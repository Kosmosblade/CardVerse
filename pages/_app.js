import '../styles/filterbar.css';
import '../styles/globals.css';
import '../styles/backgroundnav.css';
import '../styles/background.css';
import '../styles/usermenu.css';

import NavBar from '../components/NavBar';
import SearchBar from '../components/SearchBar';
import { AuthProvider } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { CardCountProvider, useCardCount } from '../context/CardCountContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function MyApp({ Component, pageProps }) {
  const [query, setQuery] = useState('');
  const [cards, setCards] = useState([]);
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();

  const clearSearch = () => {
    setQuery('');
    setCards([]);
  };

  useEffect(() => {
    if (router.isReady && router.query.reset === '1') {
      clearSearch();
      router.replace('/', undefined, { shallow: true });
    }
  }, [router.isReady, router.query.reset]);

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      setUser(data?.session?.user ?? null);
    }
    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      try {
        listener?.subscription?.unsubscribe?.();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    async function fetchProfile() {
      try {
        const cleanUserId = user.id.replace(/[<>]/g, '');
        const { data, error } = await supabase
          .from('profiles')
          .select('username, avatar_url, subscription_type, current_card_count')
          .eq('id', cleanUserId)
          .single();
        if (!error && data) setProfile(data);
        else setProfile(null);
      } catch (err) {
        console.error('fetchProfile error', err);
        setProfile(null);
      }
    }
    fetchProfile();
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    else document.removeEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const sendDiscordWebhook = async (card, opts = { usePrivate: false }) => {
    if (!card) {
      console.warn('[Webhook] sendDiscordWebhook called without card');
      return false;
    }

    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || '';
    const pageUrl = typeof window !== 'undefined' ? window.location.href : `${origin}${router.asPath}`;

    const cardDetailUrl = `${origin}/card/${card.id}`;

    const payload = {
      username: 'Conjuerers Crypt Bot',
      embeds: [
        {
          title: `Card Searched: ${card.name}`,
          url: cardDetailUrl,
          description: card.oracle_text || 'No description',
          color: 7506394,
          fields: [
            { name: 'Set', value: card.set_name || 'N/A', inline: true },
            { name: 'Rarity', value: card.rarity || 'N/A', inline: true },
            { name: 'Price (USD)', value: card.prices?.usd || 'N/A', inline: true },
            { name: 'Searched From', value: router.pathname || 'unknown', inline: true },
            { name: 'Page URL', value: pageUrl || 'unknown', inline: false },
          ],
          thumbnail: {
            url:
              (card.image_uris && card.image_uris.small) ||
              (card.card_faces?.[0]?.image_uris?.small) ||
              '',
          },
          footer: { text: `Source: ${router.pathname || 'unknown'}` },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const bodyToPost = { ...payload, usePrivate: !!opts.usePrivate };

    try {
      const res = await fetch('/api/send-to-discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyToPost),
      });

      let text;
      try {
        text = await res.text();
      } catch (readErr) {
        text = `<unable to read response text: ${readErr.message}>`;
      }

      if (!res.ok) {
        console.error('[Webhook Error]', {
          status: res.status,
          statusText: res.statusText,
          body: text,
          payload: bodyToPost,
        });
        return false;
      } else {
        try {
          const parsed = JSON.parse(text || '{}');
          console.log('[Webhook Success]', parsed);
        } catch {
          console.log('[Webhook Success]', text || '(no body)');
        }
        return true;
      }
    } catch (err) {
      console.error('[Webhook Exception]', err);
      return false;
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      const res = await fetch(
        `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(query.trim())}`
      );
      const data = await res.json();

      if (data.object === 'error') {
        alert('Card not found');
        setCards([]);
        return;
      }

      setCards([data]);

      const ok = await sendDiscordWebhook(data, { usePrivate: false });
      if (!ok) {
        console.warn('[handleSearch] webhook POST did not succeed (check server logs / debug panel)');
      }

      if (router.pathname !== '/') router.push('/');
    } catch (err) {
      alert('Error fetching card data');
      console.error(err);
    }
  };

  return (
    <AuthProvider>
      <CardCountProvider user={user}>
        <div className="min-h-screen flex flex-col bg-transparent text-white relative">
          <div className="background-overlay" />
          <div
            className="absolute inset-0 bg-animated-gradient bg-size-400 animate-gradient-move"
            style={{ filter: 'blur(80px)', opacity: 0.5, zIndex: -1 }}
          />

          <NavBar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

          {user && (
            <UserMenu
              profile={profile}
              user={user}
              menuOpen={menuOpen}
              setMenuOpen={setMenuOpen}
              menuRef={menuRef}
            />
          )}

          {/* Search bar and results ONLY on homepage */}
          {router.pathname === '/' && (
            <div className="w-full pt-32 px-4 flex justify-center">
              <SearchBar
                query={query}
                setQuery={setQuery}
                handleSearch={handleSearch}
                cards={cards}
              />
            </div>
          )}

          <main className="flex-grow flex justify-center items-start p-6 max-w-6xl mx-auto mt-12 bg-transparent">
            <Component {...pageProps} query={query} />
          </main>

          <footer className="bg-[#112b4a] border-t mt-20 p-4 text-center text-sm text-yellow-500 shadow-inner">
            <p style={{ fontSize: '0.8em', color: 'gray', marginBottom: '0.5rem' }}>
              Card data and images © Wizards of the Coast. Data provided by{' '}
              <a href="https://scryfall.com" target="_blank" rel="noopener noreferrer" className="underline">
                Scryfall
              </a>
              . Unaffiliated with Wizards of the Coast LLC.
            </p>
            &copy; {new Date().getFullYear()} Conjurers Crypt. All rights reserved.
          </footer>
        </div>
      </CardCountProvider>
    </AuthProvider>
  );
}

// ====================================================================
// UserMenu component - fetches and displays deck count and profile info
// ====================================================================
function UserMenu({ profile, user, menuOpen, setMenuOpen, menuRef }) {
  const { cardCount } = useCardCount();
  const [deckCount, setDeckCount] = useState(0);
  const timeoutRef = useRef();

  useEffect(() => {
    if (!user) {
      setDeckCount(0);
      return;
    }
    async function fetchDeckCount() {
      try {
        const cleanUserId = user.id.replace(/[<>]/g, '');
        const { count, error } = await supabase
          .from('decks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', cleanUserId);

        if (error) {
          console.error('fetchDeckCount error:', error);
          setDeckCount(0);
        } else {
          setDeckCount(count || 0);
        }
      } catch (err) {
        console.error('fetchDeckCount exception:', err);
        setDeckCount(0);
      }
    }
    fetchDeckCount();
  }, [user]);

  useEffect(() => {
    if (menuOpen) timeoutRef.current = setTimeout(() => setMenuOpen(false), 15000);
    return () => clearTimeout(timeoutRef.current);
  }, [menuOpen]);

  return (
    <div className="fixed top-4 right-4 z-50" ref={menuRef}>
      {!menuOpen && (
        <button
          onClick={() => setMenuOpen(true)}
          className="user-menu-btn relative w-12 h-12 rounded-full overflow-visible border-4 border-gradient-fire shadow-fire-glow hover:shadow-fire-glow-strong transition-all duration-500"
          title="User menu"
          aria-label="Open user menu"
          type="button"
        >
          {profile?.avatar_url ? (
            <a href="/profile" tabIndex={-1} aria-label="Go to profile">
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-full h-full object-cover rounded-full relative z-10 cursor-pointer"
              />
            </a>
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-red-600 via-yellow-400 to-orange-600 flex items-center justify-center text-white font-extrabold text-lg rounded-full animate-pulse-fire relative z-10">
              {profile?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <span
            className="flame-anim-layer pointer-events-none absolute rounded-full"
            style={{
              top: '-6px',
              left: '-6px',
              right: '-6px',
              bottom: '-6px',
              zIndex: 5,
              opacity: 0.6,
              filter: 'blur(6px)',
            }}
          />
        </button>
      )}

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="usermenu"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.25 }}
            className="mt-2 w-64 bg-gradient-to-br from-[#3a0f0f] via-[#591212] to-[#7a1b1b] backdrop-blur-xl rounded-2xl shadow-2xl border border-gradient-fire-light text-white font-sans overflow-hidden relative"
          >
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none flame-anim-layer rounded-2xl" />
            <div className="flex items-center gap-4 p-6 border-b border-gradient-fire-light relative z-10">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-gradient-fire">
                {profile?.avatar_url ? (
                  <a href="/profile" tabIndex={-1} aria-label="Go to profile">
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="w-full h-full object-cover rounded-full cursor-pointer"
                    />
                  </a>
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-red-600 via-yellow-400 to-orange-600 flex items-center justify-center text-white font-extrabold text-xl rounded-full animate-pulse-fire">
                    {profile?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl tracking-wide drop-shadow-lg select-text">
                  {profile?.username || user?.email}
                </span>
                <span className="text-sm text-orange-300 tracking-wide select-text">Online</span>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4 text-white relative z-10">
              <p className="text-lg">
                <strong className="text-orange-400">Subscription:</strong>{' '}
                <span className="text-yellow-300 font-semibold">
                  {profile?.subscription_type
                    ? profile.subscription_type[0].toUpperCase() + profile.subscription_type.slice(1)
                    : 'Free'}
                </span>
              </p>
              <p className="text-lg">
                <strong className="text-orange-400">Cards in Inventory:</strong>{' '}
                <span className="text-yellow-300 font-semibold">{cardCount}</span>
              </p>
              <p className="text-lg">
                <strong className="text-orange-400">Decks Created:</strong>{' '}
                <span className="text-yellow-300 font-semibold">{deckCount}</span>
              </p>
              <button
                type="button"
                onClick={() => {
                  clearTimeout(timeoutRef.current);
                  setMenuOpen(false);
                  supabase.auth.signOut().then(() => (window.location.href = '/'));
                }}
                className="relative w-full py-3 px-6 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 hover:from-yellow-400 hover:via-orange-500 hover:to-red-600 rounded-xl text-black font-bold text-lg shadow-lg shadow-yellow-600/70 transition-all duration-300"
              >
                <span className="relative z-10">Log Out</span>
                <span className="absolute inset-0 rounded-xl opacity-60 blur-md bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 animate-pulse-fire-glow z-0" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
