// server/routes/generateRoadmap.js
const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

router.post('/', async (req, res) => {
  const { goal, interests, strengths } = req.body;
  const prompt = `Create a step-by-step career roadmap for becoming a ${goal}. The user has interests in ${interests.join(", ")} and strengths in ${strengths.join(", ")}.`;

  console.log("📦 OpenRouter Key:", process.env.OPENROUTER_API_KEY);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://trajectai.vercel.app", // for local dev, use your domain when deployed
        "X-Title": "traject-ai-roadmap"
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct:free", // free and reliable
        messages: [
          { role: "system", content: "You are a career guidance assistant." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ OpenRouter API Error:", errorText);
      return res.status(500).json({ error: `External API Error: ${errorText}` });
    }

    const data = await response.json();
    const roadmap = data.choices?.[0]?.message?.content || "No roadmap generated.";

    res.json({ roadmap });

  } catch (error) {
    console.error("❌ Server Error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

module.exports = router;

// "openai/gpt-3.5-turbo"