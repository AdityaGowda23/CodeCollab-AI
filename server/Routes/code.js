import { Router } from "express";
import axios from "axios";
import { GitHubAIService } from "../services/githubAI.js";

const codeRoutes = Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const QUESTION_GENERATION_PROMPT = (prompt) =>
  `Generate a Data Structures and Algorithms coding problem based on the following prompt:

${prompt}

Return the result as JSON exactly in this format:
{ "title": "", "description": "", "requirements": [""], "sampleInput": "", "sampleOutput": "" }

IMPORTANT: ensure all fields are either strings or arrays of strings. If you would return an object, convert it to a string.`;

function buildPrompt({ ps, code, language }) {
  return `
Analyze this ${language} code for time/space complexity and correctness.
Return ONLY this JSON structure (no extra text):

{
  "timeComplexity": "O(...)",
  "spaceComplexity": "O(...)",
  "efficiencyScore": 1-10,
  "comment": "Over here you have to provide a short comment on the code where it was right or wrong you dont have to give any solution to the problem keep this part as small as possible one more this here dont tell what is wrong just"
}

Problem: ${ps.substring(0, 500)} // Truncate if too long
Code:
\`\`\`${language}
${code.substring(0, 1000)} // Truncate if too long
\`\`\``.trim();
}

async function callGemini(prompt, options = {}) {
  if (!GEMINI_API_KEY) {
    const err = new Error("GEMINI_API_KEY is not configured on the server");
    err.statusCode = 503;
    throw err;
  }

  const response = await axios.post(
    `${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: options.json ? "application/json" : undefined,
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.maxOutputTokens ?? 3000,
      },
    },
    { timeout: 60000 }
  );
  return response.data;
}

function geminiErrorMessage(error) {
  const apiMessage =
    error?.response?.data?.error?.message ||
    error?.response?.data?.error?.status;
  if (apiMessage) return apiMessage;
  if (error?.statusCode) return error.message;
  return error?.message || "Gemini request failed";
}

function normalizeGeneratedProblem(parsed) {
  return {
    title: String(parsed.title || "Untitled problem"),
    description: String(parsed.description || ""),
    requirements: Array.isArray(parsed.requirements)
      ? parsed.requirements.map((r) => String(r))
      : parsed.requirements
        ? [String(parsed.requirements)]
        : [],
    sampleInput: String(parsed.sampleInput || ""),
    sampleOutput: String(parsed.sampleOutput || ""),
  };
}

async function generateQuestionWithGemini(prompt) {
  const geminiResponse = await callGemini(QUESTION_GENERATION_PROMPT(prompt), {
    json: true,
    temperature: 0.4,
  });

  const responseText =
    geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!responseText) {
    const err = new Error("No content returned from Gemini");
    err.statusCode = 502;
    throw err;
  }

  return normalizeGeneratedProblem(extractJsonFromResponse(responseText));
}

async function generateQuestionWithGitHub(prompt) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    const err = new Error("GitHub AI fallback is not configured (GITHUB_TOKEN missing)");
    err.statusCode = 503;
    throw err;
  }

  const githubAI = new GitHubAIService(token);
  const result = await githubAI.makeRequest(
    "gpt-4.1",
    [
      {
        role: "system",
        content:
          "You generate coding interview problems. Reply with valid JSON only, no markdown fences.",
      },
      { role: "user", content: QUESTION_GENERATION_PROMPT(prompt) },
    ],
    { temperature: 0.4 }
  );

  if (!result.success || !result.content) {
    const err = new Error(result.error || "GitHub AI did not return a question");
    err.statusCode = 502;
    throw err;
  }

  return normalizeGeneratedProblem(extractJsonFromResponse(result.content));
}

async function generateInterviewQuestion(prompt) {
  try {
    return await generateQuestionWithGemini(prompt);
  } catch (geminiError) {
    const status = geminiError?.response?.status || geminiError?.statusCode;
    const canFallback =
      process.env.GITHUB_TOKEN &&
      (!GEMINI_API_KEY || status === 429 || status === 503 || status >= 500);

    if (!canFallback) throw geminiError;

    console.warn(
      "Gemini question generation failed, using GitHub AI fallback:",
      geminiErrorMessage(geminiError)
    );
    return await generateQuestionWithGitHub(prompt);
  }
}

function extractJsonFromResponse(text) {
  try {
    // Remove markdown code blocks if present
    const cleanText = text.replace(/```json|```/g, '').trim();

    // Find the first { and last } to extract JSON
    const jsonStart = cleanText.indexOf('{');
    const jsonEnd = cleanText.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No JSON found in response');
    }

    const jsonString = cleanText.substring(jsonStart, jsonEnd + 1);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Failed to extract JSON:', error);
    throw error;
  }
}

codeRoutes.post("/api/interview/generate-question", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: prompt",
      });
    }

    const problem = await generateInterviewQuestion(String(prompt).trim());

    return res.status(200).json({ success: true, problem });
  } catch (error) {
    console.error("Generate question error:", error?.response?.data || error.message);
    const status = error?.response?.status || error?.statusCode || 500;
    return res.status(status).json({
      success: false,
      error: geminiErrorMessage(error),
    });
  }
});

codeRoutes.post("/run", async (req, res) => {
  try {
    const { ps, code, language } = req.body;

    // Validate input
    if (!ps || !code || !language) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["ps", "code", "language"]
      });
    }

    const prompt = buildPrompt({ ps, code, language });
    const geminiResponse = await callGemini(prompt, { json: true });

    // Extract text from Gemini response
    const responseText = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text ||
      JSON.stringify(geminiResponse);

    console.log('Gemini raw response:', responseText);

    // Parse the JSON response
    let analysis;
    try {
      analysis = extractJsonFromResponse(responseText);
    } catch (parseError) {
      return res.status(500).json({
        error: "Failed to parse analysis",
        details: parseError.message,
        rawResponse: responseText
      });
    }

    // Validate and normalize the response
    const result = {
      timeComplexity: analysis.timeComplexity || "Not provided",
      spaceComplexity: analysis.spaceComplexity || "Not provided",
      efficiencyScore: analysis.efficiencyScore ?
        Math.max(1, Math.min(10, Math.round(analysis.efficiencyScore))) : null,
      comment: analysis.comment || "No analysis provided",
      success: true
    };

    return res.status(200).json(result);

  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({
      error: "Analysis failed",
      details: error.message,
      success: false
    });
  }
});

export default codeRoutes;