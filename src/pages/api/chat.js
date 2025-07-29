// pages/api/chat.js

// This is your backend API route for handling chat requests from the AI assistant sidebar.
// It listens for POST requests and forwards the conversation to OpenAI, then returns the response.

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Expect the frontend to send an array of messages like: [{ role: "user", content: "..." }]
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing or invalid messages array' });
  }

  try {
    // Call OpenAI's Chat Completions API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // You already added this in Vercel
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4', // or 'gpt-4o' if your plan supports it
        messages: messages,
        temperature: 0.7, // How "creative" the AI should be
      }),
    });

    const data = await response.json();

    if (response.ok) {
      // Send the generated reply back to the frontend
      res.status(200).json(data);
    } else {
      // If OpenAI responds with an error (e.g., bad key), forward it
      res.status(response.status).json({ error: data });
    }
  } catch (error) {
    // Catch connection or unexpected errors
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'Server error connecting to OpenAI' });
  }
}
