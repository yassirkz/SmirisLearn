// supabase/functions/add-student/index.ts
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
    // URL: /organizations/:orgId/students
    const orgId = pathParts[pathParts.length - 2];

    if (!orgId) {
      throw new Error("Missing organization ID in path");
    }

    const { email, fullName, password } = await req.json();

    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new Error("Invalid email");
    }
    if (!fullName || fullName.length < 2) {
      throw new Error("fullName must be at least 2 characters");
    }

    // Vérifier les limites de l'organisation
    const { data: limits, error: limitsError } = await supabase
      .rpc("check_organization_limits_full", { p_org_id: orgId });

    if (limitsError) throw limitsError;
    if (!limits.can_add_member) {
      throw new Error("Organization member limit reached");
    }

    // Vérifier si l'utilisateur existe déjà
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, organization_id")
      .eq("email", email)
      .maybeSingle();

    let studentId;
    if (existingProfile) {
      if (existingProfile.organization_id) {
        throw new Error("User already belongs to an organization");
      }
      // L'utilisateur existe mais sans organisation : on le rattache
      studentId = existingProfile.id;
      await supabase
        .from("profiles")
        .update({ organization_id: orgId, role: "student" })
        .eq("id", studentId);
    } else {
      // Créer un nouvel utilisateur
      const userPassword = password || Math.random().toString(36).slice(-12);
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: userPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName, role: "student" },
      });
      if (createError) throw createError;
      studentId = newUser.user.id;

      // Le trigger handle_new_user créera le profil avec organization_id = null
      // On le met à jour immédiatement
      await supabase
        .from("profiles")
        .update({ organization_id: orgId })
        .eq("id", studentId);
    }

    responseBody = {
      success: true,
      student_id: studentId,
      message: "Student added successfully",
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