// supabase/functions/delete-account/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyApiKey, logApiCall, corsHeaders, checkOrgAccess } from "../_shared/verify-api-key.ts";

serve(async (req) => {
  const startTime = performance.now();
  let statusCode = 200;
  let responseBody: any = {};

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { keyData, supabase } = await verifyApiKey(req);

    // Récupérer l'ID de l'utilisateur admin (celui qui possède l'organisation)
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const userId = pathParts[pathParts.length - 1];

    if (!userId) {
      throw new Error("Missing userId in path");
    }

    // 1. Récupérer l'organisation liée à cet utilisateur
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", userId)
      .eq("role", "org_admin")
      .single();

    if (profileError || !profile?.organization_id) {
      throw new Error("User is not an organization admin or not found");
    }

    const orgId = profile.organization_id;

    // VÉRIFICATION DE SÉCURITÉ (IDOR)
    checkOrgAccess(keyData, orgId);

    // 1.5 Récupérer tous les profils de l'organisation pour pouvoir les supprimer du système auth
    const { data: orgMembers } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("organization_id", orgId);

    // On exclut les super_admin par sécurité au cas où l'un d'eux se serait attaché à l'entreprise
    const userIdsToDelete = (orgMembers || [])
      .filter((m: any) => m.role !== "super_admin")
      .map((m: any) => m.id);

    // 2. Détacher tous les profils (pour éviter l'erreur de clé étrangère sur profiles_organization_id_fkey)
    const { error: updateProfilesError } = await supabase
      .from("profiles")
      .update({ organization_id: null })
      .eq("organization_id", orgId);

    if (updateProfilesError) {
      console.warn("Could not detach profiles:", updateProfilesError);
    }

    // 3. Supprimer l'organisation
    const { error: deleteOrgError } = await supabase
      .from("organizations")
      .delete()
      .eq("id", orgId);

    if (deleteOrgError) throw deleteOrgError;

    // 4. Supprimer tous les utilisateurs rattachés (de auth.users)
    if (userIdsToDelete.length > 0) {
      await Promise.allSettled(
        userIdsToDelete.map((uid: string) => supabase.auth.admin.deleteUser(uid))
      );
    }

    responseBody = {
      success: true,
      message: "Account and associated organization deleted permanently",
    };

  } catch (error) {
    statusCode = 400;
    responseBody = { success: false, error: error.message };
  } finally {
    const responseTimeMs = Math.round(performance.now() - startTime);
    return new Response(JSON.stringify(responseBody), {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});