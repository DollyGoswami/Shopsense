const express = require("express");
const axios = require("axios");

const router = express.Router();

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_HISTORY_MESSAGES = 10;

function buildGroqMessages(history = [], message = "", systemPrompt = "") {
  const messages = [];

  if (systemPrompt.trim()) {
    messages.push({
      role: "system",
      content: systemPrompt.trim()
    });
  }

  const normalizedHistory = Array.isArray(history)
    ? history
        .filter((item) => item && typeof item.text === "string" && item.text.trim())
        .slice(-MAX_HISTORY_MESSAGES)
        .map((item) => ({
          role: item.role === "user" ? "user" : "assistant",
          content: item.text.trim()
        }))
    : [];

  const trimmedMessage = message.trim();
  const lastMessage = normalizedHistory[normalizedHistory.length - 1] || messages[messages.length - 1];

  if (
    trimmedMessage &&
    (!lastMessage ||
      lastMessage.role !== "user" ||
      lastMessage.content !== trimmedMessage)
  ) {
    normalizedHistory.push({
      role: "user",
      content: trimmedMessage
    });
  }

  return [...messages, ...normalizedHistory];
}

function extractGroqText(responseData) {
  return responseData?.choices?.[0]?.message?.content?.trim?.() || "";
}

function mapGroqError(error) {
  const upstreamStatus = error.response?.status;
  const providerMessage = error.response?.data?.error?.message || error.message;
  const normalizedMessage = String(providerMessage || "").toLowerCase();

  if (normalizedMessage.includes("quota") || normalizedMessage.includes("rate limit")) {
    return {
      status: 429,
      message:
        "Groq quota or rate limit was reached for this API key. Please check your Groq usage and try again shortly."
    };
  }

  if (normalizedMessage.includes("api key not valid") || normalizedMessage.includes("permission denied")) {
    return {
      status: 401,
      message: "Groq API key is invalid or does not have access to this project."
    };
  }

  if (normalizedMessage.includes("model") && normalizedMessage.includes("not")) {
    return {
      status: 400,
      message: `Groq model "${GROQ_MODEL}" is unavailable. Update GROQ_MODEL in backend/.env.`
    };
  }

  if (upstreamStatus === 429) {
    return {
      status: 429,
      message: "Groq rate limit reached. Please wait a moment and try again."
    };
  }

  if (upstreamStatus && upstreamStatus >= 400 && upstreamStatus < 500) {
    return {
      status: upstreamStatus,
      message: providerMessage || "Groq rejected the request."
    };
  }

  return {
    status: 502,
    message: providerMessage || "Unable to get a response from Groq right now."
  };
}

router.post("/", async (req, res) => {
  const { message, context, history } = req.body;
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: "Message is required and must be a non-empty string"
    });
  }

  if (!groqApiKey) {
    return res.status(500).json({
      success: false,
      message: "Groq API is not configured. Add GROQ_API_KEY in backend/.env."
    });
  }

  try {
    const systemPrompt = `You are ShopSense AI, a helpful shopping assistant for an Indian e-commerce platform.

Responsibilities:
- Recommend products based on user needs, budget, and preferences
- Compare products and explain pros and cons
- Help with price analysis and deal spotting
- Answer questions about product features, specifications, and usage
- Provide shopping tips and advice

Guidelines:
- Be accurate, practical, and concise
- Focus on Indian market context and INR pricing
- Ask a short follow-up only when needed
- If you are unsure, say so clearly and suggest the next best option
- Keep replies conversational and useful

Current app context: ${context || "General shopping assistance"}`;

    const groqPayload = {
      model: GROQ_MODEL,
      messages: buildGroqMessages(history, message, systemPrompt),
      temperature: 0.7,
      max_completion_tokens: 1024
    };

    const response = await axios.post(
      GROQ_API_URL,
      groqPayload,
      {
        timeout: 30000,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`
        }
      }
    );

    const text = extractGroqText(response.data);

    if (!text) {
      throw new Error("No response from Groq");
    }

    res.json({
      success: true,
      message: text,
      provider: "groq",
      model: GROQ_MODEL,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Chatbot API error:", error.response?.data || error.message);
    const mappedError = mapGroqError(error);

    res.status(mappedError.status).json({
      success: false,
      message: mappedError.message,
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

module.exports = router;
