import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing or invalid messages array' });
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('Missing OPENAI_API_KEY in environment');
    return res.status(500).json({ error: 'OpenAI API key not configured.' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages.map((m) => ({
        role: m.role,
        content: m.text ?? m.content ?? '',
      })),
      temperature: 0.8,
    });

    if (!response.choices || response.choices.length === 0) {
      console.error('No response choices from OpenAI API');
      return res.status(500).json({ error: 'No response from AI.' });
    }

    const aiMessage = response.choices[0].message.content || 'No response from AI.';
    return res.status(200).json({ reply: aiMessage });
  } catch (err) {
    console.error('Server error contacting OpenAI:', err);
    return res.status(500).json({ error: 'Server error contacting OpenAI.' });
  }
}
