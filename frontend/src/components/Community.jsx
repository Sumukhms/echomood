import { useState, useEffect } from "react";
import axios from "axios";

export default function Community({ username, onPlayTrack }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get("https://sumukh25-echomood-api.hf.space/api/community/users");
        if (res.data?.success) {
          setUsers(res.data.users.filter(u => u.username !== username));
        }
      } catch (err) {
        console.error("Failed to load community users:", err);
      }
    };
    fetchUsers();
  }, [username]);

  const loadUserProfile = async (targetUsername) => {
    setIsLoading(true);
    setSelectedUser(targetUsername);
    try {
      const res = await axios.get(`https://sumukh25-echomood-api.hf.space/api/community/user/${targetUsername}`);
      if (res.data?.success) {
        setUserProfile(res.data.profile);
      }
    } catch (err) {
      console.error("Failed to load user profile:", err);
      setUserProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedUser(null);
    setUserProfile(null);
  };

  if (selectedUser) {
    return (
      <div className="w-full text-white animate-fade-in">
        <button 
          onClick={handleBack}
          className="mb-6 px-4 py-2 text-xs tracking-widest uppercase border border-white/20 rounded-full hover:bg-white/10 transition-colors"
        >
          ← Back to Community
        </button>

        {isLoading ? (
          <div className="text-center py-20 text-zinc-400">Loading profile...</div>
        ) : userProfile ? (
          <div>
            <div className="mb-10 text-center">
              <div className="w-24 h-24 mx-auto bg-gradient-to-tr from-gold-500 to-purple-500 rounded-full mb-4 flex items-center justify-center text-3xl font-bold text-black shadow-[0_0_30px_rgba(212,175,55,0.3)]">
                {selectedUser.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-4xl font-bold font-serif mb-2">{selectedUser}</h2>
              <div className="flex justify-center gap-2 mb-2">
                {userProfile.preferences?.vibes?.map(v => (
                  <span key={v} className="px-2 py-1 text-[10px] uppercase tracking-wider bg-white/10 rounded border border-white/5 text-gold-300">{v}</span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Liked Songs */}
              <div className="bg-black/30 border border-white/10 rounded-3xl p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">❤️ Liked Songs <span className="text-sm font-normal text-zinc-500">({userProfile.liked_songs?.length || 0})</span></h3>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                  {userProfile.liked_songs?.length > 0 ? (
                    userProfile.liked_songs.map((track, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-colors group"
                        onClick={() => onPlayTrack(track, userProfile.liked_songs)}
                      >
                        <img src={track.cover_url || '/placeholder.jpg'} alt="cover" className="w-10 h-10 rounded object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate group-hover:text-gold-400 transition-colors">{track.track_name}</p>
                          <p className="text-xs text-zinc-400 truncate">{track.artist_name}</p>
                        </div>
                        <span className="text-xs text-zinc-500 group-hover:text-white">▶</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500 italic">No liked songs yet.</p>
                  )}
                </div>
              </div>

              {/* Playlists */}
              <div className="bg-black/30 border border-white/10 rounded-3xl p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">🎵 Playlists <span className="text-sm font-normal text-zinc-500">({userProfile.playlists?.length || 0})</span></h3>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {userProfile.playlists?.length > 0 ? (
                    userProfile.playlists.map(pl => (
                      <div key={pl._id} className="border border-white/5 bg-black/40 rounded-2xl p-4">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center text-xl">
                            {pl.cover_url ? <img src={pl.cover_url} className="w-full h-full object-cover rounded-lg" alt="cover"/> : '🎧'}
                          </div>
                          <div>
                            <h4 className="font-medium text-white text-lg">{pl.name}</h4>
                            <p className="text-xs text-zinc-400">{pl.tracks?.length || 0} tracks</p>
                          </div>
                        </div>
                        <div className="space-y-1 mt-2 border-t border-white/10 pt-2">
                          {pl.tracks?.slice(0, 3).map((t, i) => (
                            <div 
                              key={i} 
                              className="text-sm text-zinc-300 hover:text-gold-400 cursor-pointer truncate"
                              onClick={() => onPlayTrack(t, pl.tracks)}
                            >
                              <span className="text-zinc-600 mr-2">{i+1}.</span>{t.track_name} - {t.artist_name}
                            </div>
                          ))}
                          {pl.tracks?.length > 3 && (
                            <p className="text-xs text-zinc-500 mt-1 italic">+ {pl.tracks.length - 3} more</p>
                          )}
                          {(!pl.tracks || pl.tracks.length === 0) && (
                            <p className="text-xs text-zinc-600 italic">Empty playlist</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500 italic">No playlists yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-red-400">Failed to load profile.</div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in">
      <div className="mb-8">
        <h2 className="text-3xl font-serif text-white mb-2">Community</h2>
        <p className="text-zinc-400">Discover public profiles and listen to what others are curating.</p>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/20 rounded-3xl bg-white/5">
          <p className="text-zinc-400 mb-2">No public users found.</p>
          <p className="text-sm text-zinc-500">Go to your Profile settings to make your account public!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {users.map(u => (
            <div 
              key={u.username}
              onClick={() => loadUserProfile(u.username)}
              className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center cursor-pointer hover:bg-white/10 hover:border-gold-500/50 transition-all hover:scale-105 group"
            >
              <div className="w-16 h-16 bg-zinc-800 rounded-full mb-4 flex items-center justify-center text-xl font-bold text-white group-hover:text-gold-400 transition-colors">
                {u.username.charAt(0).toUpperCase()}
              </div>
              <p className="font-medium text-white truncate w-full text-center">{u.username}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
