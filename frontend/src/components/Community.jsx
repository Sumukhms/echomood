import { useState, useEffect } from "react";
import axios from "axios";

export default function Community({ username, onPlayTrack }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/community/users");
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
      const res = await axios.get(`http://localhost:5000/api/community/user/${targetUsername}`);
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

  const [isBlending, setIsBlending] = useState(false);

  const handleSaveBlendedPlaylist = async () => {
    if (!username || !activePlaylist) return;
    setIsSaving(true);
    try {
      const coverImage = activePlaylist.tracks?.find(t => t.cover_url)?.cover_url || "";
      await axios.post("http://localhost:5000/api/playlists/save_ai", {
        username: username,
        name: activePlaylist.name,
        tracks: activePlaylist.tracks,
        cover_url: coverImage
      });
      window.dispatchEvent(new Event("libraryUpdate"));
      setActivePlaylist(prev => ({ ...prev, isSaved: true }));
    } catch (err) {
      console.error("Save blended playlist failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlend = async () => {
    setIsBlending(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/community/blend?user1=${username}&user2=${selectedUser}`);
      if (res.data?.success && res.data.tracks?.length > 0) {
        onPlayTrack(res.data.tracks[0], res.data.tracks);
        setActivePlaylist({
          name: `Blend: ${username} + ${selectedUser}`,
          description: `A unique mix blending your vibes with ${selectedUser}'s.`,
          tracks: res.data.tracks,
          isBlend: true,
          isSaved: false
        });
      } else {
        alert("Not enough data to blend playlists yet!");
      }
    } catch (err) {
      console.error("Blend failed:", err);
      alert("Blend failed to generate.");
    } finally {
      setIsBlending(false);
    }
  };

  if (activePlaylist) {
    const { name, description, tracks, isSaved, isBlend } = activePlaylist;
    const coverImage = tracks?.find(t => t.cover_url)?.cover_url;

    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20 animate-fade-in text-white">
        <button 
          onClick={() => setActivePlaylist(null)}
          className="text-zinc-400 hover:text-white flex items-center gap-2 mb-8 text-sm uppercase tracking-widest transition-colors"
        >
          <span>←</span> Back
        </button>

        <div className="flex flex-col md:flex-row items-center md:items-end text-center md:text-left gap-6 sm:gap-8 mb-8 sm:mb-10 pb-8 sm:pb-10 border-b border-white/10">
          <div className="w-48 h-48 sm:w-40 sm:h-40 md:w-52 md:h-52 shrink-0 rounded-lg overflow-hidden shadow-2xl relative bg-zinc-800">
            {coverImage ? (
              <img src={coverImage} alt="playlist cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-zinc-700 flex items-center justify-center text-4xl">🎧</div>
            )}
          </div>
          <div className="flex flex-col items-center md:items-start w-full">
            <p className="text-xs uppercase tracking-widest text-gold-400 block mb-2 font-bold">{isBlend ? 'Community Blend' : 'Shared Playlist'}</p>
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-white tracking-tighter mb-4">{name}</h1>
            <p className="text-zinc-400 text-sm">{description}</p>
            <p className="text-zinc-500 text-xs mt-2 font-bold tracking-widest uppercase">
              Echomood • {tracks?.length || 0} songs
            </p>
          </div>
        </div>

        <div className="mb-10 flex gap-3 sm:gap-4 items-center justify-center md:justify-start flex-wrap">
          <button 
            onClick={() => onPlayTrack(tracks[0], tracks)}
            className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full bg-gold-500 text-black hover:scale-105 transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)] shrink-0"
          >
            <span className="text-xl sm:text-2xl ml-1">▶</span>
          </button>

          {isSaved ? (
            <button 
              disabled={true}
              className="px-4 py-3 sm:px-6 sm:py-3 rounded-full bg-emerald-500/25 text-emerald-400 text-xs sm:text-sm font-medium tracking-wide border border-emerald-500/30 flex items-center gap-2 shrink-0 cursor-default"
            >
              <span>✓</span> Saved to Library
            </button>
          ) : (
            <button 
              onClick={handleSaveBlendedPlaylist}
              disabled={isSaving}
              className="px-4 py-3 sm:px-6 sm:py-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all text-xs sm:text-sm font-medium tracking-wide border border-white/10 disabled:opacity-50 shrink-0"
            >
              {isSaving ? "Saving..." : "Save to Library"}
            </button>
          )}
        </div>

        {/* Tracks List */}
        <div className="flex flex-col gap-2">
          {tracks?.map((track, idx) => (
            <div 
              key={idx}
              onClick={() => onPlayTrack(track, tracks)}
              className="group flex items-center p-3 hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
            >
              <div className="w-8 text-center text-zinc-500 group-hover:hidden text-sm">
                {idx + 1}
              </div>
              <div className="w-8 text-center text-zinc-400 hidden group-hover:block text-sm">
                ▶
              </div>
              <img src={track.cover_url || '/placeholder.jpg'} alt="cover" className="w-10 h-10 rounded object-cover ml-2 mr-4" />
              <div className="flex-grow min-w-0">
                <p className="text-white text-sm font-medium truncate">{track.track_name}</p>
                <p className="text-zinc-400 text-xs truncate">{track.artist_name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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
              <div className="flex justify-center gap-2 mb-4">
                {userProfile.preferences?.vibes?.map(v => (
                  <span key={v} className="px-2 py-1 text-[10px] uppercase tracking-wider bg-white/10 rounded border border-white/5 text-gold-300">{v}</span>
                ))}
              </div>
              <button
                onClick={handleBlend}
                disabled={isBlending}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full font-bold text-sm tracking-wide shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 mx-auto"
              >
                {isBlending ? (
                  <span className="animate-pulse">✨ Mixing your vibes...</span>
                ) : (
                  <span>🪄 Blend Tastes</span>
                )}
              </button>
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
                      <div 
                        key={pl._id} 
                        onClick={() => setActivePlaylist({
                          name: pl.name,
                          description: `A public playlist shared by ${selectedUser}.`,
                          tracks: pl.tracks,
                          cover_url: pl.cover_url,
                          isSaved: false
                        })}
                        className="border border-white/5 bg-black/40 rounded-2xl p-4 cursor-pointer hover:bg-black/60 hover:border-gold-500/50 transition-all group text-left"
                      >
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
                              onClick={(e) => {
                                e.stopPropagation();
                                onPlayTrack(t, pl.tracks);
                              }}
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
