const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

const DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1393842813128671293/P1QfMYz7uAiTnwXLdTjRBc5iFQlrFKy00jrYUaH6tf12htO3t45eOtn9in082ieQFPbd";

app.post("/send-to-discord", async (req, res) => {
  console.log("📥 Received at proxy:", JSON.stringify(req.body, null, 2));

  // FIXED: Use the whole req.body as payload (no .content)
  const payload = req.body;

  try {
    const discordRes = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await discordRes.text();
    console.log("📤 Discord responded with:", discordRes.status, text);

    if (!discordRes.ok) return res.status(502).send("Discord webhook failed");

    res.send("Webhook forwarded");
  } catch (err) {
    console.error("🚨 Proxy error sending to Discord:", err);
    res.status(500).send("Proxy error");
  }
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`✅ Webhook proxy listening on http://localhost:${PORT}`);
});
