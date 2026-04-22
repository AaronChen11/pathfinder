import { supabase } from "./supabase";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

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

export async function generateRecommendations(profile) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(apiUrl("/api/ai-advisor/recommend"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({
      answers: profile.answers || [],
      profile: profile.profile || undefined,
      savedLists: profile.savedLists || {},
      limit: 12,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate recommendations: ${response.status}`);
  }

  return readJsonResponse(response, "AI advisor recommendations API");
}

export async function loadAdvisorQuestions() {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(apiUrl("/api/ai-advisor/questions"), {
    headers: authHeaders,
  });

  if (!response.ok) {
    throw new Error(`Failed to load advisor questions: ${response.status}`);
  }

  return readJsonResponse(response, "AI advisor questions API");
}
