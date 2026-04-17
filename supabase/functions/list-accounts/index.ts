// supabase/functions/list-accounts/index.ts
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
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const plan = url.searchParams.get("plan") || undefined;
    const status = url.searchParams.get("status") || undefined;

    let query = supabase
      .from("organizations")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (plan) query = query.eq("plan_type", plan);
    if (status) query = query.eq("subscription_status", status);

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