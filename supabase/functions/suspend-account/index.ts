// supabase/functions/suspend-account/index.ts
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

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const userId = pathParts[pathParts.length - 1];

    if (!userId) {
      throw new Error("Missing userId in path");
    }

    const { suspended } = await req.json();
    if (typeof suspended !== "boolean") {
      throw new Error("Missing 'suspended' boolean in request body");
    }

    // 1. Vérifier que l'utilisateur existe et est un admin d'organisation
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", userId)
      .single();

    if (profileError) throw new Error("User not found");

    if (profile.role !== "org_admin") {
      throw new Error("User is not an organization admin");
    }

    // 2. Mettre à jour le statut "suspended" dans profiles
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ suspended })
      .eq("id", userId);

    if (updateError) throw updateError;

    // 3. (Optionnel) Si on veut bloquer l'auth, on pourrait bannir l'utilisateur
    if (suspended) {
      await supabase.auth.admin.updateUserById(userId, { ban_duration: "876600h" }); // ~100 ans
    } else {
      await supabase.auth.admin.updateUserById(userId, { ban_duration: "0h" });
    }

    responseBody = {
      success: true,
      message: suspended ? "Account suspended" : "Account reactivated",
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