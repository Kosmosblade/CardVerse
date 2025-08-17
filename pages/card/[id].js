// pages/card/[id].js
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';



export default function CardDetail() {
  const router = useRouter();

  // From router
  const {
    id,
    returnUrl,
    set: setCode,
    cn: collectorNumber,
    finish,
    style,
  } = router.query;

  // Auth state
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // UI/data state
  const [card, setCard] = useState(null);      // selected card (primary source)
  const [print, setPrint] = useState(null);    // not used for selection anymore, but kept for compatibility
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flipped, setFlipped] = useState(false);

  // ---------- Auth ----------
  useEffect(() => {
    const initAuth = async () => {
      setAuthLoading(true);
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error('getSession error:', error);
      setSession(data?.session || null);
      setUser(data?.session?.user ?? null);
      setAuthLoading(false);
    };
    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setAuthLoading(false);
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  // ---------- Utilities ----------
  const STYLE_TO_EFFECT = {
    borderless: 'borderless',
    showcase: 'showcase',
    extended: 'extendedart',
    extendedart: 'extendedart',
    fullart: 'fullart',
  };

  const desiredEffect =
    typeof style === 'string' ? STYLE_TO_EFFECT[style.toLowerCase()] ?? null : null;
  const desiredFinish =
    typeof finish === 'string' ? finish.toLowerCase() : null;

  const normalize = (v) => (typeof v === 'string' ? v.trim() : v);

  const isUUID = (val) =>
    !!val &&
    /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(String(val));

  const source = useMemo(() => print || card, [print, card]);

  const pickPrice = (prices, finishPref) => {
    if (!prices) return null;
    const prefer = (k) => prices[k] || null;
    const pref = String(finishPref || '').toLowerCase();
    if (pref === 'foil') return prefer('usd_foil') || prefer('usd') || prefer('usd_etched');
    if (pref === 'etched') return prefer('usd_etched') || prefer('usd_foil') || prefer('usd');
    if (pref === 'nonfoil') return prefer('usd') || prefer('usd_foil') || prefer('usd_etched');
    return prefer('usd') || prefer('usd_foil') || prefer('usd_etched');
  };

  const getFrontImage = (src) => {
    if (!src) return 'https://via.placeholder.com/223x310?text=No+Image';
    // For DFC cards, the front image lives in card_faces[0]
    const face = Array.isArray(src.card_faces) && src.card_faces.length ? src.card_faces[0] : src;

    // Scryfall image_uris keys: small, normal, large, png, art_crop, border_crop
    // There is no "image_uris.borderless". "borderless" is a frame_effect; the image itself is still normal/large/png.
    // Prefer large for display, then normal.
    return (
      face?.image_uris?.large ||
      face?.image_uris?.normal ||
      face?.image_uris?.png ||
      'https://via.placeholder.com/223x310?text=No+Image'
    );
  };

  const getBackImage = (src) => {
    // Only DFC cards have a second face image
    const face = Array.isArray(src?.card_faces) && src.card_faces.length > 1 ? src.card_faces[1] : null;
    if (!face) return null;
    return face.image_uris?.large || face.image_uris?.normal || face.image_uris?.png || null;
  };

  const cardMatchesEffect = (c, effect) =>
    !!effect &&
    Array.isArray(c?.frame_effects) &&
    c.frame_effects.includes(effect);

  const cardMatchesFinish = (c, fin) =>
    !!fin && Array.isArray(c?.finishes) && c.finishes.includes(fin);

  // ---------- Fetch logic ----------
  useEffect(() => {
    if (!router.isReady) return;

    const qId = normalize(id);
    const qSet = normalize(setCode);
    const qCN = normalize(collectorNumber);

    if (!qId && !(qSet && qCN)) {
      setError('Missing required parameters.');
      setLoading(false);
      return;
    }

    const abort = new AbortController();

    const buildBaseUrl = () => {
      if (isUUID(qId)) {
        // Exact print by Scryfall UUID
        return `https://api.scryfall.com/cards/${qId}`;
      }
      if (qSet && qCN) {
        // Exact print by set code + collector number
        return `https://api.scryfall.com/cards/${encodeURIComponent(qSet)}/${encodeURIComponent(qCN)}`;
      }
      if (qId) {
        // Exact name fallback
        return `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(qId)}`;
      }
      return null;
    };

    const tryRefineToDesiredPrint = async (base) => {
      // If no style/finish requested, keep as-is
      const needEffect = !!desiredEffect && !cardMatchesEffect(base, desiredEffect);
      const needFinish = !!desiredFinish && !cardMatchesFinish(base, desiredFinish);

      if (!(needEffect || needFinish)) return base;

      // Explore prints if available
      if (!base?.prints_search_uri) return base;

      try {
        const printsRes = await fetch(base.prints_search_uri, { signal: abort.signal });
        const printsJson = await printsRes.json();

        if (!Array.isArray(printsJson?.data) || !printsJson.data.length) {
          return base;
        }

        const prints = printsJson.data;

        // If user passed set+cn, try to pick exact first (that’s already handled via base URL above,
        // but we’ll keep priority logic here for safety if we came via name).
        let candidate = base;
        if (!isUUID(qId) && qSet && qCN) {
          const exactSC = prints.find(
            (p) =>
              String(p.set).toLowerCase() === String(qSet).toLowerCase() &&
              String(p.collector_number).toLowerCase() === String(qCN).toLowerCase()
          );
          if (exactSC) candidate = exactSC;
        }

        // If style requested, pick print with that frame_effects
        if (needEffect) {
          const byEffect =
            prints.find((p) => cardMatchesEffect(p, desiredEffect)) || candidate;
          candidate = byEffect;
        }

        // If finish requested, pick a print that contains the desired finish
        if (needFinish) {
          // Search within the refined pool (candidate first)
          const byFinish =
            [candidate, ...prints].find((p) => cardMatchesFinish(p, desiredFinish)) || candidate;
          candidate = byFinish;
        }

        return candidate;
      } catch (e) {
        console.warn('prints_search_uri lookup failed:', e);
        return base;
      }
    };

    const fetchCard = async () => {
      setError(null);
      setLoading(true);
      try {
        const baseUrl = buildBaseUrl();
        if (!baseUrl) {
          setError('Missing required parameters.');
          setLoading(false);
          return;
        }

        const res = await fetch(baseUrl, { signal: abort.signal });
        const data = await res.json();
        if (data?.object === 'error') throw new Error(data.details || 'Not found');

        // Refine to desired print if style/finish requested and current one doesn't match
        const refined = await tryRefineToDesiredPrint(data);

        setCard(refined || data);
        setPrint(null);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(err);
          setError(err.message || 'Failed to load card');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCard();
    return () => abort.abort();
  }, [router.isReady, id, setCode, collectorNumber, desiredEffect, desiredFinish]);

  // Reset flip on new card
  useEffect(() => setFlipped(false), [card, print]);

  // ---------- Inventory Add ----------
  const handleAddToInventory = async () => {
    if (quantity < 1) {
      setMessage({ type: 'error', text: 'Quantity must be at least 1' });
      return;
    }
    if (!user) {
      setMessage({ type: 'error', text: 'You must be logged in to add cards' });
      return;
    }
    if (!source) return;

    setAdding(true);
    setMessage(null);

    try {
      const name = source.name || source.card_name || 'Unknown';
      const scryfall_id = source.id || source.scryfall_id || name;
      const user_id = user.id;

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user_id)
        .single();

      const username = profile?.username || user.email;

      // Colors
      let colors = [];
      if (Array.isArray(source.colors) && source.colors.length > 0) {
        colors = source.colors;
      } else if (Array.isArray(source.card_faces)) {
        colors = [...new Set(source.card_faces.flatMap((face) => face.colors || []))];
      }
      if (!colors.length && Array.isArray(source.color_identity) && source.color_identity.length > 0) {
        colors = source.color_identity;
      }
      if (
        !colors.length &&
        (source.mana_cost?.includes('{C}') ||
          (source.type_line?.includes('Land') && !source.mana_cost) ||
          (source.type_line?.includes('Artifact') && (!source.mana_cost || source.mana_cost === '{0}')))
      ) {
        colors = ['Colorless'];
      }

      // Images
      const frontImage = getFrontImage(source);
      const backImage = getBackImage(source);

      const set_name = source.set_name || null;
      const scryfall_uri = source.scryfall_uri || null;

      const rawPrice = pickPrice(source.prices, desiredFinish || (typeof finish === 'string' ? finish : undefined));
      const price = rawPrice ? parseFloat(rawPrice) : 0;

      // Type line
      let type_line = '';
      if (source.type_line) {
        type_line = source.type_line;
      } else if (Array.isArray(source.card_faces) && source.card_faces.length) {
        type_line = source.card_faces.map((face) => face.type_line).filter(Boolean).join(' // ');
      }

      // Oracle text
      let oracle_text = '';
      if (source.oracle_text) {
        oracle_text = source.oracle_text;
      } else if (Array.isArray(source.card_faces) && source.card_faces.length) {
        oracle_text = source.card_faces.map((face) => face.oracle_text).filter(Boolean).join('\n\n');
      }

      // Upsert inventory
      const { data: existingCard, error: fetchError } = await supabase
        .from('inventory')
        .select('id, quantity')
        .eq('scryfall_id', scryfall_id)
        .eq('user_id', user_id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (existingCard) {
        const newQty = existingCard.quantity + quantity;
        const { error: updateError } = await supabase
          .from('inventory')
          .update({ quantity: newQty })
          .eq('id', existingCard.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('inventory')
          .insert([{
            name,
            quantity,
            image_url: frontImage,
            back_image_url: backImage,
            set_name,
            scryfall_uri,
            price,
            scryfall_id,
            user_id,
            username,
            colors,
            type_line,
            rarity: source.rarity || null,
            cmc: source.cmc ?? null,
            oracle_text,
            // Helpful to store for precise routing later:
            set: source.set || null,
            collector_number: source.collector_number || null,
            finishes: source.finishes || null,
            frame_effects: source.frame_effects || null,
          }]);
        if (insertError) throw insertError;
      }

      setMessage({ type: 'success', text: `${name} added to inventory!` });
      setQuantity(1);
    } catch (err) {
      console.error('Inventory error:', err);
      setMessage({ type: 'error', text: 'Failed to add to inventory' });
    } finally {
      setAdding(false);
    }
  };

  // ---------- UI States ----------
  if (loading) {
    return <div className="text-center mt-20 text-gray-300">Loading card data...</div>;
  }

  if (error) {
    return (
      <div className="text-center mt-20 text-gray-300">
        <p>Error: {error}</p>
        <button
          onClick={() => (returnUrl ? router.push(returnUrl) : router.back())}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded"
          type="button"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="text-center mt-20 text-gray-300">
        <p>Card not found.</p>
        <button
          onClick={() => (returnUrl ? router.push(returnUrl) : router.back())}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded"
          type="button"
        >
          Go Back
        </button>
      </div>
    );
  }

  // ---------- Render ----------
  const layout = (print || card)?.layout;
  const isTransformCard = layout === 'transform';
  const isSplitCard = layout === 'split';

  const frontImage = getFrontImage(print || card);
  const backImage = getBackImage(print || card);

  const displayRawPrice = pickPrice(
    (print || card)?.prices,
    desiredFinish || (typeof finish === 'string' ? finish : undefined)
  );
  const displayPrice = displayRawPrice ? `$${parseFloat(displayRawPrice).toFixed(2)}` : 'N/A';

  const legalityList = Object.entries(card.legalities || {}).map(([fmt, st]) => ({
    format: fmt.charAt(0).toUpperCase() + fmt.slice(1),
    status: st.charAt(0).toUpperCase() + st.slice(1),
  }));

  // Compute available effects/finishes (combine card + print to show what's actually present)
  const availableEffects = Array.from(
    new Set([
      ...((card?.frame_effects && Array.isArray(card.frame_effects) ? card.frame_effects : []) || []),
      ...((print?.frame_effects && Array.isArray(print.frame_effects) ? print.frame_effects : []) || []),
    ])
  );
  const availableFinishes = Array.from(
    new Set([
      ...((card?.finishes && Array.isArray(card.finishes) ? card.finishes : []) || []),
      ...((print?.finishes && Array.isArray(print.finishes) ? print.finishes : []) || []),
    ])
  );

  const effectBadge =
    desiredEffect && Array.isArray(card.frame_effects) && card.frame_effects.includes(desiredEffect)
      ? desiredEffect
      : null;
  const finishBadge =
    desiredFinish && Array.isArray(card.finishes) && card.finishes.includes(desiredFinish)
      ? desiredFinish
      : null;

  return (
    <div className="max-w-6xl mx-auto mt-16 p-6 text-white shadow-2xl">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Image / Flip */}
        <div className="flex-shrink-0 flex flex-col items-center perspective-800">
          {isSplitCard ? (
            <img
              src={frontImage}
              alt={card.name || 'Unknown'}
              className="w-[280px] h-[390px] rounded-lg shadow-lg"
            />
          ) : (
            <div
              className={`relative w-[280px] h-[390px] transform-style-preserve-3d transition-transform duration-700 ${
                flipped ? 'rotate-y-180' : ''
              }`}
            >
              <img
                src={frontImage}
                alt={card.name || 'Unknown'}
                className="absolute w-full h-full rounded-lg shadow-lg backface-hidden"
              />
              {backImage && (
                <img
                  src={backImage}
                  alt={`${card.name || 'Unknown'} back`}
                  className="absolute w-full h-full rounded-lg shadow-lg backface-hidden rotate-y-180"
                />
              )}
            </div>
          )}
          {!isSplitCard && backImage && (
            <button
              onClick={() => setFlipped(!flipped)}
              className="mt-4 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 rounded select-none"
              type="button"
            >
              {flipped ? (isTransformCard ? 'Untransform' : 'Unflip') : isTransformCard ? 'Transform' : 'Flip'}
            </button>
          )}
        </div>

      {/* Details */}
<div className="flex-1 space-y-4">
  <div className="flex items-start gap-3">
    <div className="flex-1">
      <h1 className="text-4xl font-extrabold">{card.name || 'Unknown'}</h1>
      <div className="flex gap-2 mt-2 items-center">
        {/* show available effects as badges */}
        {availableEffects.length > 0 ? (
          availableEffects.map((ef) => (
            <span
              key={ef}
              className={`px-2 py-1 rounded ${ef === effectBadge ? 'bg-purple-700' : 'bg-zinc-700'} text-xs uppercase tracking-wide`}
            >
              {ef}
            </span>
          ))
        ) : (
          <span className="px-2 py-1 rounded bg-zinc-700 text-xs uppercase tracking-wide">Standard</span>
        )}

        {/* show finishes */}
        {availableFinishes.length > 0 && (
          <div className="flex gap-2 ml-2">
            {availableFinishes.map((f) => (
              <span key={f} className={`px-2 py-1 rounded ${f === finishBadge ? 'bg-amber-600 text-black' : 'bg-zinc-700'} text-xs uppercase tracking-wide`}>
                {f}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>

    <div>
      <p className="text-sm text-blue-200">
        {card.set_name || 'Unknown Set'} •{' '}
        {card.rarity ? card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1) : 'Unknown'} • #{card.collector_number || 'N/A'}
      </p>
    </div>
  </div>

  {/* Price (upgraded neon) */}
<div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-4 gap-2">
  <div className="text-sm text-red-200 uppercase tracking-wider">Price</div>

  <div className="flex items-center gap-3">
    {/* big neon gradient price */}
    <div
      className="neon-price font-extrabold text-3xl md:text-4xl leading-tight"
      aria-live="polite"
    >
      {(() => {
        // try keep displayPrice as-is if it's a string, but format numeric nicely
        const numeric = parseFloat(String(displayPrice).replace(/[^0-9.\-]/g, ''));
        return Number.isFinite(numeric) ? `$${numeric.toFixed(2)}` : displayPrice || 'N/A';
      })()}
    </div>

    {/* small sub-badge (optional info: source / non-foil / price tag) */}
    <div className="price-badge inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold select-none">
      Market
    </div>
  </div>

  {/* subtle shimmer underline */}
  <div className="w-full sm:w-auto">
    <div className="price-underline mt-2 sm:mt-0" aria-hidden />
  </div>
</div>


  <div>
    <h2 className="font-semibold text-indigo-300">Oracle Text</h2>
    {isSplitCard ? (
      <div className="text-blue-100 whitespace-pre-wrap space-y-4">
        {card.card_faces?.map((face, idx) => (
          <div key={idx}>
            <h3 className="font-bold text-lg">
              {face.name || 'Unknown'} — {face.mana_cost || 'N/A'}
            </h3>
            <p>{face.oracle_text || 'No description'}</p>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-blue-100 whitespace-pre-wrap">
        {print?.oracle_text ||
          print?.card_faces?.[0]?.oracle_text ||
          card.oracle_text ||
          card.card_faces?.[0]?.oracle_text ||
          'No description'}
      </p>
    )}
  </div>

  {legalityList.length > 0 && (
    <div>
      <h2 className="font-semibold text-indigo-300">Legalities</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {legalityList.map(({ format, status }) => (
          <span
            key={format}
            className={`px-2 py-1 rounded text-white text-sm ${
              status === 'Legal'
                ? 'bg-green-700'
                : status === 'Banned'
                ? 'bg-red-700'
                : 'bg-gray-600'
            }`}
          >
            {format}: {status}
          </span>
        ))}
      </div>
    </div>
  )}



          {/* Add to Inventory */}
          <div className="mt-6 p-3 rounded text-black  bg-opacity-20">
            <h3 className="text-lg font-semibold mb-2">Add to Inventory</h3>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-16 px-2 py-1 rounded text-black"
              />
    <button
      onClick={handleAddToInventory}
      disabled={adding || authLoading || !user}
      className="disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      aria-label="Add to Inventory"
      type="button"
    >
      {/* removed nested <button> and replaced with span/div for image */}
      <div className="btn-glow p-1 ml-1 flex items-center justify-center rounded-lg">
        <img
          src="/assets/Addbut.png"
          alt="Add to Inventory"
          className="w-48 h-auto pointer-events-none select-none"
          draggable={false}
        />
      </div>
      <span className="sr-only">Add to inventory</span>
    </button>
            </div>
            {message && (
              <p
                className={`mt-2 text-sm ${
                  message.type === 'success' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {message.text}
              </p>
            )}
            {!user && !authLoading && (
              <p className="mt-2 text-yellow-600 text-sm">You must be logged in to add cards.</p>
            )}
          </div>

          {/* Nav Buttons (glowified) */}
<div className="mt-6 flex gap-2">
  <button
    onClick={() => (returnUrl ? router.push(returnUrl) : router.back())}
    className="btn-glow rounded-lg p-1 ml-3 w-30 h-12 flex items-center justify-center overflow-hidden transform transition-all duration-200 hover:scale-105 hover:rotate-1 focus:outline-none focus:ring-2 focus:ring-glow-blue"
    aria-label="Go Back"
    type="button"
  >
    <img
      src="/assets/backbut.png"
      alt="Back"
      className="w-full h-full object-contain pointer-events-none"
      draggable={false}
    />
    <span className="sr-only">Go back</span>
  </button>

            {card?.prints_search_uri && (
    <button
      onClick={() => router.push(`/card-prints?name=${encodeURIComponent(card.name || 'Unknown')}`)}
    className="btn-glow rounded-lg p-1 ml-3 w-30 h-12 flex items-center justify-center overflow-hidden transform transition-all duration-200 hover:scale-105 hover:rotate-1 focus:outline-none focus:ring-2 focus:ring-glow-blue"
      aria-label="View Prints"
      type="button"
    >
      <img
        src="/assets/viewprints.png"
        alt="View Prints"
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />
      <span className="sr-only">View prints</span>
    </button>
  )}
</div>
</div>
</div>

      <style jsx>{`
        .perspective-800 { perspective: 800px; }
        .transform-style-preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}
