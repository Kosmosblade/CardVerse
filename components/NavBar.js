import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";

// Reordered links with Import Deck and My Decks both included, My Decks under Inventory
const links = [
  { name: "Browse Cards", href: "/" },
  { name: "Import Deck", href: "/decks" },  // your old mydeck renamed here
  { name: "Inventory", href: "/inventory" },
  { name: "My Decks", href: "/mydecks" },          // new MyDecks page here, below Inventory
  { name: "AICommanderDeck", href: "/aicommanderdecks" },
  { name: "About", href: "/about" },
  { name: "Login", href: "/login" },
  { name: "Signup", href: "/signup" },
  { name: "Profile", href: "/profile" },
  { name: "Logout", href: "/logout" },
];

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const navRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const linkVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.1 + 0.3 },
    }),
  };

  return (
    <>
      {!menuOpen && (
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open Menu"
          type="button"
          className="fixed top-8 left-8 z-50 p-0 bg-transparent rounded-full hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <img
            src="/assets/Conjurer.png"
            alt="Conjurers Crypt Logo"
            className="h-10 w-auto select-none"
            draggable={false}
          />
        </button>
      )}

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            ref={navRef}
            className="fixed top-0 left-0 h-full w-72 backdrop-blur-lg bg-white/10 shadow-xl z-40 border-r border-indigo-600"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="w-full h-24 mb-8 flex items-center justify-center p-2">
              <Link href="/">
                <img
                  src="/assets/logoC.png"
                  alt="Conjurers Crypt Logo"
                  className="h-full w-auto object-contain select-none drop-shadow-md"
                  draggable={false}
                  onClick={() => setMenuOpen(false)}
                />
              </Link>
            </div>

            <ul className="flex flex-col space-y-4 px-6">
              {links.map(({ name, href }, i) => {
                const isActive = router.pathname === href;
                return (
                  <motion.li
                    key={href}
                    custom={i}
                    variants={linkVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                  >
                    <Link
                      href={href}
                      className={`inline-block text-lg font-semibold transition-colors duration-200 w-fit rounded-md py-1 px-1 leading-none ${
                        isActive ? "text-indigo-400" : "text-gray-300 hover:text-indigo-400"
                      }`}
                      onClick={() => setMenuOpen(false)}
                    >
                      {name}
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
