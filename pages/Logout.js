import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

export default function Logout() {
  const router = useRouter();
  const [loggedOut, setLoggedOut] = useState(false);

  useEffect(() => {
    const audio = new Audio('/sounds/logoutsoundlogout.mp3');
    audio.loop = true;

    const playAudio = async () => {
      try {
        await audio.play();
      } catch {
        // Autoplay failed
      }
    };

    const doLogout = async () => {
      try {
        await supabase.auth.signOut();
        setLoggedOut(true);
        await playAudio();
        setTimeout(() => {
          router.push('/');
        }, 7000);
      } catch (error) {
        console.error('Logout error:', error);
        setLoggedOut(true);
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    };

    doLogout();

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [router]);

  return (
    <>
      <style jsx global>{`
        /* Make sure root and body are full screen */
        html, body, #__next {
          margin: 0; padding: 0; height: 100%; width: 100%;
          overflow: hidden;
        }
      `}</style>

      <div className="fixed inset-0 z-0 w-screen h-screen bg-black overflow-hidden">
        <img
          src="/images/enchanted-forest.jpg"
          alt="Background"
          className="w-screen h-screen object-cover animate-fadeScale"
          draggable={false}
        />
      </div>

      {/* Overlay for text and spinner */}
      <div className="fixed inset-0 z-10 flex flex-col items-center justify-center px-4">
        {/* Optional translucent black overlay for better text contrast */}
        <div className="absolute inset-0 bg-black opacity-60"></div>

        {!loggedOut ? (
          <>
            <div className="spinner mb-4" aria-label="Loading spinner"></div>
            <p className="relative text-xl text-white select-none drop-shadow-lg">
              Logging out...
            </p>
          </>
        ) : (
          <p className="relative text-xl text-white select-none drop-shadow-lg">
            You have been logged out.
          </p>
        )}
      </div>

      <style jsx>{`
        .spinner {
          width: 48px;
          height: 48px;
          border: 5px solid #ccc;
          border-top-color: #3b82f6; /* Tailwind blue-500 */
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes fadeScaleIn {
          0% {
            opacity: 0;
            transform: scale(1.3);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeScale {
          animation: fadeScaleIn 2s ease forwards;
        }
      `}</style>
    </>
  );
}
