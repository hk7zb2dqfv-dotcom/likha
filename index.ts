import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return reply(405, { error: "Method not allowed." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");
  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !authorization?.startsWith("Bearer ")) {
    return reply(503, { error: "Account deletion is not configured." });
  }

  const caller = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData.user) return reply(401, { error: "Sign in again before deleting an account." });

  const { data: profile, error: profileError } = await admin
    .from("likha_profiles")
    .select("role,account_status")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profileError || profile?.role !== "main_admin" || profile.account_status !== "active") {
    return reply(403, { error: "Main Admin access is required." });
  }

  let userId = "";
  try {
    const body = await request.json();
    userId = String(body?.userId || "");
  } catch {
    return reply(400, { error: "A valid account ID is required." });
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    return reply(400, { error: "A valid account ID is required." });
  }
  if (userId === userData.user.id) return reply(400, { error: "You cannot delete your own Main Admin account." });

  const { data: target, error: targetError } = await admin
    .from("likha_profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (targetError || !target) return reply(404, { error: "Member account not found." });
  if (target.role === "main_admin") return reply(403, { error: "Main Admin accounts cannot be deleted here." });

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return reply(500, { error: "The account could not be deleted. Please retry." });
  return reply(200, { deleted: true });
});
