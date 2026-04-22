const express = require("express");

const defaultProfile = {
  personal: {},
  academics: {},
  preferences: {},
};

function cleanObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [key, typeof item === "string" ? item.trim().slice(0, 1000) : item])
      .filter(([, item]) => item !== undefined && item !== null)
  );
}

function normalizeProfilePayload(body = {}) {
  return {
    personal: cleanObject(body.personal),
    academics: cleanObject(body.academics),
    preferences: cleanObject(body.preferences),
  };
}

function rowToProfile(row) {
  if (!row) {
    return defaultProfile;
  }

  return {
    personal: row.personal_info || {},
    academics: row.academics || {},
    preferences: row.preferences || {},
    updatedAt: row.updated_at,
  };
}

function createStudentProfileRouter({ supabaseAdmin, requireAuth }) {
  const router = express.Router();

  router.get("/student-profile", requireAuth, async (req, res) => {
    if (!supabaseAdmin) {
      res.status(500).json({ error: "Supabase service client is not configured." });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("student_profiles")
      .select("personal_info, academics, preferences, updated_at")
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: "Failed to load student profile." });
      return;
    }

    res.json(rowToProfile(data));
  });

  router.put("/student-profile", requireAuth, async (req, res) => {
    if (!supabaseAdmin) {
      res.status(500).json({ error: "Supabase service client is not configured." });
      return;
    }

    const profile = normalizeProfilePayload(req.body);
    const { data, error } = await supabaseAdmin
      .from("student_profiles")
      .upsert(
        {
          user_id: req.user.id,
          personal_info: profile.personal,
          academics: profile.academics,
          preferences: profile.preferences,
        },
        { onConflict: "user_id" }
      )
      .select("personal_info, academics, preferences, updated_at")
      .single();

    if (error) {
      res.status(500).json({ error: "Failed to save student profile." });
      return;
    }

    res.json(rowToProfile(data));
  });

  return router;
}

module.exports = {
  createStudentProfileRouter,
};
