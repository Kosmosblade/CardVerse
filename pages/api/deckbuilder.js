import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_RETRIES = 3;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ error: 'Only POST requests allowed', code: 'method_not_allowed' });
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('Missing OPENAI_API_KEY');
    return res
      .status(500)
      .json({ error: 'Server misconfiguration: API key missing.', code: 'config_error' });
  }

  const { commander } = req.body;
  console.log('Received commander:', commander);

  const messages = [
    {
      role: 'system',
      content:
        'You are a Magic: The Gathering deckbuilding assistant. ' +
        'Generate a 100-card Commander deck: 1 commander and 99 unique, legal cards (no duplicates except basic lands).',
    },
    {
      role: 'user',
      content: commander
        ? `Build a Commander deck around "${commander}".`
        : 'Pick a fun Commander and build a 100-card EDH deck around it.',
    },
  ];

  async function callModel(model) {
    console.log(`Calling OpenAI model: ${model}`);
    return openai.chat.completions.create({
      model,
      messages,
      temperature: 0.9,
    });
  }

  async function tryCallModelWithRetry(model) {
    let attempt = 0;
    while (attempt <= MAX_RETRIES) {
      try {
        return await callModel(model);
      } catch (err) {
        const isRateLimit = err.status === 429 || err.code === 'rate_limit_exceeded' || err.code === 'insufficient_quota';
        if (isRateLimit && attempt < MAX_RETRIES) {
          const delay = 2 ** attempt * 1000 + Math.floor(Math.random() * 500);
          console.warn(`Rate limit hit, retrying after ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await sleep(delay);
          attempt++;
        } else {
          throw err;
        }
      }
    }
  }

  try {
    let response;
    try {
      response = await tryCallModelWithRetry('gpt-4o');
    } catch (firstErr) {
      const code = firstErr.code || firstErr.status || 'unknown';
      console.warn(`Primary model failed (${code}), falling back to gpt-3.5-turbo:`, firstErr.message);
      response = await tryCallModelWithRetry('gpt-3.5-turbo');
    }

    const deckText = response.choices?.[0]?.message?.content || '';
    console.log('Received deck text from OpenAI:', deckText);

    // Write deckText to a text file in the same folder as this file
    const filePath = path.resolve(process.cwd(), 'pages', 'api', 'latest-deck.txt');
    fs.writeFileSync(filePath, deckText, 'utf-8');
    console.log(`Deck text saved to ${filePath}`);

    const deckList = deckText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => ({ name: line, type_line: 'Unknown', price: '—' }));

    console.log('Parsed deck list:', deckList.length, 'cards');

    return res.status(200).json({ deck: deckList });
  } catch (err) {
    console.error('Deckbuilder error:', err);
    return res.status(500).json({
      error: 'Deck generation failed.',
      code: err.code || err.status || 'unknown_error',
      message: err.message,
      stack: err.stack,
    });
  }
}
