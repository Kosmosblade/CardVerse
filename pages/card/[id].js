// src/pages/card-detail/[id].jsx
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';

export default function CardDetail() {
  const router = useRouter();
  const { id } = router.query;

  // Auth session and user state
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Profile data from your profiles table
  const [profile, setProfile] = useState(null);

  // Dropdown state for user menu
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();

  // Card data states
  const [card, setCard] = useState(null);
  const [print, setPrint] = useState(null);

  // UI and form states
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flipped, setFlipped] = useState(false);

  // -- Effect: Manage auth session & user --
  useEffect(() => {
    async function getSession() {
      setAuthLoading(true);
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    }
    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, data) => {
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
      // Do not clear user/session if session is undefined, prevents logout glitch
      setAuthLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // -- Effect: Fetch profile data when user changes --
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    const fetchProfile = async () => {
      const cleanUserId = user.id.replace(/[<>]/g, '');
      const { data, error } = await supabase
        .from('profiles')
        .select('username, subscription_type, current_card_count, avatar_url')
        .eq('id', cleanUserId)
        .single();

      if (error) {
        console.warn('Failed to fetch profile data:', error);
        setProfile(null);
      } else {
        setProfile(data);
      }
    };

    fetchProfile();
  }, [user]);

  // -- Effect: Close menu on outside click --
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  // Fetch card data by ID or exact name from Scryfall API
  useEffect(() => {
    if (!id) return;

    const fetchCard = async () => {
      setLoading(true);
      setError(null);

      try {
        let url = '';
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (uuidRegex.test(id)) {
          url = `https://api.scryfall.com/cards/${id}`;
        } else {
          url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(id)}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.object === 'error') {
          setError(data.details || 'Card not found');
          setCard(null);
          setPrint(null);
        } else {
          setCard(data);
          setPrint(null);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching card:', err);
        setError('Failed to fetch card data');
        setCard(null);
        setPrint(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCard();
  }, [id]);

  useEffect(() => {
    setFlipped(false);
  }, [card, print]);

  // Add to inventory handler with user info included
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
      card.card_faces?.[0]?.image_uris?.normal ||
      'https://via.placeholder.com/223x310?text=No+Image';

    const backImage =
      print?.card_faces?.[1]?.image_uris?.normal ||
      card.card_faces?.[1]?.image_uris?.normal ||
      null;

    const set_name = print?.set_name || card.set_name || null;
    const scryfall_uri = print?.scryfall_uri || card.scryfall_uri || null;
    const scryfall_id = print?.id || card.id || null;

    const rawPrice = print?.prices?.usd || card?.prices?.usd || null;
    const numericPrice = rawPrice ? parseFloat(rawPrice) : 0;

    try {
      const cleanUserId = user.id.replace(/[<>]/g, '');

      // Fetch username from profiles table (optional, fallback to email or user id)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', cleanUserId)
        .single();

      let username = null;
      if (profileError || !profileData) {
        console.warn('Could not fetch username:', profileError);
        username = user.email || cleanUserId;
      } else {
        username = profileData.username;
      }

      const { error: insertError } = await supabase
        .from('inventory')
        .insert([
          {
            name,
            quantity: Number(quantity),
            image_url: frontImage,
            back_image_url: backImage,
            set_name,
            scryfall_uri,
            price: numericPrice,
            scryfall_id,
            user_id: cleanUserId,
            username,
          },
        ]);

      if (insertError) {
        setMessage({ type: 'error', text: 'Failed to add to inventory' });
        console.error('Insert error:', insertError);
      } else {
        setMessage({ type: 'success', text: `${name} added to inventory!` });
        setQuantity(1);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setMessage({ type: 'error', text: 'Failed to add to inventory' });
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center mt-20 text-gray-300">
        <p>Loading card data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center mt-20 text-gray-300">
        <p>Error: {error}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="text-center mt-20 text-gray-300">
        <p>Card data not found.</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Image selection logic
  const frontImage =
    print?.image_uris?.normal ||
    print?.card_faces?.[0]?.image_uris?.normal ||
    card.image_uris?.normal ||
    card.card_faces?.[0]?.image_uris?.normal ||
    'https://via.placeholder.com/223x310?text=No+Image';

  const backImage =
    print?.card_faces?.[1]?.image_uris?.normal ||
    card.card_faces?.[1]?.image_uris?.normal ||
    null;

  const oracleText =
    print?.oracle_text ||
    card.oracle_text ||
    (card.card_faces ? card.card_faces.map((face) => face.oracle_text).join('\n\n') : 'No description available.');

  const rawPrice = print?.prices?.usd || card?.prices?.usd || null;
  const price = rawPrice ? `$${parseFloat(rawPrice).toFixed(2)}` : 'N/A';

  const colors = card.color_identity?.length ? card.color_identity.join(', ') : 'Colorless';

  const legalityList = card.legalities
    ? Object.entries(card.legalities)
        .map(([format, status]) => ({
          format: format.charAt(0).toUpperCase() + format.slice(1),
          status: status.charAt(0).toUpperCase() + status.slice(1),
        }))
        .sort((a, b) => a.format.localeCompare(b.format))
    : [];

  return (
    <>
      {/* User avatar menu top right */}
      {user && (
        <div className="fixed top-4 right-4 z-50" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-600 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            type="button"
            title="User menu"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="User avatar" className="w-full h-full object-cover" />
            ) : (
              // Placeholder circle with initials or icon
              <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold select-none">
                {profile?.username ? profile.username.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
          </button>

          {menuOpen && (
            <div className="mt-2 w-56 bg-[#0b1f3a] rounded-lg shadow-lg border border-blue-700 text-white font-sans select-none">
              <div className="p-4 border-b border-blue-700">
                <p className="font-semibold truncate" title={profile?.username || user.email || user.id}>
                  {profile?.username || user.email || user.id}
                </p>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <p>
                  <strong>Subscription:</strong>{' '}
                  {profile?.subscription_type ? profile.subscription_type.charAt(0).toUpperCase() + profile.subscription_type.slice(1) : 'Free'}
                </p>
                <p>
                  <strong>Cards in Inventory:</strong>{' '}
                  {typeof profile?.current_card_count === 'number' ? profile.current_card_count : 'N/A'}
                </p>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    supabase.auth.signOut().then(() => {
                      router.push('/');
                    });
                  }}
                  className="mt-3 w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded transition"
                  type="button"
                >
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main page container with margin top so content not hidden behind avatar */}
      <div className="max-w-6xl mx-auto mt-16 px-6 py-8 bg-[#112b4a] text-white rounded-xl shadow-2xl">
        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-shrink-0 flex flex-col items-center perspective-800">
            {/* Card Container for flip */}
            <div
              className={`relative w-[280px] h-[390px] transition-transform duration-700 ease-in-out transform-style-preserve-3d ${
                flipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* Front */}
              <img
                src={frontImage}
                alt={print?.name || card.name}
                className="absolute w-[280px] h-[390px] rounded-lg shadow-lg border border-blue-800 backface-hidden"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/223x310?text=No+Image';
                }}
              />
              {/* Back */}
              {backImage && (
                <img
                  src={backImage}
                  alt={`${print?.name || card.name} (Back)`}
                  className="absolute w-[280px] h-[390px] rounded-lg shadow-lg border border-blue-800 backface-hidden rotate-y-180"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/223x310?text=No+Image';
                  }}
                />
              )}
            </div>

            {backImage && (
              <button
                onClick={() => setFlipped(!flipped)}
                className="mt-4 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded shadow select-none transition"
                aria-label="Toggle transform / flip card"
                type="button"
              >
                {flipped ? 'Front' : 'Transform'}
              </button>
            )}
          </div>

          <div className="flex-1 space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight">{print?.name || card.name}</h1>
            <p className="text-sm text-blue-200">
              {print?.set_name || card.set_name} •{' '}
              {print?.rarity || (card.rarity ? card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1) : 'N/A')}
            </p>
            <p className="text-emerald-400 font-semibold text-xl">Price: {price}</p>

            <div className="text-sm text-blue-100 space-y-1">
              <p>
                <strong>Type:</strong> {card.type_line || 'N/A'}
              </p>
              <p>
                <strong>Mana Cost:</strong> {card.mana_cost || 'N/A'}
              </p>
              <p>
                <strong>Colors:</strong> {colors}
              </p>
              <p>
                <strong>Artist:</strong> {card.artist || 'Unknown'}
              </p>
            </div>

            <div>
              <p className="font-semibold text-indigo-300 mt-4">Oracle Text:</p>
              <p className="whitespace-pre-wrap text-blue-100 text-sm">{oracleText}</p>
            </div>

            {legalityList.length > 0 && (
              <div className="mt-6">
                <p className="font-semibold text-indigo-300">Format Legalities:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 text-sm gap-1 mt-2">
                  {legalityList.map(({ format, status }) => (
                    <div
                      key={format}
                      className={`px-2 py-1 rounded text-center ${
                        status === 'Legal'
                          ? 'bg-green-700 text-white'
                          : status === 'Banned'
                          ? 'bg-red-700 text-white'
                          : 'bg-gray-600 text-white'
                      }`}
                    >
                      {format}: {status}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 bg-[#0b1f3a] p-4 rounded-xl shadow-inner border border-blue-900">
              <p className="text-lg font-semibold mb-2 text-blue-200">Add to Inventory</p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-20 px-2 py-1 rounded border text-black"
                  aria-label="Quantity to add"
                />
                <button
                  onClick={handleAddToInventory}
                  disabled={adding || authLoading || !user}
                  className={`px-4 py-2 font-bold rounded text-white ${
                    adding || authLoading || !user ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                  }`}
                  type="button"
                >
                  {adding ? 'Adding...' : 'Add to Inventory'}
                </button>
              </div>
              {message && (
                <p className={`mt-2 text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {message.text}
                </p>
              )}
              {!user && !authLoading && (
                <p className="mt-2 text-sm text-yellow-400">You must be logged in to add cards to inventory.</p>
              )}
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                type="button"
              >
                Back to Search
              </button>

              {card?.prints_search_uri && (
                <button
                  onClick={() => router.push(`/card-prints/${encodeURIComponent(card.name)}`)}
                  className="px-4 py-2 bg-pink-600 text-white font-bold rounded-full shadow-lg hover:bg-pink-700 transition-all duration-300"
                  type="button"
                >
                  View Prints
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Custom CSS for flip */}
        <style>{`
          .perspective-800 {
            perspective: 800px;
          }
          .transform-style-preserve-3d {
            transform-style: preserve-3d;
          }
          .backface-hidden {
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            position: absolute;
            top: 0;
            left: 0;
          }
          .rotate-y-180 {
            transform: rotateY(180deg);
          }
        `}</style>
      </div>
    </>
  );
}
