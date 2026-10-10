import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/reply', async (req, res) => {
  const { messages, mode = 'public', override } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "No messages provided." });
  }

  // 1. Set baseline rules based on the selected Mode
  let modeInstructions = "";
  if (mode === 'dm') {
    modeInstructions = "MODE: PRIVATE DM. Style: Playful, teasing, engaging, flirty, seductive, sensual. Goal: Deepen fan support or drive content/PPV sales.";
  } else if (mode === 'business') {
    modeInstructions = "MODE: BUSINESS & COLLAB. Style: Professional, organized, welcoming. Goal: Handle shoot requests, cross-promotions, or rate inquiries.";
  } else {
    modeInstructions = "MODE: PUBLIC COMMENTS. Style: Playful, teasing, engaging, flirty, naughty, highly-engaging. 1-2 short sentences max. Goal: Drive fan engagement and content/PPV sales.";
  }

  let customDirective = override && override.trim() !== "" 
    ? `INSTRUCTION PRIORITY OVERRIDE: The user explicitly requested '${override}'. You MUST prioritize this request across all options.` 
    : "";

  const systemPrompt = `
YOU ARE AN AI ASSISTANT FOR A SOCIAL MEDIA & ADULT CREATOR MANAGER.
OBJECTIVE: Generate 3 distinct ready-to-send reply options based on mode selection and input history.
${modeInstructions}
${customDirective}

OUTPUT FORMAT:
(A) [Option 1]
(B) [Option 2]
(C) [Option 3]
Do not add meta-commentary or disclaimers.
  `.trim();

  try {
    // Prepend the system prompt to the user's message history array
    const fullConversation = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "cognitivecomputations/dolphin-2.9.2-qwen2-7b:free", 
        messages: fullConversation
      })
    });

    const data = await response.json();

    if (data.choices && data.choices[0]) {
      return res.status(200).json({ reply: data.choices[0].message.content });
    } else {
      return res.status(500).json({ error: "API returned an unexpected response format." });
    }

  } catch (error) {
    return res.status(500).json({ error: "Failed to generate reply." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});