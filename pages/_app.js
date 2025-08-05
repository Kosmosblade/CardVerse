// pages/_app.js
import '../styles/filterbar.css';
import '../styles/globals.css';
import '../styles/backgroundnav.css';
import '../styles/background.css';
import '../styles/usermenu.css';
import NavBar from '../components/NavBar';
import SearchBar from '../components/SearchBar';
import Card from '../components/Card';
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

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      setUser(data?.session?.user ?? null);
    }
    loadSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    async function fetchProfile() {
      const cleanUserId = user.id.replace(/[<>]/g, '');
      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url, subscription_type, current_card_count')
        .eq('id', cleanUserId)
        .single();
      if (!error && data) setProfile(data);
      else setProfile(null);
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

  const sendDiscordWebhook = async (card) => {
    const payload = {
      username: 'Conjuerers Crypt Bot',
      embeds: [
        {
          title: `Card Searched: ${card.name}`,
          url: card.scryfall_uri,
          description: card.oracle_text || 'No description',
          color: 7506394,
          fields: [
            { name: 'Set', value: card.set_name || 'N/A', inline: true },
            { name: 'Rarity', value: card.rarity || 'N/A', inline: true },
            { name: 'Price (USD)', value: card.prices?.usd || 'N/A', inline: true },
          ],
          thumbnail: { url: card.image_uris?.small || '' },
          timestamp: new Date().toISOString(),
        },
      ],
    };
    try {
      const res = await fetch('/api/send-to-discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('[Webhook Error]', { status: res.status, statusText: res.statusText, errText, payload });
      } else {
        console.log('[Webhook Success]', await res.json());
      }
    } catch (err) {
      console.error('[Webhook Exception]', err);
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
      await sendDiscordWebhook(data);
      if (router.pathname !== '/') router.push('/');
    } catch (err) {
      alert('Error fetching card data');
      console.error(err);
    }
  };

  return (
    <AuthProvider>
      <CardCountProvider user={user}>
        <div className="min-h-screen flex flex-col bg-transparent text-white relative overflow-hidden">
          <div className="background-overlay" />
          <div
            className="absolute inset-0 bg-animated-gradient bg-size-400 animate-gradient-move"
            style={{ filter: 'blur(80px)', opacity: 0.5, zIndex: -1 }}
          />

          <NavBar />

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
              {/* Pass cards array to SearchBar so it can render results */}
              <SearchBar query={query} setQuery={setQuery} handleSearch={handleSearch} cards={cards} />
            </div>
          )}

          <main className="flex-grow flex justify-center items-center p-6 max-w-6xl mx-auto mt-12 bg-transparent">
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
// UserMenu component (unchanged, just moved here for brevity)
// ====================================================================
function UserMenu({ profile, user, menuOpen, setMenuOpen, menuRef }) {
  const { cardCount } = useCardCount();
  const timeoutRef = useRef();

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
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="w-full h-full object-cover rounded-full relative z-10"
            />
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
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover rounded-full"
                  />
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
              <button
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
