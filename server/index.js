import dotenv from 'dotenv';
dotenv.config();

import express from 'express'
import cors from "cors"
import mongoConnect from './Config/mongoConnect.js';
import codeRoutes from './Routes/code.js';
import userRoutes from './Routes/userRoutes.js';
import interviewRoutes from './Routes/interviewRoutes.js';
import executeRoutes from './routes/execute.js';
import { sendNotificationEmail } from './utils/sendEmail.js';



const app = express()
const port = process.env.PORT || 3000

// In server/server.js, near your other routes:

import axios from 'axios';

// Add these imports at the top
import rateLimit from 'express-rate-limit';
import { GitHubAIService,GITHUB_MODELS,AI_ACTIONS} from './services/githubAI.js'

// Initialize AI service
const githubAI = new GitHubAIService(process.env.GITHUB_TOKEN);
// Rate limiting for AI endpoints
const aiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs
  message: { error: 'Too many AI requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE","PATCH"], 
    allowedHeaders: ["Content-Type", "Authorization"] 
}));
app.use(express.json());

app.use(codeRoutes);
app.use(userRoutes);
app.use(interviewRoutes)
app.use('/api/execute', executeRoutes);




// AI Routes - Add these after your existing routes

// Get available AI models
app.get('/api/ai/models', (req, res) => {
  try {
    res.json({
      success: true,
      models: GITHUB_MODELS,
      actions: AI_ACTIONS
    });
  } catch (error) {
    console.error('Error getting AI models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AI models'
    });
  }
});

// Main AI assistance endpoint
app.post('/api/ai/assistance', aiRateLimit, async (req, res) => {
  try {
    const {
      action,
      prompt,
      code = '',
      language = 'javascript',
      problemStatement = '',
      errorDescription = '',
      context = '',
      model = 'gpt-4o'
    } = req.body;

    // Validate required fields
    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action is required'
      });
    }

    if (!prompt && action === AI_ACTIONS.GENERAL) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required for general assistance'
      });
    }

    if (!code && [AI_ACTIONS.ANALYZE, AI_ACTIONS.DEBUG, AI_ACTIONS.OPTIMIZE, AI_ACTIONS.EXPLAIN].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Code is required for this type of assistance'
      });
    }

    console.log(`🤖 Processing AI request: ${action} with ${model}`);

    let result;

    // Route to appropriate AI service method
    switch (action) {
      case AI_ACTIONS.ANALYZE:
        result = await githubAI.analyzeCode(code, language, problemStatement || prompt, model);
        break;

      case AI_ACTIONS.DEBUG:
        result = await githubAI.debugCode(code, language, errorDescription || prompt, model);
        break;

      case AI_ACTIONS.OPTIMIZE:
        result = await githubAI.optimizeCode(code, language, model);
        break;

      case AI_ACTIONS.EXPLAIN:
        result = await githubAI.explainCode(code, language, model);
        break;

      case AI_ACTIONS.COMPLETE:
        result = await githubAI.completeCode(code, language, context || problemStatement, model);
        break;

      case AI_ACTIONS.REVIEW:
        result = await githubAI.analyzeCode(code, language, problemStatement || prompt, model);
        break;

      default: // GENERAL
        result = await githubAI.getGeneralHelp(prompt, code, language, model);
    }

    if (result.success) {
      console.log(`✅ AI request completed successfully`);
      res.json({
        success: true,
        response: result.content,
        model: result.model,
        usage: result.usage,
        action: action
      });
    } else {
      console.error('❌ AI request failed:', result.error);
      res.status(500).json({
        success: false,
        error: result.error,
        model: result.model
      });
    }

  } catch (error) {
    console.error('❌ AI assistance error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Health check for AI service
app.get('/api/ai/health', (req, res) => {
  const isEnabled = process.env.AI_ENABLED === 'true' && !!process.env.GITHUB_TOKEN;
  
  const aiEnabledFlag = process.env.AI_ENABLED === 'true';
  const hasToken = !!process.env.GITHUB_TOKEN;
  let message = null;
  if (!aiEnabledFlag) message = 'Set AI_ENABLED=true in server/.env';
  else if (!hasToken) message = 'Set GITHUB_TOKEN in server/.env (GitHub Models API token)';

  res.json({
    success: true,
    aiEnabled: isEnabled,
    aiEnabledFlag,
    hasToken,
    availableModels: Object.keys(GITHUB_MODELS).length,
    message,
  });
});

const aiReady =
  process.env.AI_ENABLED === 'true' && !!process.env.GITHUB_TOKEN;
console.log(
  `🤖 AI Assistant: ${aiReady ? 'Enabled' : 'Disabled'}` +
    (process.env.AI_ENABLED === 'true' && !process.env.GITHUB_TOKEN
      ? ' (GITHUB_TOKEN missing — add it to server/.env and restart)'
      : process.env.AI_ENABLED !== 'true'
        ? ' (set AI_ENABLED=true in server/.env)'
        : '')
);


app.post('/api/github-ai', async (req, res) => {
  const { model, messages, max_tokens = 1024, temperature = 0.2, top_p = 0.95 } = req.body;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

  try {
    const response = await axios.post(
      'https://models.inference.ai.azure.com/chat/completions',
      {
        model,
        messages,
        max_tokens,
        temperature,
        top_p,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 40000
      }
    );
    res.json(response.data);
  } catch (err) {
    console.error('[Github AI API Proxy Error]', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: err.response?.data?.error || err.message });
  }
});


app.post("/",async(req,res)=>{
  console.log(req.body);
  
  return res.json({message:"hiiii"})
})

app.get("/email", (req, res) => {
  sendNotificationEmail("Test Subject", "Hello! This is a test email to myself.");
  res.send("Email page")
})






mongoConnect()//monogDB se connect
const server = app.listen(port, () => {
  console.log(` app listening on port ${port}`)
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `❌ Port ${port} is already in use. Stop the other process (e.g. taskkill /F /IM node.exe or close old terminals), then restart.`
    );
  } else {
    console.error('❌ Server failed to start:', err.message);
  }
  process.exit(1);
});