// pages/api/send-to-discord.js
// Robust Discord webhook proxy with validation, masking, and clear diagnostics.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.warn(`[DiscordWebhook] Invalid method: ${req.method}`);
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { usePrivate, ...payload } = req.body ?? {};

    // Choose which env var to use
    const webhookUrl = usePrivate
      ? process.env.DISCORD_PRIVATE_WEBHOOK_URL
      : process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error('[DiscordWebhook] Missing webhook URL for', usePrivate ? 'PRIVATE' : 'PUBLIC');
      return res.status(500).json({ error: 'Server misconfiguration: webhook URL not set' });
    }

    // Validate expected Discord webhook URL format
    // expects: https://discord.com/api/webhooks/<id>/<token>
    const match = webhookUrl.match(/^https?:\/\/[^\/]+\/api\/webhooks\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      console.error('[DiscordWebhook] Webhook URL invalid format:', webhookUrl);
      return res.status(500).json({ error: 'Server misconfiguration: webhook URL invalid format' });
    }

    const webhookId = match[1];
    const webhookToken = match[2];

    // webhook id must be numeric (Discord snowflake)
    if (!/^\d+$/.test(webhookId)) {
      console.error('[DiscordWebhook] Webhook ID is not a snowflake:', webhookId);
      return res.status(500).json({
        error: 'Server misconfiguration: webhook id invalid',
        details: 'Webhook ID appears non-numeric (placeholder or malformed). Ensure DISCORD_WEBHOOK_URL contains the full Discord webhook URL.',
      });
    }

    // Mask token for safe logging (show only last 6 chars)
    const maskedWebhook = webhookUrl.replace(/(\/api\/webhooks\/)([^/]+)\/(.+)/, (m, a, id, token) => {
      const maskedToken = token.length > 6 ? '...' + token.slice(-6) : '...' + token;
      return `${a}${id}/${maskedToken}`;
    });

    console.log(`[DiscordWebhook] Posting to ${usePrivate ? 'PRIVATE' : 'PUBLIC'} webhook:`, maskedWebhook);
    // Small preview of payload (avoid logging full large bodies)
    try {
      console.log('[DiscordWebhook] Payload preview:', JSON.stringify(payload).slice(0, 1000));
    } catch (e) {
      console.log('[DiscordWebhook] Payload preview: <unserializable>');
    }

    // Use global fetch (Node 18+). If you depend on node-fetch, restore import at top.
    const discordResp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Parse response body safely
    let responseBody;
    const ct = discordResp.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      try {
        responseBody = await discordResp.json();
      } catch (e) {
        responseBody = await discordResp.text();
      }
    } else {
      responseBody = await discordResp.text();
    }

    console.log(`[DiscordWebhook] Discord responded status=${discordResp.status}`, responseBody);

    if (!discordResp.ok) {
      // Return discord response back to client for debugging
      return res.status(502).json({
        error: 'Discord webhook failed',
        status: discordResp.status,
        statusText: discordResp.statusText,
        body: responseBody,
      });
    }

    return res.status(200).json({ ok: true, discordStatus: discordResp.status, body: responseBody });
  } catch (err) {
    console.error('[DiscordWebhook] Handler exception:', err);
    return res.status(500).json({ error: 'Server exception', message: err?.message ?? String(err) });
  }
}
