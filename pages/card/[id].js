// pages/card/[id].js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function CardDetail() {
  const router = useRouter();
  const { id } = router.query;

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

  useEffect(() => {
    const initAuth = async () => {
      setAuthLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
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

  useEffect(() => setFlipped(false), [card, print]);

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

    const name = print?.name || card.name;
    const frontImage =
      print?.image_uris?.normal ||
      print?.card_faces?.[0]?.image_uris?.normal ||
      card.image_uris?.normal ||
      card.card_faces?.[0]?.image_uris?.normal;
    const backImage =
      print?.card_faces?.[1]?.image_uris?.normal ||
      card.card_faces?.[1]?.image_uris?.normal || null;
    const set_name = print?.set_name || card.set_name;
    const scryfall_uri = print?.scryfall_uri || card.scryfall_uri;
    const scryfall_id = print?.id || card.id;
    const rawPrice = print?.prices?.usd || card.prices?.usd;
    const price = rawPrice ? parseFloat(rawPrice) : 0;
    const user_id = user.id;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user_id)
        .single();
      const username = profile?.username || user.email;

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
        }]);
      if (insertError) throw insertError;
      setMessage({ type: 'success', text: `${name} added to inventory!` });
      setQuantity(1);
    } catch (err) {
      console.error('Insert error:', err);
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
        <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded">
          Go Back
        </button>
      </div>
    );
  }
  if (!card) {
    return (
      <div className="text-center mt-20 text-gray-300">
        <p>Card not found.</p>
        <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded">
          Go Back
        </button>
      </div>
    );
  }

  const frontImage =
    print?.image_uris?.normal ||
    print?.card_faces?.[0]?.image_uris?.normal ||
    card.image_uris?.normal ||
    card.card_faces?.[0]?.image_uris?.normal ||
    'https://via.placeholder.com/223x310?text=No+Image';
  const backImage =
    print?.card_faces?.[1]?.image_uris?.normal ||
    card.card_faces?.[1]?.image_uris?.normal || null;

  const oracleText =
    print?.oracle_text ||
    print?.card_faces?.[0]?.oracle_text ||
    card.oracle_text ||
    card.card_faces?.[0]?.oracle_text ||
    'No description';

  const rawPrice = print?.prices?.usd || card.prices?.usd;
  const displayPrice = rawPrice ? `$${parseFloat(rawPrice).toFixed(2)}` : 'N/A';
  const legalityList = Object.entries(card.legalities || {}).map(([fmt, st]) => ({
    format: fmt.charAt(0).toUpperCase() + fmt.slice(1),
    status: st.charAt(0).toUpperCase() + st.slice(1),
  }));

  // Check if it's a transform card layout
  const isTransformCard = (print?.layout || card.layout) === 'transform';

  return (
    <div className="max-w-6xl mx-auto mt-16 p-6 bg-[#112b4a] text-white rounded-xl shadow-2xl">
      <div className="flex flex-col lg:flex-row gap-10">
        <div className="flex-shrink-0 flex flex-col items-center perspective-800">
          <div className={`relative w-[280px] h-[390px] transform-style-preserve-3d transition-transform duration-700 ${flipped ? 'rotate-y-180' : ''}`}>
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
          {backImage && (
            <button
              onClick={() => setFlipped(!flipped)}
              className="mt-4 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 rounded select-none"
            >
              {flipped
                ? isTransformCard ? 'Untransform' : 'Unflip'
                : isTransformCard ? 'Transform' : 'Flip'}
            </button>
          )}
        </div>

        <div className="flex-1 space-y-4">
          <h1 className="text-4xl font-extrabold">{card.name}</h1>
          <p className="text-sm text-blue-200">
            {card.set_name} • {card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1)}
          </p>
          <p className="text-emerald-400 text-xl">Price: {displayPrice}</p>

          <div>
            <h2 className="font-semibold text-indigo-300">Oracle Text</h2>
            <p className="text-blue-100 whitespace-pre-wrap">{oracleText}</p>
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

          <div className="mt-6 bg-[#0b1f3a] p-4 rounded-xl border border-blue-900">
            <h3 className="text-lg font-semibold text-blue-200 mb-2">Add to Inventory</h3>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                className="w-20 px-2 py-1 rounded text-black"
              />
              <button
                onClick={handleAddToInventory}
                disabled={adding || authLoading || !user}
                className={`px-4 py-2 font-bold rounded text-white ${
                  adding || authLoading || !user
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {adding ? 'Adding…' : 'Add to Inventory'}
              </button>
            </div>
            {message && (
              <p className={`mt-2 text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {message.text}
              </p>
            )}
            {!user && !authLoading && (
              <p className="mt-2 text-yellow-400 text-sm">You must be logged in to add cards.</p>
            )}
          </div>

          <div className="mt-6 flex gap-4">
            <button onClick={() => router.back()} className="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-full text-white">
              Back
            </button>
            {card.prints_search_uri && (
              <button
                onClick={() => router.push(`/card-prints?name=${encodeURIComponent(card.name)}`)}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded-full text-white"
              >
                View Prints
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .perspective-800 { perspective: 800px; }
        .transform-style-preserve-3d { transform-style: preserve-3d; }
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}
