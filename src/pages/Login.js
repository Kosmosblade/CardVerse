import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

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

    try {
      const leaked = await isLeaked(password);
      if (leaked) {
        setMessage('This password has been found in a data breach. Please use a different password.');
        return;
      }
    } catch (err) {
      console.error('Leaked password check failed:', err);
      setMessage('Error checking password security. Try again later.');
      return;
    }

    // Log the user in
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message);
    } else {
      // Check if user profile exists
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single(); // Fetch single profile for this user

      if (profileError || !profileData) {
        // If the profile doesn't exist, create it
        const { error: insertProfileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id, // Use the user's unique ID
              email: data.user.email, // Email from the supabase auth object
              username: data.user.email.split('@')[0], // Use email as default username, you can customize this
              subscription_type: 'free', // Default subscription type
              max_cards: 200, // Default maximum cards for free users
              current_card_count: 0, // Initial card count
              subscription_start: new Date().toISOString(), // Timestamp for subscription start
              subscription_updated_at: new Date().toISOString(), // Timestamp for the last update
            },
          ]);

        if (insertProfileError) {
          setMessage('Error creating profile: ' + insertProfileError.message);
          return;
        }
      }

      // After successful login, update the current card count based on the user's subscription
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (updateError || !updatedProfile) {
        setMessage('Error fetching profile data after login.');
        return;
      }

      // Fetch the total card count for the user, based on the subscription type
      const totalCardCount = updatedProfile.current_card_count;
      const maxCardLimit = updatedProfile.subscription_type === 'free' ? 200 : 600;

      // Update the card count on the Inventory page, directly setting it via the updatedProfile
      setMessage(`Logged in successfully. Card count: ${totalCardCount} / ${maxCardLimit}`);

      // Now, **do not redirect to the inventory page**. The card count will be used in the Inventory page.
      // You can optionally navigate to a different page if you prefer.
      // navigate('/inventory');
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
        />
        <input
          type="password"
          className="p-3 bg-black text-white border border-gray-600 rounded placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <button
          type="submit"
          className="bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition"
        >
          Log In
        </button>
        {message && (
          <p className="text-sm text-red-400">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
