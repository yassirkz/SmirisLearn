// supabase/functions/delete-account/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyApiKey, logApiCall, corsHeaders } from "../_shared/verify-api-key.ts";

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

    // 2. Supprimer l'organisation (cascade grâce aux FK)
    const { error: deleteOrgError } = await supabase
      .from("organizations")
      .delete()
      .eq("id", orgId);

    if (deleteOrgError) throw deleteOrgError;

    // 3. Supprimer l'utilisateur de auth.users (le compte admin)
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.warn("Could not delete auth user:", deleteUserError.message);
      // On continue, l'organisation est déjà supprimée
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