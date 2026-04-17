// supabase/functions/_shared/verify-api-key.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

/**
 * Vérifie la clé API fournie dans l'en-tête X-API-Key.
 * Retourne les informations de la clé si valide, sinon lance une erreur.
 */
export async function verifyApiKey(req: Request) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    throw new Error("Missing X-API-Key header");
  }

  // Créer un client Supabase avec la Service Role Key (contourne RLS)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1. Vérifier si l'API est activée globalement
  const { data: settings, error: settingsError } = await supabase
    .from("system_settings")
    .select("api_enabled, api_rate_limit")
    .eq("id", 1)
    .single();

  if (settingsError || !settings?.api_enabled) {
    throw new Error("API is disabled");
  }

  // 2. Hasher la clé fournie (SHA-256) pour la comparer au hash stocké
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  // 3. Récupérer la clé correspondante
  const { data: keyData, error: keyError } = await supabase
    .from("api_keys")
    .select("*")
    .eq("key_hash", hashHex)
    .eq("is_active", true)
    .maybeSingle();

  if (keyError || !keyData) {
    throw new Error("Invalid or inactive API key");
  }

  // 4. Vérifier l'expiration
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    throw new Error("API key expired");
  }

  // 5. Rate limiting
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Compter les requêtes de la dernière heure pour cette clé
  const { count, error: countError } = await supabase
    .from("api_logs")
    .select("*", { count: "exact", head: true })
    .eq("api_key_id", keyData.id)
    .gte("created_at", oneHourAgo.toISOString());

  if (countError) throw countError;

  const limit = keyData.rate_limit || settings.api_rate_limit || 1000;
  if (count && count >= limit) {
    throw new Error(`Rate limit exceeded (${limit} requests/hour)`);
  }

  return { keyData, supabase, settings };
}

/**
 * Enregistre un log d'appel API.
 */
export async function logApiCall(
  supabase: any,
  apiKeyId: string,
  req: Request,
  statusCode: number,
  responseTimeMs: number
) {
  const url = new URL(req.url);
  await supabase.from("api_logs").insert({
    api_key_id: apiKeyId,
    method: req.method,
    endpoint: url.pathname,
    status_code: statusCode,
    ip: req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "unknown",
    user_agent: req.headers.get("user-agent"),
    response_time_ms: responseTimeMs,
  });

  // Mettre à jour la date de dernière utilisation
  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKeyId);
}

export { corsHeaders };