import React, { useState, useEffect } from "react";
import Card from "../components/Card"; // Adjust path if needed
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const MAX_DECK_SIZE = 100; // maximum allowed cards in deck

export default function DeckBuilder() {
  const [deckText, setDeckText] = useState("");
  const [deckList, setDeckList] = useState([]);
  const [cardsData, setCardsData] = useState({});
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"
  const [message, setMessage] = useState(""); // For non-blocking UI messages

  // New fields for saving deck
  const [deckTitle, setDeckTitle] = useState("");
  const [commanderName, setCommanderName] = useState("");
  const [colorIdentity, setColorIdentity] = useState("");
  const [mtgType, setMtgType] = useState("");

  // Get current user from Supabase auth
  const [user, setUser] = useState(null);

  useEffect(() => {
    setDeckText("");
    setDeckList([]);
    setCardsData({});
    setLogs([]);
    setMessage("");

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  // Helper: Find commander name from deck text lines by scanning from bottom for a Legendary Creature
  function findCommanderInText(lines) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (
        !line ||
        /^[a-zA-Z ]+:$/.test(line) || // skip header/meta lines
        /^(SB[: ]|Sideboard[: ]?)/i.test(line) // skip sideboard
      )
        continue;

      const match = line.match(/^(\d+)x?\s+(.*)$/i);
      const name = match ? match[2].trim() : line;

      if (name) return name;
    }
    return null;
  }

  function parseDeck(text) {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const counts = {};
    const names = [];

    lines.forEach((line) => {
      if (/^[a-zA-Z ]+:$/.test(line)) {
        // Header/meta line
        return;
      }

      if (/^(SB[: ]|Sideboard[: ]?)/i.test(line)) {
        // Sideboard header line
        return;
      }

      if (line.includes(":") && !/^(SB[: ]|Sideboard[: ]?)/i.test(line)) {
        // Suspicious line with colon (ignore)
        return;
      }

      const match = line.match(/^(\d+)x?\s+(.*)$/i);
      const count = match ? parseInt(match[1], 10) : 1;
      const name = match ? match[2].trim() : line;

      if (!name || name.length === 0) return;

      if (!counts[name]) {
        counts[name] = count;
        names.push(name);
      } else {
        counts[name] += count;
      }
    });

    return names.map((name) => ({ name, count: counts[name] }));
  }

  async function sendDiscordWebhook(card) {
    // Your webhook logic here (optional)
  }

  async function fetchCardsData(deckList, commanderFromText) {
    // Check deck size limit before proceeding:
    const totalCardsCount = deckList.reduce((acc, c) => acc + c.count, 0);
    if (totalCardsCount > MAX_DECK_SIZE) {
      setMessage(
        `Error: Deck contains ${totalCardsCount} cards which exceeds the maximum allowed ${MAX_DECK_SIZE} cards. Please reduce deck size before importing.`
      );
      setCardsData({});
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLogs([]);
    setMessage("");
    const dataMap = {};
    const newLogs = [];
    const concurrencyLimit = 5;
    const queue = [...deckList];

    const workers = new Array(concurrencyLimit).fill(null).map(async () => {
      while (queue.length > 0) {
        const { name } = queue.shift();

        if (!name || name.trim().length === 0) {
          const msg = `Skipping fetch for empty or invalid card name: "${name}"`;
          console.warn(msg);
          newLogs.push(msg);
          continue;
        }

        console.log("Fetching card from Scryfall:", name);

        try {
          // Use the local Next.js API proxy to avoid CORS
          const res = await fetch(`/api/scryfall?name=${encodeURIComponent(name)}`);

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }

          const data = await res.json();

          if (data.object !== "error") {
            dataMap[name] = data;
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

    // Try to validate commander from text (if provided)
    if (commanderFromText) {
      const cmdCard = dataMap[commanderFromText];
      if (cmdCard && cmdCard.type_line && /Legendary Creature/.test(cmdCard.type_line)) {
        setCommanderName(cmdCard.name);
        setColorIdentity(cmdCard.color_identity?.join("") || "");
        setMtgType(cmdCard.archetype || cmdCard.type_line || "");
        return;
      }
    }

    // Otherwise, fallback to first Legendary Creature found in data
    const commanderCard = Object.values(dataMap).find(
      (c) => c && c.type_line && /Legendary Creature/.test(c.type_line)
    );
    if (commanderCard) {
      setCommanderName(commanderCard.name);
      setColorIdentity(commanderCard.color_identity?.join("") || "");
      setMtgType(commanderCard.archetype || commanderCard.type_line || "");
    }
  }

  function handleParseClick() {
    if (!deckText.trim()) {
      setLogs(["Please enter a deck list first."]);
      return;
    }
    const parsed = parseDeck(deckText);

    // Check deck size limit here too and stop if exceeded
    const totalCardsCount = parsed.reduce((acc, c) => acc + c.count, 0);
    if (totalCardsCount > MAX_DECK_SIZE) {
      setMessage(
        `Error: Deck contains ${totalCardsCount} cards which exceeds the maximum allowed ${MAX_DECK_SIZE} cards. Please reduce deck size before importing.`
      );
      setDeckList([]);
      setCardsData({});
      setLogs([]);
      return;
    }

    setDeckList(parsed);

    const lines = deckText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const commanderFromText = findCommanderInText(lines);

    fetchCardsData(parsed, commanderFromText);
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

  function exportMTGA() {
    if (deckList.length === 0) return;
    const mtgaText = deckList.map(({ count, name }) => `${count} ${name}`).join("\n");
    downloadTextFile(mtgaText, "decklist.mtga.txt");
  }

  function exportMoxfield() {
    if (deckList.length === 0) return;

    const newWindow = window.open("https://moxfield.com/decks/personal", "_blank");
    if (!newWindow) {
      setMessage("Popup blocked! Please allow popups for this site.");
      return;
    }

    const deckTextToExport = deckList.map(({ count, name }) => `${count} ${name}`).join("\n");

    const blob = new Blob([deckTextToExport], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "decklist.txt";
    a.click();
    URL.revokeObjectURL(url);

    setMessage(
      "Decklist downloaded as 'decklist.txt'.\nPlease paste it into your new deck on the Moxfield page opened in the new tab."
    );
  }

  function downloadTextFile(text, filename) {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function saveDeck() {
    setMessage("");
    setLogs([]);
    if (!user) {
      setMessage("You must be logged in to save decks.");
      return;
    }
    if (!deckTitle.trim()) {
      setMessage("Please enter a deck title.");
      return;
    }
    if (deckList.length === 0) {
      setMessage("Parse and load a deck first.");
      return;
    }
    // Check deck size on save also!
    const totalCardsCount = deckList.reduce((acc, c) => acc + c.count, 0);
    if (totalCardsCount > MAX_DECK_SIZE) {
      setMessage(
        `Error: Deck contains ${totalCardsCount} cards which exceeds the maximum allowed ${MAX_DECK_SIZE} cards. Please reduce deck size before saving.`
      );
      return;
    }

    const decklistJson = JSON.stringify(deckList);

    setLoading(true);
    const { data, error } = await supabase.from("decks").insert([
      {
        user_id: user.id,
        title: deckTitle.trim(),
        commander_name: commanderName.trim(),
        color_identity: colorIdentity.trim(),
        mtg_type: mtgType.trim(),
        decklist: decklistJson,
      },
    ]);
    setLoading(false);

    if (error) {
      setMessage(`Error saving deck: ${error.message}`);
      console.error("Supabase insert error:", error);
      return;
    }

    setMessage(`Deck "${deckTitle}" saved successfully!`);
  }

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

      <div className="flex items-center gap-4 mb-6">
        <input
          type="file"
          accept=".txt"
          onChange={(e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
              setDeckText(ev.target.result);
            };
            reader.onerror = () => {
              setLogs(["Failed to read file. Please try again."]);
            };
            reader.readAsText(file);
          }}
          className="flex-grow max-w-xs border border-indigo-400 rounded px-3 py-2 bg-black shadow-sm cursor-pointer"
          disabled={loading}
          title="Upload decklist text file"
        />

        <button
          onClick={handleParseClick}
          disabled={loading}
          className={`flex-shrink-0 bg-indigo-700 text-white text-xl font-semibold py-3 px-6 rounded-lg shadow-lg hover:bg-indigo-800 transition duration-300 ${
            loading ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Loading Cards..." : "Parse & Load Cards"}
        </button>
      </div>

      {/* Input fields for saving */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block mb-1 font-semibold text-indigo-700" htmlFor="deckTitle">
            Deck Title
          </label>
          <input
            id="deckTitle"
            type="text"
            value={deckTitle}
            onChange={(e) => setDeckTitle(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 rounded border border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="Enter deck title"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-indigo-700" htmlFor="commanderName">
            Commander Name
          </label>
          <input
            id="commanderName"
            type="text"
            value={commanderName}
            onChange={(e) => setCommanderName(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 rounded border border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="Commander name"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-indigo-700" htmlFor="colorIdentity">
            Color Identity
          </label>
          <input
            id="colorIdentity"
            type="text"
            value={colorIdentity}
            onChange={(e) => setColorIdentity(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 rounded border border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="e.g. WUBRG"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-indigo-700" htmlFor="mtgType">
            MTG Type
          </label>
          <input
            id="mtgType"
            type="text"
            value={mtgType}
            onChange={(e) => setMtgType(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 rounded border border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="e.g. Commander, Core Set"
          />
        </div>
      </div>

      <div className="mb-6">
        <button
          onClick={saveDeck}
          disabled={loading || deckList.length === 0}
          className={`bg-green-600 text-black font-bold py-3 px-6 rounded shadow hover:bg-green-700 transition duration-300 ${
            loading || deckList.length === 0 ? "opacity-60 cursor-not-allowed" : ""
          }`}
          title="Save parsed deck to your Supabase collection"
        >
          Save Deck
        </button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => setViewMode("grid")}
            disabled={loading}
            className={`mr-2 px-4 py-2 rounded font-semibold transition ${
              viewMode === "grid"
                ? "bg-indigo-700 text-black"
                : "bg-indigo-200 text-indigo-800 hover:bg-indigo-400"
            }`}
          >
            Grid View
          </button>
          <button
            onClick={() => setViewMode("list")}
            disabled={loading}
            className={`px-4 py-2 rounded font-semibold transition ${
              viewMode === "list"
                ? "bg-indigo-700 text-black"
                : "bg-indigo-200 text-indigo-800 hover:bg-indigo-400"
            }`}
          >
            List View
          </button>
        </div>

        <div className="space-x-4">
          <button
            onClick={exportMTGA}
            disabled={deckList.length === 0 || loading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-black rounded shadow"
            title="Export decklist for MTGA import"
          >
            Export MTGA
          </button>
          <button
            onClick={exportMoxfield}
            disabled={deckList.length === 0 || loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-black rounded shadow"
            title="Export decklist for Moxfield import"
          >
            Export Moxfield
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-yellow-200 text-yellow-900 rounded shadow whitespace-pre-wrap font-mono">
          {message}
        </div>
      )}

      {logs.length > 0 && (
        <div className="mt-6 p-4 bg-yellow-100 border border-yellow-400 rounded text-yellow-900 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-sm">
          <strong>Logs / Warnings:</strong>
          <br />
          {logs.join("\n")}
        </div>
      )}

      {deckList.length === 0 ? (
        <p className="mt-10 text-center text-gray-600 text-xl italic">No cards parsed yet.</p>
      ) : viewMode === "grid" ? (
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
      ) : (
        <section className="bg-white p-6 rounded shadow max-h-[500px] overflow-auto font-mono text-lg text-black">
          <h3 className="text-3xl font-bold mb-6 text-indigo-900 drop-shadow-md">
            Deck List ({deckList.reduce((a, c) => a + c.count, 0)} cards)
          </h3>

          {Object.entries(categories).map(([category, cards]) =>
            cards.length > 0 ? (
              <div key={category} className="mb-6">
                <h4 className="text-2xl font-semibold mb-2 border-b-2 border-indigo-500">
                  {category} ({cards.reduce((acc, c) => acc + c.count, 0)})
                </h4>
                <pre className="whitespace-pre-wrap">
                  {cards.map(({ count, name }) => `${count} ${name}`).join("\n")}
                </pre>
              </div>
            ) : null
          )}
        </section>
      )}
    </div>
  );
}
