function summarizeSavedLists(savedLists = {}) {
  return Object.entries(savedLists).map(([category, schools]) => ({
    category,
    schools: Array.isArray(schools) ? schools : [],
  }));
}

function getRagContext(recommendations, savedLists = {}) {
  return {
    savedCollegeList: summarizeSavedLists(savedLists),
    recommendationContext: recommendations.slice(0, 8).map((entry) => ({
      schoolName: entry.school.name,
      location: entry.school.location,
      rank: entry.school.rank,
      acceptanceRate: entry.school.acceptanceRate,
      tuition: entry.school.tuition,
      satRange: entry.school.satRange,
      content: String(entry.school.description || "").slice(0, 900),
    })),
  };
}

function buildFallbackExplanation(profile, recommendations) {
  const grouped = recommendations.reduce((acc, entry) => {
    acc[entry.category] = acc[entry.category] || [];
    acc[entry.category].push(entry.school.name);
    return acc;
  }, {});

  return [
    "I ranked these schools by combining academic match, major signals, location, budget, size, and stated preferences.",
    `Reach: ${(grouped.Reach || []).slice(0, 3).join(", ") || "None in the top list"}.`,
    `Target: ${(grouped.Target || []).slice(0, 3).join(", ") || "None in the top list"}.`,
    `Likely: ${(grouped.Likely || []).slice(0, 3).join(", ") || "None in the top list"}.`,
    profile.intendedMajors.length
      ? `Major interest used: ${profile.intendedMajors.join(", ")}.`
      : "Major fit is weighted lightly because no intended major was provided.",
  ].join(" ");
}

function extractResponseText(responseData) {
  if (responseData.output_text) {
    return responseData.output_text;
  }

  const parts = [];
  for (const item of responseData.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n").trim();
}

async function generateAiExplanation(profile, recommendations, ragContext) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      aiPowered: false,
      explanation: buildFallbackExplanation(profile, recommendations),
    };
  }

  const compactRecommendations = recommendations.map((entry) => ({
    school: entry.school.name,
    category: entry.category,
    fitScore: entry.fitScore,
    location: entry.school.location,
    rank: entry.school.rank,
    acceptanceRate: entry.school.acceptanceRate,
    tuition: entry.school.tuition,
    satRange: entry.school.satRange,
    reasons: entry.reasons,
    risks: entry.risks,
  }));

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.AI_ADVISOR_MODEL || "gpt-5-mini",
      instructions:
        "You are Pathfinder AI Advisor, a college planning assistant. Explain recommendations using only the provided profile, ranked results, and retrieved school context. Be practical, concise, and transparent that recommendations are estimates, not admissions guarantees. Do not invent admissions facts.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(
                {
                  task: "Explain this personalized college recommendation list in 5-8 concise bullet points. Include list balance, strongest matches, watch-outs, and what information would improve the next pass.",
                  studentProfile: profile,
                  recommendations: compactRecommendations,
                  retrievedContext: ragContext,
                },
                null,
                2
              ),
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  return {
    aiPowered: true,
    explanation: extractResponseText(data) || buildFallbackExplanation(profile, recommendations),
  };
}

module.exports = {
  generateAiExplanation,
  getRagContext,
};
