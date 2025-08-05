import React, { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Local cache for card data keyed by card name
const cardsCache = {};

// Helper function to get best image URL from card data (handles double-faced cards)
function getCardImageUrl(card) {
  if (!card) return null;

  if (card.image_uris?.small) return card.image_uris.small;

  if (card.card_faces && card.card_faces.length > 0) {
    // Try front face image first
    const frontFace = card.card_faces[0];
    if (frontFace.image_uris?.small) return frontFace.image_uris.small;
    if (frontFace.image_uris?.normal) return frontFace.image_uris.normal;
    if (frontFace.image_uris?.large) return frontFace.image_uris.large;

    // Fallback to back face image
    const backFace = card.card_faces[1];
    if (backFace?.image_uris?.small) return backFace.image_uris.small;
    if (backFace?.image_uris?.normal) return backFace.image_uris.normal;
    if (backFace?.image_uris?.large) return backFace.image_uris.large;
  }

  return null;
}

export default function MyDecks() {
  const [user, setUser] = useState(null);
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDeckId, setExpandedDeckId] = useState(null);
  const [error, setError] = useState(null);
  const [commanderImages, setCommanderImages] = useState({});
  const [viewModeByDeck, setViewModeByDeck] = useState({}); // { [deckId]: 'grid' | 'list' }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        fetchDecks(user.id);
      } else {
        setLoading(false);
        setError("You must be logged in to view your decks.");
      }
    });
  }, []);

  async function fetchDecks(userId) {
    setLoading(true);
    setError(null);
    try {
      let { data, error } = await supabase
        .from("decks")
        .select("id, title, commander_name, color_identity, mtg_type, decklist, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setDecks(data || []);
      if (data && data.length > 0) {
        fetchCommanderImages(data);
        fetchAllCardsImages(data);
      }
    } catch (err) {
      setError(err.message || "Failed to load decks.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCommanderImages(decks) {
    const namesToFetch = decks
      .map((d) => d.commander_name)
      .filter((name) => name && !commanderImages[name]);

    for (const name of namesToFetch) {
      try {
        const res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`);
        const data = await res.json();
        if (data.object !== "error" && data.image_uris) {
          setCommanderImages((prev) => ({
            ...prev,
            [name]: data.image_uris.normal || data.image_uris.small || "",
          }));
        }
      } catch {}
    }
  }

  async function fetchAllCardsImages(decks) {
    const allCardNames = new Set();
    decks.forEach((deck) => {
      try {
        const cards = JSON.parse(deck.decklist || "[]");
        cards.forEach((c) => {
          if (c.name && !cardsCache[c.name]) {
            allCardNames.add(c.name);
          }
        });
      } catch {}
    });

    for (const name of allCardNames) {
      try {
        const res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`);
        const data = await res.json();
        if (data.object !== "error") {
          cardsCache[name] = data;
          setDecks((prev) => [...prev]); // trigger rerender
        }
      } catch {}
    }
  }

  async function deleteDeck(id) {
    if (!confirm("Are you sure you want to delete this deck? This action cannot be undone.")) return;

    setLoading(true);
    setError(null);
    try {
      let { error } = await supabase.from("decks").delete().eq("id", id);
      if (error) throw error;

      setDecks((prev) => prev.filter((deck) => deck.id !== id));
      if (expandedDeckId === id) setExpandedDeckId(null);
      setViewModeByDeck((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } catch (err) {
      setError(err.message || "Failed to delete deck.");
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(id) {
    setExpandedDeckId((prev) => (prev === id ? null : id));
  }

  function toggleViewMode(deckId) {
    setViewModeByDeck((prev) => ({
      ...prev,
      [deckId]: prev[deckId] === "list" ? "grid" : "list",
    }));
  }

  // Group cards by type_line, fallback to "Other"
  function groupCardsByType(cards) {
    const groups = {};
    cards.forEach(({ name, count }) => {
      const cardData = cardsCache[name];
      const typeLine = cardData?.type_line || "Other";
      if (!groups[typeLine]) groups[typeLine] = [];
      groups[typeLine].push({ name, count, cardData });
    });
    return groups;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 min-h-screen text-white rounded-lg shadow-lg">
      <div className="mb-12">
  <img
    src="/assets/conjured Decks.png"
    alt="My Saved Decks"
    className="w-full max-w-4xl mx-auto rounded-lg shadow-lg"
  />
</div>


      {loading && <div className="text-center text-indigo-300 font-semibold text-xl">Loading your decks...</div>}

      {error && <div className="bg-red-700 bg-opacity-60 p-4 rounded mb-8 text-center font-semibold">{error}</div>}

      {!loading && !error && decks.length === 0 && (
        <div className="text-indigo-400 text-center text-xl italic">No decks saved yet. Import and save some decks!</div>
      )}

      <div className="space-y-10">
        {decks.map((deck) => {
          let cards = [];
          try {
            cards = JSON.parse(deck.decklist || "[]");
          } catch {
            cards = [];
          }
          const deckCount = cards.reduce((sum, c) => sum + (c.count || 0), 0);
          const commanderImg = commanderImages[deck.commander_name] || null;
          const isExpanded = expandedDeckId === deck.id;
          const viewMode = viewModeByDeck[deck.id] || "grid";

          const groupedCards = groupCardsByType(cards);

          return (
            <div
              key={deck.id}
              className="bg-indigo-700 bg-opacity-80 rounded-xl p-6 shadow-xl hover:shadow-2xl transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Commander Image & Info */}
                <div className="flex items-center gap-4">
                  <div className="w-20 h-28 bg-indigo-900 rounded-lg overflow-hidden shadow-lg flex-shrink-0">
                    {commanderImg ? (
                      <img
                        src={commanderImg}
                        alt={deck.commander_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        draggable={false}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-indigo-400 font-mono text-xs px-1 text-center">
                        No Commander Image
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{deck.title}</h2>
                    <p className="text-indigo-300">
                      <span className="font-semibold">Commander:</span> {deck.commander_name || "N/A"}
                    </p>
                    <p className="text-indigo-300">
                      <span className="font-semibold">Colors:</span>{" "}
                      {deck.color_identity ? deck.color_identity.split("").join(" • ") : "N/A"}
                    </p>
                    <p className="text-indigo-300">
                      <span className="font-semibold">Type:</span> {deck.mtg_type || "N/A"}
                    </p>
                    <p className="text-indigo-300 text-sm">
                      <span className="font-semibold">Created:</span> {new Date(deck.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-indigo-300 text-sm">
                      <span className="font-semibold">Total Cards:</span> {deckCount}
                    </p>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => toggleExpand(deck.id)}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded shadow transition"
                    aria-expanded={isExpanded}
                    aria-controls={`deck-cards-${deck.id}`}
                  >
                    {isExpanded ? "Collapse Cards" : "Show Cards"}
                  </button>
                  {isExpanded && (
                    <button
                      onClick={() => toggleViewMode(deck.id)}
                      className="bg-indigo-400 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded shadow transition"
                      aria-label={`Toggle view mode for deck ${deck.title}`}
                    >
                      {viewMode === "grid" ? "List View" : "Grid View"}
                    </button>
                  )}
                  <button
                    onClick={() => deleteDeck(deck.id)}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded shadow transition"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Expanded Cards List */}
              {isExpanded && (
                <div
                  id={`deck-cards-${deck.id}`}
                  className="mt-6 bg-indigo-900 bg-opacity-90 rounded-lg p-4 overflow-x-auto"
                >
                  <h3 className="text-xl font-bold mb-4 border-b border-indigo-600 pb-2">
                    Cards in "{deck.title}"
                  </h3>

                  {viewMode === "grid" ? (
                    <div
                      className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 max-h-96 overflow-y-auto"
                      role="list"
                    >
                      {cards.map(({ name, count }, idx) => {
                        const cardData = cardsCache[name];
                        const cardImage = getCardImageUrl(cardData);
                        return (
                          <Link
                            key={`${name}-${idx}`}
                            href={`/card/${encodeURIComponent(name)}`}
                            className="bg-indigo-800 rounded-lg shadow-lg flex flex-col items-center p-2 hover:ring-2 hover:ring-indigo-400 transition"
                            role="listitem"
                            title={`${count} × ${name}`}
                          >
                            {cardImage ? (
                              <img
                                src={cardImage}
                                alt={name}
                                className="w-20 h-28 rounded-md object-cover mb-1"
                                loading="lazy"
                                draggable={false}
                              />
                            ) : (
                              <div className="w-20 h-28 bg-indigo-700 flex items-center justify-center text-indigo-400 font-mono text-xs text-center rounded mb-1">
                                No Image
                              </div>
                            )}
                            <div className="text-center text-sm font-semibold">{name}</div>
                            <div className="text-indigo-300 text-xs">{count}×</div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    // LIST VIEW: grouped by type_line
                    <div className="max-h-96 overflow-y-auto">
                      {Object.entries(groupedCards).map(([typeLine, cardsInGroup]) => (
                        <section key={typeLine} className="mb-6">
                          <h4 className="text-lg font-semibold border-b border-indigo-600 mb-3">{typeLine}</h4>
                          <ul role="list" className="space-y-2">
                            {cardsInGroup.map(({ name, count, cardData }, idx) => {
                              const cardImage = getCardImageUrl(cardData);
                              return (
                                <li
                                  key={`${name}-${idx}`}
                                  className="flex items-center gap-4 bg-indigo-800 rounded-md p-2 hover:ring-2 hover:ring-indigo-400 transition cursor-pointer"
                                >
                                  <Link href={`/card/${encodeURIComponent(name)}`} className="flex items-center gap-4 w-full">
                                    {cardImage ? (
                                      <img
                                        src={cardImage}
                                        alt={name}
                                        className="w-12 h-16 rounded-md object-cover flex-shrink-0"
                                        loading="lazy"
                                        draggable={false}
                                      />
                                    ) : (
                                      <div className="w-12 h-16 bg-indigo-700 flex items-center justify-center text-indigo-400 font-mono text-xs text-center rounded">
                                        No Image
                                      </div>
                                    )}
                                    <div className="flex flex-col justify-center flex-grow">
                                      <span className="text-sm font-semibold text-white">{name}</span>
                                      <span className="text-xs text-indigo-300">{count}×</span>
                                    </div>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </section>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
