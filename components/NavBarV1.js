// components/NavBar.js
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const links = [
    { name: "Browse Cards", href: "/" },
    { name: "My Decks", href: "/decks" },
    { name: "Inventory", href: "/inventory" },
    { name: "AICommanderDeck", href: "/aicommanderdecks" },
    { name: "About", href: "/about" },
    { name: "Login", href: "/login" },
    { name: "Signup", href: "/signup" },
    { name: "Profile", href: "/profile" },
    { name: "Logout", href: "/logout" },
  ];

  return (
    <div>
      {!menuOpen && (
        <button
          onClick={() => setMenuOpen(true)}
          className="fixed right-4 bottom-4 z-50 p-0 bg-transparent border-none focus:outline-none"
          aria-label="Open Menu"
          type="button"
        >
          <img
            src="/assets/menu-icon.png"
            alt="Menu Icon"
            className="w-8 h-8 object-cover"
            onError={(e) => (e.target.src = "/assets/default-icon.png")}
          />
        </button>
      )}

      <nav
        className={`fixed top-0 right-0 h-full w-64 shadow-lg transform ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        } transition-transform duration-300`}
        style={{
          backgroundImage: "url(/assets/navbar-background.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundColor: "rgba(0, 0, 0, 0.4)",
        }}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/assets/logo.png"
              alt="Conjuring Crypt Logo"
              className="h-12 w-auto drop-shadow-md"
              draggable={false}
            />
            <span className="text-3xl font-extrabold text-white tracking-wide select-none">
              Conjuring <span className="text-indigo-500">Crypt</span>
            </span>
          </Link>

          <button
            onClick={() => setMenuOpen(false)}
            className="text-white hover:bg-gray-200 p-2 rounded-md md:hidden"
            aria-label="Close Menu"
            type="button"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <ul className="flex flex-col space-y-4 px-6 py-2">
          {links.map(({ name, href }) => {
            const isActive = router.pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`text-lg font-medium ${
                    isActive ? "text-indigo-500 font-bold" : "text-gray-200"
                  } hover:text-indigo-500 transition duration-200 hover:underline hover:underline-offset-4`}
                >
                  {name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
