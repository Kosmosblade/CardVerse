// pages/api/chat.js

// API route for AI Assistant chat

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing or invalid messages array' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: messages.map((m) => ({
          role: m.role,
          content: m.text || m.content, // support both 'text' and 'content' keys
        })),
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    const aiMessage = data.choices?.[0]?.message?.content || 'No response from AI.';
    return res.status(200).json({ reply: aiMessage });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: 'Server error contacting OpenAI.' });
  }
}
