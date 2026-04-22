import { supabase } from "./supabase";

const emptyProfile = {
  personal: {},
  academics: {},
  preferences: {},
};

async function getAuthHeaders() {
  if (!supabase) {
    return {};
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function loadStudentProfile() {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/student-profile", {
    headers: authHeaders,
  });

  if (!response.ok) {
    throw new Error(`Failed to load student profile: ${response.status}`);
  }

  return response.json();
}

export async function saveStudentProfile(profile) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch("/api/student-profile", {
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

  return response.json();
}

export { emptyProfile };
