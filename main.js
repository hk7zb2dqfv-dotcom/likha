import { supabase, backendConfigured, userMessage } from "./supabase.js";
import { defaults, getSite, listAnnouncements, listArtists, listAteliers, listArtworks } from "./data.js";
import { loadProfile, registerMember, requestAdminAccess, sendPasswordReset, signIn, signOut, updateProfile } from "./auth.js";
import { header, footer, renderAbout, renderArtist, renderArtists, renderAtelier, renderArtworkDialog, renderCommunity, renderHome, renderJoin } from "./gallery.js";
import { renderChat, renderedMessages, reportMessage, removeChatMessage, sendChatMessage, subscribeChat } from "./chat.js";
import { renderAccessRequest, renderAccount, renderLogin, renderPasswordReset } from "./auth-views.js";
import { clearImage, handleAdminAction, handleAdminForm, handleImagePreview, renderAdmin } from "./admin.js";
import { $, $$, escapeHtml as e, showDialog, toast, uploadPublicImage } from "./utils.js";

const app = $("#app");
const state = { session: null, profile: null, site: defaults.site, home: defaults.home, databaseReady: false, currentPath: "/", chatFile: null, stopChat: null, artworkIndex: new Map(), artists: [] };

function withTimeout(task, ms = 3500) {
  let timer;
  return Promise.race([
    Promise.resolve().then(task),
    new Promise((_, reject) => { timer = window.setTimeout(() => reject(new Error("Request timed out")), ms); })
  ]).finally(() => window.clearTimeout(timer));
}

function applyTheme(theme = {}) {
  const root = document.documentElement;
  const keys = { primary: "--primary", secondary: "--secondary", background: "--background", text: "--text", accent: "--accent", button: "--button", nav: "--nav" };
  for (const [key, variable] of Object.entries(keys)) if (/^#[0-9a-f]{6}$/i.test(theme[key] || "")) root.style.setProperty(variable, theme[key]);
  const fonts = { "Playfair Display": "'Playfair Display', Georgia, serif", "DM Sans": "'DM Sans', Arial, sans-serif", Georgia: "Georgia, serif", Arial: "Arial, sans-serif" };
  if (fonts[theme.headingFont]) root.style.setProperty("--font-heading", fonts[theme.headingFont]);
  if (fonts[theme.bodyFont]) root.style.setProperty("--font-body", fonts[theme.bodyFont]);
}

async function loadSite() {
  if (!backendConfigured) {
    state.databaseReady = false;
    state.site = defaults.site;
    state.home = defaults.home;
    return;
  }
  try {
    const data = await withTimeout(() => getSite());
    state.site = data.site;
    state.home = data.home;
    state.databaseReady = true;
    applyTheme(state.site.theme);
  } catch {
    state.databaseReady = false;
    state.site = defaults.site;
    state.home = defaults.home;
  }
}

async function refreshProfile(session) {
  state.session = session;
  if (!session?.user) {
    state.profile = null;
    return;
  }
  try { state.profile = await withTimeout(() => loadProfile(session.user.id)); }
  catch { state.profile = null; }
}

async function initialize() {
  await route({ skipSiteLoad: true });
  if (!backendConfigured) return;
  const authReturnType = new URLSearchParams(location.hash.slice(1)).get("type");
  const { data } = await withTimeout(() => supabase.auth.getSession()).catch(() => ({ data: { session: null } }));
  await refreshProfile(data.session);
  if (authReturnType === "recovery") location.hash = "#/reset-password";
  else if (["signup", "email"].includes(authReturnType) && data.session) location.hash = "#/chat";
  supabase.auth.onAuthStateChange((event, session) => {
    window.setTimeout(async () => {
      await refreshProfile(session);
      if (event === "PASSWORD_RECOVERY") location.hash = "#/reset-password";
      if (["/login", "/join", "/chat", "/account", "/admin", "/access"].some(path => state.currentPath.startsWith(path))) await route();
    }, 0);
  });
  await route();
}

function parseRoute() {
  const value = location.hash.slice(1) || "/";
  const path = value.split("?")[0].replace(/\/$/, "") || "/";
  return path.split("/").filter(Boolean).map(decodeURIComponent);
}

async function getOr(load, fallback) {
  if (!state.databaseReady) return fallback;
  try { return await withTimeout(load); }
  catch { state.databaseReady = false; return fallback; }
}

async function route({ skipSiteLoad = false } = {}) {
  if (state.stopChat) { state.stopChat(); state.stopChat = null; }
  state.chatFile = null;
  if (!skipSiteLoad) await loadSite();
  const [section = "", id = "", tab = "overview"] = parseRoute();
  const path = section ? `/${section}${id ? `/${id}` : ""}` : "/";
  state.currentPath = path;
  let content = "";
  let admin = false;
  try {
    if (!section) {
      const [artworks, artists, ateliers, announcements] = await Promise.all([
        getOr(() => listArtworks(80), []), getOr(() => listArtists(80), []), getOr(() => listAteliers(), []), getOr(() => listAnnouncements(5), [])
      ]);
      cachePublic(artworks, artists, ateliers);
      content = renderHome({ site: state.site, home: state.home, artworks, artists, ateliers, announcements });
    } else if (section === "atelier") {
      const [artworks, artists, ateliers] = await Promise.all([getOr(() => listArtworks(500), []), getOr(() => listArtists(500), []), getOr(() => listAteliers(), [])]);
      cachePublic(artworks, artists, ateliers);
      content = renderAtelier({ artworks, artists, ateliers, selected: id });
    } else if (section === "artists") {
      const [artworks, artists] = await Promise.all([getOr(() => listArtworks(500), []), getOr(() => listArtists(500), [])]);
      state.artists = artists;
      cachePublic(artworks, artists, []);
      content = renderArtists({ artists, artworks });
    } else if (section === "artist") {
      const [artworks, artists, ateliers] = await Promise.all([getOr(() => listArtworks(500), []), getOr(() => listArtists(500), []), getOr(() => listAteliers(), [])]);
      state.artists = artists;
      cachePublic(artworks, artists, ateliers);
      content = renderArtist({ artist: artists.find(person => person.id === id), artworks: artworks.filter(work => work.artist_id === id), artists, ateliers });
    } else if (section === "about") {
      const ateliers = await getOr(() => listAteliers(), []);
      content = renderAbout(state.home, ateliers);
    } else if (section === "join") {
      content = renderJoin(state.site, state.profile);
    } else if (section === "community") {
      content = renderCommunity(state.profile, state.site);
    } else if (section === "login") {
      content = renderLogin();
    } else if (section === "reset-password") {
      content = renderPasswordReset();
    } else if (section === "access") {
      content = await renderAccessRequest(state.profile);
    } else if (section === "account") {
      content = renderAccount(state.profile);
    } else if (section === "chat") {
      content = await renderChat(state.profile);
    } else if (section === "admin") {
      admin = true;
      content = await renderAdmin(id || "overview", state.profile);
    } else if (section === "artwork") {
      const [artworks, artists, ateliers] = await Promise.all([getOr(() => listArtworks(500), []), getOr(() => listArtists(500), []), getOr(() => listAteliers(), [])]);
      cachePublic(artworks, artists, ateliers);
      const work = artworks.find(item => item.id === id);
      content = work ? `<main id="main" class="section wrap"><a class="back-link" href="#/atelier">← Back to Atelier</a><h1>${e(work.title)}</h1><button class="button button-primary" data-action="artwork" data-id="${e(work.id)}">View full artwork</button></main>` : `<main id="main" class="section wrap"><h1>Artwork not found</h1><a href="#/atelier">Browse the Atelier</a></main>`;
      if (work) window.setTimeout(() => renderArtworkDialog(work, artists.find(person => person.id === work.artist_id), ateliers.find(room => room.id === work.atelier_id)), 0);
    } else {
      content = `<main id="main" class="section wrap"><h1>Page not found</h1><a class="text-link" href="#/">Back to LIKHA</a></main>`;
    }
  } catch {
    content = `<main id="main" class="section wrap"><div class="inline-alert" role="alert"><h1>We couldn't load this page.</h1><p>Check your connection and try again.</p><button class="button button-primary" data-action="retry">Try again</button></div></main>`;
  }

  const current = section === "atelier" ? "/atelier" : `/${section}`;
  app.innerHTML = admin ? content : `${header(state.profile, state.site, current)}${setupBanner()}${content}${footer(state.site)}`;
  $$(".upload-control input[type=file][hidden]", app).forEach(input => { input.hidden = false; });
  const main = $("#main", app);
  main?.focus({ preventScroll: true });
  document.title = `${titleFor(section, id)} | LIKHA Arts Club`;
  if (section === "chat" && state.profile?.membership_status === "active" && state.profile.account_status !== "banned" && state.profile.display_name) {
    state.stopChat = subscribeChat(() => refreshChatFeed());
    const feed = $("#chat-feed");
    if (feed) feed.scrollTop = feed.scrollHeight;
  }
}

function setupBanner() {
  if (state.databaseReady) return "";
  const message = backendConfigured
    ? "Member sign-in and administrator access are waiting for the LIKHA database setup."
    : "Connect the Supabase project to activate member sign-in and administrator access.";
  return `<div class="service-banner" role="status"><span class="service-mark">L</span><span>${message}</span></div>`;
}

function titleFor(section, id) {
  if (!section) return "Create. Express. Belong.";
  if (section === "artist") return state.artists.find(person => person.id === id)?.name || "Artist";
  return ({ atelier: "Atelier", artists: "Artists", about: "About", join: "Join LIKHA", community: "Community", login: "Sign in", account: "Account", chat: "Open chat", admin: "Admin portal", access: "Admin access", "reset-password": "Password reset", artwork: "Artwork" })[section] || "LIKHA";
}

function cachePublic(artworks, artists, ateliers) {
  if (artworks) for (const item of artworks) state.artworkIndex.set(item.id, { ...item, _artist: artists?.find(person => person.id === item.artist_id), _atelier: ateliers?.find(room => room.id === item.atelier_id) });
  if (artists) state.artists = artists;
}

async function refreshChatFeed() {
  const feed = $("#chat-feed");
  if (!feed || !state.profile) return;
  const nearBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 90;
  try {
    const html = await renderedMessages(state.profile);
    feed.innerHTML = html || `<div class="chat-empty"><span aria-hidden="true">✦</span><p>No messages yet. Start the conversation.</p></div>`;
    if (nearBottom) feed.scrollTop = feed.scrollHeight;
  } catch { toast("New messages could not be refreshed.", "error"); }
}

function formError(form, error, fallback) {
  const target = $(`[data-form-error]`, form);
  const raw = String(error?.message || "");
  const validation = /^(Use your school email|Choose |Enter |Passwords must|Write |This field|The image|Select |Add )/i.test(raw);
  const message = validation ? raw : userMessage(error, fallback);
  if (target) target.textContent = message;
  else toast(message, "error");
}

async function handleSubmit(form) {
  if (!backendConfigured || !state.databaseReady) {
    const message = backendConfigured
      ? "The LIKHA database is not ready yet. Complete the Supabase setup, then try again."
      : "Sign-in is not connected to Supabase yet.";
    return formError(form, new Error("service"), message);
  }
  if (!form.checkValidity()) return form.reportValidity();
  const data = new FormData(form);
  const submit = $("button[type=submit]", form);
  if (submit) { submit.disabled = true; submit.dataset.label = submit.textContent; submit.textContent = "Please wait..."; }
  try {
    if (form.dataset.form === "login") {
      const signedIn = await signIn(data.get("email"), data.get("password"));
      state.profile = signedIn.profile;
      toast(signedIn.profile ? `Welcome back, ${signedIn.profile.full_name}.` : "Signed in. Your LIKHA profile is still being prepared.");
      location.hash = signedIn.profile && ["main_admin", "sub_admin"].includes(signedIn.profile.role) ? "#/admin" : "#/account";
    } else if (form.dataset.form === "register") {
      const result = await registerMember(Object.fromEntries(data), state.site.school_email_domain || "");
      if (result.session) {
        await refreshProfile(result.session);
        location.hash = "#/chat";
      } else {
        form.innerHTML = `<div class="registration-success"><span aria-hidden="true">L</span><p class="eyebrow">Registration received</p><h2>Check your school email.</h2><p>Follow the verification link to activate your LIKHA account. Then sign in to join the open chat.</p><a class="button button-primary" href="#/login">Continue to sign in</a></div>`;
      }
    } else if (form.dataset.form === "admin-request") {
      await requestAdminAccess(data.get("reason"));
      toast("Admin access request sent for review.");
      await route();
    } else if (form.dataset.form === "account") {
      const interests = String(data.get("interests") || "").split(",").map(item => item.trim()).filter(Boolean);
      state.profile = await updateProfile(state.profile.id, { full_name: data.get("full_name").trim(), display_name: data.get("display_name").trim(), community_type: data.get("community_type"), course: data.get("course").trim(), year_level: data.get("year_level") || null, contact_info: data.get("contact_info").trim(), interests });
      toast("Profile updated.");
      await route();
    } else if (form.dataset.form === "reset-password") {
      if (data.get("password") !== data.get("confirm_password")) throw new Error("Passwords must match.");
      const { error } = await supabase.auth.updateUser({ password: data.get("password") });
      if (error) throw error;
      toast("Password updated.");
      location.hash = "#/account";
    } else if (form.dataset.form === "display-name") {
      state.profile = await updateProfile(state.profile.id, { display_name: data.get("display_name").trim() });
      location.hash = "#/chat";
    } else if (form.dataset.form === "chat") {
      const body = String(data.get("body") || "").trim();
      const sticker = String(data.get("sticker") || "");
      if (!body && !sticker && !state.chatFile) throw new Error("Write a message, choose a sticker or add an image.");
      const uploadStatus = document.createElement("p");
      uploadStatus.className = "upload-status";
      uploadStatus.setAttribute("role", "status");
      uploadStatus.setAttribute("aria-live", "polite");
      uploadStatus.textContent = state.chatFile ? "Uploading image..." : "Sending message...";
      form.append(uploadStatus);
      await sendChatMessage({ profile: state.profile, body, sticker, file: state.chatFile });
      uploadStatus.remove();
      form.reset(); state.chatFile = null;
      const preview = $("[data-chat-preview]", form); if (preview) { preview.hidden = true; preview.innerHTML = ""; }
      $$(".sticker-picker button", form).forEach(button => button.classList.remove("is-selected"));
      await refreshChatFeed();
      $("#chat-message", form)?.focus();
    } else if (["home-content", "site-appearance", "site-settings"].includes(form.dataset.form)) {
      await handleAdminForm(form, state.profile, async () => { await loadSite(); await route(); });
    }
  } catch (error) {
    form.querySelector(".upload-status")?.remove();
    formError(form, error, "That action could not be completed. Please try again.");
  } finally {
    if (submit?.isConnected) { submit.disabled = false; submit.textContent = submit.dataset.label || "Submit"; }
  }
}

document.addEventListener("click", async event => {
  const target = event.target.closest("[data-action], [data-admin-action], [data-clear-image]");
  if (!target) return;
  try {
    if (target.dataset.action === "menu") {
      const nav = $("#main-nav");
      const open = nav.classList.toggle("is-open");
      target.setAttribute("aria-expanded", String(open));
      target.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    } else if (target.dataset.action === "logout") {
      await signOut();
      state.profile = null;
      toast("You are signed out.");
      location.hash = "#/";
    } else if (target.dataset.action === "retry") {
      await route();
    } else if (target.dataset.action === "forgot-password") {
      showDialog({ title: "Reset your password", confirm: "Send reset link", body: `<label>School email<input name="email" type="email" autocomplete="email" required maxlength="254"></label><p class="form-error" data-form-error role="alert"></p>`, onSubmit: async data => {
        await sendPasswordReset(data.get("email"));
        toast("If that account exists, a password reset link has been sent.");
      } });
    } else if (target.dataset.action === "artwork") {
      const item = state.artworkIndex.get(target.dataset.id);
      if (!item) return toast("This artwork is no longer available.", "error");
      renderArtworkDialog(item, item._artist, item._atelier);
    } else if (target.dataset.action === "sticker") {
      const input = $("input[name=sticker]", target.closest("form"));
      input.value = target.dataset.value;
      $$(".sticker-picker button").forEach(button => button.classList.toggle("is-selected", button === target));
    } else if (target.dataset.action === "report-message") {
      showDialog({ title: "Report this message", confirm: "Send report", body: `<label>Reason<select name="reason" required><option value="">Choose one</option><option>Harassment</option><option>Inappropriate image</option><option>Spam</option><option>Other</option></select></label><p class="form-error" data-form-error role="alert"></p>`, onSubmit: async data => { await reportMessage(target.dataset.id, data.get("reason")); toast("Report sent to the moderators."); } });
    } else if (target.dataset.action === "moderate-message") {
      showDialog({ title: "Remove this message?", confirm: "Remove message", danger: true, body: `<p>The message will be hidden from members. The moderation record stays available to administrators.</p><p class="form-error" data-form-error role="alert"></p>`, onSubmit: async () => { await removeChatMessage(target.dataset.id); toast("Message removed."); await refreshChatFeed(); } });
    } else if (target.dataset.clearImage !== undefined) {
      clearImage(target);
    } else if (target.dataset.adminAction) {
      await handleAdminAction(target, state.profile, route);
    }
  } catch (error) { toast(userMessage(error), "error"); }
});

document.addEventListener("submit", event => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  void handleSubmit(form);
});

document.addEventListener("change", event => {
  const input = event.target;
  if (input.type !== "file") return;
  if (input.closest("[data-image-field]")) handleImagePreview(input);
  if (input.name === "image" && input.closest("[data-form=chat]")) {
    const file = input.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) {
      toast(file.size > 8 * 1024 * 1024 ? "Choose an image smaller than 8 MB." : "Choose a JPG, PNG or WebP image.", "error");
      input.value = ""; return;
    }
    state.chatFile = file;
    const preview = $("[data-chat-preview]");
    preview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Image selected for chat"><span>${e(file.name)}</span><button type="button" class="icon-button" data-action="remove-chat-image" aria-label="Remove selected image">×</button>`;
    preview.hidden = false;
  }
});

document.addEventListener("input", event => {
  if (event.target.matches("[data-action=artist-search]")) {
    const query = event.target.value.trim().toLowerCase();
    const list = $("#artist-list");
    list?.querySelectorAll(".artist-card").forEach(card => {
      const text = card.textContent.toLowerCase();
      card.hidden = !text.includes(query);
    });
  }
});

document.addEventListener("click", event => {
  if (event.target.closest("[data-action=remove-chat-image]")) {
    state.chatFile = null;
    const preview = $("[data-chat-preview]");
    if (preview) { preview.hidden = true; preview.innerHTML = ""; }
    const input = $("[data-form=chat] input[type=file]"); if (input) input.value = "";
  }
});

addEventListener("hashchange", () => void route());
void initialize();
