import express from 'express';
import axios from 'axios';

const router = express.Router();

const PISTON_LANG_MAP = {
  cpp: 'c++',
  javascript: 'javascript',
  python: 'python',
  java: 'java',
};

// Health / config for code runner
router.get('/health', (req, res) => {
  const hasKey = !!process.env.PISTON_API_KEY;
  const url =
    process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston/execute';
  const isSelfHosted = !url.includes('emkc.org');

  res.json({
    success: true,
    pistonConfigured: hasKey || isSelfHosted,
    hasApiKey: hasKey,
    endpoint: url.replace(/\/execute\/?$/, ''),
    hint: hasKey
      ? 'Public Piston API key configured'
      : isSelfHosted
        ? 'Using self-hosted Piston'
        : 'Set PISTON_API_KEY in server/.env (request from EngineerMan on Discord) or self-host Piston and set PISTON_API_URL=http://localhost:2000/api/v2/execute',
  });
});

router.post('/', async (req, res) => {
  const { language, code, version = '*', stdin = '' } = req.body;

  if (!language || !code) {
    return res.status(400).json({
      success: false,
      error: 'language and code are required',
    });
  }

  const pistonLang = PISTON_LANG_MAP[language] || language;
  const filename =
    language === 'java'
      ? 'Main.java'
      : language === 'cpp'
        ? 'main.cpp'
        : 'main';

  const pistonUrl =
    process.env.PISTON_API_URL || 'https://emkc.org/api/v2/piston/execute';
  const apiKey = process.env.PISTON_API_KEY;

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  try {
    const response = await axios.post(
      pistonUrl,
      {
        language: pistonLang,
        version,
        files: [{ name: filename, content: code }],
        stdin,
      },
      { headers, timeout: 30000 }
    );

    return res.json({ success: true, ...response.data });
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data;
    let message =
      data?.message ||
      error.message ||
      'Code execution failed';

    if (status === 401 && !apiKey) {
      message +=
        ' — Public Piston API requires PISTON_API_KEY in server/.env, or self-host Piston (see README).';
    }

    console.error('[Piston proxy]', status, message);
    return res.status(status).json({ success: false, error: message, status });
  }
});

export default router;
