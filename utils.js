import { supabase } from "./supabase.js";

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

export function safeUrl(value) {
  try {
    const url = new URL(value, location.href);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

export function dateLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function toast(message, kind = "") {
  const host = $("#toasts");
  if (!host) return;
  const item = document.createElement("div");
  item.className = `toast ${kind}`;
  item.setAttribute("role", kind === "error" ? "alert" : "status");
  item.textContent = message;
  host.append(item);
  window.setTimeout(() => item.remove(), 5200);
}

export function pageLoading(label = "Loading...") {
  return `<div class="page-loading" role="status"><span class="spinner" aria-hidden="true"></span><span>${escapeHtml(label)}</span></div>`;
}

export function emptyState(title, detail, action = "") {
  return `<div class="empty-state"><span class="empty-mark" aria-hidden="true">L</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(detail)}</p>${action}</div>`;
}

export function validateImage(file, limit = 8 * 1024 * 1024) {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) throw new Error("Choose a JPG, PNG or WebP image.");
  if (file.size > limit) throw new Error("Choose an image smaller than 8 MB.");
}

export async function uploadPublicImage(file, folder) {
  validateImage(file);
  const extension = file.name.split(".").pop().toLowerCase();
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { data, error } = await supabase.storage.from("likha-site-media").upload(path, file, {
    cacheControl: "3600", upsert: false, contentType: file.type
  });
  if (error) throw error;
  return { path: data.path, url: supabase.storage.from("likha-site-media").getPublicUrl(data.path).data.publicUrl };
}

export function showDialog({ title, body, confirm = "Save", danger = false, onSubmit }) {
  const dialog = $("#global-dialog");
  dialog.innerHTML = `<form method="dialog" class="dialog-panel" novalidate>
    <div class="dialog-head"><h2 id="dialog-title">${escapeHtml(title)}</h2><button class="icon-button" type="button" data-dialog-close aria-label="Close dialog">×</button></div>
    <div class="dialog-content">${body}</div>
    <div class="dialog-actions"><button class="button button-quiet" type="button" data-dialog-close>Cancel</button><button class="button ${danger ? "button-danger" : "button-primary"}" type="submit">${escapeHtml(confirm)}</button></div>
  </form>`;
  const form = $("form", dialog);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const submit = $("[type=submit]", form);
    submit.disabled = true;
    submit.textContent = "Saving...";
    try {
      const done = await onSubmit?.(new FormData(form), form);
      if (done !== false) dialog.close();
    } catch (error) {
      const uploadStatus = form.querySelector(".upload-status");
      if (uploadStatus) uploadStatus.textContent = "";
      const feedback = $("[data-form-error]", form);
      if (feedback) feedback.textContent = error.message || "That action could not be completed.";
      else toast(error.message || "That action could not be completed.", "error");
      submit.disabled = false;
      submit.textContent = confirm;
    }
  });
  dialog.querySelectorAll("[data-dialog-close]").forEach(button => button.addEventListener("click", () => dialog.close()));
  dialog.showModal();
  $("input:not([type=hidden]), textarea, select", form)?.focus();
}

export function imagePreview(file, alt = "Selected image preview") {
  const source = file ? URL.createObjectURL(file) : "";
  return source ? `<img src="${source}" alt="${escapeHtml(alt)}">` : "";
}
