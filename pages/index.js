// pages/index.js
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home({ query = '' }) {
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    if (typeof query === 'string' && query.trim() !== '') {
      setShowWelcome(false);
    } else {
      setShowWelcome(true);
    }
  }, [query]);

  return (
    <div className="w-full flex flex-col items-center justify-center text-white">
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            key="welcome"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-extrabold mt-24 text-center"
          >
            Welcome to CardVerse!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
