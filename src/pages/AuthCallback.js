import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleRedirect = async () => {
      const { error } = await supabase.auth.getSessionFromUrl();
      if (error) {
        console.error('Error during auth callback:', error.message);
      }
      navigate('/profile'); // or wherever you want to redirect
    };

    handleRedirect();
  }, [navigate]);

  return (
    <div className="text-center mt-20 text-xl text-gray-600">
      Completing sign-in...
    </div>
  );
}
