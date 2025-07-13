import { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    const doLogout = async () => {
      await supabase.auth.signOut();
      navigate('/');
    };
    doLogout();
  }, [navigate]);

  return (
    <div className="text-center mt-20 text-xl text-gray-600">Logging out...</div>
  );
}
