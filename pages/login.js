// File: pages/login.js
import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useRouter } from 'next/router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Check against HaveIBeenPwned leaked password database
  const isLeaked = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    const text = await res.text();

    return text.includes(suffix);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const leaked = await isLeaked(password);
      if (leaked) {
        setMessage('This password has been found in a data breach. Please use a different password.');
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('Leaked password check failed:', err);
      setMessage('Error checking password security. Try again later.');
      setLoading(false);
      return;
    }

    // Log the user in
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message);
      setLoading(false);
    } else {
      // Check if user profile exists
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profileData) {
        // Create profile if missing
        const { error: insertProfileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: data.user.email,
              username: data.user.email.split('@')[0],
              subscription_type: 'free',
              max_cards: 200,
              current_card_count: 0,
              subscription_start: new Date().toISOString(),
              subscription_updated_at: new Date().toISOString(),
            },
          ]);

        if (insertProfileError) {
          setMessage('Error creating profile: ' + insertProfileError.message);
          setLoading(false);
          return;
        }
      }

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (updateError || !updatedProfile) {
        setMessage('Error fetching profile data after login.');
        setLoading(false);
        return;
      }

      const totalCardCount = updatedProfile.current_card_count;
      const maxCardLimit = updatedProfile.subscription_type === 'free' ? 200 : 600;

      setMessage(`Logged in successfully. Card count: ${totalCardCount} / ${maxCardLimit}`);
      setLoading(false);

      // Redirect after login
      router.push('/inventory');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-[#0b1f3a] text-white rounded-lg shadow-md border border-blue-800">
      <h2 className="text-2xl font-bold mb-4 text-blue-200">Log In</h2>
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <input
          type="email"
          className="p-3 bg-black text-white border border-gray-600 rounded placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={loading}
        />
        <input
          type="password"
          className="p-3 bg-black text-white border border-gray-600 rounded placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          disabled={loading}
        />
        <button
          type="submit"
          className={`relative flex items-center justify-center gap-2 py-2 rounded text-white transition 
            ${loading ? 'bg-indigo-900 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          disabled={loading}
          aria-live="polite"
        >
          {loading && (
            <span className="inline-block w-5 h-5 border-4 border-indigo-300 border-t-transparent rounded-full animate-spin"
              aria-label="Loading spinner"
            />
          )}
          Log In
        </button>
        {message && (
          <p className="text-sm text-red-400" role="alert" aria-live="assertive">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
