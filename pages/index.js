import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home({ query = '' }) {
  const [showWelcome, setShowWelcome] = useState(true);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchNews() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/news');

      console.log(`Frontend: /api/news response status: ${res.status}`);

      if (!res.ok) {
        let errorMsg = `API error: ${res.status}`;
        try {
          const errData = await res.json();
          if (errData.error) errorMsg += ` - ${errData.error}`;
        } catch (_) {}
        throw new Error(errorMsg);
      }

      const data = await res.json();
      if (!data.news || data.news.length === 0) throw new Error('No news items found');

      setNews(data.news);
    } catch (err) {
      console.error('Failed to fetch news:', err);
      setError(err.message || 'Failed to fetch news');
      setNews([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (typeof query === 'string' && query.trim() !== '') {
      setShowWelcome(false);
      fetchNews();
    } else {
      setShowWelcome(true);
      setNews([]);
      setError(null);
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (showWelcome) return;
    const interval = setInterval(() => {
      fetchNews();
    }, 30000);
    return () => clearInterval(interval);
  }, [showWelcome]);

  return (
    <main className="w-full min-h-screen flex flex-col items-center justify-start px-6 py-8 font-sans text-cfcfea relative">
      <AnimatePresence mode="wait">
        {showWelcome && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl text-center select-none"
          >
            <h1 className="text-4xl font-extrabold mb-6 text-arcane-gold animate-pulse-glow tracking-widest">
              Welcome to{' '}
              <span className="text-indigo-400 animate-magic-wisp">Conjurer's Crypt</span>
            </h1>
            <p className="text-lg text-indigo-300 leading-relaxed max-w-xl mx-auto">
              Your gateway to Magic: The Gathering decks, news, and community. Start typing in the
              search bar to explore the latest and greatest!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {!showWelcome && (
        <>
          {loading && <p className="text-center text-indigo-300 mt-12">Loading news…</p>}

          {error && <p className="text-center text-red-600 mt-12">{error}</p>}

          {!loading && !error && news.length > 0 && (
            <motion.section
              key="news-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="w-full max-w-5xl mt-12"
              aria-label="Latest Magic news"
            >
              <h2 className="text-4xl font-bold mb-8 border-b border-arcane-gold pb-3 text-arcane-gold tracking-widest select-none animate-pulse-glow">
                Latest Magic: The Gathering News
              </h2>

              <div
                className="
                  grid 
                  grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 
                  gap-6"
              >
                {news.map(({ title, date, excerpt, url }, i) => (
                  <motion.article
                    key={i}
                    className="relative group rounded-lg shadow-xl cursor-pointer bg-[#0f1220] lightning-border p-[2px]"
                    initial="rest"
                    whileHover="hover"
                    animate="rest"
                    layout
                  >
                    <motion.div
                      variants={{
                        rest: { scale: 1 },
                        hover: { scale: 1.05 },
                      }}
                      className="rounded-md bg-[#121527] p-3 flex flex-col h-56"
                    >
                      <motion.h3
                        variants={{
                          rest: { color: '#d4af37' }, // arcane gold
                          hover: { color: '#7c3aed' }, // indigo-400
                        }}
                        className="text-lg font-semibold tracking-wide mb-1 line-clamp-2"
                      >
                        <a href={url} target="_blank" rel="noopener noreferrer" className="no-underline">
                          {title}
                        </a>
                      </motion.h3>

                      <motion.time
                        className="text-xs text-indigo-300 mb-1"
                        variants={{
                          rest: { opacity: 1 },
                          hover: { opacity: 0 },
                        }}
                      >
                        {date}
                      </motion.time>

                      <motion.p
                        className="text-indigo-200 text-xs leading-snug flex-grow overflow-hidden"
                        variants={{
                          rest: { opacity: 0, height: 0 },
                          hover: { opacity: 1, height: 'auto' },
                        }}
                      >
                        {excerpt}
                      </motion.p>

                      <motion.a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-indigo-400 hover:text-indigo-600 font-semibold transition-colors duration-300 tracking-wide text-sm"
                        aria-label={`Read more about ${title}`}
                        variants={{
                          rest: { opacity: 0, height: 0 },
                          hover: { opacity: 1, height: 'auto' },
                        }}
                      >
                        Read more &rarr;
                      </motion.a>
                    </motion.div>
                  </motion.article>
                ))}
              </div>
            </motion.section>
          )}

          {!loading && !error && news.length === 0 && (
            <motion.div
              key="no-news"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="mt-24 max-w-xl text-center text-indigo-300 text-lg"
            >
              No news available at the moment. Please try again later.
            </motion.div>
          )}
        </>
      )}
    </main>
  );
}
