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
    const { studentId, groupIds } = await req.json();

    // Validation
    if (!studentId || !Array.isArray(groupIds) || groupIds.length === 0) {
      throw new Error("studentId and non-empty groupIds array are required");
    }

    // 1. Vérifier que l'étudiant existe et récupérer son organisation
    const { data: student, error: studentError } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", studentId)
      .eq("role", "student")
      .single();

    if (studentError || !student) {
      throw new Error("Student not found or not a student");
    }

    // 2. Vérifier que les groupes appartiennent à la même organisation que l'étudiant
    const { data: groups, error: groupsError } = await supabase
      .from("groups")
      .select("id")
      .in("id", groupIds)
      .eq("organization_id", student.organization_id);

    if (groupsError || !groups || groups.length !== groupIds.length) {
      throw new Error("One or more groups are invalid or do not belong to the student's organization");
    }

    // 3. Insérer dans group_members (en évitant les doublons)
    const inserts = groupIds.map(groupId => ({
      user_id: studentId,
      group_id: groupId,
      added_by: keyData.created_by || null,
    }));

    const { error: insertError } = await supabase
      .from("group_members")
      .upsert(inserts, { onConflict: "user_id, group_id", ignoreDuplicates: true });

    if (insertError) throw insertError;

    responseBody = {
      success: true,
      message: `Student assigned to ${groupIds.length} group(s)`,
    };

  } catch (error) {
    statusCode = 400;
    responseBody = { success: false, error: error.message };
  } finally {
    const responseTimeMs = Math.round(performance.now() - startTime);
    // Note: pour logger, on a besoin de supabase ; si on est dans le catch, on peut ne pas logger.
    return new Response(JSON.stringify(responseBody), {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});