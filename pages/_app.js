// pages/_app.js
import '../styles/globals.css';
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

  // Load Supabase session
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

  // Fetch user profile
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

  // Close menu on outside click
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

  // Discord webhook helper
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

  // Card search handler
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
        <div className="min-h-screen flex flex-col bg-[#0b1f3a] text-white relative overflow-hidden">
          <div
            className="absolute inset-0 bg-animated-gradient bg-size-400 animate-gradient-move"
            style={{ filter: 'blur(80px)', opacity: 0.5, zIndex: -2 }}
          />
          <div className="background-overlay" />

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

          {router.pathname === '/' && (
            <SearchBar query={query} setQuery={setQuery} handleSearch={handleSearch} />
          )}

          {router.pathname === '/' && cards.length > 0 && (
            <div className="max-w-6xl mx-auto px-6 mt-6 mb-12 w-full">
              <AnimatePresence>
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.6 }}
                >
                  {cards.map((card) => (
                    <Card key={card.id} card={card} />
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          <main className="flex-grow flex justify-center items-center p-6 max-w-6xl mx-auto mt-12">
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
            &copy; {new Date().getFullYear()} Conjuerers Crypt. All rights reserved.
          </footer>
        </div>
      </CardCountProvider>
    </AuthProvider>
  );
}

// ====================================================================
//  UserMenu: uses .user-menu-btn for glow border via your globals.css
// ====================================================================
function UserMenu({ profile, user, menuOpen, setMenuOpen, menuRef }) {
  const { cardCount } = useCardCount();
  const timeoutRef = useRef();

  // auto-close after 15s
  useEffect(() => {
    if (menuOpen) timeoutRef.current = setTimeout(() => setMenuOpen(false), 15000);
    return () => clearTimeout(timeoutRef.current);
  }, [menuOpen]);

  return (
    <div className="fixed top-4 right-4 z-50" ref={menuRef}>
      {!menuOpen && (
        <button
          onClick={() => setMenuOpen(true)}
          className="user-menu-btn w-10 h-10 rounded-full overflow-hidden border-2 border-blue-600 shadow-md hover:shadow-blue-500 transition-all duration-300"
          title="User menu"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold">
              {profile?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
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
            className="mt-2 w-72 bg-[#0e2748]/90 backdrop-blur-md rounded-xl shadow-xl border border-blue-700 text-white font-sans overflow-hidden"
          >
            <div className="flex items-center gap-3 p-4 border-b border-blue-700">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-500">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold">
                    {profile?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold truncate">{profile?.username || user?.email}</span>
                <span className="text-xs text-blue-300">Online</span>
              </div>
            </div>

            <div className="px-4 py-3 space-y-2 text-sm">
              <p>
                <strong className="text-blue-400">Subscription:</strong>{' '}
                {profile?.subscription_type
                  ? profile.subscription_type[0].toUpperCase() + profile.subscription_type.slice(1)
                  : 'Free'}
              </p>
              <p>
                <strong className="text-blue-400">Cards in Inventory:</strong> {cardCount}
              </p>
              <button
                onClick={() => {
                  clearTimeout(timeoutRef.current);
                  setMenuOpen(false);
                  supabase.auth.signOut().then(() => (window.location.href = '/'));
                }}
                className="relative w-full py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-sm font-medium transition-all duration-300 shadow-md border border-rose-800"
              >
                <span className="relative z-10">Log Out</span>
                <span className="absolute inset-0 rounded-md opacity-30 blur-md bg-gradient-to-r from-rose-500 to-rose-700 animate-pulse z-0" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
