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
import addToCatalog from '../components/AddToCatalog';
import { v4 as uuidv4 } from 'uuid'; // make sure to import uuid if using

// Added Colorless with label 'Colorless'
const colorOptions = [
  { code: 'W', label: 'White' },
  { code: 'U', label: 'Blue' },
  { code: 'B', label: 'Black' },
  { code: 'R', label: 'Red' },
  { code: 'G', label: 'Green' },
  { code: 'Colorless', label: 'Colorless' },
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
          aria-label={`Delete one ${card.name}`}
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
            aria-label={`Flip ${card.name}`}
          >
            🔁
          </button>
        )}
        <img
          src={displayedImage}
          alt={card.name || 'Card image'}
          className="w-full h-full object-cover"
          onError={(e) => {
            // defensive check - some browsers type for event target is any
            try {
              e.target.onerror = null;
              e.target.src = '/placeholder.jpg';
            } catch (err) {
              /* ignore */
            }
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
  const [inventory, setInventory] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [flippedCards, setFlippedCards] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const hoveredCardRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showFilters, setShowFilters] = useState(true);
  const router = useRouter();
  const mountedRef = useRef(true);
  const [cardData, setCardData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cardName, setCardName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [user, setUser] = useState(null);
  

  // refs to hold pending ids restored from sessionStorage
  const pendingSelectedIdRef = useRef(null);
  const pendingHoveredIdRef = useRef(null);

  // --- filter state ---
  const [fName, setFName] = useState('');
  const [fSet, setFSet] = useState('');
  const [fMinQty, setFMinQty] = useState('');
  const [fMaxQty, setFMaxQty] = useState('');
  const [fMinPrice, setFMinPrice] = useState('');
  const [fMaxPrice, setFMaxPrice] = useState('');
  const [fTypes, setFTypes] = useState([]);
  const [fColors, setFColors] = useState([]);

  // cleanup mounted ref and restore session state on mount
  useEffect(() => {
    mountedRef.current = true;

    try {
      const savedState = sessionStorage.getItem('inventoryState');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (parsed?.page) {
          // ensure it's a number
          const p = parseInt(parsed.page, 10);
          if (!Number.isNaN(p) && p > 0) setCurrentPage(p);
        }
        if (parsed?.selectedId) pendingSelectedIdRef.current = String(parsed.selectedId);
        if (parsed?.hoveredId) pendingHoveredIdRef.current = String(parsed.hoveredId);
        // note: we intentionally do not remove the state here so back/forward works repeatedly
      }
    } catch (err) {
      // ignore parse errors
    }

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // load user once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!cancelled) setUser(data?.user || null);
      } catch (err) {
        console.error('Error loading user', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

// Utility: Fix colors array on each card to include 'Colorless' when appropriate
function fixColorsArray(cardObj) {
  let colorsArray = [];

  if (cardObj.color_identity && cardObj.color_identity.length > 0) {
    colorsArray = cardObj.color_identity;
  } else if (cardObj.colors && cardObj.colors.length > 0) {
    colorsArray = cardObj.colors;
  } else {
    const manaCost = (cardObj.mana_cost || '').trim();
    const typeLine = (cardObj.type_line || '').trim();

    const hasColoredMana = /\{[WUBRG]\}/.test(manaCost);
    const isColorlessArtifact = typeLine.includes('Artifact');
    const isColorlessLand = typeLine.includes('Land') && manaCost === '';
    const producesColorless = manaCost.includes('{C}');

    if (!hasColoredMana && (isColorlessArtifact || isColorlessLand || producesColorless)) {
      colorsArray = ['Colorless'];
    }
  }

  return colorsArray;
}

// fetch inventory with filters applied server-side
const fetchInventory = useCallback(async () => {
  if (!user) return;
  setLoading(true);

  try {
    let query = supabase
      .from('inventory')
      .select(
        'id, name, quantity, price, image_url, back_image_url, set_name, scryfall_uri, scryfall_id, type_line, colors, rarity, cmc, oracle_text, created_at'
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
      const hasColorless = fColors.some(c => c.toLowerCase() === "colorless");
      const coloredColors = fColors.filter(c => c.toLowerCase() !== "colorless");

      if (hasColorless && coloredColors.length === 0) {
        // Only colorless: filter server-side
        query = query.contains('colors', ['Colorless']);
      } else if (!hasColorless && coloredColors.length > 0) {
        // Only colored: filter server-side
        query = query.contains('colors', coloredColors);
      } else if (hasColorless && coloredColors.length > 0) {
        // Mixed: skip server-side color filtering; will filter client-side
        console.warn("Mixed colorless + colored filter: will do client-side filtering");
      }
    }

    // Pagination and ordering
    query = query
      .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error loading inventory:', error);
      if (mountedRef.current) {
        setInventory([]);
        setSelectedCard(null);
        setLoading(false);
      }
      return;
    }

    let filteredData = data || [];

    // Patch each card's colors array with 'Colorless' if appropriate (client-side fix)
    filteredData = filteredData.map(card => ({
      ...card,
      colors: fixColorsArray(card),
    }));

    // CLIENT SIDE COLOR FILTER if mixed colorless + colored selected
    if (fColors.length > 0) {
      const hasColorless = fColors.some(c => c.toLowerCase() === "colorless");
      const coloredColors = fColors.filter(c => c.toLowerCase() !== "colorless");

      if (hasColorless && coloredColors.length > 0) {
        filteredData = filteredData.filter(card => {
          const cardColors = (card.colors || []).map(c => c.toLowerCase());
          // Include card if it has Colorless OR any colored color selected
          return (
            (cardColors.includes('colorless') && hasColorless) ||
            coloredColors.some(color => cardColors.includes(color.toLowerCase()))
          );
        });
      }
      // else: already filtered on server for only colorless OR only colored
    }

    // Client side filter for types
    if (fTypes.length > 0) {
      filteredData = filteredData.filter((card) =>
        fTypes.some((type) =>
          card.type_line?.toLowerCase().includes(type.toLowerCase())
        )
      );
    }

    if (!mountedRef.current) return;

    setInventory(filteredData);

    // Handle pending selected / hovered card IDs as before...

    if (pendingSelectedIdRef.current) {
      const match = filteredData.find(
        (c) => String(c.id) === String(pendingSelectedIdRef.current)
      );
      if (match) {
        setSelectedCard(match);
      } else {
        setSelectedCard((prev) =>
          prev && filteredData.find((c) => c.id === prev.id) ? prev : null
        );
      }
      pendingSelectedIdRef.current = null;
    } else {
      setSelectedCard((prev) => {
        if (!prev && filteredData.length) return filteredData[0];
        if (prev && !filteredData.find((c) => c.id === prev.id)) return null;
        return prev;
      });
    }

    if (pendingHoveredIdRef.current) {
      const matchH = filteredData.find(
        (c) => String(c.id) === String(pendingHoveredIdRef.current)
      );
      if (matchH) {
        setHoveredCard(matchH);
        hoveredCardRef.current = matchH;
      } else {
        setHoveredCard((prev) =>
          prev && filteredData.find((c) => c.id === prev.id) ? prev : null
        );
        hoveredCardRef.current = hoveredCard;
      }
      pendingHoveredIdRef.current = null;
    }
  } catch (err) {
    console.error('Unexpected error fetching inventory:', err);
    if (mountedRef.current) {
      setInventory([]);
      setSelectedCard(null);
    }
  } finally {
    if (mountedRef.current) setLoading(false);
  }
}, [
  user,
  currentPage,
  refreshTrigger,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchInventory]);

  // Utility: Fix colors array on each card to include 'Colorless' when appropriate
function fixColorsArray(cardObj) {
  let colorsArray = [];

  if (cardObj.color_identity && cardObj.color_identity.length > 0) {
    colorsArray = cardObj.color_identity;
  } else if (cardObj.colors && cardObj.colors.length > 0) {
    colorsArray = cardObj.colors;
  } else {
    const manaCost = (cardObj.mana_cost || '').trim();
    const typeLine = (cardObj.type_line || '').trim();

    const hasColoredMana = /\{[WUBRG]\}/.test(manaCost);
    const isColorlessArtifact = typeLine.includes('Artifact');
    const isColorlessLand = typeLine.includes('Land') && manaCost === '';
    const producesColorless = manaCost.includes('{C}');

    if (!hasColoredMana && (isColorlessArtifact || isColorlessLand || producesColorless)) {
      colorsArray = ['Colorless'];
    }
  }

  return colorsArray;
}

const handleAdd = useCallback(
  async (e) => {
      e.preventDefault();
      if (!cardName.trim() || !user) return;
      const qty = parseInt(quantity, 10);
      if (isNaN(qty) || qty < 1) return alert('Quantity must be at least 1');
      setLoading(true);

    try {
      // fetch from Scryfall
      const res = await fetch(
        `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(
          cardName.trim()
        )}`
      );
      const r = await res.json();
      if (r.object === 'error') {
        alert('Card not found');
        return;
      }

      // build colors array from card or faces
      let cardColors = [];
      if (Array.isArray(r.colors)) {
        cardColors = r.colors;
      } else if (Array.isArray(r.card_faces)) {
        cardColors = r.card_faces.reduce((acc, face) => {
          if (Array.isArray(face.colors)) acc.push(...face.colors);
          return acc;
        }, []);
        cardColors = [...new Set(cardColors)];
      }

      if (
        cardColors.length === 0 &&
        (r.mana_cost?.includes('{C}') ||
          (r.type_line?.toLowerCase().includes('land') && !r.mana_cost) ||
          (r.type_line?.toLowerCase().includes('artifact') &&
            (!r.mana_cost || r.mana_cost === '' || r.mana_cost === '{0}')))
      ) {
        cardColors = ['Colorless'];
      }

      const image_url =
  r.image_uris?.normal || r.card_faces?.[0]?.image_uris?.normal || '';
const back_image_url = r.card_faces?.[1]?.image_uris?.normal || '';

// Build card catalog payload matching your DB schema
const catalogPayload = {
  id: uuidv4(), // generate unique id for PK
  scryfall_id: r.id,
  name: r.name,
  set_code: r.set.toUpperCase(), // Scryfall set code, uppercase to match your schema
  number: parseInt(r.collector_number, 10) || 0, // card number as integer
  rarity: r.rarity || (r.card_faces?.[0]?.rarity ?? '') || '',
  type_line: r.type_line || '',
  colors: cardColors,
  cmc: r.cmc ?? (r.card_faces?.[0]?.cmc ?? null),
  oracle_text: r.oracle_text || (r.card_faces?.[0]?.oracle_text ?? '') || '',
  image_url,
  back_image_url,
  scryfall_uri: r.scryfall_uri,
};

await addToCatalog(cardData, user.id);

      // UPSERT card into card_catalog table (on scryfall_id)
      const { data: catalogData, error: catalogError } = await supabase
        .from('card_catalog')
        .upsert([catalogPayload], { onConflict: 'scryfall_id' });

      if (catalogError) {
        console.error('Error upserting card_catalog:', catalogError);
        // You can still continue to add to inventory even if this fails
      } else {
        console.log('Card catalog upserted:', catalogData);
      }

      // optional username fetch
      let username = null;
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        if (!profileError) username = profile?.username || null;
      } catch {
        // ignore
      }

      // build inventory payload (single source of truth)
      const payload = {
        name: r.name,
        user_id: user.id,
        username,
        price: parseFloat(r.prices?.usd) || 0,
        image_url,
        back_image_url,
        set_name: r.set_name,
        scryfall_uri: r.scryfall_uri,
        scryfall_id: r.id,
        type_line: r.type_line || '',
        colors: cardColors,
        rarity: r.rarity || (r.card_faces?.[0]?.rarity ?? '') || '',
        cmc: r.cmc ?? (r.card_faces?.[0]?.cmc ?? null),
        oracle_text: r.oracle_text || (r.card_faces?.[0]?.oracle_text ?? '') || '',
      };

      // Fix colors in payload before saving
      payload.colors = fixColorsArray(payload);

      console.log('Inventory payload:', payload);

      // check if card already exists for this user
      const { data: existingCard, error: fetchError } = await supabase
        .from('inventory')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('scryfall_id', r.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking existing card:', fetchError);
        alert('Failed to add card (check console)');
        return;
      }

      if (existingCard) {
        // update — merge quantity
        const newQty = existingCard.quantity + qty;
        const updatePayload = { ...payload, quantity: newQty };

        const { data: updateData, error: updateError } = await supabase
          .from('inventory')
          .update(updatePayload)
          .eq('id', existingCard.id)
          .select();

        console.log('Update response:', updateData, updateError);

        if (updateError) {
          console.error('Error updating existing card:', updateError);
          alert('Failed to update card (check console)');
          return;
        }
      } else {
        // insert new
        const insertPayload = { ...payload, quantity: qty };

        const { data: insertData, error: insertError } = await supabase
          .from('inventory')
          .insert([insertPayload], { returning: 'representation' });

        console.log('Insert response:', insertData, insertError);

        if (insertError) {
          console.error('Error inserting new card:', insertError);
          alert('Failed to add card (check console)');
          return;
        }
      }

      // success - clear form & refresh
      setCardName('');
      setQuantity(1);
      setRefreshTrigger((p) => p + 1);
    } catch (err) {
      console.error('Unhandled error in handleAdd:', err);
      alert('Failed to add card (see console)');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  },
  [cardName, quantity, user]
);




  // NOTE: handleClick now saves minimal state (page + ids) to sessionStorage before navigation.
  const handleClick = useCallback(
    (card) => {
      try {
        sessionStorage.setItem(
          'inventoryState',
          JSON.stringify({
            page: currentPage,
            selectedId: card?.id ?? null,
            hoveredId: hoveredCardRef.current?.id ?? null,
          })
        );
      } catch (err) {
        // ignore storage errors
      }

      router.push(
        card.scryfall_id
          ? `/card/${card.scryfall_id}`
          : `/card/${encodeURIComponent(card.name)}`
      );
    },
    [router, currentPage]
  );

  const handleDelete = useCallback(
    async (id) => {
      if (!id) return;
      setLoading(true);
      try {
        const { data: card, error: fetchError } = await supabase
          .from('inventory')
          .select('id, quantity')
          .eq('id', id)
          .single();

        if (fetchError) {
          console.error('Error fetching card quantity:', fetchError);
          alert('Failed to delete card (check console)');
          return;
        }

        if (!card) {
          alert('Card not found');
          return;
        }

        if (card.quantity > 1) {
          const newQty = card.quantity - 1;
          const { data: updateData, error: updateError } = await supabase
            .from('inventory')
            .update({ quantity: newQty })
            .eq('id', id)
            .select();

          console.log('Delete(decrement) update:', updateData, updateError);

          if (updateError) {
            console.error('Error updating quantity:', updateError);
            alert('Failed to update card quantity');
            return;
          }
        } else {
          const { data: deleteData, error: deleteError } = await supabase
            .from('inventory')
            .delete()
            .eq('id', id)
            .select();

          console.log('Delete row response:', deleteData, deleteError);

          if (deleteError) {
            console.error('Error deleting card:', deleteError);
            alert('Failed to delete card');
            return;
          }
        }

        setRefreshTrigger((p) => p + 1);
      } catch (err) {
        console.error('Unexpected error deleting card:', err);
        alert('Failed to delete card (see console)');
      } finally {
        if (mountedRef.current) setLoading(false);
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
          flipped={!!flippedCards[c.id]}
          onFlip={handleFlip}
          onHover={handleHover}
        />
      )),
    [inventory, flippedCards, handleClick, handleDelete, handleFlip, handleHover]
  );

  // unique sets/types for filters
  const uniqueSets = useMemo(
    () =>
      Array.from(new Set(inventory.map((c) => c.set_name).filter(Boolean))).sort(),
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
        // Ignore very long or malformed parts
        if (part.length > 0 && part.length < 30) {
          typeSet.add(part);
        }
      });
    });

    return Array.from(typeSet).sort();
  }, [inventory]);

  // memoized CardCountDisplay to reduce re-renders
  const cardCountWidget = useMemo(
    () => <CardCountDisplay user={user} refreshTrigger={refreshTrigger} />,
    [user, refreshTrigger]
  );

  return (
    <div className="min-h-screen bg-cover bg-center text-black p-6">
      <main className="flex min-h-screen w-full p-6 bg-transparent items-start justify-start gap-6">
        <div className="w-full flex flex-col md:flex-row md:items-start gap-1">

          {/* LEFT COLUMN - PREVIEW & CARD COUNT */}
          <div
            className="w-full md:w-1/4 md:text-left text-left img-left
              sticky top-6 self-start" // <-- key sticky styles here
            style={{ alignSelf: 'start' }}
          >
            <h1 className="text-xl font-bold text-white-300 mb-4">Card Preview</h1>

            {(hoveredCard || selectedCard) && (
              <>
                <img
                  src={(hoveredCard || selectedCard).image_url || '/placeholder.jpg'}
                  alt={(hoveredCard || selectedCard).name || 'Card preview'}
                  className="w-full h-auto object-contain rounded mb-2"
                />
                <div className="text-xs space-y-1">
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

            <div className="text-white font-bold mt-15">{cardCountWidget}</div>
          </div>

          {/* RIGHT COLUMN - ADD CARD FORM + INVENTORY */}
          <div className="w-full md:w-3/4 flex flex-col items-center">
            {/* ADD CARD FORM */}
            <form
              onSubmit={handleAdd}
              className="bg-opacity-60 rounded-lg p-4 shadow-lg mb-6 w-full max-w-3xl"
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
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setQuantity(Number.isNaN(v) ? '' : v);
                    }}
                    className="w-full bg-black text-white px-3 py-2 rounded border border-gray-600"
                    required
                  />
                </div>
                <button type="submit" className="p-0 border-none bg-transparent" aria-label="Add card">
                  <img
                    src="/assets/add_card.png"
                    alt="Add Card"
                    className="w-32 h-auto hover:opacity-80 transition"
                  />
                </button>
              </div>
            </form>

            {/* CARD GRID */}
            <div className="w-full max-w-6xl">
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
                    type="button"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 bg-gray-800 rounded">Page {currentPage}</span>
                  <button
                    onClick={handleNext}
                    disabled={inventory.length < pageSize}
                    className="px-4 py-2 bg-indigo-600 rounded disabled:opacity-50"
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
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
                size={6}
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
