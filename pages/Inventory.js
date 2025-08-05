import React, {
  useState,
  useEffect,
  useCallback,
  memo,
  useMemo,
  useRef,
} from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import CardCountDisplay from '../components/CardCountDisplay';

// Added Colorless with code 'C'
const colorOptions = [
  { code: 'W', label: 'White' },
  { code: 'U', label: 'Blue' },
  { code: 'B', label: 'Black' },
  { code: 'R', label: 'Red' },
  { code: 'G', label: 'Green' },
  { code: 'Colorless', label: 'Colorless' }, // Added Colorless
];

const CardItem = memo(
  function CardItem({ card, onClick, onDelete, onHover, flipped, onFlip }) {
    const frontImage = card.image_url || '/placeholder.jpg';
    const backImage = card.back_image_url || null;
    const displayedImage = flipped && backImage ? backImage : frontImage;

    return (
      <div
        className="relative group cursor-pointer rounded-xl overflow-hidden shadow-md bg-[#0a1528] w-[172px] h-[240px]"
        onClick={() => onClick(card)}
        onMouseEnter={() => onHover(card)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(card);
          }
        }}
        aria-label={`View details for ${card.name}`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(card.id);
          }}
          className="absolute top-2 right-2 z-30 bg-red-700 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          type="button"
        >
          ❌
        </button>
        {backImage && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFlip(card.id);
            }}
            className="absolute top-2 left-2 z-20 bg-gray-800 bg-opacity-75 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            type="button"
          >
            🔁
          </button>
        )}
        <img
          src={displayedImage}
          alt={card.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/placeholder.jpg';
          }}
          draggable={false}
        />
        {card.quantity > 1 && (
          <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded-md">
            ×{card.quantity}
          </div>
        )}
      </div>
    );
  },
  (prev, next) => prev.card.id === next.card.id && prev.flipped === next.flipped
);

export default function Inventory() {
  // --- state hooks ---
  const [cardName, setCardName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [flippedCards, setFlippedCards] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const hoveredCardRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showFilters, setShowFilters] = useState(true);
  const router = useRouter();

  // --- filter state ---
  const [fName, setFName] = useState('');
  const [fSet, setFSet] = useState('');
  const [fMinQty, setFMinQty] = useState('');
  const [fMaxQty, setFMaxQty] = useState('');
  const [fMinPrice, setFMinPrice] = useState('');
  const [fMaxPrice, setFMaxPrice] = useState('');
  const [fTypes, setFTypes] = useState([]);
  const [fColors, setFColors] = useState([]);

  // load user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  // fetch inventory with filters applied server-side
  const fetchInventory = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from('inventory')
      .select(
        'id, name, quantity, price, image_url, back_image_url, set_name, scryfall_uri, scryfall_id, type_line, colors'
      )
      .eq('user_id', user.id);

    // filters
    if (fName.trim() !== '') {
      query = query.ilike('name', `%${fName.trim()}%`);
    }
    if (fSet !== '') {
      query = query.eq('set_name', fSet);
    }
    if (fMinQty !== '') {
      const minQty = parseInt(fMinQty, 10);
      if (!isNaN(minQty)) query = query.gte('quantity', minQty);
    }
    if (fMaxQty !== '') {
      const maxQty = parseInt(fMaxQty, 10);
      if (!isNaN(maxQty)) query = query.lte('quantity', maxQty);
    }
    if (fMinPrice !== '') {
      const minPrice = parseFloat(fMinPrice);
      if (!isNaN(minPrice)) query = query.gte('price', minPrice);
    }
    if (fMaxPrice !== '') {
      const maxPrice = parseFloat(fMaxPrice);
      if (!isNaN(maxPrice)) query = query.lte('price', maxPrice);
    }
    if (fColors.length > 0) {
      // filter cards that contain ALL selected colors (codes like 'W', 'C', etc)
      fColors.forEach((color) => {
        query = query.contains('colors', [color]);
      });
    }

    // Pagination and ordering
    query = query
      .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error loading inventory:', error);
      setInventory([]);
      setSelectedCard(null);
      setLoading(false);
      return;
    }

    // client side filter for types (because supabase doesn't support OR for multiple values easily)
    let filteredData = data || [];
    if (fTypes.length > 0) {
      filteredData = filteredData.filter((card) =>
        fTypes.some((type) =>
          card.type_line?.toLowerCase().includes(type.toLowerCase())
        )
      );
    }

    setInventory(filteredData);
    if (!selectedCard && filteredData.length) setSelectedCard(filteredData[0]);
    else if (selectedCard && !filteredData.find((c) => c.id === selectedCard.id)) {
      setSelectedCard(null);
    }
    setLoading(false);
  }, [
    user,
    currentPage,
    refreshTrigger,
    selectedCard,
    fName,
    fSet,
    fMinQty,
    fMaxQty,
    fMinPrice,
    fMaxPrice,
    fColors,
    fTypes,
  ]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

 const handleAdd = useCallback(
  async (e) => {
    e.preventDefault();
    if (!cardName.trim() || !user) return;
    const qty = parseInt(quantity, 10);
    if (qty < 1) return alert('Quantity ≥ 1');
    try {
      const res = await fetch(
        `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(
          cardName.trim()
        )}`
      );
      const r = await res.json();
      if (r.object === 'error') return alert('Card not found');

      // Fix colors extraction — ensure it's always an array of strings or empty array
      let cardColors = [];
      if (Array.isArray(r.colors)) {
        cardColors = r.colors;
      } else if (r.card_faces && Array.isArray(r.card_faces)) {
        // Combine colors from all faces (if multiface)
        cardColors = r.card_faces.reduce((acc, face) => {
          if (Array.isArray(face.colors)) acc.push(...face.colors);
          return acc;
        }, []);
        // Remove duplicates
        cardColors = [...new Set(cardColors)];
      }

      // Add "Colorless" if no colors and mana cost includes {C} or land with no mana cost
      if (
  cardColors.length === 0 &&
  (
    r.mana_cost?.includes('{C}') || 
    (r.type_line?.includes('Land') && r.type_line?.includes('Artifact') && !r.mana_cost) ||
    (r.type_line?.includes('Artifact') && (!r.mana_cost || r.mana_cost === '' || r.mana_cost === '{0}'))
  )
) {
  cardColors = ['Colorless'];  // FULL word here, NOT 'C'
}

const image_url =
  r.image_uris?.normal ||
  r.card_faces?.[0]?.image_uris?.normal ||
  '';

const back_image_url = r.card_faces?.[1]?.image_uris?.normal || '';

      // Fetch username for logged in user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      const username = profile?.username || null;

      // Check if card already exists for this user in inventory
      const { data: existingCard, error: fetchError } = await supabase
        .from('inventory')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('scryfall_id', r.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows found, so safe to proceed
        console.error('Error checking existing card:', fetchError);
        alert('Failed to add card');
        return;
      }

      if (existingCard) {
        // Card exists, update quantity by adding
        const newQty = existingCard.quantity + qty;
        const { error: updateError } = await supabase
          .from('inventory')
          .update({ quantity: newQty })
          .eq('id', existingCard.id);

        if (updateError) {
          console.error('Error updating quantity:', updateError);
          alert('Failed to update card quantity');
          return;
        }
      } else {
        // Card does not exist, insert new with username and colors
        const { error: insertError } = await supabase.from('inventory').insert([
          {
            name: r.name,
            quantity: qty,
            user_id: user.id,
            username,           // <-- Add username here
            price: parseFloat(r.prices?.usd) || 0,
            image_url,
            back_image_url,
            set_name: r.set_name,
            scryfall_uri: r.scryfall_uri,
            scryfall_id: r.id,
            type_line: r.type_line || '',
            colors: cardColors, // colorless fix applied here
          },
        ]);

        if (insertError) {
          console.error('Error inserting new card:', insertError);
          alert('Failed to add card');
          return;
        }
      }

      setCardName('');
      setQuantity(1);
      setRefreshTrigger((p) => p + 1);
    } catch (err) {
      console.error(err);
      alert('Failed to add card');
    }
  },
  [cardName, quantity, user]
);

  // delete card
  // Inside Inventory function component, add:

const handleClick = useCallback(
  (card) => {
    router.push(
      card.scryfall_id
        ? `/card/${card.scryfall_id}`
        : `/card/${encodeURIComponent(card.name)}`
    );
  },
  [router]
);

const handleDelete = useCallback(
  async (id) => {
    try {
      const { data: card, error: fetchError } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Error fetching card quantity:', fetchError);
        alert('Failed to delete card');
        return;
      }

      if (!card) {
        alert('Card not found');
        return;
      }

      if (card.quantity > 1) {
        const { error: updateError } = await supabase
          .from('inventory')
          .update({ quantity: card.quantity - 1 })
          .eq('id', id);

        if (updateError) {
          console.error('Error updating quantity:', updateError);
          alert('Failed to update card quantity');
          return;
        }
      } else {
        const { error: deleteError } = await supabase
          .from('inventory')
          .delete()
          .eq('id', id);

        if (deleteError) {
          console.error('Error deleting card:', deleteError);
          alert('Failed to delete card');
          return;
        }
      }

      setRefreshTrigger((p) => p + 1);
    } catch (err) {
      console.error('Unexpected error deleting card:', err);
      alert('Failed to delete card');
    }
  },
  []
);

const handleHover = useCallback((card) => {
  setHoveredCard(card);
  hoveredCardRef.current = card;
}, []);

const handleFlip = useCallback((id) => {
  setFlippedCards((p) => ({ ...p, [id]: !p[id] }));
}, []);


  // pagination
  const handleNext = () => {
    if (inventory.length === pageSize) setCurrentPage((p) => p + 1);
  };
  const handlePrev = () => setCurrentPage((p) => (p > 1 ? p - 1 : 1));

  // reset filters
  const resetAll = () => {
    setFName('');
    setFSet('');
    setFMinQty('');
    setFMaxQty('');
    setFMinPrice('');
    setFMaxPrice('');
    setFTypes([]);
    setFColors([]);
    setCurrentPage(1);
  };

  // grid items
  const inventoryGrid = useMemo(
  () =>
    inventory.map((c) => (
      <CardItem
        key={c.id}
        card={c}
        onClick={handleClick}
        onDelete={handleDelete}
        flipped={flippedCards[c.id]}
        onFlip={handleFlip}
        onHover={handleHover}
      />
    )),
  [inventory, flippedCards, handleClick, handleDelete, handleFlip, handleHover]
);

  // unique sets/types for filters
  const uniqueSets = useMemo(
    () => Array.from(new Set(inventory.map((c) => c.set_name))).sort(),
    [inventory]
  );

  // Fix uniqueTypes extraction to clean up type strings:
  const uniqueTypes = useMemo(() => {
    // Extract all type_line strings from inventory
    const allTypeLines = inventory
      .map((c) => c.type_line || '')
      .filter(Boolean);

    // Split each type_line into individual types by common delimiters
    let typeSet = new Set();

    allTypeLines.forEach((line) => {
      // Split on commas, em dash, en dash, hyphen, slash
      const parts = line
        .split(/[,—–\-\/]/)
        .map((s) => s.trim().replace(/;+$/, '')) // trim and remove trailing semicolons
        .filter(Boolean);

      parts.forEach((part) => {
        // Ignore very long or malformed parts like "Angel;;;;;;;;;;"
        if (part.length > 0 && part.length < 30) {
          typeSet.add(part);
        }
      });
    });

    return Array.from(typeSet).sort();
  }, [inventory]);

  return (
    <div className="flex h-screen bg-[#0a1528] text-white overflow-hidden">
      {/* LEFT PREVIEW */}
      <aside className="w-[240px] bg-[#0e1d35] p-4 border-r border-blue-900 flex-shrink-0">
        <h1 className="text-xl font-bold text-cyan-300 mb-4">Conjuring Crypt</h1>
        {(hoveredCard || selectedCard) && (
          <>
            <img
              src={(hoveredCard || selectedCard).image_url || '/placeholder.jpg'}
              alt={(hoveredCard || selectedCard).name}
              className="w-full h-[260px] object-contain rounded mb-2"
            />
            <div className="text-xs space-y-1 text-center">
              <p className="font-bold">{(hoveredCard || selectedCard).name}</p>
              <p>
                Price:{' '}
                {(hoveredCard || selectedCard).price > 0
                  ? `$${(hoveredCard || selectedCard).price.toFixed(2)}`
                  : 'N/A'}
              </p>
              <p>Set: {(hoveredCard || selectedCard).set_name}</p>
              <a
                href={(hoveredCard || selectedCard).scryfall_uri}
                target="_blank"
                rel="noreferrer"
                className="underline text-blue-400"
              >
                View on Scryfall
              </a>
            </div>
          </>
        )}
        <CardCountDisplay user={user} refreshTrigger={refreshTrigger} />
      </aside>

      {/* CENTER GRID & FORM */}
      <main className="flex-1 p-6 overflow-y-auto flex flex-col">
        {/* ADD FORM */}
        <form
          onSubmit={handleAdd}
          className="bg-[#1b2e4b] rounded-lg p-4 shadow mb-6 max-w-3xl mx-auto"
        >
          <div className="flex flex-wrap gap-4 justify-center items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block mb-1">Card Name</label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="w-full bg-black text-white px-3 py-2 rounded border border-gray-600"
                placeholder="Black Lotus"
                required
                autoComplete="off"
              />
            </div>
            <div className="w-20">
              <label className="block mb-1">Qty</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full bg-black text-white px-3 py-2 rounded border border-gray-600"
                required
              />
            </div>
            <button className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white">
              Add
            </button>
          </div>
        </form>

        {/* CARD GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {loading ? (
            <p className="col-span-full text-center">Loading…</p>
          ) : inventory.length === 0 ? (
            <p className="col-span-full text-center">No cards in inventory.</p>
          ) : (
            inventoryGrid
          )}
        </div>

        {/* PAGINATION */}
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={handlePrev}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-indigo-600 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-2 py-2">Page {currentPage}</span>
          <button
            onClick={handleNext}
            disabled={inventory.length < pageSize}
            className="px-4 py-2 bg-indigo-600 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </main>

      {/* RIGHT FILTER DRAWER (fixed) */}
<aside
  className={`fixed top-0 right-0 h-full bg-[#1b2e4b] shadow-lg p-4 transition-transform duration-300 filterbar-container ${
    showFilters ? 'translate-x-0' : 'translate-x-full'
  }`}
  style={{ width: '260px', zIndex: 50 }}
>
  {/* toggle handle */}
  <button
    onClick={() => setShowFilters((v) => !v)}
    className="absolute left-[-32px] top-4 bg-[#1b2e4b] p-2 rounded-full shadow filterbar-toggle"
    aria-label="Toggle filters"
    type="button"
  >
    {showFilters ? '◀' : '▶'}
  </button>

  <h2 className="text-lg mb-4 text-cyan-300 filterbar-title">Filters</h2>
  <div className="space-y-3 text-sm filterbar-content">
    <div>
      <label className="block mb-1">Name contains</label>
      <input
        type="text"
        value={fName}
        onChange={(e) => {
          setFName(e.target.value);
          setCurrentPage(1);
        }}
        className="w-full bg-black text-white px-2 py-1 rounded border border-gray-600 filterbar-input"
        placeholder="Black Lotus"
        autoComplete="off"
      />
    </div>
    <div>
      <label className="block mb-1">Set</label>
      <select
        value={fSet}
        onChange={(e) => {
          setFSet(e.target.value);
          setCurrentPage(1);
        }}
        className="w-full bg-black text-white px-2 py-1 rounded border border-gray-600 filterbar-select"
      >
        <option value="">All sets</option>
        {uniqueSets.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="block mb-1">Qty ≥</label>
        <input
          type="number"
          min="0"
          value={fMinQty}
          onChange={(e) => {
            setFMinQty(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full bg-black text-white px-2 py-1 rounded border border-gray-600 filterbar-input"
        />
      </div>
      <div>
        <label className="block mb-1">Qty ≤</label>
        <input
          type="number"
          min="0"
          value={fMaxQty}
          onChange={(e) => {
            setFMaxQty(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full bg-black text-white px-2 py-1 rounded border border-gray-600 filterbar-input"
        />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="block mb-1">Price ≥</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={fMinPrice}
          onChange={(e) => {
            setFMinPrice(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full bg-black text-white px-2 py-1 rounded border border-gray-600 filterbar-input"
        />
      </div>
      <div>
        <label className="block mb-1">Price ≤</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={fMaxPrice}
          onChange={(e) => {
            setFMaxPrice(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full bg-black text-white px-2 py-1 rounded border border-gray-600 filterbar-input"
        />
      </div>
    </div>

    {/* --- Color filter (multi-select) --- */}
    <div>
      <label className="block mb-1">Colors</label>
      <select
        multiple
        value={fColors}
        onChange={(e) => {
          const selectedOptions = Array.from(e.target.selectedOptions).map(
            (opt) => opt.value
          );
          setFColors(selectedOptions);
          setCurrentPage(1);
        }}
        className="w-full bg-black text-white px-2 py-1 rounded border border-gray-600 h-28 filterbar-multiselect"
      >
        {colorOptions.map(({ code, label }) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
    </div>

    {/* --- Types filter changed to multi-select dropdown --- */}
    <div>
      <label className="block mb-1">Types</label>
      <select
        multiple
        value={fTypes}
        onChange={(e) => {
          const selectedOptions = Array.from(e.target.selectedOptions).map(
            (opt) => opt.value
          );
          setFTypes(selectedOptions);
          setCurrentPage(1);
        }}
        className="w-full bg-black text-white px-2 py-1 rounded border border-gray-600 h-32"
        size={6} // shows multiple rows without scrolling if possible
      >
        {uniqueTypes.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>

    <button
      onClick={(e) => {
        e.preventDefault();
        resetAll();
      }}
      className="w-full bg-red-700 hover:bg-red-800 py-2 rounded text-center filterbar-reset-btn"
      type="button"
    >
      Reset Filters
    </button>
  </div>
</aside>
    </div>
  );
}
