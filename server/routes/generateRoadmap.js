
const express = require("express");
const router = express.Router();

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

router.post("/", async (req, res) => {
  try {
    const { goal, interests, strengths } = req.body || {};

    // Validate the required information.
    if (
      typeof goal !== "string" ||
      !goal.trim() ||
      !Array.isArray(interests) ||
      !Array.isArray(strengths) ||
      interests.length === 0 ||
      strengths.length === 0
    ) {
      return res.status(400).json({
        error:
          "Please provide your career goal, interests, and strengths.",
      });
    }

    const cleanList = (items) =>
      items
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 20);

    const userInterests = cleanList(interests);
    const userStrengths = cleanList(strengths);
    const careerGoal = goal.trim();

    if (!userInterests.length || !userStrengths.length) {
      return res.status(400).json({
        error: "Please select valid interests and strengths.",
      });
    }

    const prompt = `
Create a comprehensive, personalized career roadmap for:
CAREER GOAL: ${careerGoal}

USER'S SELECTED INTERESTS:
${userInterests.map((item) => `- ${item}`).join("\n")}

USER'S IDENTIFIED STRENGTHS:
${userStrengths.map((item) => `- ${item}`).join("\n")}

IMPORTANT PERSONALIZATION RULES:
1. Use the interests and strengths provided above throughout the roadmap.
2. Do not ask the user to repeat information already provided.
3. Do not claim that the user has skills or experience that they have
   not provided. Clearly distinguish known strengths from skills to learn.
4. If some background information is missing, state reasonable
   assumptions and proceed instead of stopping to ask questions.
5. Make recommendations specific to the chosen career, not generic
   advice that could apply to every profession.
6. Recommend realistic, actionable steps in a logical learning order.
7. Include free or accessible learning resources wherever possible.
8. Avoid guaranteeing jobs, salaries, or specific career outcomes.

OUTPUT FORMAT:

# 1. Personalized Career Analysis
Explain the career goal, how the user's interests align with it, and
how their strengths can help.

# 2. Current Strengths and Skill Gap Analysis
Identify how the stated strengths can be used and which additional
skills are needed. Do not assume unknown skills.

# 3. Complete Learning Roadmap
Divide the roadmap into sequential phases with realistic durations.
For each phase, specify:
- Skills and topics to learn
- Practical activities and exercises
- A project or measurable deliverable
- Free learning resources or official documentation
- A clear completion milestone

Adapt the phases to the selected career and the user's known strengths.

# 4. Hands-on Projects
Recommend at least three progressively challenging projects relevant
to the career. Explain their purpose, core features, and skills practiced.

# 5. Weekly Execution Plan
Provide a practical example weekly schedule with learning, practice,
project work, and revision. State any assumptions about available time.

# 6. Portfolio and Practical Experience
Explain how to demonstrate skills through projects, GitHub, a portfolio,
or other relevant work samples.

# 7. Career Preparation
Include relevant resume preparation, interview practice, and job-search
steps for the chosen career, where applicable.

# 8. Progress Tracking and Next Actions
Provide measurable milestones, a progress checklist, and five concrete
actions the user can start with.

# 9. Final Recommendations
Summarize the highest-priority skills, common mistakes to avoid, and
how to adapt the roadmap as the user progresses.

Write a detailed but readable roadmap with clear headings, numbered
steps, and bullet points. Be specific, practical, realistic, and
consistent with the user's supplied interests and strengths.
`;

    if (!process.env.OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY is not configured.");

      return res.status(500).json({
        error: "AI service configuration is missing.",
      });
    }

    console.log("OpenRouter roadmap request initiated.");

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://trajectai-client.vercel.app",
          "X-Title": "TrajectAI",
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content:
                "You are TrajectAI, an expert career planning assistant. " +
                "Generate complete, personalized, actionable career roadmaps. " +
                "Use the user's supplied information, follow the requested " +
                "output structure, and do not ask for information already provided.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "OpenRouter API request failed:",
        response.status,
        errorText.slice(0, 1000)
      );

      return res.status(502).json({
        error: "The AI service could not generate your roadmap. Please try again.",
      });
    }

    const data = await response.json();
    const roadmap = data.choices?.[0]?.message?.content;

    if (typeof roadmap !== "string" || !roadmap.trim()) {
      console.error("OpenRouter returned an empty roadmap.");

      return res.status(502).json({
        error: "The AI returned an empty response. Please try again.",
      });
    }

    return res.json({ roadmap: roadmap.trim() });
  } catch (error) {
    console.error("Roadmap generation failed:", error.message);

    return res.status(500).json({
      error: "Unable to generate the roadmap. Please try again.",
    });
  }
});

module.exports = router;