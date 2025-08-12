import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from '../lib/supabase';  // adjust path if needed


const cardsCache = {};

function getCardImageUrl(card) {
  if (!card) return null;
  if (card.image_uris?.small) return card.image_uris.small;
  if (card.card_faces && card.card_faces.length > 0) {
    const frontFace = card.card_faces[0];
    if (frontFace.image_uris?.small) return frontFace.image_uris.small;
    if (frontFace.image_uris?.normal) return frontFace.image_uris.normal;
    if (frontFace.image_uris?.large) return frontFace.image_uris.large;

    const backFace = card.card_faces[1];
    if (backFace?.image_uris?.small) return backFace.image_uris.small;
    if (backFace?.image_uris?.normal) return backFace.image_uris.normal;
    if (backFace?.image_uris?.large) return backFace.image_uris.large;
  }
  return null;
}

function getBroadType(typeLine) {
  if (!typeLine) return "Other";
  const broad = typeLine.split("—")[0].trim();
  return broad || "Other";
}

export default function MyDecks() {
  const [user, setUser] = useState(null);
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDeckId, setExpandedDeckId] = useState(null);
  const [error, setError] = useState(null);
  const [commanderImages, setCommanderImages] = useState({});
  const [modalViewMode, setModalViewMode] = useState("text");

  // Fetch user & decks on mount
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

  // Fetch decks from Supabase
  async function fetchDecks(userId) {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
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

  // Fetch commander images from Scryfall, avoiding duplicates
  async function fetchCommanderImages(decks) {
    const namesToFetch = decks
      .map((d) => d.commander_name)
      .filter((name) => name && !commanderImages[name]);

    if (namesToFetch.length === 0) return;

    // Fetch all commanders in parallel with Promise.all
    const fetches = namesToFetch.map(async (name) => {
      try {
        const res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`);
        const data = await res.json();
        if (data.object !== "error" && data.image_uris) {
          return { name, url: data.image_uris.normal || data.image_uris.small || "" };
        }
      } catch {
        return null;
      }
      return null;
    });

    const results = await Promise.all(fetches);
    const newImages = {};
    results.forEach((res) => {
      if (res) newImages[res.name] = res.url;
    });

    if (Object.keys(newImages).length > 0) {
      setCommanderImages((prev) => ({ ...prev, ...newImages }));
    }
  }

  // Fetch card data for all cards in all decks, caching results
  async function fetchAllCardsImages(decks) {
    const allCardNames = new Set();

    decks.forEach((deck) => {
      try {
        const cards = JSON.parse(deck.decklist || "[]");
        cards.forEach(({ name }) => {
          if (name && !cardsCache[name]) {
            allCardNames.add(name);
          }
        });
      } catch {
        // ignore malformed JSON
      }
    });

    if (allCardNames.size === 0) return;

    // Fetch all card data in parallel with limit to avoid spamming Scryfall
    const namesArray = Array.from(allCardNames);
    const BATCH_SIZE = 10;
    for (let i = 0; i < namesArray.length; i += BATCH_SIZE) {
      const batch = namesArray.slice(i, i + BATCH_SIZE);
      const fetches = batch.map(async (name) => {
        try {
          const res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`);
          const data = await res.json();
          if (data.object !== "error") {
            cardsCache[name] = data;
          }
        } catch {
          // ignore errors
        }
      });
      await Promise.all(fetches);
      // Trigger re-render after each batch
      setDecks((prev) => [...prev]);
    }
  }

  async function deleteDeck(id) {
    if (!confirm("Are you sure you want to delete this deck? This action cannot be undone.")) return;

    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.from("decks").delete().eq("id", id);
      if (error) throw error;

      setDecks((prev) => prev.filter((deck) => deck.id !== id));
      if (expandedDeckId === id) setExpandedDeckId(null);
    } catch (err) {
      setError(err.message || "Failed to delete deck.");
    } finally {
      setLoading(false);
    }
  }

  function groupCardsByBroadType(cards) {
    const groups = {};
    cards.forEach(({ name, count }) => {
      const cardData = cardsCache[name];
      const broadType = getBroadType(cardData?.type_line);
      if (!groups[broadType]) groups[broadType] = [];
      groups[broadType].push({ name, count, cardData });
    });
    return groups;
  }

  function isSplitCard(cardData) {
    if (!cardData) return false;
    return (
      cardData.layout === "split" ||
      cardData.layout === "transform" ||
      cardData.layout === "modal_dfc" ||
      cardData.layout === "double_faced_token" ||
      cardData.layout === "meld"
    );
  }

  const handleOverlayClick = (e) => {
    if (e.target.id === "deck-modal-overlay") {
      setExpandedDeckId(null);
    }
  };

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape" && expandedDeckId !== null) {
        setExpandedDeckId(null);
      }
    },
    [expandedDeckId]
  );

  useEffect(() => {
    if (expandedDeckId !== null) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [expandedDeckId, handleKeyDown]);

  const modalViewModes = [
    "text",
    "condensed",
    "grid",
    "stacks",
    "stacks-splits",
    "spoiler",
  ];

  const viewModeLabels = {
    text: "Text",
    condensed: "Condensed Text",
    grid: "Visual Grid",
    stacks: "Visual Stacks",
    "stacks-splits": "Visual Stacks (Splits)",
    spoiler: "Visual Spoiler",
  };

  function calculateDeckPrice(cards) {
    return cards.reduce((sum, c) => {
      const data = cardsCache[c.name];
      const price = parseFloat(data?.prices?.usd) || 0;
      return sum + c.count * price;
    }, 0);
  }

  // Renderers for each modal view mode:
  function renderTextView(cards) {
    const grouped = groupCardsByBroadType(cards);
    return (
      <div className="max-h-[70vh] overflow-y-auto space-y-6">
        {Object.entries(grouped).map(([broadType, cardsInGroup]) => (
          <section key={broadType}>
            <h4 className="text-lg font-semibold border-b border-indigo-600 mb-2">{broadType}</h4>
            <ul className="list-disc list-inside space-y-1">
              {cardsInGroup.map(({ name, count }) => (
                <li key={name} className="text-white font-mono text-sm">
                  {count} {name}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  function renderCondensedView(cards) {
    return (
      <div className="max-h-[70vh] overflow-y-auto font-mono text-xs text-indigo-200 space-y-1">
        {cards.map(({ name, count }, idx) => (
          <div key={`${name}-${idx}`}>
            {count} {name}
          </div>
        ))}
      </div>
    );
  }

  function renderGridView(cards) {
    return (
      <div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 lg:grid-cols-8 gap-4 max-h-[70vh] overflow-y-auto"
        role="list"
      >
        {cards.map(({ name, count }, idx) => {
          const cardData = cardsCache[name];
          const cardImage = getCardImageUrl(cardData);
          return (
            <Link
              key={`${name}-${idx}`}
              href={`/card/${encodeURIComponent(name)}`}
              className="relative flex flex-col items-center p-2 cursor-pointer hover:ring-2 hover:ring-indigo-400 transition"
              role="listitem"
              title={`${count}  ${name}`}
            >
              {cardImage ? (
                <>
                  <img
                    src={cardImage}
                    alt={name}
                    className="w-20 h-28 object-cover mb-1 rounded-none"
                    loading="lazy"
                    draggable={false}
                  />
                  {count > 1 && (
                    <div className="absolute top-1 right-1 bg-indigo-700 bg-opacity-80 text-white text-xs font-bold px-1 rounded select-none pointer-events-none">
                      {count}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-20 h-28 bg-transparent flex items-center justify-center text-indigo-400 font-mono text-xs text-center mb-1">
                  No Image
                </div>
              )}
              <div className="text-center text-sm font-semibold text-white">{name}</div>
            </Link>
          );
        })}
      </div>
    );
  }

  function renderStacksView(cards, showSplit = false) {
    const groups = groupCardsByBroadType(cards);

    return (
      <div className="max-h-[70vh] overflow-y-auto space-y-12 pr-2">
        {Object.entries(groups).map(([broadType, cardsInGroup]) => (
          <section key={broadType}>
            <h4 className="text-lg font-semibold text-cyan-400 mb-4">{broadType}</h4>
            <div className="flex items-end overflow-x-auto pb-4 relative">
              {cardsInGroup.map(({ name, cardData, count }, idx) => {
                const cardImage = getCardImageUrl(cardData);
                return (
                  <div
                    key={`${name}-${idx}`}
                    className="relative -ml-16 first:ml-0 hover:z-50 transition-all duration-300 cursor-pointer"
                    onMouseEnter={(e) => (e.currentTarget.style.zIndex = 1000)}
                    onMouseLeave={(e) => (e.currentTarget.style.zIndex = "")}
                    title={`${count}  ${name}`}
                  >
                    <Link href={`/card/${encodeURIComponent(name)}`}>
                      {cardImage ? (
                        <>
                          <img
                            src={cardImage}
                            alt={name}
                            className="w-[120px] h-auto rounded shadow-lg border border-gray-700"
                            loading="lazy"
                            draggable={false}
                          />
                          {count > 1 && (
                            <div className="absolute top-1 right-1 bg-indigo-700 bg-opacity-80 text-white text-xs font-bold px-1 rounded select-none pointer-events-none">
                              {count}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-[120px] h-[168px] bg-gray-900 flex items-center justify-center text-indigo-400 font-mono text-xs text-center">
                          No Image
                        </div>
                      )}
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    );
  }

  function renderSpoilerView(cards) {
    return (
      <div className="max-h-[80vh] overflow-y-auto flex flex-wrap items-start gap-6 p-2 justify-center">
        {cards.map(({ name, count }, idx) => {
          const cardData = cardsCache[name];
          const cardImage = getCardImageUrl(cardData);
          return (
            <Link
              key={`${name}-${idx}`}
              href={`/card/${encodeURIComponent(name)}`}
              className="relative cursor-pointer flex flex-col items-center"
              title={`${count}  ${name}`}
            >
              {cardImage ? (
                <>
                  <img
                    src={cardImage}
                    alt={name}
                    className="w-36 object-cover rounded-none"
                    loading="lazy"
                    draggable={false}
                  />
                  {count > 1 && (
                    <div className="absolute top-1 right-1 bg-indigo-700 bg-opacity-80 text-white text-xs font-bold px-1 rounded select-none pointer-events-none">
                      x{count}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-36 h-56 bg-transparent flex items-center justify-center text-indigo-400 font-mono text-xs text-center rounded-none">
                  No Image
                </div>
              )}
              <div className="text-center text-sm font-semibold mt-1 text-white whitespace-nowrap">
                {count}  {name}
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gradient-to-br from-blue-900 via-orange-900 to-red-400 min-h-screen text-black rounded-lg shadow-lg relative">
      <div className="mb-12">
        <img
          src="/assets/conjured Decks.png"
          alt="My Saved Decks"
          className="w-full max-w-4xl mx-auto rounded-lg shadow-lg"
        />
      </div>

      {loading && (
        <div className="text-center text-indigo-300 font-semibold text-xl">Loading your decks...</div>
      )}

      {error && (
        <div className="bg-green-700 bg-opacity-60 p-4 rounded mb-8 text-center font-semibold">{error}</div>
      )}

      {!loading && !error && decks.length === 0 && (
        <div className="text-indigo-900 text-center text-xl italic">
          No decks saved yet. Import and save some decks!
        </div>
      )}

      <div className={`space-y-10 ${expandedDeckId !== null ? "blur-sm pointer-events-none select-none" : ""}`}>
        {decks.map((deck) => {
          let cards = [];
          try {
            cards = JSON.parse(deck.decklist || "[]");
          } catch {
            cards = [];
          }
          const deckCount = cards.reduce((sum, c) => sum + (c.count || 0), 0);
          const totalPrice = calculateDeckPrice(cards);
          const commanderImg = commanderImages[deck.commander_name] || null;

          return (
            <div
              key={deck.id}
              className="bg-opacity-80 rounded-xl p-6 shadow-xl hover:shadow-2xl transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-28 bg-black rounded-lg overflow-hidden shadow-lg flex-shrink-0">
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
                    <p className="text-white/70">
                      <span className="font-semibold">Colors:</span>{" "}
                      {deck.color_identity ? deck.color_identity.split("").join(" • ") : "N/A"}
                    </p>
                    <p className="text-purple-300">
                      <span className="font-semibold">Type:</span> {deck.mtg_type || "N/A"}
                    </p>
                    <p className="text-yellow-300 text-sm">
                      <span className="font-semibold">Created:</span>{" "}
                      {new Date(deck.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-green-300 text-sm">
                      <span className="font-semibold">Total Cards:</span> {deckCount}
                    </p>
                    <p className="text-yellow-300 text-sm">
                      <span className="font-semibold">Total Price:</span> ${totalPrice.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setExpandedDeckId(deck.id)}
                    className="text-amber-400 drop-shadow-[0_0_6px_rgba(212,175,55,0.8)] bg-red-800 hover:bg-black font-semibold py-2 px-4 rounded shadow transition"
                    aria-expanded={expandedDeckId === deck.id}
                    aria-controls={`deck-cards-${deck.id}`}
                  >
                    Show Cards
                  </button>
                  <button
                    onClick={() => deleteDeck(deck.id)}
                    className="text-amber-400 drop-shadow-[0_0_6px_rgba(212,175,55,0.8)] bg-black border border-black rounded px-4 py-2 shadow transition"
                    aria-label={`Delete deck ${deck.title}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {expandedDeckId !== null && (
        <div
          id="deck-modal-overlay"
          className="fixed inset-0 bg-black bg-opacity-90 flex flex-col p-6 overflow-y-auto z-50"
          onClick={handleOverlayClick}
          aria-modal="true"
          role="dialog"
        >
          <button
            onClick={() => setExpandedDeckId(null)}
            className="self-end text-amber-400 drop-shadow-[0_0_6px_rgba(212,175,55,0.8)] rounded px-4 py-2 hover:bg-red-700"
            aria-label="Close deck view"
          >
            X
          </button>
          <div className="text-white mb-4 flex gap-4 flex-wrap justify-center">
            {modalViewModes.map((mode) => (
              <button
                key={mode}
                onClick={() => setModalViewMode(mode)}
                className={`rounded px-3 py-1 ${
                  modalViewMode === mode ? "bg-indigo-600" : "bg-indigo-900 hover:bg-indigo-700"
                }`}
                aria-pressed={modalViewMode === mode}
              >
                {viewModeLabels[mode]}
              </button>
            ))}
          </div>

          <div id={`deck-cards-${expandedDeckId}`} className="text-white" tabIndex={-1}>
            {(() => {
              const deck = decks.find((d) => d.id === expandedDeckId);
              if (!deck) return null;

              let cards = [];
              try {
                cards = JSON.parse(deck.decklist || "[]");
              } catch {
                cards = [];
              }

              switch (modalViewMode) {
                case "text":
                  return renderTextView(cards);
                case "condensed":
                  return renderCondensedView(cards);
                case "grid":
                  return renderGridView(cards);
                case "stacks":
                  return renderStacksView(cards);
                case "stacks-splits":
                  return renderStacksView(cards, true);
                case "spoiler":
                  return renderSpoilerView(cards);
                default:
                  return renderTextView(cards);
              }
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
