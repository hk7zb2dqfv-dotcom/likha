const config = window.LIKHA_CONFIG || {};
const sdk = window.supabase;

export const backendConfigured = Boolean(config.supabaseUrl && config.supabasePublishableKey && sdk?.createClient);
export const supabase = backendConfigured
  ? sdk.createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: { autoRefreshToken: true, detectSessionInUrl: true, persistSession: true }
    })
  : null;

export const clubLinks = config.links || {};

export async function result(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export function userMessage(error, fallback = "That action could not be completed. Please try again.") {
  const message = String(error?.message || "");
  if (/Invalid login credentials/i.test(message)) return "That email and password do not match.";
  if (/User already registered/i.test(message)) return "An account already exists for this email. Sign in instead.";
  if (/Email not confirmed/i.test(message)) return "Please verify your school email before signing in.";
  if (/row-level security|permission denied|not allowed/i.test(message)) return "Your account does not have permission for that action.";
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) return "The LIKHA service is unreachable. Check your connection and try again.";
  return fallback;
}
