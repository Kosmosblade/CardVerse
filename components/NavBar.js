import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";

const links = [
  { name: "Browse Cards", href: "/" },
  { name: "Import Deck", href: "/decks" },
  { name: "Inventory", href: "/inventory" },
  { name: "My Decks", href: "/mydecks" },
  { name: "AI Commander Deck", href: "/aicommanderdecks" },
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const linkVariants = {
    hidden: { opacity: 0, x: -25 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: 0.1 * i + 0.2,
        type: "spring",
        stiffness: 100,
        damping: 20,
      },
    }),
  };

  const handleLinkClick = (href) => {
    setMenuOpen(false);
    if (href === "/") {
      router.push("/?reset=1");
    } else {
      router.push(href);
    }
  };

  return (
    <>
      {/* Hamburger Button */}
      {!menuOpen && (
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open Menu"
          type="button"
          className="fixed top-6 left-6 z-50 p-1 bg-transparent rounded-full
            hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-yellow-400
            transition-transform duration-200 ease-in-out hover:scale-110 hover:drop-shadow-[0_0_10px_rgba(255,223,0,0.85)]"
        >
          <img
            src="/assets/Conjurer.png"
            alt="Conjurers Crypt Logo"
            className="h-14 w-auto select-none"
            draggable={false}
          />
        </button>
      )}

      {/* Side Navigation Drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            ref={navRef}
            className="fixed top-0 left-0 h-full w-72 z-50 overflow-hidden
              bg-gradient-to-b from-indigo-950 via-indigo-900 to-indigo-950
              shadow-yellow-500/40 shadow-lg"
            initial={{ x: "-110%" }}
            animate={{ x: 0 }}
            exit={{ x: "-110%" }}
            transition={{ type: "spring", stiffness: 300, damping: 35 }}
            role="navigation"
            aria-label="Main menu"
          >
            {/* Pulsing Background */}
            <motion.div
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 z-0"
            >
              <img
                src="/assets/arcane-scroll-texture.png"
                alt=""
                className="w-full h-full object-cover opacity-80"
                draggable={false}
              />
              <div
                className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-950 opacity-90"
                aria-hidden="true"
              />
            </motion.div>

            {/* Foreground */}
            <div className="relative z-10 h-full w-full backdrop-blur-sm bg-black/40 flex flex-col">
              
              {/* Logo (Home Button) */}
              <div className="w-full h-28 flex items-center justify-center p-3">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/");
                  }}
                  aria-label="Home"
                  className="outline-none focus:ring-2 focus:ring-yellow-400 rounded"
                >
                  <img
                    src="/assets/logoC.png"
                    alt="Conjurers Crypt Logo"
                    className="h-full w-full object-contain select-none drop-shadow-lg"
                    draggable={false}
                  />
                </button>
              </div>

              {/* Navigation Links */}
              <ul className="flex flex-col gap-4 px-6 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-yellow-500 scrollbar-track-indigo-900">
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
                      whileHover={{
                        x: 8,
                        scale: 1.07,
                        transition: { type: "spring", stiffness: 350 },
                      }}
                      whileTap={{ scale: 0.95 }}
                      className="cursor-pointer"
                    >
                      <span
                        onClick={() => handleLinkClick(href)}
                        className={`block text-xl font-semibold rounded-md py-2 px-3 select-none
                          ${
                            isActive
                              ? "text-yellow-400 font-extrabold drop-shadow-[0_0_10px_rgba(255,223,0,0.95)]"
                              : "text-yellow-200 hover:text-yellow-400 hover:drop-shadow-[0_0_6px_rgba(255,223,0,0.7)]"
                          }
                          transition-colors duration-200 ease-in-out`}
                        role="link"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleLinkClick(href);
                          }
                        }}
                      >
                        {name}
                      </span>
                    </motion.li>
                  );
                })}
              </ul>

             
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
