import { supabase } from "./supabase";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const emptyProfile = {
  personal: {},
  academics: {},
  preferences: {},
};

function apiUrl(path) {
  return `${apiBaseUrl}${path}`;
}

async function getAuthHeaders() {
  if (!supabase) {
    return {};
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readJsonResponse(response, label) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    const preview = text.trim().slice(0, 80);
    throw new Error(`${label} returned ${response.status} ${contentType || "unknown content type"}: ${preview}`);
  }

  return response.json();
}

export async function loadStudentProfile() {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(apiUrl("/api/student-profile"), {
    headers: authHeaders,
  });

  if (!response.ok) {
    throw new Error(`Failed to load student profile: ${response.status}`);
  }

  return readJsonResponse(response, "Student profile API");
}

export async function saveStudentProfile(profile) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(apiUrl("/api/student-profile"), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({
      ...emptyProfile,
      ...profile,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save student profile: ${response.status}`);
  }

  return readJsonResponse(response, "Student profile API");
}

export { emptyProfile };
