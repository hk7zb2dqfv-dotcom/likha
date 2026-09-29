import { result, supabase } from "./supabase.js";

export const defaults = {
  site: {
    theme: {
      primary: "#173a2d", secondary: "#d3a43c", background: "#f4f4ed", text: "#17251e",
      accent: "#bd4c34", button: "#173a2d", nav: "#10271f", headingFont: "Playfair Display", bodyFont: "DM Sans"
    },
    logo_url: "likha-logo.png",
    cover_url: "likha-official-cover.png",
    background_image_url: "",
    hero_art_url: "studio-study.jpg",
    school_email_domain: ""
  },
  home: {
    tagline: "Create. Express. Belong.",
    intro: "A home for artists, writers, makers and curious minds at NU Cebu.",
    subtitle: "Ideas become things we can share.",
    about_title: "A community made to create",
    about_body: "LIKHA is the arts club of NU Cebu. We bring people together to make, learn and share creative work across disciplines.",
    join_copy: "Bring your ideas, your practice, or just your curiosity. There is room to begin here."
  }
};

export async function getSite() {
  const [site, home] = await Promise.all([
    result(supabase.from("likha_site_config").select("*").eq("id", true).maybeSingle()),
    result(supabase.from("likha_home_content").select("*").eq("id", true).maybeSingle())
  ]);
  return { site: { ...defaults.site, ...(site || {}), theme: { ...defaults.site.theme, ...(site?.theme || {}) } }, home: { ...defaults.home, ...(home || {}) } };
}

export const listArtworks = (limit = 80) => result(
  supabase.from("likha_artworks").select("*").order("created_at", { ascending: false }).limit(limit)
);

export const listArtists = (limit = 80) => result(
  supabase.from("likha_artists").select("*").order("name", { ascending: true }).limit(limit)
);

export const listAteliers = () => result(
  supabase.from("likha_ateliers").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true })
);

export const listAnnouncements = (limit = 5) => result(
  supabase.from("likha_announcements").select("*").eq("published", true).order("published_at", { ascending: false }).limit(limit)
);

export const listMemberships = (limit = 100) => result(
  supabase.from("likha_profiles").select("id,full_name,email,community_type,course,year_level,role,account_status,membership_status,created_at,display_name").order("created_at", { ascending: false }).limit(limit)
);

export const listAdminRequests = () => result(
  supabase.from("likha_admin_requests").select("*,likha_profiles!likha_admin_requests_applicant_id_fkey(full_name,email,community_type)").order("created_at", { ascending: false })
);

export const listAdminProfiles = () => result(
  supabase.from("likha_profiles").select("id,full_name,email,role,permissions,account_status,created_at").in("role", ["main_admin", "sub_admin"]).order("created_at", { ascending: true })
);

export const listChatMessages = (limit = 100) => result(
  supabase.from("likha_chat_messages").select("*").order("created_at", { ascending: false }).limit(limit)
);

export const listChatReports = () => result(
  supabase.from("likha_chat_reports").select("*,likha_chat_messages!likha_chat_reports_message_id_fkey(body,display_name,created_at)").eq("status", "open").order("created_at", { ascending: false })
);

export async function countRows(table) {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) throw error;
  return count || 0;
}
