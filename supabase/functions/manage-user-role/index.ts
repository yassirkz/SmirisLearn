
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("FRONTEND_URL") || "https://smiris-learn.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // 1. Vérifier l'identité de l'appelant
    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !caller) throw new Error("Non authentifié");

    // 2. Récupérer le profil du caller pour vérifier ses droits réels (pas le JWT)
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role, organization_id")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || !["super_admin", "org_admin"].includes(callerProfile.role)) {
      throw new Error("Droits insuffisants");
    }

    // 3. Récupérer les paramètres
    const { targetUserId, newRole } = await req.json();
    if (!targetUserId || !newRole) throw new Error("Paramètres manquants");

    // 4. Récupérer le profil de la cible
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("organization_id, role")
      .eq("id", targetUserId)
      .single();

    if (!targetProfile) throw new Error("Utilisateur cible non trouvé");

    // 5. Vérifier les permissions de modification
    const isSuperAdmin = callerProfile.role === "super_admin";
    const isSameOrg = callerProfile.organization_id === targetProfile.organization_id;

    if (!isSuperAdmin && !isSameOrg) {
      throw new Error("Vous ne pouvez pas modifier un utilisateur d'une autre organisation");
    }

    // Un Org Admin ne peut pas promouvoir quelqu'un en Super Admin
    if (!isSuperAdmin && newRole === "super_admin") {
      throw new Error("Action non autorisée");
    }

    // 6. Appliquer les changements (Profile + Auth Metadata)
    const { error: updateProfileError } = await supabaseAdmin
      .from("profiles")
      .update({ role: newRole })
      .eq("id", targetUserId);

    if (updateProfileError) throw updateProfileError;

    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { user_metadata: { role: newRole } }
    );

    if (updateAuthError) throw updateAuthError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
