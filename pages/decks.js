// pages/deckbuilder.jsx

import React, { useState, useEffect } from "react";
import Card from "../components/Card"; // Adjust path if needed

export default function DeckBuilder() {
  const [deckText, setDeckText] = useState("");
  const [deckList, setDeckList] = useState([]);
  const [cardsData, setCardsData] = useState({});
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  // Clear all state on mount (optional)
  useEffect(() => {
    setDeckText("");
    setDeckList([]);
    setCardsData({});
    setLogs([]);
  }, []);

  // Parses deck text input into {name, count} objects, skipping lines ending with colon (headers)
  function parseDeck(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const counts = {};
  const names = [];

  lines.forEach((line, index) => {
    // Skip headers or metadata lines ending with colon (common in deck lists)
    if (line.endsWith(":")) {
      console.log(`Skipping header/meta line: "${line}"`);
      return;
    }

    // Reject any line containing colon anywhere (likely not a card)
    if (line.includes(":")) {
      console.warn(`Skipping suspicious line with colon at line ${index + 1}: "${line}"`);
      return;
    }

    // Match lines with format "2x Card Name" or "2 Card Name"
    const match = line.match(/^(\d+)x?\s+(.*)$/i);
    const count = match ? parseInt(match[1], 10) : 1;
    const name = match ? match[2].trim() : line;

    if (!name || name.length === 0) {
      console.warn(`Skipping empty or invalid card name at line ${index + 1}: "${line}"`);
      return;
    }

    if (!counts[name]) {
      counts[name] = count;
      names.push(name);
    } else {
      counts[name] += count;
    }
  });

  const parsed = names.map((name) => ({ name, count: counts[name] }));
  console.log("parseDeck sanitized result:", parsed);
  return parsed;
}


  // Send card info to your Discord webhook API route
  async function sendDiscordWebhook(card) {
    const payload = {
      username: "CardVerse Bot",
      embeds: [
        {
          title: `Card Found in Deck: ${card.name}`,
          url: card.scryfall_uri,
          description: card.oracle_text || "No description",
          color: 7506394,
          fields: [
            { name: "Set", value: card.set_name || "Unknown", inline: true },
            { name: "Rarity", value: card.rarity || "Unknown", inline: true },
            { name: "Price (USD)", value: card.prices?.usd || "N/A", inline: true },
          ],
          thumbnail: { url: card.image_uris?.small || "" },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    try {
      const response = await fetch("/api/send-to-discord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Discord webhook error response:", text);
      }
    } catch (err) {
      console.error("Webhook send error:", err);
    }
  }

  // Fetch Scryfall data for each card in deck with concurrency limit and error logging
  async function fetchCardsData(deckList) {
    setLoading(true);
    setLogs([]);
    const dataMap = {};
    const newLogs = [];
    const concurrencyLimit = 5;
    const queue = [...deckList];

    const workers = new Array(concurrencyLimit).fill(null).map(async () => {
      while (queue.length > 0) {
        const { name } = queue.shift();

        // Defensive check: skip empty or suspicious names before fetching
        if (!name || name.trim().length === 0) {
          const msg = `Skipping fetch for empty or invalid card name: "${name}"`;
          console.warn(msg);
          newLogs.push(msg);
          continue;
        }

        console.log("Fetching card from Scryfall:", name);

        try {
          const res = await fetch(
            `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`
          );

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }

          const data = await res.json();

          if (data.object !== "error") {
            dataMap[name] = data;
            // Optional: comment this out if Discord webhook spamming is a concern
            await sendDiscordWebhook(data);
          } else {
            const msg = `Card not found: "${name}"`;
            console.warn(msg);
            newLogs.push(msg);
            dataMap[name] = null;
          }
        } catch (err) {
          const msg = `Fetch error for "${name}": ${err.message}`;
          console.error(msg);
          newLogs.push(msg);
          dataMap[name] = null;
        }
      }
    });

    await Promise.all(workers);
    setCardsData(dataMap);
    setLogs(newLogs);
    setLoading(false);
  }

  // Handle parse button click
  function handleParseClick() {
    if (!deckText.trim()) {
      setLogs(["Please enter a deck list first."]);
      return;
    }
    const parsed = parseDeck(deckText);
    setDeckList(parsed);
    fetchCardsData(parsed);
  }

  // Categorize cards by type line for display
  function categorizeCards() {
    const categories = {
      Creature: [],
      Instant: [],
      Sorcery: [],
      Enchantment: [],
      Artifact: [],
      Planeswalker: [],
      Land: [],
      Other: [],
    };

    deckList.forEach(({ name, count }) => {
      const card = cardsData[name];
      if (!card) {
        categories.Other.push({ name, count, card: null });
        return;
      }

      const typeLine = card.type_line || "";

      if (typeLine.includes("Creature"))
        categories.Creature.push({ name, count, card });
      else if (typeLine.includes("Instant"))
        categories.Instant.push({ name, count, card });
      else if (typeLine.includes("Sorcery"))
        categories.Sorcery.push({ name, count, card });
      else if (typeLine.includes("Enchantment"))
        categories.Enchantment.push({ name, count, card });
      else if (typeLine.includes("Artifact"))
        categories.Artifact.push({ name, count, card });
      else if (typeLine.includes("Planeswalker"))
        categories.Planeswalker.push({ name, count, card });
      else if (typeLine.includes("Land"))
        categories.Land.push({ name, count, card });
      else categories.Other.push({ name, count, card });
    });

    return categories;
  }

  const categories = categorizeCards();

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-100 rounded-lg shadow-xl">
      <h2 className="text-4xl font-extrabold mb-8 text-center text-indigo-700 drop-shadow-md">
        Deck Importer & Viewer
      </h2>

      <textarea
        value={deckText}
        onChange={(e) => setDeckText(e.target.value)}
        placeholder="Paste your deck list here..."
        rows={8}
        className="w-full p-4 border border-indigo-400 rounded-lg shadow-inner mb-6 font-mono text-lg resize-none focus:outline-none focus:ring-4 focus:ring-indigo-300"
        disabled={loading}
      />

      <input
        type="file"
        accept=".txt"
        onChange={(e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            setDeckText(ev.target.result); // Set deck text only, user must click parse button
          };
          reader.onerror = () => {
            setLogs(["Failed to read file. Please try again."]);
          };
          reader.readAsText(file);
        }}
        className="mb-6"
        disabled={loading}
      />

      <button
        onClick={handleParseClick}
        disabled={loading}
        className={`w-full bg-indigo-700 text-white text-xl font-semibold py-4 rounded-lg shadow-lg hover:bg-indigo-800 transition duration-300 ${
          loading ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        {loading ? "Loading Cards..." : "Parse & Load Cards"}
      </button>

      {logs.length > 0 && (
        <div className="mt-6 p-4 bg-yellow-100 border border-yellow-400 rounded text-yellow-900 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-sm">
          <strong>Logs / Warnings:</strong>
          <br />
          {logs.join("\n")}
        </div>
      )}

      {deckList.length === 0 ? (
        <p className="mt-10 text-center text-gray-600 text-xl italic">
          No cards parsed yet.
        </p>
      ) : (
        Object.entries(categories).map(
          ([category, cards]) =>
            cards.length > 0 && (
              <section key={category} className="mb-16">
                <h3 className="text-3xl font-bold mb-6 border-b-4 border-indigo-500 pb-3 text-indigo-900 drop-shadow-md">
                  {category} ({cards.reduce((a, c) => a + c.count, 0)})
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: "24px",
                  }}
                >
                  {cards.map(({ name, count, card }) => (
                    <Card key={name} card={card} count={count} />
                  ))}
                </div>
              </section>
            )
        )
      )}
    </div>
  );
}
