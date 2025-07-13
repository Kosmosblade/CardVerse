// webhook-proxy.js
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
const PORT = 5001;

const DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1393842813128671293/P1QfMYz7uAiTnwXLdTjRBc5iFQlrFKy00jrYUaH6tf12htO3t45eOtn9in082ieQFPbd";

app.use(cors());
app.use(express.json());

app.post("/send-to-discord", async (req, res) => {
  try {
    const { content } = req.body;

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content),
    });

    const result = await response.json();
    res.status(200).json({ status: "sent", result });
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Failed to send webhook" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Webhook proxy running on http://localhost:${PORT}`);
});
