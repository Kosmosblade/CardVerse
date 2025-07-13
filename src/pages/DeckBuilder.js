import React, { useState } from "react";

export default function DeckBuilder() {
  const [deckText, setDeckText] = useState("");
  const [deckList, setDeckList] = useState([]);
  const [cardsData, setCardsData] = useState({});
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [hoveredCardName, setHoveredCardName] = useState(null);

  function parseDeck(text) {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const counts = {};
    const names = [];

    lines.forEach((line) => {
      const match = line.match(/^(\d+)x?\s+(.*)$/i);
      const count = match ? parseInt(match[1]) : 1;
      const name = match ? match[2].trim() : line;

      if (["SIDEBOARD:", "STICKERS:"].includes(name.toUpperCase())) return;

      if (!counts[name]) {
        counts[name] = count;
        names.push(name);
      } else {
        counts[name] += count;
      }
    });

    return names.map((name) => ({ name, count: counts[name] }));
  }

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
        try {
          const res = await fetch(
            `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (data.object === "error") {
            newLogs.push(`Card not found: "${name}"`);
            dataMap[name] = null;
          } else {
            dataMap[name] = data;
          }
        } catch (err) {
          newLogs.push(`Fetch error for "${name}": ${err.message}`);
          dataMap[name] = null;
        }
      }
    });

    await Promise.all(workers);

    setCardsData(dataMap);
    setLogs(newLogs);
    setLoading(false);
  }

  function handleParseClick() {
    if (!deckText.trim()) {
      setLogs(["Please enter a deck list first."]);
      return;
    }
    const parsed = parseDeck(deckText);
    setDeckList(parsed);
    fetchCardsData(parsed);
  }

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

      if (typeLine.includes("Creature")) categories.Creature.push({ name, count, card });
      else if (typeLine.includes("Instant")) categories.Instant.push({ name, count, card });
      else if (typeLine.includes("Sorcery")) categories.Sorcery.push({ name, count, card });
      else if (typeLine.includes("Enchantment")) categories.Enchantment.push({ name, count, card });
      else if (typeLine.includes("Artifact")) categories.Artifact.push({ name, count, card });
      else if (typeLine.includes("Planeswalker")) categories.Planeswalker.push({ name, count, card });
      else if (typeLine.includes("Land")) categories.Land.push({ name, count, card });
      else categories.Other.push({ name, count, card });
    });

    return categories;
  }

  const categories = categorizeCards();
  const fallbackImage = "https://via.placeholder.com/223x310?text=No+Image";

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
            setDeckText(ev.target.result);
            const parsed = parseDeck(ev.target.result);
            setDeckList(parsed);
            fetchCardsData(parsed);
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
        <p className="mt-10 text-center text-gray-600 text-xl italic">No cards parsed yet.</p>
      ) : (
        Object.entries(categories).map(([category, cards]) =>
          cards.length > 0 ? (
            <section key={category} className="mb-16">
              <h3 className="text-3xl font-bold mb-6 border-b-4 border-indigo-500 pb-3 text-indigo-900 drop-shadow-md">
                {category} ({cards.reduce((a, c) => a + c.count, 0)})
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: "24px",
                }}
              >
                {cards.map(({ name, count, card }) => (
                  <div
                    key={name}
                    style={{
                      position: "relative",
                      backgroundColor: "white",
                      borderRadius: 12,
                      boxShadow:
                        "0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)",
                      padding: 8,
                      cursor: "default",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      userSelect: "none",
                    }}
                    title={`${count}x ${name}`}
                  >
                    <div
                      onMouseEnter={() => setHoveredCardName(name)}
                      onMouseLeave={() => setHoveredCardName(null)}
                      style={{ position: "relative", width: "100%", borderRadius: 10, overflow: "hidden" }}
                    >
                      <img
                        src={
                          card?.image_uris?.normal ||
                          card?.card_faces?.[0]?.image_uris?.normal ||
                          fallbackImage
                        }
                        alt={name}
                        style={{
                          width: "100%",
                          borderRadius: 10,
                          boxShadow: "0 8px 12px rgba(0,0,0,0.15)",
                          transition: "transform 0.3s ease",
                          transform:
                            hoveredCardName === name ? "scale(1.06)" : "scale(1)",
                          display: "block",
                        }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = fallbackImage;
                        }}
                      />

                      {/* Tooltip */}
                      {hoveredCardName === name && card && (
                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "105%",
                            transform: "translateY(-50%)",
                            backgroundColor: "white",
                            borderRadius: 12,
                            padding: 16,
                            boxShadow:
                              "0 12px 24px rgba(0,0,0,0.15)",
                            width: 320,
                            zIndex: 9999,
                            fontSize: 14,
                            color: "#1e40af",
                            pointerEvents: "none",
                            userSelect: "none",
                          }}
                        >
                          <div style={{ fontWeight: "700", fontSize: 18, marginBottom: 6 }}>
                            {card.name}
                          </div>
                          <div><strong>Set:</strong> {card.set_name || "N/A"}</div>
                          <div><strong>Price (USD):</strong> {card.prices?.usd ?? "N/A"}</div>
                          <div><strong>Mana Cost:</strong> {card.mana_cost || "N/A"}</div>
                          <div><strong>Type:</strong> {card.type_line || "N/A"}</div>
                          <div
                            style={{
                              maxHeight: 60,
                              overflowY: "auto",
                              marginTop: 4,
                              whiteSpace: "pre-wrap",
                              lineHeight: 1.3,
                            }}
                          >
                            <strong>Oracle Text:</strong>{" "}
                            {card.oracle_text
                              ? card.oracle_text.length > 200
                                ? card.oracle_text.slice(0, 200) + "..."
                                : card.oracle_text
                              : "N/A"}
                          </div>
                          <div><strong>Rarity:</strong> {card.rarity || "N/A"}</div>
                          <div><strong>Artist:</strong> {card.artist || "N/A"}</div>

                          {/* Tooltip arrow */}
                          <div
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: "-12px",
                              marginTop: "-6px",
                              width: 0,
                              height: 0,
                              borderTop: "6px solid transparent",
                              borderBottom: "6px solid transparent",
                              borderRight: "12px solid white",
                              filter: "drop-shadow(-1px 0 1px rgba(0,0,0,0.1))",
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        fontWeight: 600,
                        fontSize: 16,
                        color: "#3730a3",
                        textAlign: "center",
                        userSelect: "text",
                        lineHeight: 1.2,
                      }}
                    >
                      {name}
                    </div>
                    <div
                      style={{
                        color: "#4f46e5",
                        fontWeight: "500",
                        fontSize: 14,
                        marginTop: 4,
                      }}
                    >
                      x{count}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null
        )
      )}
    </div>
  );
}
