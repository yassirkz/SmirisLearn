// supabase/functions/update-student/index.ts
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

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const studentId = pathParts[pathParts.length - 1];

    if (!studentId) {
      throw new Error("Missing student ID in path");
    }

    const { fullName, suspended } = await req.json();
    const updates: any = {};
    if (fullName !== undefined) updates.full_name = fullName;
    if (suspended !== undefined) updates.suspended = suspended;

    if (Object.keys(updates).length === 0) {
      throw new Error("No valid fields to update");
    }

    // Vérifier que l'utilisateur est bien un étudiant
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, organization_id")
      .eq("id", studentId)
      .eq("role", "student")
      .single();

    if (profileError) throw new Error("Student not found");

    // VÉRIFICATION DE SÉCURITÉ (IDOR)
    checkOrgAccess(keyData, profile.organization_id);

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", studentId);

    if (updateError) throw updateError;

    // Gérer la suspension au niveau auth
    if (suspended !== undefined) {
      if (suspended) {
        await supabase.auth.admin.updateUserById(studentId, { ban_duration: "876600h" });
      } else {
        await supabase.auth.admin.updateUserById(studentId, { ban_duration: "0h" });
      }
    }

    responseBody = {
      success: true,
      message: "Student updated successfully",
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