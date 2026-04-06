import { supabase } from "./supabase";

const listsTableName = import.meta.env.VITE_SUPABASE_LISTS_TABLE || "user_saved_schools";

function emptyLists() {
  return {
    Target: [],
    Reach: [],
    Safety: [],
  };
}

function normalizeCategory(value) {
  return value === "Reach" || value === "Safety" ? value : "Target";
}

export function buildListsFromRows(rows) {
  const lists = emptyLists();

  for (const row of rows || []) {
    const category = normalizeCategory(row.category);
    const schoolName = row.school_name || row.schoolName;
    if (!schoolName) {
      continue;
    }

    lists[category].push(schoolName);
  }

  return lists;
}

export async function loadUserLists(userId) {
  if (!supabase || !userId) {
    return emptyLists();
  }

  const { data, error } = await supabase
    .from(listsTableName)
    .select("school_name, category")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return buildListsFromRows(data);
}

export async function saveSchoolToCategory(userId, schoolName, category) {
  if (!supabase || !userId || !schoolName) {
    return;
  }

  const { error } = await supabase.from(listsTableName).upsert(
    {
      user_id: userId,
      school_name: schoolName,
      category: normalizeCategory(category),
    },
    {
      onConflict: "user_id,school_name",
      ignoreDuplicates: false,
    }
  );

  if (error) {
    throw error;
  }
}

export async function deleteSchoolFromCategory(userId, schoolName) {
  if (!supabase || !userId || !schoolName) {
    return;
  }

  const { error } = await supabase.from(listsTableName).delete().eq("user_id", userId).eq("school_name", schoolName);
  if (error) {
    throw error;
  }
}

export async function clearUserLists(userId) {
  if (!supabase || !userId) {
    return;
  }

  const { error } = await supabase.from(listsTableName).delete().eq("user_id", userId);
  if (error) {
    throw error;
  }
}
