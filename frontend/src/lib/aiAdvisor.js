import { supabase } from "./supabase";

async function getAuthHeaders() {
  if (!supabase) {
    return {};
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function generateRecommendations(profile) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/ai-advisor/recommend", {
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

  return response.json();
}

export async function loadAdvisorQuestions() {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/ai-advisor/questions", {
    headers: authHeaders,
  });

  if (!response.ok) {
    throw new Error(`Failed to load advisor questions: ${response.status}`);
  }

  return response.json();
}
