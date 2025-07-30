// webhook-proxy.js

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Discord webhook URL - ideally use process.env.DISCORD_WEBHOOK_URL in production
const DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1393842813128671293/P1QfMYz7uAiTnwXLdTjRBc5iFQlrFKy00jrYUaH6tf12htO3t45eOtn9in082ieQFPbd";

app.post("/send-to-discord", async (req, res) => {
  try {
    // Log received payload
    console.log("📥 Received at proxy:", JSON.stringify(req.body, null, 2));

    const payload = req.body;

    if (!payload || Object.keys(payload).length === 0) {
      return res.status(400).send("Bad Request: Empty payload");
    }

    const discordRes = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await discordRes.text();

    console.log("📤 Discord responded with:", discordRes.status, text);

    if (!discordRes.ok) {
      return res.status(502).send(`Discord webhook failed: ${text}`);
    }

    res.send("Webhook forwarded successfully");
  } catch (err) {
    console.error("🚨 Proxy error sending to Discord:", err);
    res.status(500).send("Internal Server Error");
  }
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`✅ Webhook proxy listening on http://localhost:${PORT}`);
});
