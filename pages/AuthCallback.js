import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../supabaseClient';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleRedirect = async () => {
      const { error } = await supabase.auth.getSessionFromUrl();
      if (error) {
        console.error('Error during auth callback:', error.message);
      }
      router.push('/profile'); // Next.js redirect
    };

    handleRedirect();
  }, [router]);

  return (
    <div className="text-center mt-20 text-xl text-gray-600">
      Completing sign-in...
    </div>
  );
}
