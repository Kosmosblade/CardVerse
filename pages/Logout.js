import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

export default function Logout() {
  const router = useRouter();
  const [loggedOut, setLoggedOut] = useState(false);

  useEffect(() => {
    // Create audio and prepare it
    const audio = new Audio('/sounds/forest-ambience.mp3');
    audio.loop = true;

    // Try to play audio and catch autoplay restrictions
    const playAudio = async () => {
      try {
        await audio.play();
      } catch {
        // Autoplay failed (browser restriction)
        // Could implement a user gesture trigger later
      }
    };

    // Perform logout, play audio, redirect after delay
    const doLogout = async () => {
      try {
        await supabase.auth.signOut();
        setLoggedOut(true);
        await playAudio();
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } catch (error) {
        console.error('Logout error:', error);
        setLoggedOut(true);
        // Redirect anyway after 2 seconds even if logout fails
        setTimeout(() => {
          router.push('/');
        }, 2000);
      }
    };

    doLogout();

    // Cleanup audio on unmount
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [router]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url('/images/enchanted-forest.jpg')` }}
    >
      {!loggedOut ? (
        <>
          <div className="spinner mb-4" aria-label="Loading spinner"></div>
          <p className="text-xl text-gray-200 select-none">Logging out...</p>
        </>
      ) : (
        <p className="text-xl text-gray-200 select-none">You have been logged out.</p>
      )}

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
      `}</style>
    </div>
  );
}
