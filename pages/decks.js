import React, { useState, useRef, useEffect } from "react";
import Card from "../components/Card"; // Adjust path if needed
import { supabase } from '../lib/supabase';  // adjust path if needed

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

  // inputRef for hidden file input
  const inputRef = useRef(null);

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

    if (commanderFromText) {
      const cmdCard = dataMap[commanderFromText];
      if (cmdCard && cmdCard.type_line && /Legendary Creature/.test(cmdCard.type_line)) {
        setCommanderName(cmdCard.name);
        setColorIdentity(cmdCard.color_identity?.join("") || "");
        // If user hasn't set mtgType, set it to Commander so inventory button can appear
        if (!mtgType || mtgType.trim() === "") {
          setMtgType("Commander");
        } else {
          setMtgType(cmdCard.archetype || cmdCard.type_line || mtgType);
        }
        return;
      }
    }

    const commanderCard = Object.values(dataMap).find(
      (c) => c && c.type_line && /Legendary Creature/.test(c.type_line)
    );
    if (commanderCard) {
      setCommanderName(commanderCard.name);
      setColorIdentity(commanderCard.color_identity?.join("") || "");
      if (!mtgType || mtgType.trim() === "") {
        setMtgType("Commander");
      } else {
        setMtgType(commanderCard.archetype || commanderCard.type_line || mtgType);
      }
    }
  }

  function handleParseClick() {
    if (!deckText.trim()) {
      setLogs(["Please enter a deck list first."]);
      return;
    }
    const parsed = parseDeck(deckText);

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

  // robust Add Commander deck to Inventory (works with various column name schemas)
  async function addToInventory() {
  setMessage("");
  setLogs([]);

  if (!user) {
    setMessage("You must be logged in to add to inventory.");
    return;
  }

  const isCommander = (mtgType || "").toLowerCase().includes("commander") || !!commanderName;
  if (!isCommander) {
    setMessage("Inventory add is only available for Commander decks. Set MTG Type to 'Commander' or ensure a commander is detected.");
    return;
  }

  if (deckList.length === 0) {
    setMessage("No cards to add. Parse a deck first.");
    return;
  }

  setLoading(true);

  try {
    // Build a name => count map
    const nameCounts = {};
    deckList.forEach(({ name, count }) => {
      nameCounts[name] = (nameCounts[name] || 0) + count;
    });
    const names = Object.keys(nameCounts);

    // Assuming you have user.id from auth
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('username')
  .eq('id', user.id)
  .single();

if (profileError) {
  console.error('Error fetching profile username:', profileError);
}

const usernameVal = profile?.username || user.email || "unknown";

    // Fetch a sample of inventory rows (no column assumptions)
    const { data: allInv = [], error: fetchErr } = await supabase
      .from("inventory")
      .select("*")
      .limit(1000);

    if (fetchErr) {
      throw fetchErr;
    }

    const sampleRow = allInv.length > 0 ? allInv[0] : null;
    const sampleKeys = sampleRow ? Object.keys(sampleRow) : [];

    // Helper to find actual column name from common candidates (case-insensitive)
    function findKey(candidates) {
      if (!sampleKeys || sampleKeys.length === 0) return null;
      for (const cand of candidates) {
        const found = sampleKeys.find((k) => k.toLowerCase() === cand.toLowerCase());
        if (found) return found;
      }
      return null;
    }

    // Detect key names present in the table
    const idKey = findKey(['id', 'inventory_id', 'row_id']) || 'id';
    const nameKey = findKey(['card_name', 'cardname', 'name', 'card']) || null;
    const quantityKey = findKey(['quantity', 'qty', 'count']) || 'quantity';
    const userIdKey = findKey(['user_id', 'userid', 'owner_id']) || 'user_id';
    const usernameKey = findKey(['username', 'user_name', 'user']) || 'username';
    const priceKey = findKey(['price', 'usd_price', 'price_usd', 'card_price']) || 'price';
    const typeLineKey = findKey(['type_line', 'typeline', 'type']) || 'type_line';
    const colorsKey = findKey(['colors', 'color_identity', 'color', 'coloridentity']) || 'colors';
    const rarityKey = findKey(['rarity']) || 'rarity';
    const cmcKey = findKey(['cmc', 'converted_mana_cost']) || 'cmc';
    const oracleKey = findKey(['oracle_text', 'oracletext', 'text', 'oracle']) || 'oracle_text';
    const sourceKey = findKey(['source']) || 'source';



    // Build map of existing rows for this user (keyed by normalized card name)
    let existingForUser = [];

    if (allInv.length > 0) {
      // Check if userIdKey or usernameKey present for filtering existing rows
      const uidPresent = sampleKeys.map(k => k.toLowerCase()).includes(userIdKey.toLowerCase());
      const unamePresent = sampleKeys.map(k => k.toLowerCase()).includes(usernameKey.toLowerCase());

      if (uidPresent) {
        existingForUser = allInv.filter(r => {
          try {
            return String(r[userIdKey]) === String(user.id);
          } catch (e) {
            return false;
          }
        });
      } else if (unamePresent) {
        existingForUser = allInv.filter(r => {
          try {
            return String(r[usernameKey]) === String(usernameVal);
          } catch (e) {
            return false;
          }
        });
      } else {
        // Fallback: rows with matching card names
        existingForUser = allInv.filter(r => {
          const candidateName = (r[nameKey] || r['name'] || r['card_name'] || r['cardname'] || r['card']);
          if (!candidateName) return false;
          return names.includes(String(candidateName));
        });
      }
    }

    // Create map of existing rows keyed by lowercase card name for quick lookup
    const existingMap = {};
    existingForUser.forEach(row => {
      const cardName = (row[nameKey] || row['name'] || row['card_name'] || row['cardname'] || row['card']);
      if (cardName) {
        existingMap[cardName.toLowerCase()] = row;
      }
    });

    // Arrays to hold insert and update payloads
    const inserts = [];
    const updates = [];

    // Build insert/update payloads using detected column names
   // At the top: find keys (keep your existing keys)
const imageUrlKey = findKey(['image_url', 'imageurl', 'image']) || 'image_url';
const backImageUrlKey = findKey(['back_image_url', 'backimageurl', 'backimage']) || 'back_image_url';
const setNameKey = findKey(['set_name', 'setname', 'set']) || 'set_name';
const scryfallUriKey = findKey(['scryfall_uri', 'scryfalluri', 'scryfall']) || 'scryfall_uri';
const scryfallIdKey = findKey(['scryfall_id', 'scryfallid', 'scryfall']) || 'scryfall_id';

// Loop over card names (your existing for loop)
for (const n of names) {
  const countToAdd = nameCounts[n];
  const cardObj = cardsData[n] || null;

  if (!cardObj) continue; // skip if no data

  // === FIX: build colorsArray with colorless detection ===
  let colorsArray = [];
  if (cardObj.color_identity && cardObj.color_identity.length > 0) {
    colorsArray = cardObj.color_identity;
  } else if (cardObj.colors && cardObj.colors.length > 0) {
    colorsArray = cardObj.colors;
  } else {
    // Detect colorless cards explicitly:
    const manaCost = cardObj.mana_cost || '';
    const typeLine = cardObj.type_line || '';

    if (
      manaCost.includes('{C}') ||
      (typeLine.includes('Land') && manaCost === '') ||
      (typeLine.includes('Artifact') && (manaCost === '' || manaCost === '{0}' || manaCost == null))
    ) {
      colorsArray = ['Colorless'];
    }
  }

  // Now gather other card fields
  const price = cardObj.prices?.usd ?? null;
  const type_line = cardObj.type_line ?? null;
  const rarity = cardObj.rarity ?? null;
  const cmc = cardObj.cmc ?? null;
  const oracle_text = cardObj.oracle_text ?? null;

  const image_url = cardObj.image_uris?.normal ?? null;
  const back_image_url = cardObj.card_faces && cardObj.card_faces[1]?.image_uris?.normal
    ? cardObj.card_faces[1].image_uris.normal
    : null;
  const set_name = cardObj.set_name ?? null;
  const scryfall_uri = cardObj.scryfall_uri ?? null;
  const scryfall_id = cardObj.id ?? null;

  const existingRow = existingMap[n.toLowerCase()];

  if (existingRow) {
    // Prepare update payload
    const payload = {};
    payload[quantityKey] = (existingRow[quantityKey] || existingRow['quantity'] || 0) + countToAdd;
    if (priceKey) payload[priceKey] = price;
    if (typeLineKey) payload[typeLineKey] = type_line;
    if (colorsKey) payload[colorsKey] = colorsArray.length > 0 ? colorsArray : null;
    if (rarityKey) payload[rarityKey] = rarity;
    if (cmcKey) payload[cmcKey] = cmc;
    if (oracleKey) payload[oracleKey] = oracle_text;
    if (usernameKey) payload[usernameKey] = usernameVal;
    if (imageUrlKey) payload[imageUrlKey] = image_url;
    if (backImageUrlKey) payload[backImageUrlKey] = back_image_url;
    if (setNameKey) payload[setNameKey] = set_name;
    if (scryfallUriKey) payload[scryfallUriKey] = scryfall_uri;
    if (scryfallIdKey) payload[scryfallIdKey] = scryfall_id;

    updates.push({
      idValue: existingRow[idKey] ?? existingRow['id'],
      payload,
    });
  } else {
    // Prepare insert payload
    const payload = {};
    if (userIdKey) payload[userIdKey] = user.id;
    if (usernameKey) payload[usernameKey] = usernameVal;
    if (nameKey) payload[nameKey] = n;
    else payload['card_name'] = n;
    payload[quantityKey] = countToAdd;
    if (priceKey) payload[priceKey] = price;
    if (typeLineKey) payload[typeLineKey] = type_line;
    if (colorsKey) payload[colorsKey] = colorsArray.length > 0 ? colorsArray : null;
    if (rarityKey) payload[rarityKey] = rarity;
    if (cmcKey) payload[cmcKey] = cmc;
    if (oracleKey) payload[oracleKey] = oracle_text;
    if (imageUrlKey) payload[imageUrlKey] = image_url;
    if (backImageUrlKey) payload[backImageUrlKey] = back_image_url;
    if (setNameKey) payload[setNameKey] = set_name;
    if (scryfallUriKey) payload[scryfallUriKey] = scryfall_uri;
    if (scryfallIdKey) payload[scryfallIdKey] = scryfall_id;

    inserts.push(payload);
  }
}



    // Now perform updates
    for (const upd of updates) {
      const { idValue, payload } = upd;
      const { data, error } = await supabase
        .from("inventory")
        .update(payload)
        .eq(idKey, idValue);

      if (error) {
        console.error("Error updating inventory:", error);
        setLogs((logs) => [...logs, `Update error for id ${idValue}: ${error.message}`]);
      } else {
        setLogs((logs) => [...logs, `Updated card id ${idValue} quantity to ${payload[quantityKey]}`]);
      }
    }

    // Perform inserts
    if (inserts.length > 0) {
      const { data, error } = await supabase
        .from("inventory")
        .insert(inserts);

      if (error) {
        console.error("Error inserting into inventory:", error);
        setLogs((logs) => [...logs, `Insert error: ${error.message}`]);
        throw error;
      } else {
        setLogs((logs) => [...logs, `Inserted ${inserts.length} new cards into inventory.`]);
      }
    }

    setMessage("Inventory updated successfully.");
  } catch (e) {
    console.error("Error adding to inventory:", e);
    setMessage(`Error adding to inventory: ${e.message || e}`);
  } finally {
    setLoading(false);
  }
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

    const totalCardsCount = deckList.reduce((acc, c) => acc + c.count, 0);
    if (totalCardsCount > MAX_DECK_SIZE) {
      setMessage(
        `Error: Deck contains ${totalCardsCount} cards which exceeds the maximum allowed ${MAX_DECK_SIZE} cards. Please reduce deck size before saving.`
      );
      return;
    }

    const decklistJson = JSON.stringify(deckList);
    const username = user.user_metadata?.user_name || user.email || "unknown";

    setLoading(true);
    const { data, error } = await supabase.from("decks").insert([
      {
        user_id: user.id,
        username,
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
    <div className="max-w-7xl mx-auto p-6 bg-black text-white rounded-lg shadow-xl">
      <h2 className="text-4xl font-extrabold mb-8 text-center text-black-900 drop-shadow-md">
        Deck Importer & Viewer
      </h2>

      <textarea
        value={deckText}
        onChange={(e) => setDeckText(e.target.value)}
        placeholder="Paste your deck list here..."
        rows={8}
        className="w-full border-indigo-400 rounded-3g shadow-inner mb-6 font-mono text-lg resize-none focus:outline-none focus:ring-4 focus:ring-indigo-300"
        disabled={loading}
      />

      <div className="flex items-center gap-4 mb-6">
        {/* Hidden file input */}
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
          ref={inputRef}
          className="hidden"
          disabled={loading}
          title="Upload decklist text file"
        />

        {/* Custom black button to open file dialog */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded shadow hover:bg-blacks-800 disabled:opacity-50"
          title="Upload decklist text file"
        >
          Upload file
        </button>

        {/* Parse & Load Cards button */}
        <button
          onClick={handleParseClick}
          disabled={loading}
          className={`flex-shrink-0 bg-black-700 text-white text-xl font-semibold py-3 px-6 rounded-lg shadow-lg hover:bg-black-800 transition duration-300 ${
            loading ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Loading Cards..." : "Parse & Load Cards"}
        </button>
      </div>

      {/* Input fields for saving */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
        <div>
          <label
            className="block mb-0 font-semibold text-yellow-700 border-black-500 drop-shadow-md"
            htmlFor="deckTitle"
          >
            Deck Title
          </label>
          <input
            id="deckTitle"
            type="text"
            value={deckTitle}
            onChange={(e) => setDeckTitle(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 rounded-3g border-black-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="Enter deck title"
          />
        </div>

        <div>
          <label
            className="block mb-0 font-semibold text-yellow-700 border-black-500 drop-shadow-md"
            htmlFor="commanderName"
          >
            Commander Name
          </label>
          <input
            id="commanderName"
            type="text"
            value={commanderName}
            onChange={(e) => setCommanderName(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 rounded-3g border-black-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="Commander name"
          />
        </div>

        <div>
          <label
            className="block mb-0 font-semibold text-yellow-700 border-black-500 drop-shadow-md"
            htmlFor="colorIdentity"
          >
            Color Identity
          </label>
          <input
            id="colorIdentity"
            type="text"
            value={colorIdentity}
            onChange={(e) => setColorIdentity(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 rounded-3g border-black-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="e.g. WUBRG"
          />
        </div>

        <div>
          <label
            className="block mb-0 font-semibold text-yellow-700 border-black-500 drop-shadow-md"
            htmlFor="mtgType"
          >
            MTG Type
          </label>
          <input
            id="mtgType"
            type="text"
            value={mtgType}
            onChange={(e) => setMtgType(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 rounded-3g border-black-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="e.g. Commander, Core Set"
          />
        </div>
      </div>

      <div className="mb-6">
        <button
          onClick={saveDeck}
          disabled={loading || deckList.length === 0}
          className={`bg-transparent p-0 border-0 rounded shadow-none hover:opacity-90 transition duration-300 ${
            loading || deckList.length === 0 ? "opacity-50 cursor-not-allowed" : ""
          }`}
          title="Save parsed deck to your Supabase collection"
        >
          <img
            src="/assets/savedeck.png"
            alt="Save Deck"
            className="w-auto h-14 pointer-events-none"
          />
        </button>

        {/* Add to Inventory button: appears when a Commander is detected or MTG Type includes "Commander" */}
        {(deckList.length > 0 && ((mtgType || "").toLowerCase().includes("commander") || commanderName)) && (
          <button
            onClick={addToInventory}
            disabled={loading || deckList.length === 0}
            title="Add parsed deck cards to your inventory (Commander decks only)"
            className="ml-4 p-0 border-0 bg-transparent"
          >
            <img
              src="/assets/Addbut.png"
              alt="Add to Inventory"
              className="w-auto h-14 pointer-events-none"
              style={{ display: "inline-block" }}
            />
          </button>
        )}

        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode("grid")}
              disabled={loading}
              className={`px-1 py-2 rounded font-semibold transition ${
                viewMode === "grid"
                  ? "bg-black-700 text-yellow-700 border-black-500"
                  : "bg-indigo-200 text-indigo-800 hover:bg-black-400"
              }`}
            >
              Grid View
            </button>
            <button
              onClick={() => setViewMode("list")}
              disabled={loading}
              className={`px-4 py-2 rounded font-semibold transition ${
                viewMode === "list" ? "bg-white-700 text-yellow-700" : "bg-indigo-200 text-indigo-800"
              }`}
            >
              List View
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 mt-4 flex flex-col items-start">
        <button
          onClick={exportMTGA}
          disabled={deckList.length === 0 || loading}
          className="bg-black hover:bg-black-800 text-yellow-400 border border-black rounded px-4 py-2 shadow disabled:opacity-50"
          title="Export decklist for MTGA import"
        >
          Export MTGA
        </button>
        <button
          onClick={exportMoxfield}
          disabled={deckList.length === 0 || loading}
          className="bg-black hover:bg-black-800 text-yellow-400 border border-black rounded px-4 py-2 shadow disabled:opacity-50"
          title="Export decklist for Moxfield import"
        >
          Export Moxfield
        </button>
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
        <p className="mt-10 text-center text-black-600 text-xl italic">No cards parsed yet.</p>
      ) : viewMode === "grid" ? (
        Object.entries(categories).map(
          ([category, cards]) =>
            cards.length > 0 && (
              <section key={category} className="mb-16">
                <h3 className="text-3xl font-bold mb-6 border-b-4 border-indigo-500 pb-3 text-black-900 drop-shadow-md">
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
                <pre className="space-pre-wrap">
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
