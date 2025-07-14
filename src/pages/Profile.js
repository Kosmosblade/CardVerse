import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Profile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function getUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error fetching user:', error);
        setUser(null);
      } else {
        setUser(data?.user ?? null);
      }
    }
    getUser();
  }, []);

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-[#0b1f3a] text-white rounded-lg shadow-md border border-blue-800">
      <h2 className="text-2xl font-bold mb-4 text-blue-200">My Profile</h2>
      {user ? (
        <div className="space-y-3">
          <p><strong>ID:</strong> <span className="text-gray-300">{user.id}</span></p>
          <p><strong>Email:</strong> <span className="text-gray-300">{user.email}</span></p>
          <p><strong>Created:</strong> <span className="text-gray-300">{new Date(user.created_at).toLocaleString()}</span></p>
        </div>
      ) : (
        <p className="text-gray-400">Loading user info...</p>
      )}
    </div>
  );
}
