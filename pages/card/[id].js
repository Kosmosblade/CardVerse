import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function CardDetail() {
  const router = useRouter();
  const { id, returnUrl } = router.query;

  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [card, setCard] = useState(null);
  const [print, setPrint] = useState(null);

  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flipped, setFlipped] = useState(false);

  // Auth setup
  useEffect(() => {
    const initAuth = async () => {
      setAuthLoading(true);
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) console.error('getSession error:', error);
      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);
    };
    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setAuthLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Fetch card from Scryfall by id or name
  useEffect(() => {
    if (!id) return;
    const fetchCard = async () => {
      setLoading(true);
      setError(null);
      try {
        const isUUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);
        const url = isUUID
          ? `https://api.scryfall.com/cards/${id}`
          : `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(id)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.object === 'error') throw new Error(data.details || 'Not found');
        setCard(data);
        setPrint(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCard();
  }, [id]);

  // Reset flip on card change
  useEffect(() => setFlipped(false), [card, print]);

  // Add to inventory
  const handleAddToInventory = async () => {
    if (quantity < 1) {
      setMessage({ type: 'error', text: 'Quantity must be at least 1' });
      return;
    }
    if (!user) {
      setMessage({ type: 'error', text: 'You must be logged in to add cards' });
      return;
    }
    setAdding(true);
    setMessage(null);

    try {
      const source = print || card;

      const name = source.name;
      const scryfall_id = source.id;
      const user_id = user.id;

      // Get user profile username fallback to email
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user_id)
        .single();
      const username = profile?.username || user.email;

      // Prepare colors array carefully
      let colors = [];
      if (Array.isArray(source.colors) && source.colors.length > 0) {
        colors = source.colors;
      } else if (Array.isArray(source.card_faces)) {
        colors = [...new Set(source.card_faces.flatMap((face) => face.colors || []))];
      }
      if (colors.length === 0 && Array.isArray(source.color_identity) && source.color_identity.length > 0) {
        colors = source.color_identity;
      }
      if (
        colors.length === 0 &&
        (source.mana_cost?.includes('{C}') ||
          (source.type_line?.includes('Land') && !source.mana_cost) ||
          (source.type_line?.includes('Artifact') && (!source.mana_cost || source.mana_cost === '{0}')))
      ) {
        colors = ['Colorless'];
      }

      // Gather images
      const frontImage =
        source.image_uris?.normal ||
        source.card_faces?.[0]?.image_uris?.normal ||
        'https://via.placeholder.com/223x310?text=No+Image';
      const backImage = source.card_faces?.[1]?.image_uris?.normal || null;

      const set_name = source.set_name || null;
      const scryfall_uri = source.scryfall_uri || null;

      const rawPrice = source.prices?.usd || null;
      const price = rawPrice ? parseFloat(rawPrice) : 0;

      // Compose type_line for double-faced cards
      let type_line = '';
      if (source.type_line) {
        type_line = source.type_line;
      } else if (source.card_faces?.length) {
        type_line = source.card_faces.map((face) => face.type_line).filter(Boolean).join(' // ');
      }

      // Compose oracle_text for double-faced cards
      let oracle_text = '';
      if (source.oracle_text) {
        oracle_text = source.oracle_text;
      } else if (source.card_faces?.length) {
        oracle_text = source.card_faces.map((face) => face.oracle_text).filter(Boolean).join('\n\n');
      }

      // Check if card exists in inventory
      const { data: existingCard, error: fetchError } = await supabase
        .from('inventory')
        .select('id, quantity')
        .eq('scryfall_id', scryfall_id)
        .eq('user_id', user_id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

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
          .insert([
            {
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
            },
          ]);
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
        >
          Go Back
        </button>
      </div>
    );
  }

  const layout = print?.layout || card.layout;
  const isTransformCard = layout === 'transform';
  const isSplitCard = layout === 'split';

  const frontImage =
    print?.image_uris?.normal ||
    print?.card_faces?.[0]?.image_uris?.normal ||
    card.image_uris?.normal ||
    card.card_faces?.[0]?.image_uris?.normal ||
    'https://via.placeholder.com/223x310?text=No+Image';

  const backImage =
    print?.card_faces?.[1]?.image_uris?.normal || card.card_faces?.[1]?.image_uris?.normal || null;

  const rawPrice = print?.prices?.usd || card.prices?.usd;
  const displayPrice = rawPrice ? `$${parseFloat(rawPrice).toFixed(2)}` : 'N/A';

  const legalityList = Object.entries(card.legalities || {}).map(([fmt, st]) => ({
    format: fmt.charAt(0).toUpperCase() + fmt.slice(1),
    status: st.charAt(0).toUpperCase() + st.slice(1),
  }));

  return (
    <div className="max-w-6xl mx-auto mt-16 p-6 text-white shadow-2xl">
      <div className="flex flex-col lg:flex-row gap-10">
        <div className="flex-shrink-0 flex flex-col items-center perspective-800">
          {isSplitCard ? (
            <img
              src={frontImage}
              alt={card.name}
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
                alt={card.name}
                className="absolute w-full h-full rounded-lg shadow-lg backface-hidden"
              />
              {backImage && (
                <img
                  src={backImage}
                  alt={`${card.name} back`}
                  className="absolute w-full h-full rounded-lg shadow-lg backface-hidden rotate-y-180"
                />
              )}
            </div>
          )}
          {!isSplitCard && backImage && (
            <button
              onClick={() => setFlipped(!flipped)}
              className="mt-4 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 rounded select-none"
            >
              {flipped
                ? isTransformCard
                  ? 'Untransform'
                  : 'Unflip'
                : isTransformCard
                ? 'Transform'
                : 'Flip'}
            </button>
          )}
        </div>

        <div className="flex-1 space-y-4">
          <h1 className="text-4xl font-extrabold">{card.name}</h1>
          <p className="text-sm text-blue-200">
            {card.set_name} • {card.rarity?.charAt(0).toUpperCase() + card.rarity?.slice(1)}
          </p>
          <p className="text-emerald-400 text-xl">Price: {displayPrice}</p>

          <div>
            <h2 className="font-semibold text-indigo-300">Oracle Text</h2>
            {isSplitCard ? (
              <div className="text-blue-100 whitespace-pre-wrap space-y-4">
                {card.card_faces.map((face, idx) => (
                  <div key={idx}>
                    <h3 className="font-bold text-lg">
                      {face.name} — {face.mana_cost}
                    </h3>
                    <p>{face.oracle_text}</p>
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

          <div className="mt-6 p-4 rounded text-black bg-indigo-100 bg-opacity-20">
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
                className="disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Add to Inventory"
              >
                <img
                  src="/assets/Addbut.png"
                  alt="Add to Inventory"
                  className="w-48 h-auto hover:opacity-80 transition duration-200"
                />
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

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => (returnUrl ? router.push(returnUrl) : router.back())}
              className="relative w-36 h-12 rounded-full overflow-hidden transition transform hover:scale-105"
              aria-label="Go Back"
            >
              <img
                src="/assets/backbut.png"
                alt="Back"
                className="absolute inset-0 w-full h-full object-contain"
              />
            </button>

            {card.prints_search_uri && (
              <button
                onClick={() => router.push(`/card-prints?name=${encodeURIComponent(card.name)}`)}
                className="relative w-44 h-12 rounded-full overflow-hidden transition transform hover:scale-105"
                aria-label="View Prints"
              >
                <img
                  src="/assets/viewprints.png"
                  alt="View Prints"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .perspective-800 {
          perspective: 800px;
        }
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
