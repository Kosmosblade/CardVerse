// pages/inventory.jsx
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
import { v4 as uuidv4 } from 'uuid';

const colorOptions = [
  { code: 'W', label: 'White' },
  { code: 'U', label: 'Blue' },
  { code: 'B', label: 'Black' },
  { code: 'R', label: 'Red' },
  { code: 'G', label: 'Green' },
  { code: 'Colorless', label: 'Colorless' },
];

const CardItem = memo(function CardItem({ card, onClick, onDelete, onHover, flipped, onFlip }) {
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
          try {
            e.target.onerror = null;
            e.target.src = '/placeholder.jpg';
          } catch (err) {}
        }}
        draggable={false}
      />

      {card.quantity > 1 && (
        <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded-md">
          ×{card.quantity}
        </div>
      )}

      {/* Variant badges */}
      <div className="absolute top-10 left-2 flex flex-col gap-1 z-40">
        {card.extended_art && (
          <span className="text-xs bg-pink-600 text-white px-2 py-0.5 rounded">Extended</span>
        )}
        {card.borderless && (
          <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded">Borderless</span>
        )}
        {card.showcase && (
          <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded">Showcase</span>
        )}
        {card.foil && (
          <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">Foil</span>
        )}
      </div>
    </div>
  );
},
(prev, next) => prev.card.id === next.card.id && prev.flipped === next.flipped
);

export default function Inventory() {
  // states
  const [inventory, setInventory] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [flippedCards, setFlippedCards] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const hoveredCardRef = useRef(null);
  const [showSetDropdown, setShowSetDropdown] = useState(false);
  

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showFilters, setShowFilters] = useState(true);

  const router = useRouter();
  const mountedRef = useRef(true);

  const [loading, setLoading] = useState(false);
  const [cardName, setCardName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [user, setUser] = useState(null);

  const [setName, setSetName] = useState('');
  const [allSets, setAllSets] = useState([]);

  // variant flags
  const [borderless, setBorderless] = useState(false);
  const [showcase, setShowcase] = useState(false);
  const [extendedArt, setExtendedArt] = useState(false);
  const [foil, setFoil] = useState(false);

  // filters
  const [fName, setFName] = useState('');
  const [fSet, setFSet] = useState('');
  const [fMinQty, setFMinQty] = useState('');
  const [fMaxQty, setFMaxQty] = useState('');
  const [fMinPrice, setFMinPrice] = useState('');
  const [fMaxPrice, setFMaxPrice] = useState('');
  const [fTypes, setFTypes] = useState([]);
  const [fColors, setFColors] = useState([]);
  const filteredSets = allSets.filter((set) =>
  set.name.toLowerCase().includes(setName.toLowerCase())
);


  // metadata for filter options & meta error
  const [inventoryMetaSets, setInventoryMetaSets] = useState([]); // [{name, type}]
  const [inventoryMetaTypes, setInventoryMetaTypes] = useState([]); // [ 'Legendary Creature', ... ]
  const [metaError, setMetaError] = useState(null);

  // pending refs for restore
  const pendingSelectedIdRef = useRef(null);
  const pendingHoveredIdRef = useRef(null);

  // CARD NAME dropdown visibility
const [showCardDropdown, setShowCardDropdown] = useState(false);



// CARD NAME suggestions
const [cardSuggestions, setCardSuggestions] = useState([]);
const [loadingCards, setLoadingCards] = useState(false);



  // restore session state and mounted flag
  useEffect(() => {
    mountedRef.current = true;
    try {
      const savedState = sessionStorage.getItem('inventoryState');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (parsed?.page) {
          const p = parseInt(parsed.page, 10);
          if (!Number.isNaN(p) && p > 0) setCurrentPage(p);
        }
        if (parsed?.selectedId) pendingSelectedIdRef.current = String(parsed.selectedId);
        if (parsed?.hoveredId) pendingHoveredIdRef.current = String(parsed.hoveredId);
      }
    } catch (err) {}
    return () => { mountedRef.current = false; };
  }, []);

  // load user
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
    return () => { cancelled = true; };
  }, []);
// color heuristics helper
  function fixColorsArray(cardObj) {
    let colorsArray = [];
    if (cardObj.color_identity && Array.isArray(cardObj.color_identity) && cardObj.color_identity.length > 0) {
      colorsArray = cardObj.color_identity;
    } else if (cardObj.colors && Array.isArray(cardObj.colors) && cardObj.colors.length > 0) {
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
  // fetch Scryfall sets for add dropdown
  useEffect(() => {
    async function fetchSets() {
      try {
        const res = await fetch('https://api.scryfall.com/sets');
        const data = await res.json();
        if (data && data.data) {
          const sortedSets = data.data.sort((a, b) => a.name.localeCompare(b.name));
          setAllSets(sortedSets);
        }
      } catch (error) {
        console.error('Failed to fetch sets from Scryfall:', error);
      }
    }
    fetchSets();
  }, []);

    const fetchCardSuggestions = useCallback(async (query) => {
  if (!query || query.length < 2) {
    setCardSuggestions([]);
    return;
  }
  setLoadingCards(true);
  try {
    const res = await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}`);
    if (!res.ok) { setCardSuggestions([]); setLoadingCards(false); return; }
    const data = await res.json();
    setCardSuggestions(Array.isArray(data.data) ? data.data : []);
  } catch (err) {
    console.error('Error fetching card suggestions:', err);
    setCardSuggestions([]);
  } finally {
    setLoadingCards(false);
  }
}, []);

  

  // --- FETCH DISPLAYED INVENTORY (filtered & paginated) ---
  const fetchInventory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('inventory')
        .select('id, name, quantity, price, image_url, set_type, back_image_url, set_name, scryfall_uri, scryfall_id, type_line, colors, rarity, cmc, oracle_text, created_at, borderless, showcase, extended_art, foil')
        .eq('user_id', user.id);

      if (fName.trim() !== '') query = query.ilike('name', `%${fName.trim()}%`);
    if (fSet !== '') query = query.eq('set_name', fSet);
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

      // color server-side when reasonable
      if (fColors.length > 0) {
        const hasColorless = fColors.some(c => c.toLowerCase() === 'colorless');
        const coloredColors = fColors.filter(c => c.toLowerCase() !== 'colorless');
        if (hasColorless && coloredColors.length === 0) {
          query = query.contains('colors', ['Colorless']);
        } else if (!hasColorless && coloredColors.length > 0) {
          query = query.contains('colors', coloredColors);
        } else {
          // mixed -> client-side filter later
        }
      }

      // --- NEW SERVER-SIDE TYPE FILTER ---
if (fTypes.length > 0) {
  fTypes.forEach(ft => {
    query = query.ilike('type_line', `%${ft.trim()}%`);
  });
}

      query = query.range((currentPage - 1) * pageSize, currentPage * pageSize - 1).order('created_at', { ascending: false });

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

      let filteredData = (data || []).map(c => ({ ...c, colors: fixColorsArray(c) }));

      // Mixed color client-side
      if (fColors.length > 0) {
        const hasColorless = fColors.some(c => c.toLowerCase() === 'colorless');
        const coloredColors = fColors.filter(c => c.toLowerCase() !== 'colorless');
        if (hasColorless && coloredColors.length > 0) {
          filteredData = filteredData.filter(card => {
            const cardColors = (card.colors || []).map(cc => cc.toLowerCase());
            return cardColors.includes('colorless') || coloredColors.some(cc => cardColors.includes(cc.toLowerCase()));
          });
        }
      }

    

      if (!mountedRef.current) return;
      setInventory(filteredData);

      // restore selected/hovered if saved
      if (pendingSelectedIdRef.current) {
        const match = filteredData.find(c => String(c.id) === String(pendingSelectedIdRef.current));
        if (match) setSelectedCard(match);
        pendingSelectedIdRef.current = null;
      } else {
        setSelectedCard(prev => {
          if (!prev && filteredData.length) return filteredData[0];
          if (prev && !filteredData.find(c => c.id === prev.id)) return null;
          return prev;
        });
      }

      if (pendingHoveredIdRef.current) {
        const matchH = filteredData.find(c => String(c.id) === String(pendingHoveredIdRef.current));
        if (matchH) {
          setHoveredCard(matchH);
          hoveredCardRef.current = matchH;
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
  }, [user, currentPage, pageSize, fName, fSet, fMinQty, fMaxQty, fMinPrice, fMaxPrice, fColors, fTypes, refreshTrigger]);

  useEffect(() => {
    fetchInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchInventory]);

  // --- FETCH UNFILTERED METADATA for Filters (sets & types) with robust error handling ---
  const fetchInventoryMeta = useCallback(async () => {
    if (!user) return;
    setMetaError(null);
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('set_name, set_type, type_line, scryfall_id')
        .eq('user_id', user.id);

      if (error) {
        // log detailed error for debugging
        console.error('Inventory metadata supabase error:', error);
        setMetaError(error.message || JSON.stringify(error));
        // set empty meta lists so UI won't blow up
        setInventoryMetaSets([]);
        setInventoryMetaTypes([]);
        return;
      }

      const setsMap = new Map();
      const typesSet = new Set();
      const scryfallIds = new Set();

      (data || []).forEach(row => {
        const sName = row.set_name;
        const sType = row.set_type || 'unknown';
        if (sName && !setsMap.has(sName)) setsMap.set(sName, sType);

        const tl = row.type_line || '';
        if (tl) {
          const parts = tl.split(/[,—–\-\/]/).map(s => s.trim().replace(/;+$/, '')).filter(Boolean);
          parts.forEach(p => { if (p.length > 0 && p.length < 50) typesSet.add(p); });
        }

        if (row.scryfall_id) scryfallIds.add(row.scryfall_id);
      });

      // Fallback: if no types found in inventory rows, try card_catalog for those scryfall IDs
      if (typesSet.size === 0 && scryfallIds.size > 0) {
        try {
          const idsArr = Array.from(scryfallIds);
          // chunk if very large but assuming small
          const { data: ccData, error: ccErr } = await supabase
            .from('card_catalog')
            .select('scryfall_id, type_line')
            .in('scryfall_id', idsArr);

          if (ccErr) {
            console.error('card_catalog fallback error:', ccErr);
            // don't set metaError here to avoid overwriting inventory query error; but log it
          } else if (Array.isArray(ccData)) {
            ccData.forEach(row => {
              const tl = row.type_line || '';
              if (tl) {
                const parts = tl.split(/[,—–\-\/]/).map(s => s.trim().replace(/;+$/, '')).filter(Boolean);
                parts.forEach(p => { if (p.length > 0 && p.length < 50) typesSet.add(p); });
              }
            });
          }
        } catch (err) {
          console.warn('Error fetching card_catalog fallback types:', err);
        }
      }

      setInventoryMetaSets(Array.from(setsMap, ([name, type]) => ({ name, type })).sort((a, b) => a.name.localeCompare(b.name)));
      setInventoryMetaTypes(Array.from(typesSet).sort((a, b) => a.localeCompare(b)));
    } catch (err) {
      console.error('Unexpected error fetching inventory metadata:', err);
      setInventoryMetaSets([]);
      setInventoryMetaTypes([]);
      setMetaError(err?.message || String(err));
    }
  }, [user]);

  useEffect(() => {
    fetchInventoryMeta();
  }, [fetchInventoryMeta, refreshTrigger]);

  // pick print image helper (tries prints_search_uri for flags)
  async function pickPrintImage(cardData, flags = {}, preferredSetCode = '') {
    const printImageFrom = (p) => {
      if (!p) return { image_url: '', back_image_url: '' };
      if (p.image_uris && p.image_uris.normal) return { image_url: p.image_uris.normal, back_image_url: '' };
      if (Array.isArray(p.card_faces) && p.card_faces.length > 0) {
        const front = p.card_faces[0].image_uris?.normal || '';
        const back = p.card_faces[1]?.image_uris?.normal || '';
        return { image_url: front, back_image_url: back };
      }
      return { image_url: '', back_image_url: '' };
    };

    if (!cardData) return { image_url: '', back_image_url: '' };
    const noFlags = !flags.borderless && !flags.showcase && !flags.extendedArt && !flags.foil;

    if (noFlags) {
      if (cardData.image_uris && cardData.image_uris.normal) return { image_url: cardData.image_uris.normal, back_image_url: '' };
      if (Array.isArray(cardData.card_faces) && cardData.card_faces.length > 0) {
        return { image_url: cardData.card_faces[0].image_uris?.normal || '', back_image_url: cardData.card_faces[1]?.image_uris?.normal || '' };
      }
    }

    try {
      if (!cardData.prints_search_uri) {
        if (cardData.image_uris && cardData.image_uris.normal) return { image_url: cardData.image_uris.normal, back_image_url: '' };
        if (Array.isArray(cardData.card_faces) && cardData.card_faces.length > 0) {
          return { image_url: cardData.card_faces[0].image_uris?.normal || '', back_image_url: cardData.card_faces[1]?.image_uris?.normal || '' };
        }
        return { image_url: '', back_image_url: '' };
      }

      const r = await fetch(cardData.prints_search_uri);
      if (!r.ok) {
        if (cardData.image_uris && cardData.image_uris.normal) return { image_url: cardData.image_uris.normal, back_image_url: '' };
        return { image_url: '', back_image_url: '' };
      }
      const printsJson = await r.json();
      const prints = Array.isArray(printsJson.data) ? printsJson.data : [];

      const matchesFlags = (p) => {
        const fe = Array.isArray(p.frame_effects) ? p.frame_effects.map(x => String(x).toLowerCase()) : [];
        const finishes = Array.isArray(p.finishes) ? p.finishes.map(x => String(x).toLowerCase()) : [];
        const foilBool = !!p.foil || finishes.includes('foil');

        if (flags.borderless && !fe.includes('borderless')) return false;
        if (flags.showcase && !fe.includes('showcase')) return false;
        if (flags.extendedArt && !(fe.includes('extendedart') || fe.includes('extended_art') || fe.includes('extended'))) return false;
        if (flags.foil && !foilBool) return false;
        return true;
      };

      let candidates = [];
      if (preferredSetCode) {
        const codeLower = String(preferredSetCode).toLowerCase();
        candidates = prints.filter(p => String(p.set || '').toLowerCase() === codeLower && matchesFlags(p));
      }
      if (candidates.length === 0) candidates = prints.filter(p => matchesFlags(p));

      for (const p of candidates) {
        const imgs = printImageFrom(p);
        if (imgs.image_url) return imgs;
      }

      if (preferredSetCode) {
        const sameSet = prints.filter(p => String(p.set || '').toLowerCase() === String(preferredSetCode).toLowerCase());
        for (const p of sameSet) {
          const imgs = printImageFrom(p);
          if (imgs.image_url) return imgs;
        }
      }

      for (const p of prints) {
        const imgs = printImageFrom(p);
        if (imgs.image_url) return imgs;
      }

      if (cardData.image_uris && cardData.image_uris.normal) return { image_url: cardData.image_uris.normal, back_image_url: '' };
      if (Array.isArray(cardData.card_faces) && cardData.card_faces.length > 0) {
        return { image_url: cardData.card_faces[0].image_uris?.normal || '', back_image_url: cardData.card_faces[1]?.image_uris?.normal || '' };
      }

      return { image_url: '', back_image_url: '' };
    } catch (err) {
      console.warn('Error fetching prints_search_uri:', err);
      if (cardData.image_uris && cardData.image_uris.normal) return { image_url: cardData.image_uris.normal, back_image_url: '' };
      if (Array.isArray(cardData.card_faces) && cardData.card_faces.length > 0) {
        return { image_url: cardData.card_faces[0].image_uris?.normal || '', back_image_url: cardData.card_faces[1]?.image_uris?.normal || '' };
      }
      return { image_url: '', back_image_url: '' };
    }
  }

  // --- ADD handler
  const handleAdd = useCallback(async (e) => {
    e.preventDefault();
    if (!cardName.trim() || !setName || !user) {
      alert('Please enter card name and select a set.');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (Number.isNaN(qty) || qty < 1) {
      alert('Quantity must be at least 1');
      return;
    }

    setLoading(true);
    try {
      const setCode = allSets.find(s => s.name === setName)?.code || '';

      const scryfallUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}${setCode ? `&set=${encodeURIComponent(setCode)}` : ''}`;
      const resp = await fetch(scryfallUrl);
      if (!resp.ok) {
        alert('Card not found on Scryfall for that set.');
        return;
      }
      const cardDataScry = await resp.json();

      let cardColors = [];
      if (Array.isArray(cardDataScry.colors)) cardColors = cardDataScry.colors;
      else if (Array.isArray(cardDataScry.card_faces)) {
        cardColors = cardDataScry.card_faces.reduce((acc, face) => {
          if (Array.isArray(face.colors)) acc.push(...face.colors);
          return acc;
        }, []);
        cardColors = [...new Set(cardColors)];
      }
      if (cardColors.length === 0 &&
        (cardDataScry.mana_cost?.includes('{C}') ||
          (cardDataScry.type_line?.toLowerCase().includes('land') && !cardDataScry.mana_cost) ||
          (cardDataScry.type_line?.toLowerCase().includes('artifact') && (!cardDataScry.mana_cost || cardDataScry.mana_cost === '' || cardDataScry.mana_cost === '{0}')))) {
        cardColors = ['Colorless'];
      }

      const chosen = await pickPrintImage(cardDataScry, {
        borderless,
        showcase,
        extendedArt,
        foil,
      }, setCode);

      const image_url_for_catalog = chosen.image_url || cardDataScry.image_uris?.normal || cardDataScry.card_faces?.[0]?.image_uris?.normal || '';
      const back_image_url_for_catalog = chosen.back_image_url || cardDataScry.card_faces?.[1]?.image_uris?.normal || '';

      const catalogPayload = {
        id: uuidv4(),
        scryfall_id: cardDataScry.id,
        name: cardDataScry.name,
        set_code: (cardDataScry.set || '').toUpperCase(),
        number: cardDataScry.collector_number || '',
        rarity: cardDataScry.rarity || (cardDataScry.card_faces?.[0]?.rarity ?? '') || '',
        type_line: cardDataScry.type_line || '',
        colors: cardColors,
        cmc: cardDataScry.cmc ?? (cardDataScry.card_faces?.[0]?.cmc ?? null),
        oracle_text: cardDataScry.oracle_text || (cardDataScry.card_faces?.[0]?.oracle_text ?? '') || '',
        image_url: image_url_for_catalog,
        back_image_url: back_image_url_for_catalog,
        scryfall_uri: cardDataScry.scryfall_uri,
      };

      const { error: catalogError } = await supabase.from('card_catalog').upsert([catalogPayload], { onConflict: 'scryfall_id' });
      if (catalogError) console.error('Error upserting card_catalog:', catalogError);

      let username = null;
      try {
        const { data: profile, error: profileError } = await supabase.from('profiles').select('username').eq('id', user.id).single();
        if (!profileError) username = profile?.username || null;
      } catch {}

      const payload = {
        name: cardDataScry.name,
        user_id: user.id,
        username,
        price: parseFloat(cardDataScry.prices?.usd) || 0,
        image_url: chosen.image_url || image_url_for_catalog,
        back_image_url: chosen.back_image_url || back_image_url_for_catalog,
        set_name: setName,
        scryfall_uri: cardDataScry.scryfall_uri,
        scryfall_id: cardDataScry.id,
        type_line: cardDataScry.type_line || '',
        colors: cardColors,
        rarity: cardDataScry.rarity || (cardDataScry.card_faces?.[0]?.rarity ?? '') || '',
        cmc: cardDataScry.cmc ?? (cardDataScry.card_faces?.[0]?.cmc ?? null),
        oracle_text: cardDataScry.oracle_text || (cardDataScry.card_faces?.[0]?.oracle_text ?? '') || '',
        borderless: !!borderless,
        showcase: !!showcase,
        extended_art: !!extendedArt,
        foil: !!foil,
      };

      payload.colors = fixColorsArray(payload);

      // Find existing rows for this scryfall_id, check for exact variant match
      const { data: existingRows, error: existErr } = await supabase
        .from('inventory')
        .select('id, quantity, borderless, showcase, extended_art, foil')
        .eq('user_id', user.id)
        .eq('scryfall_id', cardDataScry.id);

      if (existErr) {
        console.error('Error checking existing card:', existErr);
        alert('Failed to add card (check console)');
        return;
      }

      let matchingRow = null;
      if (Array.isArray(existingRows)) {
        matchingRow = existingRows.find(r =>
          !!r.borderless === !!payload.borderless &&
          !!r.showcase === !!payload.showcase &&
          !!r.extended_art === !!payload.extended_art &&
          !!r.foil === !!payload.foil
        );
      }

      if (matchingRow) {
        const newQty = matchingRow.quantity + qty;
        const updatePayload = { ...payload, quantity: newQty };
        const { error: updateError } = await supabase.from('inventory').update(updatePayload).eq('id', matchingRow.id);
        if (updateError) {
          console.error('Error updating existing card:', updateError);
          alert('Failed to update card (check console)');
          return;
        }
      } else {
        const insertPayload = { ...payload, quantity: qty };
        const { error: insertError } = await supabase.from('inventory').insert([insertPayload]);
        if (insertError) {
          console.error('Error inserting new card:', insertError);
          alert('Failed to add card (check console)');
          return;
        }
      }

      // reset and refresh
      setCardName('');
      setQuantity(1);
      setSetName('');
      setBorderless(false);
      setShowcase(false);
      setExtendedArt(false);
      setFoil(false);
      setRefreshTrigger(p => p + 1);
    } catch (err) {
      console.error('Unhandled error in handleAdd:', err);
      alert('Failed to add card (see console)');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [cardName, quantity, setName, user, allSets, borderless, showcase, extendedArt, foil]);

// ---------- Card click to detail page ----------
const handleCardClick = useCallback(
  async (card) => {
    if (!card || !card.scryfall_id) {
      console.warn('Card click missing scryfall_id', card);
      // Optional server logging for debugging
      await fetch('/api/logFetchError', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Missing scryfall_id on card click',
          card,
          timestamp: new Date(),
        }),
      });
      return;
    }

    try {
      router.push({
        pathname: '/card/[id]',
        query: {
          id: card.scryfall_id,      // exact print UUID
          returnUrl: router.asPath,  // go back to inventory
          finish: card.finish || '', // optional finish
          style: card.style || '',   // optional borderless / alt-art
        },
      });
    } catch (err) {
      console.error('Error navigating to CardDetail:', err);
      await fetch('/api/logFetchError', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: err.message,
          card,
          timestamp: new Date(),
        }),
      });
    }
  },
  [router]
);

// ---------- Delete ----------
const handleDelete = useCallback(async (id) => {
  if (!id) return;
  setLoading(true);
  try {
    const { data: card, error: fetchError } = await supabase
      .from('inventory')
      .select('id, quantity')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    if (card.quantity > 1) {
      await supabase.from('inventory').update({ quantity: card.quantity - 1 }).eq('id', id);
    } else {
      await supabase.from('inventory').delete().eq('id', id);
    }

    setRefreshTrigger((p) => p + 1);
  } catch (err) {
    console.error('Error deleting card:', err);
    alert('Failed to delete card (check console)');
  } finally {
    if (mountedRef.current) setLoading(false);
  }
}, []);

// ---------- Hover ----------
const handleHover = useCallback((card) => {
  setHoveredCard(card);
  hoveredCardRef.current = card;
}, []);

// ---------- Flip ----------
const handleFlip = useCallback((id) => {
  setFlippedCards(p => ({ ...p, [id]: !p[id] }));
}, []);

// ---------- Pagination ----------
const handleNext = () => { if (inventory.length === pageSize) setCurrentPage(p => p + 1); };
const handlePrev = () => setCurrentPage(p => (p > 1 ? p - 1 : 1));

// ---------- Reset filters ----------
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


  // ---------- Click Handler ----------
const handleClick = useCallback(
  (card) => {
    if (!card) return;

    try {
      // Determine correct style for CardDetail page
      let style = '';
      if (card.borderless || borderless) style = 'borderless';
      else if (card.showcase || showcase) style = 'showcase';
      else if (card.extended_art || extendedArt) style = 'extended';
      else if (card.foil || foil) style = 'foil';

      const finish = card.foil || foil ? 'foil' : 'nonfoil';

      // Navigate to CardDetail page
      router.push({
        pathname: '/card/[id]',
        query: {
          id: card.scryfall_id || card.id, // fallback to local id if needed
          returnUrl: router.asPath,
          style,
          finish,
        },
      });
    } catch (err) {
      console.error('Error navigating to CardDetail:', err);
      alert('Failed to open card detail. Check console for details.');
    }
  },
  [router, borderless, showcase, extendedArt, foil]
);

// ---------- Inventory Grid ----------
const inventoryGrid = useMemo(
  () =>
    inventory.map((c) => (
      <CardItem
        key={c.id}
        card={c}
        onClick={() => handleClick(c)}
        onDelete={handleDelete}
        flipped={!!flippedCards[c.id]}
        onFlip={handleFlip}
        onHover={handleHover}
      />
    )),
  [inventory, flippedCards, handleClick, handleDelete, handleFlip, handleHover]
);

// ---------- Metadata & Card Count ----------
const uniqueSetsWithType = inventoryMetaSets;
const uniqueTypes = inventoryMetaTypes;

const cardCountWidget = useMemo(
  () => <CardCountDisplay user={user} refreshTrigger={refreshTrigger} />,
  [user, refreshTrigger]
);

// ---------- Render ----------
return (
  <div className="min-h-screen bg-cover bg-center text-black p-6">
    <main className="flex min-h-screen w-full p-6 bg-transparent items-start justify-start gap-6">
      <div className="w-full flex flex-col md:flex-row md:items-start gap-1">
        {/* LEFT COLUMN - PREVIEW & CARD COUNT */}
        <div className="w-full md:w-1/4 sticky top-6 self-start">
          <h1 className="text-xl font-bold text-white-300 mb-4">Card Preview</h1>
          {(hoveredCard || selectedCard) ? (
            <>
              <img
                src={(hoveredCard || selectedCard).image_url || '/placeholder.jpg'}
                alt={(hoveredCard || selectedCard).name || 'Card preview'}
                className="w-full h-auto object-contain rounded mb-2"
              />
              <div className="text-xs space-y-1">
                <p className="font-bold">{(hoveredCard || selectedCard).name}</p>
                <p>Price: {(hoveredCard || selectedCard).price > 0 ? `$${(hoveredCard || selectedCard).price?.toFixed?.(2)}` : 'N/A'}</p>
                <p>Set: {(hoveredCard || selectedCard).set_name || 'Unknown'}</p>
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
          ) : <p className="text-white">Hover a card to preview it</p>}
          <div className="text-white font-bold mt-4">{cardCountWidget}</div>
        </div>

          

{/* RIGHT COLUMN - ADD CARD FORM + INVENTORY (slimmed & refined) */}
<div className="w-full md:w-3/4 flex flex-col items-center">
  <form
    onSubmit={handleAdd}
    className="bg-[#0e0e16]/70 rounded-cardverse p-3 md:p-4 shadow-glow-purple/30 mb-6 w-full max-w-2xl"
  >
    <div className="flex flex-wrap gap-3 items-end">
      {/* CARD NAME AUTOCOMPLETE */}
      <div className="flex-1 min-w-[160px] relative">
        <label className="block mb-1 text-white font-magic text-sm font-semibold">
          Card Name
        </label>

        <input
          type="text"
          value={cardName}
          onChange={(e) => {
            setCardName(e.target.value);
            setShowCardDropdown(true);
            if (typeof fetchCardSuggestions === 'function') fetchCardSuggestions(e.target.value);
          }}
          onFocus={() => setShowCardDropdown(true)}
          onBlur={() => setTimeout(() => setShowCardDropdown(false), 150)}
          placeholder="Black Lotus"
          autoComplete="off"
          required
          className="w-full input-glass text-sm px-3 py-2 placeholder-neon-purple focus:glow-purple"
        />

        {/* Suggestions (strings from Scryfall autocomplete) */}
        {showCardDropdown && cardSuggestions && cardSuggestions.length > 0 && (
          <ul
            role="listbox"
            aria-label="Card suggestions"
            className="absolute top-full left-0 right-0 bg-gradient-to-b from-[#0b0b12] to-[#0f0b18] border border-arcane-purple/40 rounded-lg mt-1 max-h-48 overflow-y-auto z-50 shadow-rune-shadow"
          >
            {cardSuggestions.map((name) => (
              <li
                key={name}
                onMouseDown={(e) => {
                  e.preventDefault(); // ensure this runs before input blur
                  setCardName(name);
                  setShowCardDropdown(false);
                }}
                className="px-3 py-2 text-white text-sm hover:bg-arcane-purple/30 cursor-pointer transition-colors duration-150 select-none"
                role="option"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setCardName(name);
                    setShowCardDropdown(false);
                  }
                }}
              >
                <span className="block truncate font-medium">{name}</span>
              </li>
            ))}
          </ul>
        )}

        {loadingCards && (
          <div className="absolute top-full left-0 right-0 mt-1 text-xs text-gray-400 px-3 py-1 bg-black/60 rounded">
            Loading…
          </div>
        )}
      </div>

      {/* SET AUTOCOMPLETE */}
      <div className="flex-1 min-w-[180px] relative">
        <label className="block mb-1 text-white font-magic text-sm font-semibold">
          Set
        </label>
        <input
          type="text"
          value={setName}
          onChange={(e) => {
            setSetName(e.target.value);
            setShowSetDropdown(true);
          }}
          onFocus={() => setShowSetDropdown(true)}
          onBlur={() => setTimeout(() => setShowSetDropdown(false), 150)}
          placeholder="Select or type set"
          autoComplete="off"
          className="w-full input-glass text-sm px-3 py-2 placeholder-neon-pink"
        />

        {showSetDropdown && allSets && allSets.length > 0 && (
          <ul
            role="listbox"
            aria-label="Set suggestions"
            className="absolute top-full left-0 right-0 bg-gradient-to-b from-[#0b0b12] to-[#0f0b18] border border-arcane-purple/40 rounded-lg mt-1 max-h-40 overflow-y-auto z-50 shadow-rune-shadow"
          >
            {allSets
              .filter((s) => (s.name || '').toLowerCase().includes((setName || '').toLowerCase()))
              .slice(0, 80) // keep list reasonable
              .map((set) => (
                <li
                  key={set.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSetName(set.name);
                    setShowSetDropdown(false);
                  }}
                  className="px-3 py-2 text-white text-sm hover:bg-arcane-purple/30 cursor-pointer transition-colors duration-150 select-none"
                >
                  <span className="block truncate">{set.name}</span>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* QUANTITY */}
      <div className="w-20 min-w-[64px]">
        <label className="block mb-1 text-white font-magic text-sm font-semibold">
          Qty
        </label>
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) =>
            setQuantity(
              Number.isNaN(parseInt(e.target.value, 10))
                ? 1
                : parseInt(e.target.value, 10)
            )
          }
          required
          className="w-full input-glass text-sm px-2 py-2 placeholder-neon-pink"
        />
      </div>

      {/* ADD BUTTON (image with glow wrapper) */}
<div className="flex items-end">
  <button
    type="submit"
    aria-label="Add card"
    className="btn-glow p-1 ml-1 flex items-center justify-center rounded-lg"
  >
    <img
      src="/assets/add_card.png"
      alt="Add Card"
      className="w-20 h-auto pointer-events-none"
      draggable={false}
    />
    <span className="sr-only">Add card</span>
  </button>
</div>
</div>

  
            {/* compact checkbox row */}
            <div className="mt-3 flex flex-wrap gap-3 text-white">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={borderless} onChange={(e) => setBorderless(e.target.checked)} className="accent-blue-400" /> Borderless
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={showcase} onChange={(e) => setShowcase(e.target.checked)} className="accent-blue-400" /> Showcase
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={extendedArt} onChange={(e) => setExtendedArt(e.target.checked)} className="accent-blue-400" /> Extended Art
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={foil} onChange={(e) => setFoil(e.target.checked)} className="accent-blue-400" /> Foil
              </label>
            </div>
          </form>

          {/* CARD GRID */}
          <div className="w-full max-w-6xl">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {loading
                ? <p className="col-span-full text-center">Loading…</p>
                : inventory.length === 0
                  ? <p className="col-span-full text-center">No cards in inventory.</p>
                  : inventoryGrid
              }
            </div>

            {/* PAGINATION */}
            <div className="flex justify-center gap-4 mt-6">
              <button onClick={handlePrev} disabled={currentPage === 1} className="px-4 py-2 bg-indigo-600 rounded disabled:opacity-50" type="button">Previous</button>
              <span className="px-4 py-2 bg-gray-800 rounded">Page {currentPage}</span>
              <button onClick={handleNext} disabled={inventory.length < pageSize} className="px-4 py-2 bg-indigo-600 rounded disabled:opacity-50" type="button">Next</button>
            </div>
          </div>
        </div>
      </div>
    </main>
 


      {/* RIGHT FILTER DRAWER */}
<aside
  className={`fixed top-0 right-0 h-full bg-gradient-to-b from-[#15273b] to-[#102233] shadow-lg p-4 transition-transform duration-300 filterbar-container ${showFilters ? 'translate-x-0' : 'translate-x-full'}`}
  style={{ width: '300px', zIndex: 50 }}
>
  <button
    onClick={() => setShowFilters(v => !v)}
    className="absolute left-[-36px] top-4 bg-[#1b2e4b] p-2 rounded-full shadow"
    aria-label="Toggle filters"
    type="button"
  >
    {showFilters ? '◀' : '▶'}
  </button>
  <h2 className="text-lg mb-2 text-cyan-300 font-semibold">Filters</h2>

  <div className="space-y-3 text-sm overflow-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
    {/* meta error banner & retry */}
    {metaError && (
      <div className="bg-yellow-800 text-yellow-100 px-3 py-2 rounded mb-2">
        <div className="text-xs">Metadata load failed: {String(metaError)}</div>
        <div className="mt-1 flex gap-2">
          <button
            onClick={(e) => { e.preventDefault(); fetchInventoryMeta(); }}
            className="bg-yellow-600 px-2 py-1 rounded text-xs"
          >
            Retry
          </button>
          <button
            onClick={(e) => { e.preventDefault(); setMetaError(null); }}
            className="bg-gray-700 px-2 py-1 rounded text-xs"
          >
            Dismiss
          </button>
        </div>
        <div className="mt-1 text-xs text-gray-200">
          If this keeps failing: check Supabase RLS/policies and console for details.
        </div>
      </div>
    )}

    <div>
      <label className="block mb-1 text-gray-200">Name contains</label>
      <input
        type="text"
        value={fName}
        onChange={(e) => { setFName(e.target.value); setCurrentPage(1); }}
        className="w-full bg-[#071019] text-white px-2 py-1 rounded border border-gray-600"
        placeholder="Black Lotus"
        autoComplete="off"
      />
    </div>

    <div>
      <label className="block mb-1 text-gray-200">Set</label>
      <select
        value={fSet}
        onChange={(e) => { setFSet(e.target.value); setCurrentPage(1); }}
        className="w-full bg-[#071019] text-white px-2 py-1 rounded border border-gray-600"
      >
        <option value="">All sets</option>
        {uniqueSetsWithType.map(({ name, type }) => (
          <option key={name} value={name}>{name} {type ? `(${type})` : ''}</option>
        ))}
      </select>
    </div>

    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="block mb-1 text-gray-200">Qty ≥</label>
        <input
          type="number"
          min="0"
          value={fMinQty}
          onChange={(e) => { setFMinQty(e.target.value); setCurrentPage(1); }}
          className="w-full bg-[#071019] text-white px-2 py-1 rounded border border-gray-600"
        />
      </div>
      <div>
        <label className="block mb-1 text-gray-200">Qty ≤</label>
        <input
          type="number"
          min="0"
          value={fMaxQty}
          onChange={(e) => { setFMaxQty(e.target.value); setCurrentPage(1); }}
          className="w-full bg-[#071019] text-white px-2 py-1 rounded border border-gray-600"
        />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="block mb-1 text-gray-200">Price ≥</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={fMinPrice}
          onChange={(e) => { setFMinPrice(e.target.value); setCurrentPage(1); }}
          className="w-full bg-[#071019] text-white px-2 py-1 rounded border border-gray-600"
        />
      </div>
      <div>
        <label className="block mb-1 text-gray-200">Price ≤</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={fMaxPrice}
          onChange={(e) => { setFMaxPrice(e.target.value); setCurrentPage(1); }}
          className="w-full bg-[#071019] text-white px-2 py-1 rounded border border-gray-600"
        />
      </div>
    </div>

    <div>
      <label className="block mb-1 text-gray-200">Colors</label>
      <select
        multiple
        value={fColors}
        onChange={(e) => {
          const selected = Array.from(e.target.selectedOptions).map(o => o.value);
          setFColors(selected);
          setCurrentPage(1);
        }}
        className="w-full bg-[#071019] text-white px-2 py-1 rounded border border-gray-600 h-28"
      >
        {colorOptions.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
      </select>
    </div>

    <div>
      <label className="block mb-1 text-gray-200">Types</label>
      <select
        multiple
        value={fTypes}
        onChange={(e) => {
          const selected = Array.from(e.target.selectedOptions).map(o => o.value);
          setFTypes(selected);
          setCurrentPage(1);
        }}
        className="w-full bg-[#071019] text-white px-2 py-1 rounded border border-gray-600 h-32"
      >
        {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <div className="mt-1 text-xs text-gray-300">Tip: multi-select with Ctrl/Cmd or Shift</div>
    </div>

    <div className="pt-2">
      <button
        onClick={(e) => { e.preventDefault(); resetAll(); }}
        className="w-full bg-red-700 hover:bg-red-800 py-2 rounded text-center text-white"
        type="button"
      >
        Reset Filters
      </button>
    </div>
  </div>
</aside>

    </div>
  );
}
