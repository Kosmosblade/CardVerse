// pages/_app.js
import '../styles/background.css';
import '../styles/globals.css';
import styles from '../styles/Inventory.module.css';
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

      if (!error && data) {
        setProfile(data);
      } else {
        setProfile(null);
      }
    }

    fetchProfile();
  }, [user]);

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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const sendDiscordWebhook = async (card) => {
    const payload = {
      username: 'Conjuring Crypt Bot',
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
        const errorText = await res.text();
        console.error('[Webhook Error]', {
          status: res.status,
          statusText: res.statusText,
          response: errorText,
          payload,
        });
      } else {
        console.log('[✅ Webhook Success]', await res.json());
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
        console.warn('[Scryfall Error]', data);
        setCards([]);
        return;
      }

      setCards([data]);
      console.log('[Card Fetched]', data);
      await sendDiscordWebhook(data);

      if (router.pathname !== '/') {
        router.push('/');
      }
    } catch (error) {
      alert('Error fetching card data');
      console.error('[Search Exception]', error);
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
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-center items-center"
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
            {router.pathname === '/' ? (
              <Component {...pageProps} query={query} />
            ) : (
              <Component {...pageProps} />
            )}
          </main>

          <footer className="bg-[#112b4a] border-t mt-20 p-4 text-center text-sm text-yellow-500 shadow-inner">
            <p style={{ fontSize: '0.8em', color: 'gray', marginBottom: '0.5rem' }}>
              Card data and images © Wizards of the Coast. Data provided by{' '}
              <a
                href="https://scryfall.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Scryfall
              </a>
              . This site is not affiliated with, endorsed, or sponsored by Wizards of the Coast LLC.
            </p>
            &copy; {new Date().getFullYear()} Conjuring Crypt. All rights reserved.
          </footer>
        </div>
      </CardCountProvider>
    </AuthProvider>
  );
}

function UserMenu({ profile, user, menuOpen, setMenuOpen, menuRef }) {
  const { cardCount } = useCardCount();

  return (
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
              {profile?.subscription_type
                ? profile.subscription_type.charAt(0).toUpperCase() + profile.subscription_type.slice(1)
                : 'Free'}
            </p>
            <p>
              <strong>Cards in Inventory:</strong> {cardCount}
            </p>
            <button
              onClick={() => {
                setMenuOpen(false);
                supabase.auth.signOut().then(() => {
                  window.location.href = '/';
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
  );
}
