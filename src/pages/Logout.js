import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Logout() {
  const navigate = useNavigate();
  const [loggedOut, setLoggedOut] = useState(false);

  useEffect(() => {
    const doLogout = async () => {
      await supabase.auth.signOut();
      setLoggedOut(true);
      setTimeout(() => {
        navigate('/');
      }, 2000); // wait 2 seconds before redirecting
    };
    doLogout();
  }, [navigate]);

  return (
    <div className="text-center mt-20 text-xl text-gray-600">
      {loggedOut ? 'You have been logged out.' : 'Logging out...'}
    </div>
  );
}
