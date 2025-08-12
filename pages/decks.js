// pages/decks.js
import React, { useState, useRef, useEffect } from "react";
import Card from "../components/Card";
import { supabase } from "../lib/supabase";
import AddToCatalog from '../components/AddToCatalog';

const MAX_DECK_SIZE = 100;

export default function DeckBuilder() {
  const [deckText, setDeckText] = useState("");
  const [deckList, setDeckList] = useState([]);
  const [cardsData, setCardsData] = useState({});
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [message, setMessage] = useState("");

  const [deckTitle, setDeckTitle] = useState("");
  const [commanderName, setCommanderName] = useState("");
  const [colorIdentity, setColorIdentity] = useState("");
  const [mtgType, setMtgType] = useState("");

  const [user, setUser] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // initialize simple state on mount
    setDeckText("");
    setDeckList([]);
    setCardsData({});
    setLogs([]);
    setMessage("");

    // load supabase user
    supabase.auth.getUser().then(({ data: { user } = {} } = {}) => {
      if (user) setUser(user);
    });
  }, []);

  // === parseDeck ===
  function parseDeck(text) {
    if (!text) return [];
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const counts = {};
    const names = [];

    lines.forEach((line) => {
      // skip headers like "Main:" "Sideboard:" and suspicious colon lines
      if (/^[a-zA-Z ]+:$/.test(line)) return;
      if (/^(SB[: ]|Sideboard[: ]?)/i.test(line)) return;
      if (line.includes(":") && !/^(SB[: ]|Sideboard[: ]?)/i.test(line)) return;

      const match = line.match(/^(\d+)x?\s+(.*)$/i);
      const count = match ? parseInt(match[1], 10) : 1;
      const name = match ? match[2].trim() : line;

      if (!name) return;

      if (!counts[name]) {
        counts[name] = count;
        names.push(name);
      } else {
        counts[name] += count;
      }
    });

    return names.map((name) => ({ name, count: counts[name] }));
  }

  // === findCommanderInText ===
  function findCommanderInText(lines) {
    if (!Array.isArray(lines)) return null;
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = (lines[i] || "").trim();
      if (!line) continue;
      if (/^[a-zA-Z ]+:$/.test(line)) continue; // header meta
      if (/^(SB[: ]|Sideboard[: ]?)/i.test(line)) continue;

      const match = line.match(/^(\d+)x?\s+(.*)$/i);
      const name = match ? match[2].trim() : line;
      if (name) return name;
    }
    return null;
  }

  // === sendDiscordWebhook placeholder ===
  async function sendDiscordWebhook(card) {
    // optional, left as stub
    return;
  }

  // === fetchCardsData ===
  // Accepts deckList (array of {name,count}) and commanderFromText optional string.
  // Returns dataMap (object name->cardData)
  async function fetchCardsData(deckListParam = [], commanderFromText) {
    try {
      const totalCardsCount = deckListParam.reduce((acc, c) => acc + (c.count || 0), 0);
      if (totalCardsCount > MAX_DECK_SIZE) {
        setMessage(
          `Error: Deck contains ${totalCardsCount} cards which exceeds the maximum allowed ${MAX_DECK_SIZE} cards. Reduce deck size before importing.`
        );
        setCardsData(dataMap);
  setLogs(newLogs);
  setLoading(false);
    return dataMap;
      }

      setLoading(true);
      setLogs([]);
      setMessage("");

      // Prepare queue and worker pool
      const dataMap = {};
      const newLogs = [];
      const concurrencyLimit = 5;
      const queue = deckListParam.map((c) => ({ name: c.name }));

      // worker implementation
      const workers = new Array(concurrencyLimit).fill(null).map(async () => {
        while (queue.length > 0) {
          const item = queue.shift();
          if (!item) continue;
          const name = item.name;
          if (!name || !name.trim()) {
            const msg = `Skipping empty/invalid name: "${name}"`;
            console.warn(msg);
            newLogs.push(msg);
            continue;
          }

          // fetch via your API wrapper to Scryfall
          try {
            const res = await fetch(`/api/scryfall?name=${encodeURIComponent(name)}`);
            if (!res.ok) {
              const msg = `HTTP ${res.status} when fetching "${name}"`;
              console.warn(msg);
              newLogs.push(msg);
              dataMap[name] = null;
              continue;
            }
            const card = await res.json();
            if (card && card.object !== "error") {
              dataMap[name] = card;
              // optional webhook
              await sendDiscordWebhook(card);
              newLogs.push(`Fetched ${name}`);
            } else {
              const msg = `Card not found: "${name}"`;
              console.warn(msg);
              newLogs.push(msg);
              dataMap[name] = null;
            }
          } catch (err) {
            const msg = `Fetch error for "${name}": ${err?.message || err}`;
            console.error(msg);
            newLogs.push(msg);
            dataMap[name] = null;
          }
        }
      });

      // wait for all workers
      await Promise.all(workers);

      // set results in state
      setCardsData(dataMap);
      setLogs(newLogs);
      setLoading(false);

      // commander detection logic (prefer commanderFromText)
      if (commanderFromText) {
        const cmdCard = dataMap[commanderFromText];
        if (cmdCard && cmdCard.type_line && /Legendary Creature/.test(cmdCard.type_line)) {
          setCommanderName(cmdCard.name);
          setColorIdentity((cmdCard.color_identity || []).join("") || "");
          if (!mtgType || mtgType.trim() === "") {
            setMtgType("Commander");
          } else {
            setMtgType(cmdCard.archetype || cmdCard.type_line || mtgType);
          }
          return dataMap;
        }
      }

      const commanderCard = Object.values(dataMap).find(
        (c) => c && c.type_line && /Legendary Creature/.test(c.type_line)
      );
      if (commanderCard) {
        setCommanderName(commanderCard.name);
        setColorIdentity((commanderCard.color_identity || []).join("") || "");
        if (!mtgType || mtgType.trim() === "") {
          setMtgType("Commander");
        } else {
          setMtgType(commanderCard.archetype || commanderCard.type_line || mtgType);
        }
      }

      return dataMap;
    } catch (err) {
      console.error("fetchCardsData error:", err);
      setLogs((logs) => [...logs, `Fetch error: ${err?.message || err}`]);
      setLoading(false);
      return {};
    }
  }
// === addToInventory (robust) ===
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
    // build name => count map
    const nameCounts = {};
    deckList.forEach(({ name, count }) => {
      nameCounts[name] = (nameCounts[name] || 0) + (count || 0);
    });
    const names = Object.keys(nameCounts);

    // fetch username from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile username:", profileError);
      setLogs((logs) => [...logs, `Error fetching username: ${profileError.message}`]);
    }

    const usernameVal = profile?.username || user.email || "unknown";
    console.log("Username to use:", usernameVal);

    // Loop over cards to insert or update
    for (const name of names) {
      const countToAdd = nameCounts[name];
      const cardObj = cardsData[name] || null;
      if (!cardObj) {
        setLogs((logs) => [...logs, `No card data for "${name}", skipping.`]);
        continue;
      }

      // Use scryfall_id or id as unique card_id fallback to name
      const card_id = cardObj.scryfall_id || cardObj.id || name;

      // Check if card already exists for this user
      const { data: existing, error: fetchError } = await supabase
        .from("inventory")
        .select("*")
        .eq("user_id", user.id)
        .eq("card_id", card_id)
        .maybeSingle();

      if (fetchError) {
        console.error(`Error checking inventory for ${name}:`, fetchError);
        setLogs((logs) => [...logs, `Error checking ${name}: ${fetchError.message}`]);
        continue;
      }

      // Prepare colors array
      let colorsArray = [];
      if (Array.isArray(cardObj.color_identity) && cardObj.color_identity.length > 0) {
        colorsArray = cardObj.color_identity;
      } else if (Array.isArray(cardObj.colors) && cardObj.colors.length > 0) {
        colorsArray = cardObj.colors;
      } else {
        const manaCost = (cardObj.mana_cost || "").trim();
        const typeLine = (cardObj.type_line || "").trim();
        const hasColoredMana = /\{[WUBRG]\}/.test(manaCost);
        const isColorlessArtifact = typeLine.includes("Artifact");
        const isColorlessLand = typeLine.includes("Land") && manaCost === "";
        const producesColorless = manaCost.includes("{C}");
        if (!hasColoredMana && (isColorlessArtifact || isColorlessLand || producesColorless)) {
          colorsArray = ["Colorless"];
        }
      }

      const payload = {
        user_id: user.id,
        card_id,
        name: cardObj.name,
        scryfall_id: cardObj.scryfall_id,
        card_data: cardObj,
        quantity: countToAdd,
        image_url: cardObj.image_uris?.normal ?? null,
        back_image_url: cardObj.card_faces && cardObj.card_faces[1]?.image_uris?.normal
          ? cardObj.card_faces[1].image_uris.normal
          : null,
        set_name: cardObj.set_name ?? null,
        scryfall_uri: cardObj.scryfall_uri ?? null,
        type_line: cardObj.type_line ?? null,
        colors: colorsArray,
        rarity: cardObj.rarity ?? null,
        cmc: cardObj.cmc ?? null,
        oracle_text: cardObj.oracle_text ?? null,
        username: usernameVal,
        price: cardObj.prices?.usd ?? null,
      };

      if (existing) {
        // Update quantity by adding count
        const newQty = (existing.quantity || 0) + countToAdd;
        const updatePayload = { ...payload, quantity: newQty };

        const { error: updateError } = await supabase
          .from("inventory")
          .update(updatePayload)
          .eq("user_id", user.id)
          .eq("card_id", card_id);

        if (updateError) {
          console.error(`Error updating inventory for ${name}:`, updateError);
          setLogs((logs) => [...logs, `Update error for ${name}: ${updateError.message}`]);
        } else {
          setLogs((logs) => [...logs, `Updated ${name} quantity to ${newQty}`]);
        }
      } else {
        // Insert new row
        const { error: insertError } = await supabase.from("inventory").insert([payload]);

        if (insertError) {
          console.error(`Error inserting ${name} into inventory:`, insertError);
          setLogs((logs) => [...logs, `Insert error for ${name}: ${insertError.message}`]);
        } else {
          setLogs((logs) => [...logs, `Inserted ${countToAdd}x ${name} into inventory.`]);
        }
      }
    }

    setMessage("Inventory updated successfully.");
  } catch (e) {
    console.error("Error adding to inventory:", e);
    setMessage(`Error adding to inventory: ${e.message || e}`);
    setLogs((logs) => [...logs, `Error: ${e.message || e}`]);
  } finally {
    setLoading(false);
  }
}


  // === categorizeCards ===
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

  // === exports / save deck / other helpers ===
  function downloadTextFile(text, filename) {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

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
    setMessage("Decklist downloaded as 'decklist.txt'. Paste it into Moxfield.");
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
  const totalCardsCount = deckList.reduce((acc, c) => acc + (c.count || 0), 0);
  if (totalCardsCount > MAX_DECK_SIZE) {
    setMessage(`Error: Deck contains ${totalCardsCount} cards which exceeds maximum ${MAX_DECK_SIZE}.`);
    return;
  }
  
  setLoading(true);

  try {
    // Fetch username from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile username:", profileError);
    }
    const username = profile?.username || user.email || "unknown";

    const decklistJson = JSON.stringify(deckList);

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

    if (error) {
      setMessage(`Error saving deck: ${error.message}`);
      console.error("Supabase insert error:", error);
      setLoading(false);
      return;
    }

    setMessage(`Deck "${deckTitle}" saved successfully!`);
  } catch (e) {
    console.error("Error in saveDeck:", e);
    setMessage(`Error saving deck: ${e.message || e}`);
  } finally {
    setLoading(false);
  }
}


  // === handleParseClick ===
  async function handleParseClick() {
  if (!deckText.trim()) {
    setLogs(["Please enter a deck list first."]);
    return;
  }

  // parse deck text into [{name, count}, ...]
  const parsed = parseDeck(deckText);

  // validate deck size
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

  // extract commander (optional)
  const lines = deckText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const commanderFromText = findCommanderInText(lines);

  try {
    setLoading(true);
    setLogs([]);
    setMessage("");

    // IMPORTANT: fetchCardsData MUST return the dataMap (object mapping cardName -> cardData)
    const fetched = await fetchCardsData(parsed, commanderFromText);
    const map = fetched || cardsData; // fallback if fetchCardsData didn't return

    // update state with the fresh map (keeps UI consistent)
    if (map) setCardsData(map);

    // Add cards to catalog AFTER fetching data, using the parsed counts
    if (user) {
      setLogs((l) => [...l, "Adding cards to catalog..."]);

      for (const { name, count } of parsed) {
        const card = map[name] || cardsData[name];
        if (!card) {
          setLogs((l) => [...l, `No card data for "${name}", skipping catalog add.`]);
          continue;
        }

        try {
          // call AddToCatalog and pass count so it can set quantity
          const res = await AddToCatalog(card, user.id, count);
          if (!res || !res.success) {
            setLogs((l) => [...l, `Catalog add failed for "${name}": ${res?.message || 'unknown error'}`]);
          } else {
            setLogs((l) => [...l, `Added ${name} to catalog.`]);
          }
        } catch (err) {
          console.error("AddToCatalog threw:", err);
          setLogs((l) => [...l, `Catalog add thrown for "${name}": ${err?.message || err}`]);
        }
      }

      setMessage("Finished adding cards to catalog.");
    }
  } catch (err) {
    console.error("Error in handleParseClick:", err);
    setLogs((l) => [...l, `Error: ${err?.message || err}`]);
    setMessage("An error occurred during parsing / fetch.");
  } finally {
    setLoading(false);
  }
}


  // UI render (keeps your layout, simplified classes stable)
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
        <input
          type="file"
          accept=".txt"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => setDeckText(String(ev.target.result || ""));
            reader.onerror = () => setLogs(["Failed to read file."]);
            reader.readAsText(file);
          }}
          ref={inputRef}
          className="hidden"
          disabled={loading}
          title="Upload decklist text file"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded shadow hover:bg-black-800 disabled:opacity-50"
        >
          Upload file
        </button>

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

      {/* many UI controls — keep your earlier layout for title/commander fields */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block mb-0 font-semibold text-yellow-700" htmlFor="deckTitle">Deck Title</label>
          <input id="deckTitle" type="text" value={deckTitle} onChange={(e) => setDeckTitle(e.target.value)} disabled={loading} className="w-full px-3 py-2 rounded" placeholder="Enter deck title" />
        </div>
        <div>
          <label className="block mb-0 font-semibold text-yellow-700" htmlFor="commanderName">Commander Name</label>
          <input id="commanderName" type="text" value={commanderName} onChange={(e) => setCommanderName(e.target.value)} disabled={loading} className="w-full px-3 py-2 rounded" placeholder="Commander name" />
        </div>
        <div>
          <label className="block mb-0 font-semibold text-yellow-700" htmlFor="colorIdentity">Color Identity</label>
          <input id="colorIdentity" type="text" value={colorIdentity} onChange={(e) => setColorIdentity(e.target.value)} disabled={loading} className="w-full px-3 py-2 rounded" placeholder="e.g. WUBRG" />
        </div>
        <div>
          <label className="block mb-0 font-semibold text-yellow-700" htmlFor="mtgType">MTG Type</label>
          <input id="mtgType" type="text" value={mtgType} onChange={(e) => setMtgType(e.target.value)} disabled={loading} className="w-full px-3 py-2 rounded" placeholder="e.g. Commander" />
        </div>
      </div>

      <div className="mb-6">
        <button onClick={saveDeck} disabled={loading || deckList.length === 0} className="mr-2">Save Deck</button>

        {(deckList.length > 0 && ((mtgType || "").toLowerCase().includes("commander") || commanderName)) && (
          <button onClick={addToInventory} disabled={loading || deckList.length === 0} className="ml-4">Add to Inventory</button>
        )}
      </div>

      {message && <div className="mb-4 p-3 bg-yellow-200 text-yellow-900 rounded whitespace-pre-wrap font-mono">{message}</div>}

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
                <h3 className="text-3xl font-bold mb-6 border-b-4 border-indigo-500 pb-3">
                  {category} ({cards.reduce((a, c) => a + c.count, 0)})
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "24px" }}>
                  {cards.map(({ name, count, card }) => <Card key={name} card={card} count={count} />)}
                </div>
              </section>
            )
        )
      ) : (
        <section className="bg-white p-6 rounded shadow max-h-[500px] overflow-auto font-mono text-lg text-black">
          <h3 className="text-3xl font-bold mb-6 text-indigo-900">Deck List ({deckList.reduce((a, c) => a + c.count, 0)} cards)</h3>
          {Object.entries(categories).map(([category, cards]) =>
            cards.length > 0 ? (
              <div key={category} className="mb-6">
                <h4 className="text-2xl font-semibold mb-2 border-b-2 border-indigo-500">
                  {category} ({cards.reduce((acc, c) => acc + c.count, 0)})
                </h4>
                <pre className="space-pre-wrap">{cards.map(({ count, name }) => `${count} ${name}`).join("\n")}</pre>
              </div>
            ) : null
          )}
        </section>
      )}
    </div>
  );
}
