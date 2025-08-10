import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const sampleNews = [
  {
    title: "Mark Rosewater: Flavor Text Drought Will Soon Lift",
    date: "August 8, 2025",
    excerpt:
      "Magic Head Designer Mark Rosewater teases the end of the flavor text drought in upcoming sets.",
    url: "https://edhrec.com/articles/mark-rosewater-flavor-text-drought-will-soon-lift",
  },
  {
    title: "Fire and Ice: What Cards are Hot and Cold for August 8th?",
    date: "August 8, 2025",
    excerpt:
      "A statistical analysis of popular and underplayed cards in the current meta.",
    url: "https://edhrec.com/articles/fire-and-ice-what-cards-are-hot-and-cold-for-august-8th",
  },
  {
    title: "The Top 10 Universes Beyond Secret Lairs",
    date: "August 8, 2025",
    excerpt:
      "A ranking of the most impactful Universes Beyond Secret Lair drops.",
    url: "https://edhrec.com/articles/the-top-10-universes-beyond-secret-lairs",
  },
  {
    title: "Final Fantasy Set Preview",
    date: "August 2025",
    excerpt:
      "A first look at the upcoming Final Fantasy crossover set in Magic: The Gathering.",
    url: "https://moxfield.com/sets/finalfantasy",
  },
];

export default function Home({ query = '' }) {
  const [showWelcome, setShowWelcome] = useState(true);
  const [news, setNews] = useState([]);

  useEffect(() => {
    if (typeof query === 'string' && query.trim() !== '') {
      setShowWelcome(false);
      setNews(sampleNews);
    } else {
      setShowWelcome(true);
      setNews([]);
    }
  }, [query]);

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
              <span className="text-indigo-400 animate-magic-wisp">
                Conjurer's Crypt
              </span>
            </h1>
            <p className="text-lg text-indigo-300 leading-relaxed max-w-xl mx-auto">
              Your gateway to Magic: The Gathering decks, news, and community.
              Start typing in the search bar to explore the latest and greatest!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {!showWelcome && news.length > 0 && (
        <motion.section
          key="news-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-5xl mt-12 space-y-12 overflow-y-auto"
          aria-label="Latest Magic news"
        >
          <h2 className="text-4xl font-bold mb-8 border-b border-arcane-gold pb-3 text-arcane-gold tracking-widest select-none animate-pulse-glow">
            Latest Magic: The Gathering News
          </h2>

          <div className="space-y-10">
            {news.map(({ title, date, excerpt, url }, i) => (
              <article
                key={i}
                className="group lightning-border rounded-xl p-[2px] /* outer animated border */"
              >
                {/* inner card that covers the center so gradient shows only as border */}
                <div className="bg-[#0f1220] rounded-lg p-6 relative z-10 shadow-xl">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-underline"
                  >
                    <h3 className="text-2xl font-bold text-arcane-gold group-hover:text-indigo-400 transition-colors duration-300 tracking-wide">
                      {title}
                    </h3>
                  </a>
                  <time className="block mt-1 text-sm text-indigo-300">
                    {date}
                  </time>
                  <p className="mt-3 text-indigo-200 leading-relaxed">
                    {excerpt}
                  </p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-indigo-400 hover:text-indigo-600 font-semibold transition-colors duration-300 tracking-wide"
                    aria-label={`Read more about ${title}`}
                  >
                    Read more &rarr;
                  </a>
                </div>
              </article>
            ))}
          </div>
        </motion.section>
      )}

      {!showWelcome && news.length === 0 && (
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
    </main>
  );
}
