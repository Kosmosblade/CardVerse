import fetch from "node-fetch";

export default async function handler(req, res) {
  let { name } = req.query;
  if (!name) {
    return res.status(400).json({ error: "Missing card name" });
  }

  // Clean the name: remove trailing colon + digits like ":1", ":2", etc.
  name = name.replace(/:\d+$/, "").trim();

  try {
    const scryfallRes = await fetch(
      `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`
    );

    if (!scryfallRes.ok) {
      const text = await scryfallRes.text();
      return res.status(scryfallRes.status).json({ error: text });
    }

    const data = await scryfallRes.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
