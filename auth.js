import { result, supabase } from "./supabase.js";

export async function loadProfile(userId) {
  return result(supabase.from("likha_profiles").select("*").eq("id", userId).maybeSingle());
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  return { user: data.user, profile: await loadProfile(data.user.id) };
}

export async function registerMember(values, emailDomain = "") {
  const email = values.email.trim().toLowerCase();
  if (emailDomain && !email.endsWith(`@${emailDomain.toLowerCase()}`)) {
    throw new Error(`Use your school email ending in @${emailDomain}.`);
  }
  const metadata = {
    full_name: values.full_name.trim(),
    community_type: values.community_type,
    course: values.course.trim(),
    year_level: values.year_level,
    contact_info: values.contact_info.trim(),
    interests: values.interests.split(",").map(value => value.trim()).filter(Boolean),
    consent: values.consent === "on"
  };
  const { data, error } = await supabase.auth.signUp({
    email,
    password: values.password,
    options: { data: metadata, emailRedirectTo: `${location.origin}${location.pathname}` }
  });
  if (error) throw error;
  return data;
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${location.origin}${location.pathname}`
  });
  if (error) throw error;
}

export async function requestAdminAccess(reason) {
  return result(supabase.from("likha_admin_requests").insert({ reason: reason.trim() }).select().single());
}

export async function currentAdminRequest(userId) {
  return result(supabase.from("likha_admin_requests").select("*").eq("applicant_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle());
}

export async function updateProfile(userId, values) {
  return result(supabase.from("likha_profiles").update(values).eq("id", userId).select().single());
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
