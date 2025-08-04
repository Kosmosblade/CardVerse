import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.log(`[DiscordWebhook] Invalid method: ${req.method}`);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  try {
    const { usePrivate, ...payload } = req.body;

    console.log('[DiscordWebhook] Received payload:', JSON.stringify(payload, null, 2));
    console.log('[DiscordWebhook] usePrivate:', usePrivate);

    const webhookUrl = usePrivate
      ? process.env.DISCORD_PRIVATE_WEBHOOK_URL
      : process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error('[DiscordWebhook] Webhook URL not configured!');
      return res.status(500).json({ error: 'Webhook URL not configured' });
    }

    console.log('[DiscordWebhook] Using webhook URL:', usePrivate ? 'PRIVATE' : 'PUBLIC');

    const discordRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await discordRes.text();
    console.log(`[DiscordWebhook] Discord responded with status ${discordRes.status}: ${text}`);

    if (!discordRes.ok) {
      return res.status(502).json({ error: 'Discord webhook failed', details: text });
    }

    return res.status(200).json({ message: `Webhook sent to ${usePrivate ? 'private' : 'public'} channel` });
  } catch (err) {
    console.error('[DiscordWebhook] Handler error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
}
