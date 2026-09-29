import { listAdminProfiles, listAdminRequests, listAnnouncements, listArtists, listAteliers, listArtworks, listChatMessages, listChatReports, listMemberships } from "./data.js";
import { result, supabase, userMessage } from "./supabase.js";
import { showDialog, toast, escapeHtml as e, safeUrl, uploadPublicImage } from "./utils.js";
import { removeChatMessage } from "./chat.js";

const adminRole = role => role === "main_admin" || role === "sub_admin";
const isMain = profile => profile?.role === "main_admin";
const mayContent = profile => isMain(profile) || (profile?.role === "sub_admin" && profile.permissions?.content);
const mayModerate = profile => isMain(profile) || (profile?.role === "sub_admin" && profile.permissions?.moderate_chat);
const mayRestrict = profile => isMain(profile) || (profile?.role === "sub_admin" && profile.permissions?.restrict_users);
const roleName = role => role === "main_admin" ? "Main Admin" : role === "sub_admin" ? "Sub-Admin" : "Member";

const navItems = [
  ["overview", "Overview", () => true],
  ["artworks", "Artworks", mayContent],
  ["artists", "Artists", mayContent],
  ["ateliers", "Ateliers", mayContent],
  ["announcements", "Announcements", mayContent],
  ["members", "Members", isMain],
  ["requests", "Admin requests", isMain],
  ["administrators", "Administrators", isMain],
  ["moderation", "Chat moderation", mayModerate],
  ["activity", "Activity log", isMain],
  ["homepage", "Homepage", isMain],
  ["appearance", "Appearance", isMain],
  ["settings", "Settings", isMain]
];

export async function renderAdmin(tab, profile) {
  if (!adminRole(profile)) return `<main id="main" tabindex="-1"><section class="section wrap"><div class="empty-state"><span class="empty-mark" aria-hidden="true">L</span><h1>Admin portal</h1><p>Sign in with an approved administrator account to open the dashboard.</p><a class="button button-primary" href="#/login">Administrator sign in</a></div></section></main>`;
  const active = navItems.find(item => item[0] === tab) || navItems[0];
  const canOpen = active[2](profile);
  let content = "";
  if (!canOpen) content = `<div class="empty-state"><span class="empty-mark" aria-hidden="true">L</span><h1>Access is restricted</h1><p>${e(roleName(profile.role))} accounts do not have permission to open this section.</p></div>`;
  else {
    try { content = await renderTab(active[0], profile); }
    catch (error) { content = `<div class="inline-alert" role="alert"><strong>This section could not load.</strong><p>${e(userMessage(error))}</p><button class="button button-quiet" data-admin-action="refresh">Try again</button></div>`; }
  }
  const visible = navItems.filter(item => item[2](profile));
  return `<main id="main" tabindex="-1" class="admin-shell"><aside class="admin-sidebar"><a class="admin-brand" href="#/"><span class="admin-logo">L</span><span>LIKHA <small>CONTROL CENTER</small></span></a><nav aria-label="Admin sections">${visible.map(([key, label]) => `<a href="#/admin/${key}"${key === active[0] ? ' aria-current="page"' : ""}>${e(label)}</a>`).join("")}</nav><div class="admin-side-bottom"><a href="#/">View public site <span aria-hidden="true">↗</span></a><a href="#/account">Account</a></div></aside><section class="admin-content"><header class="admin-top"><div><p class="eyebrow">Website Control Center</p><p>Signed in as <strong>${e(profile.full_name)}</strong> <span class="role-badge">${e(roleName(profile.role))}</span></p></div><button class="button button-quiet button-small" data-action="logout">Sign out</button></header><div class="admin-page">${content}</div></section></main>`;
}

async function renderTab(tab, profile) {
  if (tab === "overview") return overview(profile);
  if (tab === "artworks") return artworksTab(profile);
  if (tab === "artists") return artistsTab(profile);
  if (tab === "ateliers") return ateliersTab(profile);
  if (tab === "announcements") return announcementsTab(profile);
  if (tab === "members") return membersTab();
  if (tab === "requests") return requestsTab();
  if (tab === "administrators") return administratorsTab();
  if (tab === "moderation") return moderationTab(profile);
  if (tab === "activity") return activityTab();
  if (tab === "homepage") return homepageTab();
  if (tab === "appearance") return appearanceTab();
  return settingsTab();
}

async function overview(profile) {
  const [artworks, artists, ateliers, announcements] = await Promise.all([listArtworks(500), listArtists(500), listAteliers(), listAnnouncements(50)]);
  let pending = 0, reports = 0, members = 0;
  if (isMain(profile)) {
    const [requests, profiles, chatReports] = await Promise.all([listAdminRequests(), listMemberships(500), listChatReports()]);
    pending = requests.filter(item => item.status === "pending").length;
    members = profiles.length;
    reports = chatReports.length;
  }
  const stats = [
    ["Published artworks", artworks.length, "artworks"], ["Artist profiles", artists.length, "artists"],
    ["Ateliers", ateliers.length, "ateliers"], ["Announcements", announcements.length, "announcements"],
    ...(isMain(profile) ? [["Members", members, "members"], ["Pending access requests", pending, "requests"], ["Open chat reports", reports, "reports"]] : [])
  ];
  return `<div class="admin-page-heading"><div><p class="eyebrow">Your overview</p><h1>Welcome, ${e(profile.full_name.split(" ")[0])}.</h1><p>Keep an eye on the club's work and community.</p></div></div>
    <div class="admin-stats">${stats.map(([label, value, link]) => `<a href="#/admin/${e(link)}"><span>${e(label)}</span><strong>${value}</strong></a>`).join("")}</div>
    <div class="admin-overview-bottom"><section><div class="admin-section-heading"><div><p class="eyebrow">Quick actions</p><h2>Keep things moving</h2></div></div><div class="quick-actions">${mayContent(profile) ? `<a href="#/admin/artworks" class="quick-action"><span>01</span><strong>Add an artwork</strong><span aria-hidden="true">↗</span></a><a href="#/admin/artists" class="quick-action"><span>02</span><strong>Update an artist</strong><span aria-hidden="true">↗</span></a>` : ""}${isMain(profile) ? `<a href="#/admin/requests" class="quick-action"><span>03</span><strong>Review access requests</strong><span aria-hidden="true">↗</span></a><a href="#/admin/appearance" class="quick-action"><span>04</span><strong>Adjust site appearance</strong><span aria-hidden="true">↗</span></a>` : ""}${mayModerate(profile) ? `<a href="#/admin/moderation" class="quick-action"><span>05</span><strong>Review chat reports</strong><span aria-hidden="true">↗</span></a>` : ""}</div></section><aside class="role-summary"><p class="eyebrow">Your permissions</p><h2>${e(roleName(profile.role))}</h2><p>${isMain(profile) ? "Full access to content, members, administrators, appearance and moderation." : "Content and chat access is limited to the permissions assigned by the Main Admin."}</p>${!isMain(profile) ? `<ul>${Object.entries(profile.permissions || {}).filter(([, enabled]) => enabled).map(([key]) => `<li>${e(permissionLabel(key))}</li>`).join("") || "<li>No additional permissions assigned</li>"}</ul>` : ""}</aside></div>`;
}

async function artworksTab(profile) {
  const [works, artists, ateliers] = await Promise.all([listArtworks(500), listArtists(500), listAteliers()]);
  const artistMap = new Map(artists.map(item => [item.id, item.name]));
  const atelierMap = new Map(ateliers.map(item => [item.id, item.name]));
  return `<div class="admin-page-heading"><div><p class="eyebrow">Atelier collection</p><h1>Artworks</h1><p>Publish and maintain member artwork.</p></div>${mayContent(profile) ? '<button class="button button-primary" data-admin-action="add" data-entity="artwork">Add artwork</button>' : ""}</div>
    ${works.length ? `<div class="manage-list">${works.map(work => `<article class="manage-row"><div class="manage-thumb">${work.image_url ? `<img src="${e(safeUrl(work.image_url))}" alt="">` : ""}</div><div class="manage-main"><h2>${e(work.title)}</h2><p>${e(artistMap.get(work.artist_id) || "Artist not assigned")} · ${e(atelierMap.get(work.atelier_id) || "No atelier")}</p><small>${work.featured ? "Featured" : "Not featured"}${work.caption ? ` · ${e(work.caption)}` : ""}</small></div><div class="manage-actions">${mayContent(profile) ? `<button class="button button-quiet button-small" data-admin-action="edit" data-entity="artwork" data-id="${e(work.id)}">Edit</button><button class="button button-quiet button-small" data-admin-action="feature" data-id="${e(work.id)}">${work.featured ? "Unfeature" : "Feature"}</button><button class="button button-danger button-small" data-admin-action="delete" data-entity="artwork" data-id="${e(work.id)}">Delete</button>` : ""}</div></article>`).join("")}</div>` : empty("No artworks yet", "Add the first member piece to start the Atelier.", '<button class="button button-primary" data-admin-action="add" data-entity="artwork">Add artwork</button>')}`;
}

async function artistsTab(profile) {
  const [artists, artworks] = await Promise.all([listArtists(500), listArtworks(500)]);
  return `<div class="admin-page-heading"><div><p class="eyebrow">People behind the work</p><h1>Artists</h1><p>Manage profiles and portfolio introductions.</p></div>${mayContent(profile) ? '<button class="button button-primary" data-admin-action="add" data-entity="artist">Add artist</button>' : ""}</div>
    ${artists.length ? `<div class="manage-list">${artists.map(artist => `<article class="manage-row"><div class="manage-thumb round">${artist.profile_image_url ? `<img src="${e(safeUrl(artist.profile_image_url))}" alt="">` : e((artist.name || "L").charAt(0))}</div><div class="manage-main"><h2>${e(artist.name)}</h2><p>${e(artist.program || "LIKHA artist")} · ${artworks.filter(work => work.artist_id === artist.id).length} works</p><small>${e(artist.bio || "No biography yet.")}</small></div><div class="manage-actions">${mayContent(profile) ? `<button class="button button-quiet button-small" data-admin-action="edit" data-entity="artist" data-id="${e(artist.id)}">Edit</button><button class="button button-danger button-small" data-admin-action="delete" data-entity="artist" data-id="${e(artist.id)}">Delete</button>` : ""}</div></article>`).join("")}</div>` : empty("No artist profiles yet", "Add a profile to introduce LIKHA members.", '<button class="button button-primary" data-admin-action="add" data-entity="artist">Add artist</button>')}`;
}

async function ateliersTab(profile) {
  const [ateliers, artworks] = await Promise.all([listAteliers(), listArtworks(500)]);
  return `<div class="admin-page-heading"><div><p class="eyebrow">Creative groups</p><h1>Ateliers</h1><p>Organize the practices in the public gallery.</p></div>${mayContent(profile) ? '<button class="button button-primary" data-admin-action="add" data-entity="atelier">Add atelier</button>' : ""}</div>
    ${ateliers.length ? `<div class="manage-list">${ateliers.map(room => `<article class="manage-row"><div class="manage-thumb">${room.cover_image_url ? `<img src="${e(safeUrl(room.cover_image_url))}" alt="">` : ""}</div><div class="manage-main"><h2>${e(room.name)}</h2><p>/${e(room.slug)} · ${artworks.filter(work => work.atelier_id === room.id).length} works</p><small>${e(room.description || "No description yet.")}</small></div><div class="manage-actions">${mayContent(profile) ? `<button class="button button-quiet button-small" data-admin-action="edit" data-entity="atelier" data-id="${e(room.id)}">Edit</button><button class="button button-danger button-small" data-admin-action="delete" data-entity="atelier" data-id="${e(room.id)}">Delete</button>` : ""}</div></article>`).join("")}</div>` : empty("No ateliers yet", "Add the club's first creative group.", '<button class="button button-primary" data-admin-action="add" data-entity="atelier">Add atelier</button>')}`;
}

async function announcementsTab(profile) {
  const announcements = await result(supabase.from("likha_announcements").select("*").order("created_at", { ascending: false }));
  return `<div class="admin-page-heading"><div><p class="eyebrow">Public updates</p><h1>Announcements</h1><p>Share events, club news and calls for work.</p></div>${mayContent(profile) ? '<button class="button button-primary" data-admin-action="add" data-entity="announcement">New announcement</button>' : ""}</div>
    ${announcements.length ? `<div class="manage-list">${announcements.map(post => `<article class="manage-row"><div class="manage-main"><h2>${e(post.title)}</h2><p>${post.published ? "Published" : "Draft"} · ${e(post.published_at ? new Date(post.published_at).toLocaleDateString() : "Not scheduled")}</p><small>${e(post.body)}</small></div><div class="manage-actions">${mayContent(profile) ? `<button class="button button-quiet button-small" data-admin-action="edit" data-entity="announcement" data-id="${e(post.id)}">Edit</button><button class="button button-danger button-small" data-admin-action="delete" data-entity="announcement" data-id="${e(post.id)}">Delete</button>` : ""}</div></article>`).join("")}</div>` : empty("No announcements yet", "Draft a club update and choose when it becomes public.", '<button class="button button-primary" data-admin-action="add" data-entity="announcement">New announcement</button>')}`;
}

async function membersTab() {
  const profiles = await listMemberships(1000);
  return `<div class="admin-page-heading"><div><p class="eyebrow">Community directory</p><h1>Members</h1><p>Review membership and account status.</p></div><span class="count-label">${profiles.length} members</span></div>
    ${profiles.length ? `<div class="table-wrap"><table class="admin-table"><thead><tr><th>Name and email</th><th>Community</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead><tbody>${profiles.map(person => `<tr><td><strong>${e(person.full_name)}</strong><small>${e(person.email)}</small></td><td>${e(person.community_type || "—")}</td><td>${e(roleName(person.role))}</td><td><span class="status-badge status-${e(person.account_status)}">${e(person.account_status)}</span></td><td>${e(new Date(person.created_at).toLocaleDateString())}</td><td>${memberStatusActions(person)}</td></tr>`).join("")}</tbody></table></div>` : empty("No members have registered", "Membership applications will appear here.")}`;
}

function memberStatusActions(person) {
  if (person.role === "main_admin") return "Protected";
  const restore = `<button data-admin-action="member-status" data-id="${e(person.id)}" data-status="active">Restore access</button>`;
  const ban = `<button data-admin-action="member-status" data-id="${e(person.id)}" data-status="banned">Ban</button>`;
  const restrict = `<button data-admin-action="member-status" data-id="${e(person.id)}" data-status="restricted">Restrict</button>`;
  const statusAction = person.account_status === "banned" ? restore : person.account_status === "restricted" ? restore + ban : restrict + ban;
  return `<div class="table-actions">${statusAction}<button class="danger-text" data-admin-action="delete-member" data-id="${e(person.id)}">Delete</button></div>`;
}

async function requestsTab() {
  const requests = await listAdminRequests();
  return `<div class="admin-page-heading"><div><p class="eyebrow">Role approvals</p><h1>Admin requests</h1><p>Only the Main Admin can grant or revoke administrator access.</p></div></div>
    ${requests.length ? `<div class="manage-list">${requests.map(request => `<article class="request-row"><div><h2>${e(request.likha_profiles?.full_name || "Member")}</h2><p>${e(request.likha_profiles?.email || "")} · ${e(request.likha_profiles?.community_type || "")}</p><blockquote>${e(request.reason)}</blockquote><span class="status-badge status-${e(request.status)}">${e(request.status)}</span></div>${request.status === "pending" ? `<div class="manage-actions"><button class="button button-primary button-small" data-admin-action="review-request" data-id="${e(request.id)}" data-decision="approve">Approve</button><button class="button button-danger button-small" data-admin-action="review-request" data-id="${e(request.id)}" data-decision="reject">Reject</button></div>` : `<small>Reviewed ${e(request.reviewed_at ? new Date(request.reviewed_at).toLocaleDateString() : "")}</small>`}</article>`).join("")}</div>` : empty("No pending requests", "Sub-Admin requests will appear here after a member applies.")}`;
}

async function administratorsTab() {
  const admins = await listAdminProfiles();
  return `<div class="admin-page-heading"><div><p class="eyebrow">Role management</p><h1>Administrators</h1><p>Assign specific permissions to approved Sub-Admins.</p></div></div>
    <div class="permission-summary"><strong>Main Admin</strong><span>Full control of the website, members, appearance, administrators and moderation.</span></div>
    ${admins.length ? `<div class="manage-list">${admins.map(admin => `<article class="manage-row"><div class="manage-main"><h2>${e(admin.full_name)}</h2><p>${e(admin.email)} · ${e(roleName(admin.role))}</p><small>${admin.role === "main_admin" ? "All permissions" : permissionSummary(admin.permissions)}</small></div>${admin.role === "sub_admin" ? `<div class="manage-actions"><button class="button button-quiet button-small" data-admin-action="permissions" data-id="${e(admin.id)}">Edit permissions</button><button class="button button-danger button-small" data-admin-action="revoke-admin" data-id="${e(admin.id)}">Revoke role</button></div>` : "<span class=role-badge>Protected</span>"}</article>`).join("")}</div>` : empty("No administrators", "Approve a member request to add the first Sub-Admin.")}`;
}

async function moderationTab(profile) {
  const [reports, messages] = await Promise.all([listChatReports(), listChatMessages(100)]);
  const userIds = [...new Set(messages.map(message => message.user_id))];
  let members = [];
  if (mayRestrict(profile) && userIds.length) {
    members = await result(supabase.rpc("likha_chat_member_summary", { p_user_ids: userIds }));
  }
  const memberMap = new Map(members.map(person => [person.id, person]));
  return `<div class="admin-page-heading"><div><p class="eyebrow">Community care</p><h1>Chat moderation</h1><p>Review reports and remove content that breaks the community guidelines.</p></div></div>
    <section class="moderation-section"><div class="admin-section-heading"><div><p class="eyebrow">Needs review</p><h2>Open reports</h2></div><span class="count-label">${reports.length} open</span></div>
      ${reports.length ? `<div class="report-list">${reports.map(report => `<article class="report-row"><div><span class="status-badge status-open">Open</span><p><strong>${e(report.reason)}</strong></p><blockquote>${e(report.likha_chat_messages?.body || "Image or sticker report")}</blockquote><small>Reported ${e(new Date(report.created_at).toLocaleString())}</small></div><div class="manage-actions"><button class="button button-danger button-small" data-admin-action="moderate-message" data-id="${e(report.message_id)}">Remove message</button><button class="button button-quiet button-small" data-admin-action="resolve-report" data-id="${e(report.id)}">Dismiss report</button></div></article>`).join("")}</div>` : `<p class="muted-line">No open reports. Messages reported by members will show here.</p>`}
    </section><section class="moderation-section"><div class="admin-section-heading"><div><p class="eyebrow">Recent conversation</p><h2>Recent messages</h2></div></div>
      ${messages.length ? `<div class="manage-list">${messages.map(message => { const person = memberMap.get(message.user_id); return `<article class="manage-row"><div class="manage-main"><h3>${e(message.display_name || "LIKHA member")}</h3><p>${e(message.body || (message.image_path ? "Shared an image" : message.sticker || "Sticker"))}</p><small>${e(new Date(message.created_at).toLocaleString())}${message.moderation_status !== "visible" ? ` · ${e(message.moderation_status)}` : ""}</small></div><div class="manage-actions">${message.moderation_status === "visible" ? `<button class="button button-danger button-small" data-admin-action="moderate-message" data-id="${e(message.id)}">Remove</button>` : ""}${mayRestrict(profile) && person?.account_status !== "banned" ? `<button class="button button-quiet button-small" data-admin-action="member-status" data-id="${e(message.user_id)}" data-status="restricted">Restrict member</button>` : ""}</div></article>`; }).join("")}</div>` : `<p class="muted-line">No chat messages have been posted.</p>`}
    </section>`;
}

async function activityTab() {
  const logs = await result(supabase.from("likha_audit_log").select("id,actor_id,action,entity,entity_id,details,created_at").order("created_at", { ascending: false }).limit(250));
  const actorIds = [...new Set(logs.map(entry => entry.actor_id).filter(Boolean))];
  const actors = actorIds.length ? await result(supabase.from("likha_profiles").select("id,full_name,email").in("id", actorIds)) : [];
  const actorMap = new Map(actors.map(person => [person.id, person]));
  return `<div class="admin-page-heading"><div><p class="eyebrow">Security and accountability</p><h1>Activity log</h1><p>Recent changes made in the LIKHA administration tools.</p></div><span class="count-label">Latest ${logs.length}</span></div>
    ${logs.length ? `<div class="manage-list">${logs.map(entry => {
      const actor = actorMap.get(entry.actor_id);
      const detail = Object.entries(entry.details || {}).map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`).join(" · ");
      return `<article class="manage-row"><div class="manage-main"><h2>${e(entry.action.replaceAll("_", " "))}</h2><p>${e(actor?.full_name || (entry.actor_id ? "Former member" : "System"))} · ${e(entry.entity)}${entry.entity_id ? ` · ${e(entry.entity_id)}` : ""}</p>${detail ? `<small>${e(detail)}</small>` : ""}</div><time datetime="${e(entry.created_at)}">${e(new Date(entry.created_at).toLocaleString())}</time></article>`;
    }).join("")}</div>` : empty("No activity recorded yet", "Administrative changes will appear here.")}`;
}

async function homepageTab() {
  const { data, error } = await supabase.from("likha_home_content").select("*").eq("id", true).single();
  if (error) throw error;
  return `<div class="admin-page-heading"><div><p class="eyebrow">Public introduction</p><h1>Homepage content</h1><p>Edit the words visitors see when they arrive.</p></div></div><form class="admin-form" data-form="home-content"><label>Tagline<input name="tagline" required maxlength="100" value="${e(data.tagline)}"></label><label>Introduction<textarea name="intro" rows="4" maxlength="500" required>${e(data.intro)}</textarea></label><label>Statement band<textarea name="subtitle" rows="2" maxlength="180" required>${e(data.subtitle)}</textarea></label><label>About heading<input name="about_title" maxlength="140" required value="${e(data.about_title)}"></label><label>About paragraph<textarea name="about_body" rows="4" maxlength="800" required>${e(data.about_body)}</textarea></label><label>Membership invitation<textarea name="join_copy" rows="3" maxlength="400" required>${e(data.join_copy)}</textarea></label><p class="form-error" data-form-error role="alert"></p><button class="button button-primary" type="submit">Save homepage</button></form>`;
}

async function appearanceTab() {
  const { data, error } = await supabase.from("likha_site_config").select("*").eq("id", true).single();
  if (error) throw error;
  const theme = data.theme || {};
  return `<div class="admin-page-heading"><div><p class="eyebrow">Visual identity</p><h1>Appearance</h1><p>Adjust public colors, typography, logo and cover artwork.</p></div></div><form class="admin-form appearance-form" data-form="site-appearance"><h2>Color palette</h2><div class="theme-grid">${[["primary", "Primary"], ["secondary", "Secondary"], ["background", "Background"], ["text", "Text"], ["accent", "Accent"], ["button", "Button"], ["nav", "Navigation"]].map(([key, label]) => `<label class="color-field"><span>${label}</span><input name="theme_${key}" type="color" value="${e(theme[key] || "#173a2d")}"><small>${e(theme[key] || "#173a2d")}</small></label>`).join("")}</div><h2>Typography</h2><div class="form-grid"><label>Heading font<select name="theme_headingFont">${["Playfair Display", "Georgia", "DM Sans", "Arial"].map(font => `<option${theme.headingFont === font ? " selected" : ""}>${font}</option>`).join("")}</select></label><label>Body font<select name="theme_bodyFont">${["DM Sans", "Arial", "Georgia", "Playfair Display"].map(font => `<option${theme.bodyFont === font ? " selected" : ""}>${font}</option>`).join("")}</select></label></div><h2>Brand imagery</h2>${imageField("logo_url", "Logo", data.logo_url)}${imageField("cover_url", "Official cover", data.cover_url)}${imageField("background_image_url", "Official background image", data.background_image_url, true)}${imageField("hero_art_url", "Homepage artwork image", data.hero_art_url, true)}<p class="form-error" data-form-error role="alert"></p><button class="button button-primary" type="submit">Save appearance</button></form>`;
}

async function settingsTab() {
  const { data, error } = await supabase.from("likha_site_config").select("school_email_domain,social_links").eq("id", true).single();
  if (error) throw error;
  return `<div class="admin-page-heading"><div><p class="eyebrow">Club configuration</p><h1>Website settings</h1><p>Manage membership validation and public contact links.</p></div></div><form class="admin-form" data-form="site-settings"><label>School email domain <span class="optional">Leave blank until confirmed</span><div class="input-prefix"><span>@</span><input name="school_email_domain" value="${e(data.school_email_domain || "")}" maxlength="100" placeholder="school.edu.ph"></div></label><p class="field-hint">The database checks this domain on registration. Enter only the domain, without the @ sign.</p><label>Facebook page<input name="facebook" type="url" value="${e(data.social_links?.facebook || "")}" maxlength="500"></label><label>Instagram profile<input name="instagram" type="url" value="${e(data.social_links?.instagram || "")}" maxlength="500"></label><label>Messenger community<input name="messenger" type="url" value="${e(data.social_links?.messenger || "")}" maxlength="500"></label><p class="form-error" data-form-error role="alert"></p><button class="button button-primary" type="submit">Save settings</button></form><section class="setup-note"><p class="eyebrow">System status</p><h2>Security model</h2><p>Authentication is handled by Supabase Auth. Database policies enforce member, Sub-Admin and Main Admin access. The service key is used only by the account deletion Edge Function.</p></section>`;
}

export async function handleAdminAction(target, profile, refresh) {
  const action = target.dataset.adminAction;
  const id = target.dataset.id;
  if (action === "refresh") return refresh();
  if (["add", "edit"].includes(action)) return editEntity(target.dataset.entity, action === "edit" ? id : null, refresh);
  if (action === "delete") return deleteEntity(target.dataset.entity, id, refresh);
  if (action === "feature") {
    const work = await result(supabase.from("likha_artworks").select("featured,title").eq("id", id).single());
    await result(supabase.from("likha_artworks").update({ featured: !work.featured }).eq("id", id));
    toast(work.featured ? "Artwork removed from featured." : "Artwork featured on the homepage.");
    return refresh();
  }
  if (action === "review-request") return reviewRequest(id, target.dataset.decision, refresh);
  if (action === "permissions") return editPermissions(id, refresh);
  if (action === "revoke-admin") return revokeAdmin(id, refresh);
  if (action === "member-status") return setMemberStatus(id, target.dataset.status, profile, refresh);
  if (action === "delete-member") return deleteMember(id, refresh);
  if (action === "moderate-message") return confirmAction("Remove this message?", "The message will be hidden from members. The moderation record remains available to administrators.", async () => { await removeChatMessage(id); toast("Message removed."); await refresh(); });
  if (action === "resolve-report") {
    await result(supabase.from("likha_chat_reports").update({ status: "dismissed", reviewed_at: new Date().toISOString() }).eq("id", id));
    toast("Report dismissed.");
    return refresh();
  }
}

async function editEntity(entity, id, refresh) {
  const config = {
    artwork: { table: "likha_artworks", title: "Artwork", load: async () => {
      const [artists, ateliers, record] = await Promise.all([listArtists(), listAteliers(), id ? result(supabase.from("likha_artworks").select("*").eq("id", id).single()) : {}]);
      return { artists, ateliers, record };
    } },
    artist: { table: "likha_artists", title: "Artist", load: async () => ({ record: id ? await result(supabase.from("likha_artists").select("*").eq("id", id).single()) : {} }) },
    atelier: { table: "likha_ateliers", title: "Atelier", load: async () => ({ record: id ? await result(supabase.from("likha_ateliers").select("*").eq("id", id).single()) : {} }) },
    announcement: { table: "likha_announcements", title: "Announcement", load: async () => ({ record: id ? await result(supabase.from("likha_announcements").select("*").eq("id", id).single()) : {} }) }
  }[entity];
  if (!config) return;
  const context = await config.load();
  const record = context.record || {};
  const title = `${id ? "Edit" : "Add"} ${config.title.toLowerCase()}`;
  showDialog({ title, confirm: id ? "Save changes" : `Add ${config.title.toLowerCase()}`, body: entityFields(entity, record, context), onSubmit: async (formData, form) => {
    const save = $("[type=submit]", form);
    const imageKey = entity === "artwork" ? "image_url" : entity === "artist" ? "profile_image_url" : entity === "atelier" ? "cover_image_url" : "image_url";
    const file = formData.get(`${imageKey}_file`);
    let row = entityValues(entity, formData);
    if (file?.size) {
      save.textContent = "Uploading image...";
      let status = $("[data-upload-status]", form);
      if (!status) {
        status = document.createElement("p");
        status.className = "upload-status";
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");
        save.before(status);
      }
      status.textContent = "Uploading image...";
      row[imageKey] = (await uploadPublicImage(file, entity === "artwork" ? "artworks" : entity === "artist" ? "artists" : entity === "atelier" ? "ateliers" : "announcements")).url;
      status.textContent = "Saving changes...";
    }
    if (id) await result(supabase.from(config.table).update(row).eq("id", id));
    else await result(supabase.from(config.table).insert(row));
    toast(`${config.title} saved.`);
    await refresh();
  } });
}

function entityFields(entity, record, context) {
  if (entity === "artwork") return `<label>Title<input name="title" required maxlength="160" value="${e(record.title || "")}"></label><label>Artist<select name="artist_id" required><option value="">Choose artist</option>${(context.artists || []).map(person => `<option value="${e(person.id)}"${record.artist_id === person.id ? " selected" : ""}>${e(person.name)}</option>`).join("")}</select></label><label>Atelier<select name="atelier_id"><option value="">No atelier</option>${(context.ateliers || []).map(room => `<option value="${e(room.id)}"${record.atelier_id === room.id ? " selected" : ""}>${e(room.name)}</option>`).join("")}</select></label><label>Caption<textarea name="caption" rows="3" maxlength="400">${e(record.caption || "")}</textarea></label><label>Details<textarea name="description" rows="4" maxlength="1600">${e(record.description || "")}</textarea></label>${imageField("image_url", "Artwork image", record.image_url, true)}<label class="consent"><input name="featured" type="checkbox"${record.featured ? " checked" : ""}><span>Feature this artwork on the homepage</span></label><p class="form-error" data-form-error role="alert"></p>`;
  if (entity === "artist") return `<label>Name<input name="name" required maxlength="120" value="${e(record.name || "")}"></label><label>Program or course<input name="program" maxlength="100" value="${e(record.program || "")}"></label><label>Biography<textarea name="bio" rows="5" maxlength="1200">${e(record.bio || "")}</textarea></label><label>Artistic interests<input name="interests" maxlength="300" value="${e(record.interests?.join(", ") || "")}" placeholder="Drawing, design, writing"></label><label>Portfolio or social link<input name="external_url" type="url" maxlength="500" value="${e(record.external_url || "")}"></label>${imageField("profile_image_url", "Profile image", record.profile_image_url, true)}<p class="form-error" data-form-error role="alert"></p>`;
  if (entity === "atelier") return `<label>Atelier name<input name="name" required maxlength="100" value="${e(record.name || "")}"></label><label>URL slug<input name="slug" required maxlength="80" value="${e(record.slug || "")}" placeholder="visual-arts"></label><label>Description<textarea name="description" rows="4" maxlength="400">${e(record.description || "")}</textarea></label><label>Display order<input name="sort_order" type="number" min="0" step="1" value="${e(record.sort_order ?? 0)}"></label>${imageField("cover_image_url", "Atelier cover image", record.cover_image_url, true)}<p class="form-error" data-form-error role="alert"></p>`;
  return `<label>Title<input name="title" required maxlength="160" value="${e(record.title || "")}"></label><label>Announcement<textarea name="body" rows="5" maxlength="1600" required>${e(record.body || "")}</textarea></label><label>Details link<input name="link_url" type="url" maxlength="500" value="${e(record.link_url || "")}"></label>${imageField("image_url", "Announcement image", record.image_url, true)}<label class="consent"><input name="published" type="checkbox"${record.published ? " checked" : ""}><span>Publish on the public website</span></label><p class="form-error" data-form-error role="alert"></p>`;
}

function imageField(name, label, current = "", optional = false) {
  return `<fieldset class="image-fieldset" data-image-field><legend>${e(label)}</legend><div class="image-preview" data-image-preview>${current ? `<img src="${e(safeUrl(current))}" alt="Current ${e(label.toLowerCase())} preview">` : "<span>No image selected</span>"}</div><input type="hidden" name="${e(name)}" value="${e(current || "")}"><label class="button button-quiet button-small upload-control">${current ? "Replace image" : "Choose image"}<input type="file" name="${e(name)}_file" accept="image/jpeg,image/png,image/webp" hidden></label>${optional ? `<button type="button" class="text-link" data-clear-image="${e(name)}">Remove image</button>` : ""}<small>JPG, PNG or WebP · Max 8 MB. Transparency is preserved.</small></fieldset>`;
}

function entityValues(entity, data) {
  if (entity === "artwork") return { title: data.get("title").trim(), artist_id: data.get("artist_id"), atelier_id: data.get("atelier_id") || null, caption: data.get("caption").trim(), description: data.get("description").trim(), image_url: data.get("image_url") || null, featured: data.get("featured") === "on" };
  if (entity === "artist") return { name: data.get("name").trim(), program: data.get("program").trim(), bio: data.get("bio").trim(), interests: data.get("interests").split(",").map(item => item.trim()).filter(Boolean), external_url: data.get("external_url").trim() || null, profile_image_url: data.get("profile_image_url") || null };
  if (entity === "atelier") return { name: data.get("name").trim(), slug: slugify(data.get("slug")), description: data.get("description").trim(), sort_order: Number(data.get("sort_order") || 0), cover_image_url: data.get("cover_image_url") || null };
  return { title: data.get("title").trim(), body: data.get("body").trim(), link_url: data.get("link_url").trim() || null, image_url: data.get("image_url") || null, published: data.get("published") === "on", published_at: data.get("published") === "on" ? new Date().toISOString() : null };
}

async function deleteEntity(entity, id, refresh) {
  const config = { artwork: ["likha_artworks", "artwork"], artist: ["likha_artists", "artist"], atelier: ["likha_ateliers", "atelier"], announcement: ["likha_announcements", "announcement"] }[entity];
  if (!config || !window.confirm(`Delete this ${config[1]}? Related items may no longer appear in the public gallery.`)) return;
  await result(supabase.from(config[0]).delete().eq("id", id));
  toast(`${config[1][0].toUpperCase()}${config[1].slice(1)} deleted.`);
  await refresh();
}

async function reviewRequest(id, decision, refresh) {
  if (decision === "reject") return confirmAction("Reject this request?", "The applicant will not receive administrator access.", async () => {
    await result(supabase.rpc("likha_review_admin_request", { p_request_id: id, p_approved: false, p_permissions: {} }));
    toast("Request rejected."); await refresh();
  }, "Reject request");
  const body = `<p>This grants Sub-Admin access. Choose the permissions for this administrator.</p><label class="consent"><input type="checkbox" name="content" checked><span>Manage artworks, artists, ateliers and announcements</span></label><label class="consent"><input type="checkbox" name="moderate_chat" checked><span>Moderate open chat and reports</span></label><label class="consent"><input type="checkbox" name="restrict_users"><span>Restrict member chat access</span></label><p class="form-error" data-form-error role="alert"></p>`;
  showDialog({ title: "Approve Sub-Admin request", confirm: "Approve access", body, onSubmit: async data => {
    const permissions = { content: data.get("content") === "on", moderate_chat: data.get("moderate_chat") === "on", restrict_users: data.get("restrict_users") === "on" };
    await result(supabase.rpc("likha_review_admin_request", { p_request_id: id, p_approved: true, p_permissions: permissions }));
    toast("Sub-Admin access approved."); await refresh();
  } });
}

async function editPermissions(id, refresh) {
  const admin = await result(supabase.from("likha_profiles").select("full_name,permissions").eq("id", id).single());
  const p = admin.permissions || {};
  const body = `<p>Set the areas this Sub-Admin can manage. Database permissions update when you save.</p>${[["content", "Manage artworks, artists, ateliers and announcements"], ["moderate_chat", "Moderate open chat and reports"], ["restrict_users", "Restrict member chat access"]].map(([key, label]) => `<label class="consent"><input type="checkbox" name="${key}"${p[key] ? " checked" : ""}><span>${label}</span></label>`).join("")}<p class="form-error" data-form-error role="alert"></p>`;
  showDialog({ title: `Permissions for ${admin.full_name}`, confirm: "Save permissions", body, onSubmit: async data => {
    const permissions = Object.fromEntries(["content", "moderate_chat", "restrict_users"].map(key => [key, data.get(key) === "on"]));
    await result(supabase.rpc("likha_set_admin_permissions", { p_user_id: id, p_permissions: permissions }));
    toast("Permissions updated."); await refresh();
  } });
}

async function revokeAdmin(id, refresh) {
  return confirmAction("Revoke Sub-Admin access?", "This account returns to the member role and loses all administrator permissions.", async () => {
    await result(supabase.rpc("likha_set_admin_permissions", { p_user_id: id, p_permissions: { content: false, moderate_chat: false, restrict_users: false }, p_revoke: true }));
    toast("Administrator access revoked."); await refresh();
  }, "Revoke access");
}

async function setMemberStatus(id, status, profile, refresh) {
  const label = status === "banned" ? "ban" : status === "restricted" ? "restrict" : "restore access for";
  return confirmAction(`${label[0].toUpperCase()}${label.slice(1)} this member?`, "The change takes effect immediately for chat and member access.", async () => {
    await result(supabase.rpc("likha_set_member_status", { p_user_id: id, p_status: status }));
    toast(status === "active" ? "Member access restored." : `Member ${status}.`); await refresh();
  }, status === "active" ? "Restore access" : `Confirm ${status}`);
}

async function deleteMember(id, refresh) {
  return confirmAction("Permanently delete this account?", "This removes the member's Supabase Auth account and related profile. This cannot be undone.", async () => {
    const { error } = await supabase.functions.invoke("admin-delete-user", { body: { userId: id } });
    if (error) throw error;
    toast("Member account deleted."); await refresh();
  }, "Permanently delete");
}

function confirmAction(title, detail, onSubmit, confirm = "Confirm") {
  showDialog({ title, confirm, danger: true, body: `<p>${e(detail)}</p><p class="form-error" data-form-error role="alert"></p>`, onSubmit });
}

export async function handleAdminForm(form, profile, afterSave) {
  const data = new FormData(form);
  if (form.dataset.form === "home-content") {
    const row = Object.fromEntries(["tagline", "intro", "subtitle", "about_title", "about_body", "join_copy"].map(key => [key, String(data.get(key) || "").trim()]));
    await result(supabase.from("likha_home_content").update(row).eq("id", true));
  } else if (form.dataset.form === "site-appearance") {
    const current = await result(supabase.from("likha_site_config").select("*").eq("id", true).single());
    const theme = { ...current.theme };
    for (const key of ["primary", "secondary", "background", "text", "accent", "button", "nav", "headingFont", "bodyFont"]) theme[key] = data.get(`theme_${key}`);
    const row = { theme };
    let status;
    for (const key of ["logo_url", "cover_url", "background_image_url", "hero_art_url"]) {
      const file = data.get(`${key}_file`);
      const value = data.get(key);
      if (file?.size) {
        status ||= form.querySelector("[data-upload-status]") || (() => {
          const node = document.createElement("p");
          node.className = "upload-status";
          node.setAttribute("data-upload-status", "");
          node.setAttribute("role", "status");
          node.setAttribute("aria-live", "polite");
          form.querySelector("[type=submit]")?.before(node);
          return node;
        })();
        status.textContent = "Uploading brand image...";
        row[key] = (await uploadPublicImage(file, "branding")).url;
      } else row[key] = value || null;
    }
    if (status) status.textContent = "Saving appearance...";
    await result(supabase.from("likha_site_config").update(row).eq("id", true));
  } else if (form.dataset.form === "site-settings") {
    const current = await result(supabase.from("likha_site_config").select("social_links").eq("id", true).single());
    const domain = String(data.get("school_email_domain") || "").trim().replace(/^@/, "").toLowerCase();
    if (domain && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) throw new Error("Enter a valid email domain without @.");
    const social = Object.fromEntries(["facebook", "instagram", "messenger"].map(key => [key, String(data.get(key) || "").trim()]));
    for (const value of Object.values(social)) if (value && !/^https:\/\//i.test(value)) throw new Error("Community links must start with https://.");
    await result(supabase.from("likha_site_config").update({ school_email_domain: domain || null, social_links: { ...current.social_links, ...social } }).eq("id", true));
  }
  toast("Changes saved.");
  await afterSave();
}

export function handleImagePreview(input) {
  const host = input.closest("[data-image-field]");
  if (!host) return;
  const preview = host.querySelector("[data-image-preview]");
  const file = input.files?.[0];
  if (!preview) return;
  if (!file) return;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) {
    toast(file.size > 8 * 1024 * 1024 ? "Choose an image smaller than 8 MB." : "Choose a JPG, PNG or WebP image.", "error");
    input.value = "";
    return;
  }
  preview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Selected image preview">`;
}

export function clearImage(button) {
  const field = button.closest("[data-image-field]");
  if (!field) return;
  const key = button.dataset.clearImage;
  const hidden = field.querySelector(`input[type=hidden][name="${key}"]`);
  if (hidden) hidden.value = "";
  const file = field.querySelector("input[type=file]");
  if (file) file.value = "";
  field.querySelector("[data-image-preview]").innerHTML = "<span>No image selected</span>";
}

export async function handleSiteForm(form, afterSave) {
  const { data: current, error } = await supabase.from("likha_site_config").select("social_links").eq("id", true).single();
  if (error) throw error;
  const data = new FormData(form);
  const domain = String(data.get("school_email_domain") || "").trim().replace(/^@/, "").toLowerCase();
  const social = Object.fromEntries(["facebook", "instagram", "messenger"].map(key => [key, String(data.get(key) || "").trim()]));
  if (domain && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) throw new Error("Enter a valid school domain without @.");
  if (Object.values(social).some(value => value && !/^https:\/\//i.test(value))) throw new Error("Community links must start with https://.");
  await result(supabase.from("likha_site_config").update({ school_email_domain: domain || null, social_links: { ...current.social_links, ...social } }).eq("id", true));
  toast("Website settings saved."); await afterSave();
}

function empty(title, detail, action = "") { return `<div class="admin-empty"><strong>${e(title)}</strong><p>${e(detail)}</p>${action}</div>`; }
function permissionLabel(key) { return ({ content: "Content management", moderate_chat: "Chat moderation", restrict_users: "Member restrictions" })[key] || key; }
function permissionSummary(p = {}) { return Object.keys(p).filter(key => p[key]).map(permissionLabel).join(" · ") || "No extra permissions"; }
function slugify(value) { return String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function $(selector, root = document) { return root.querySelector(selector); }
