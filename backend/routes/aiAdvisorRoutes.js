const express = require("express");
const { generateAiExplanation, getRagContext } = require("../aiAdvisor/explanation");
const { buildProfileFromAnswers, getDisplayProfile } = require("../aiAdvisor/profile");
const { publicAdvisorQuestions, PREFER_NOT_TO_ANSWER } = require("../aiAdvisor/questions");
const { getRecommendations } = require("../aiAdvisor/recommender");

function createAiAdvisorRouter({ getSchools, requireAuth }) {
  const router = express.Router();

  router.get("/ai-advisor/questions", requireAuth, (_req, res) => {
    res.json({
      questions: publicAdvisorQuestions(),
      preferNotToAnswer: PREFER_NOT_TO_ANSWER,
    });
  });

  router.post("/ai-advisor/recommend", requireAuth, async (req, res) => {
    const limit = Math.min(Math.max(Number.parseInt(req.body?.limit, 10) || 12, 6), 18);

    try {
      const rawProfile = Array.isArray(req.body?.answers)
        ? buildProfileFromAnswers(req.body.answers)
        : req.body?.profile || {};
      const savedLists = req.body?.savedLists || {};
      const result = getRecommendations(getSchools(), rawProfile, limit, { savedLists });
      const ragContext = getRagContext(result.recommendations, savedLists);
      const aiResult = await generateAiExplanation(result.profile, result.recommendations, ragContext);

      res.json({
        profile: result.profile,
        displayProfile: getDisplayProfile(result.profile),
        recommendations: result.recommendations,
        ragContext,
        aiExplanation: aiResult.explanation,
        aiPowered: aiResult.aiPowered,
      });
    } catch (error) {
      console.error("AI advisor recommendation failed:", error);
      res.status(500).json({ error: "Failed to generate AI recommendations." });
    }
  });

  return router;
}

module.exports = {
  createAiAdvisorRouter,
};
