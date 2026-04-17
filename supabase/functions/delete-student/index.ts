// supabase/functions/delete-student/index.ts
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
    const studentId = pathParts[pathParts.length - 1];

    if (!studentId) {
      throw new Error("Missing student ID in path");
    }

    // Vérifier que c'est bien un étudiant
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", studentId)
      .eq("role", "student")
      .single();

    if (profileError) throw new Error("Student not found");

    // Supprimer les progrès
    await supabase.from("user_progress").delete().eq("user_id", studentId);
    // Retirer des groupes
    await supabase.from("group_members").delete().eq("user_id", studentId);
    // Supprimer le profil
    await supabase.from("profiles").delete().eq("id", studentId);
    // Supprimer l'utilisateur auth
    await supabase.auth.admin.deleteUser(studentId);

    responseBody = {
      success: true,
      message: "Student deleted permanently",
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