import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; // adjust path if needed

export default function Profile() {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [username, setUsername] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    async function getUser() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user) {
        console.error('Error fetching user:', error);
        setError('Failed to fetch user data');
        return;
      }

      setUser(data.user);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(
          'username, avatar_url, subscription_type, max_card_limit, current_card_count, subscription_end'
        )
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError.message);
        setError('Failed to fetch profile data');
      } else {
        setSubscription(profileData);
        setUsername(profileData.username || '');
        setAvatarUrl(profileData.avatar_url || null);
      }
    }

    getUser();
  }, []);

  const handleUpgrade = async () => {
    if (!subscription || !user) return;

    const now = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 1);

    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_type: 'premium',
        max_card_limit: 600,
        subscription_start: now.toISOString(),
        subscription_end: end.toISOString(),
        subscription_updated_at: now.toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      setMessage('Error upgrading subscription: ' + error.message);
    } else {
      setMessage('Successfully upgraded to Premium!');
      setSubscription((prev) => ({
        ...prev,
        subscription_type: 'premium',
        max_card_limit: 600,
        subscription_start: now.toISOString(),
        subscription_end: end.toISOString(),
        subscription_updated_at: now.toISOString(),
      }));
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const filePath = `avatars/${user.id}/${timestamp}.${fileExt}`;

    setUploading(true);
    setMessage('');

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError.message);
      setMessage('Upload failed: ' + uploadError.message);
      setUploading(false);
      return;
    }

    // Get public URL
    const { data: publicData, error: urlError } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    if (urlError || !publicData?.publicUrl) {
      setMessage('Failed to retrieve public avatar URL.');
      setUploading(false);
      return;
    }

    const publicUrl = publicData.publicUrl;

    // Update profile avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    if (updateError) {
      setMessage('Failed to update avatar URL in profile: ' + updateError.message);
    } else {
      setAvatarUrl(publicUrl);
      setMessage('Avatar updated successfully!');
    }

    setUploading(false);
  };

  const handleUsernameSave = async () => {
    if (!username.trim() || !user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', user.id);

    if (error) {
      setMessage('Failed to update username: ' + error.message);
    } else {
      setMessage('Username updated!');
      setSubscription((prev) => ({ ...prev, username }));
      setEditingUsername(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-[#0b1f3a] text-white rounded-lg shadow-md">
      <h2 className="text-3xl font-bold mb-4 text-amber-400 drop-shadow-[0_0_6px_rgba(212,175,55,0.8)]">
        Account
      </h2>

      {error && <p className="text-sm text-red-400 drop-shadow-[0_0_6px_rgba(255,0,0,0.6)]">{error}</p>}
      {message && (
        <p
          className={`text-sm ${
            message.toLowerCase().includes('updated') || message.toLowerCase().includes('successfully')
              ? 'text-green-400'
              : 'text-red-400 drop-shadow-[0_0_6px_rgba(255,0,0,0.6)]'
          }`}
        >
          {message}
        </p>
      )}

      {user ? (
        <div className="space-y-5">
          <div className="flex items-center space-x-4">
            <img
              src={avatarUrl || '/default-avatar.png'}
              alt="User Avatar"
              className="w-16 h-16 rounded-full object-cover"
            />
            <div>
              <label className="block text-sm text-amber-400 drop-shadow-[0_0_6px_rgba(212,175,55,0.8)] mb-1">
                Change Avatar
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="text-sm text-amber-400"
                disabled={uploading}
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-amber-400 drop-shadow-[0_0_6px_rgba(212,175,55,0.8)]">
              Username:
            </label>
            {editingUsername ? (
              <div className="flex space-x-2 mt-1">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="px-2 py-1 rounded bg-black-800 text-white border border-gray-600 w-full"
                />
                <button
                  onClick={handleUsernameSave}
                  className="p-1 rounded border border-gray-400 hover:bg-gray-200 bg-white"
                >
                  <img src="/assets/save.png" alt="Save" className="h-6 w-6 object-contain" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between mt-1">
                <span className="text-red-400 font-semibold drop-shadow-[0_0_6px_rgba(255,0,0,0.6)]">
                  {subscription?.username || 'N/A'}
                </span>
                <button
                  onClick={() => setEditingUsername(true)}
                  className="text-sm text-yellow-400 hover:underline drop-shadow-[0_0_6px_rgba(212,175,55,0.8)]"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          <p>
            <strong className="text-amber-400 drop-shadow-[0_0_6px_rgba(212,175,55,0.8)]">
              Created:
            </strong>{' '}
            <span className="text-red-400 font-semibold drop-shadow-[0_0_6px_rgba(255,0,0,0.6)]">
              {new Date(user.created_at).toLocaleString()}
            </span>
          </p>

          {subscription ? (
            <>
              <p>
                <strong className="text-amber-400 drop-shadow-[0_0_6px_rgba(212,175,55,0.8)]">
                  Subscription Type:
                </strong>{' '}
                <span className="text-red-400 font-semibold drop-shadow-[0_0_6px_rgba(255,0,0,0.6)]">
                  {subscription.subscription_type}
                </span>
              </p>
              <p>
                <strong className="text-amber-400 drop-shadow-[0_0_6px_rgba(212,175,55,0.8)]">Max Cards:</strong>{' '}
                <span className="text-red-400 font-semibold drop-shadow-[0_0_6px_rgba(255,0,0,0.6)]">
                  {subscription.max_card_limit}
                </span>
              </p>
              <p>
                <strong className="text-amber-400 drop-shadow-[0_0_6px_rgba(212,175,55,0.8)]">
                  Cards in Inventory:
                </strong>{' '}
                <span className="text-red-400 font-semibold drop-shadow-[0_0_6px_rgba(255,0,0,0.6)]">
                  {subscription.current_card_count}
                </span>
              </p>
              {subscription.subscription_end && (
                <p>
                  <strong className="text-amber-400 drop-shadow-[0_0_6px_rgba(212,175,55,0.8)]">
                    Subscription Ends:
                  </strong>{' '}
                  <span className="text-red-400 font-semibold drop-shadow-[0_0_6px_rgba(255,0,0,0.6)]">
                    {new Date(subscription.subscription_end).toLocaleString()}
                  </span>
                </p>
              )}

              {subscription.subscription_type === 'free' && (
                <button
                  onClick={handleUpgrade}
                  className="bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition mt-4 w-full"
                >
                  Upgrade to Premium
                </button>
              )}
            </>
          ) : (
            <p className="text-red-400 drop-shadow-[0_0_6px_rgba(255,0,0,0.6)]">
              Subscription info not available.
            </p>
          )}
        </div>
      ) : (
        <p className="text-red-400 drop-shadow-[0_0_6px_rgba(255,0,0,0.6)]">Loading user info...</p>
      )}
    </div>
  );
}
