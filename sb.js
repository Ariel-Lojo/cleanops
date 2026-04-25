const SB_URL = "https://shqhpmvqwsnvbmxytnon.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNocWhwbXZxd3NudmJteHl0bm9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwODY2NDYsImV4cCI6MjA5MjY2MjY0Nn0.uHO92kKB5SkU17G9cQDLGqwWHSTWUqWcRysumRrB9tE";

const h = {
  "Content-Type": "application/json",
  "apikey": SB_KEY,
  "Authorization": `Bearer ${SB_KEY}`,
  "Prefer": "return=representation"
};

export async function sbGet(table, params = "") {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, { headers: h });
  return r.ok ? r.json() : [];
}

export async function sbPost(table, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, { method: "POST", headers: h, body: JSON.stringify(body) });
  return r.ok ? r.json() : null;
}

export async function sbPatch(table, params, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, { method: "PATCH", headers: h, body: JSON.stringify(body) });
  return r.ok;
}

export async function sbDelete(table, params) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${params}`, { method: "DELETE", headers: h });
  return r.ok;
}

export async function uploadImage(file) {
  const ext = file.name.split(".").pop();
  const path = `tasks/${Date.now()}.${ext}`;
  const r = await fetch(`${SB_URL}/storage/v1/object/task-images/${path}`, {
    method: "POST",
    headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": file.type },
    body: file,
  });
  if (r.ok) return `${SB_URL}/storage/v1/object/public/task-images/${path}`;
  return new Promise(res => {
    const fr = new FileReader();
    fr.onload = e => res(e.target.result);
    fr.readAsDataURL(file);
  });
}

export const getWA = () => localStorage.getItem("cop_wa") || "5521972579717";
export const getAdminPass = () => localStorage.getItem("cop_pass") || "admin1234";
