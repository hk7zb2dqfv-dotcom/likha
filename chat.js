import { result, supabase } from "./supabase.js";
import { escapeHtml as e, safeUrl } from "./utils.js";

const stickers = ["🎨", "🖌️", "🖍️", "🌼", "🪷", "✨", "💚", "🧡", "🫶", "🖼️", "📚", "✍️"];

async function signedImage(path) {
  if (!path) return "";
  const { data, error } = await supabase.storage.from("likha-chat-media").createSignedUrl(path, 10 * 60);
  return error ? "" : safeUrl(data.signedUrl);
}

function messageMarkup(message, imageUrl, currentUser, canModerate) {
  const mine = message.user_id === currentUser;
  return `<article class="chat-message ${mine ? "is-mine" : ""}" data-message-id="${e(message.id)}">
    <div class="message-meta"><strong>${e(message.display_name || "LIKHA member")}</strong><time datetime="${e(message.created_at)}">${e(new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }))}</time></div>
    ${message.body ? `<p>${e(message.body)}</p>` : ""}${message.sticker ? `<p class="chat-sticker" aria-label="Sticker">${e(message.sticker)}</p>` : ""}
    ${imageUrl ? `<a class="chat-image-link" href="${e(imageUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open shared image in a new tab"><img src="${e(imageUrl)}" alt="Image shared in the LIKHA chat" loading="lazy"></a>` : ""}
    <div class="message-actions">${canModerate ? `<button type="button" data-action="moderate-message" data-id="${e(message.id)}">Remove</button>` : `<button type="button" data-action="report-message" data-id="${e(message.id)}"${mine ? " hidden" : ""}>Report</button>`}</div>
  </article>`;
}

export async function renderChat(profile) {
  if (!profile) return `<main id="main" tabindex="-1"><section class="page-heading"><div class="wrap"><p class="eyebrow">LIKHA community</p><h1>Open chat</h1><p>Sign in to join the conversation. New here? Registration is open to students, faculty and staff.</p><div class="hero-actions"><a class="button button-primary" href="#/login">Sign in</a><a class="button button-outline-dark" href="#/join">Join LIKHA</a></div></div></section></main>`;
  if (profile.membership_status !== "active") return `<main id="main" tabindex="-1"><section class="section wrap">${emptyState("Membership access is not active", "Contact the LIKHA team if you think this is a mistake.")}</section></main>`;
  if (profile.account_status === "banned") return `<main id="main" tabindex="-1"><section class="section wrap">${emptyState("Chat access is unavailable", "Your account cannot access the LIKHA community chat. Contact a club administrator if you need help.")}</section></main>`;

  const name = profile.display_name || "";
  if (!name) return `<main id="main" tabindex="-1"><section class="section wrap chat-name-step"><p class="eyebrow">One last detail</p><h1>Choose your chat name</h1><p>It is the name other LIKHA members will see in the open chat.</p><form data-form="display-name"><label>Display name<input name="display_name" required maxlength="40" value="${e(profile.full_name || "")}" autocomplete="nickname"></label><p class="form-error" data-form-error role="alert"></p><button class="button button-primary" type="submit">Enter the chat</button></form></section></main>`;

  const messages = await renderedMessages(profile);
  const locked = profile.account_status === "restricted";
  return `<main id="main" tabindex="-1"><section class="chat-shell wrap">
    <div class="chat-heading"><div><p class="eyebrow">LIKHA community</p><h1>Open chat</h1><p>Share what you're making. Keep it kind.</p></div><div class="chat-user"><span class="online-dot" aria-hidden="true"></span><span>${e(name)}</span><a href="#/account" aria-label="Edit chat profile">Edit</a></div></div>
    ${locked ? `<p class="chat-notice" role="status">Your account is restricted to reading messages for now.</p>` : ""}
    <div class="chat-panel"><div class="chat-rules"><span>Community guidelines</span><span>Be respectful · Share thoughtfully · No personal information</span></div>
      <div class="chat-feed" id="chat-feed" role="log" aria-label="Open chat messages" aria-live="polite" aria-relevant="additions text">${messages || `<div class="chat-empty"><span aria-hidden="true">✦</span><p>No messages yet. Start the conversation.</p></div>`}</div>
      ${locked ? "" : `<form class="chat-composer" data-form="chat"><div class="chat-tools"><div class="sticker-picker" aria-label="Choose a sticker">${stickers.map(sticker => `<button type="button" data-action="sticker" data-value="${e(sticker)}" aria-label="Send ${e(sticker)} sticker">${e(sticker)}</button>`).join("")}</div><label class="button button-quiet button-small upload-control">Add image<input type="file" name="image" accept="image/jpeg,image/png,image/webp" hidden></label></div>
        <div class="chat-image-preview" data-chat-preview hidden></div><input type="hidden" name="sticker"><label class="sr-only" for="chat-message">Message</label><div class="chat-compose-row"><textarea id="chat-message" name="body" rows="1" maxlength="1000" placeholder="Write a message..." aria-describedby="chat-help"></textarea><button class="button button-primary" type="submit">Send</button></div><small id="chat-help">Messages are visible to signed-in LIKHA members.</small><p class="form-error" data-form-error role="alert"></p></form>`}
    </div><p class="chat-footnote">Repeated harmful behavior may lead to account restrictions.</p>
  </section></main>`;
}

export async function renderedMessages(profile) {
  const rows = await result(supabase.from("likha_chat_messages").select("*").order("created_at", { ascending: false }).limit(80));
  const canModerate = profile.role === "main_admin" || (profile.role === "sub_admin" && profile.permissions?.moderate_chat);
  const rendered = await Promise.all(rows.reverse().map(async message => messageMarkup(message, await signedImage(message.image_path), profile.id, canModerate)));
  return rendered.join("");
}

export function subscribeChat(onChange) {
  const channel = supabase.channel(`likha-chat-${crypto.randomUUID()}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "likha_chat_messages" }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export async function sendChatMessage({ profile, body, sticker, file }) {
  let imagePath = null;
  if (file) {
    const { validateImage } = await import("./utils.js");
    validateImage(file);
    const extension = file.name.split(".").pop().toLowerCase();
    imagePath = `${profile.id}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("likha-chat-media").upload(imagePath, file, {
      cacheControl: "3600", upsert: false, contentType: file.type
    });
    if (error) throw error;
  }
  return result(supabase.from("likha_chat_messages").insert({ body: body.trim(), sticker: sticker || null, image_path: imagePath }).select().single());
}

export const reportMessage = (messageId, reason) => result(
  supabase.from("likha_chat_reports").insert({ message_id: messageId, reason }).select().single()
);

export const removeChatMessage = (messageId) => result(
  supabase.from("likha_chat_messages").update({ moderation_status: "removed" }).eq("id", messageId).select().single()
);

export function emptyState(title, detail) {
  return `<div class="empty-state"><span class="empty-mark" aria-hidden="true">L</span><h2>${e(title)}</h2><p>${e(detail)}</p></div>`;
}
