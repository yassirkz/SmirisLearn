// supabase/functions/create-account/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyApiKey, logApiCall, corsHeaders } from "../_shared/verify-api-key.ts";

serve(async (req) => {
  const startTime = performance.now();
  let statusCode = 200;
  let responseBody: any = {};

  // Gérer les requêtes OPTIONS (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Vérifier la clé API
    const { keyData, supabase } = await verifyApiKey(req);

    // 2. Récupérer les données du body
    const { companyName, adminEmail, adminPassword, plan = "free" } = await req.json();

    // 3. Validation des entrées (OWASP)
    if (!companyName || companyName.length < 3) {
      throw new Error("Invalid companyName (min 3 characters)");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!adminEmail || !emailRegex.test(adminEmail)) {
      throw new Error("Invalid adminEmail");
    }
    if (!adminPassword || adminPassword.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    // Validation du plan (whitelist)
    const validPlans = ["free", "starter"];
    const safePlan = validPlans.includes(plan) ? plan : "free";

    // 4. Créer l'utilisateur dans Auth
    const { data: newUser, error: signUpError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: companyName, role: "org_admin" },
    });

    if (signUpError) {
      if (signUpError.message.includes("already registered")) {
        throw new Error("Email already registered");
      }
      throw signUpError;
    }

    // 5. Générer un slug unique
    const slug = companyName
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "") + "-" + Math.random().toString(36).substring(2, 7);

    // 6. Créer l'organisation
    const { data: newOrg, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: companyName,
        slug: slug,
        plan_type: safePlan,
        subscription_status: safePlan === "free" ? "active" : "trial",
        trial_ends_at: safePlan === "starter"
          ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // 7. Lier le profil à l'organisation
    await supabase
      .from("profiles")
      .update({ organization_id: newOrg.id, role: "org_admin" })
      .eq("id", newUser.user.id);

    responseBody = {
      success: true,
      organization_id: newOrg.id,
      admin_user_id: newUser.user.id,
      message: "Account created successfully",
    };

  } catch (error) {
    statusCode = 400;
    responseBody = { success: false, error: error.message };
  } finally {
    const responseTimeMs = Math.round(performance.now() - startTime);
    // Logger l'appel (on récupère supabase à nouveau si pas dispo)
    if (statusCode !== 500) {
      // Idéalement on log même en cas d'erreur de clé (mais on n'a pas supabase)
    }
    return new Response(JSON.stringify(responseBody), {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});