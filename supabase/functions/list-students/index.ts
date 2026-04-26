// supabase/functions/list-students/index.ts
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
    const orgId = pathParts[pathParts.length - 2];

    if (!orgId) {
      throw new Error("Missing organization ID in path");
    }

    // VÉRIFICATION DE SÉCURITÉ (IDOR)
    checkOrgAccess(keyData, orgId);

    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const search = url.searchParams.get("search") || "";

    let query = supabase
      .from("profiles")
      .select("id, full_name, email, role, suspended, created_at", { count: "exact" })
      .eq("organization_id", orgId)
      .eq("role", "student")
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      const sanitized = search.replace(/[%_\\]/g, '\\$&');
      query = query.or(`full_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    responseBody = {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit),
      },
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