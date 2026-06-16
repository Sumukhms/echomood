import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function Library({ currentUser, onPlayTrack }) {
  const [favorites, setFavorites] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [activePlaylist, setActivePlaylist] = useState(null);
  const [isGeneratingRadio, setIsGeneratingRadio] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  // Drag and drop refs
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const fetchLibraryData = async () => {
    if (!currentUser?.username) return;
    setIsLoading(true);
    try {
      const [favRes, plRes] = await Promise.all([
        axios.get(`http://127.0.0.1:5000/api/favorites/all?username=${currentUser.username}&_t=${Date.now()}`),
        axios.get(`http://127.0.0.1:5000/api/playlists/all?username=${currentUser.username}&_t=${Date.now()}`)
      ]);
      if (favRes.data?.success) setFavorites(favRes.data.favorites);
      setPlaylists(plRes.data || []);
    } catch (error) {
      console.error("Failed to fetch library", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraryData();
    window.addEventListener('libraryUpdate', fetchLibraryData);
    return () => window.removeEventListener('libraryUpdate', fetchLibraryData);
  }, [currentUser]);

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    setIsCreating(true);
    try {
      await axios.post("http://127.0.0.1:5000/api/playlists/create", {
        username: currentUser.username,
        name: newPlaylistName
      });
      setNewPlaylistName("");
      fetchLibraryData();
    } catch (error) {
      console.error("Failed to create playlist", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeletePlaylist = async (playlistId) => {
    if (!window.confirm("Are you sure you want to delete this playlist?")) return;
    try {
      await axios.post("http://127.0.0.1:5000/api/playlists/delete", { playlist_id: playlistId });
      setActivePlaylist(null);
      fetchLibraryData();
      window.dispatchEvent(new Event('libraryUpdate'));
    } catch (error) {
      console.error("Failed to delete playlist", error);
    }
  };

  const handleTogglePin = async (playlistId) => {
    try {
      const res = await axios.post("http://127.0.0.1:5000/api/playlists/toggle_pin", { playlist_id: playlistId });
      if (res.data?.success) {
        setActivePlaylist(prev => prev ? { ...prev, is_pinned: res.data.is_pinned } : null);
        fetchLibraryData();
        window.dispatchEvent(new Event('libraryUpdate'));
      }
    } catch (error) {
      console.error("Failed to toggle pin", error);
    }
  };

  const handleRenamePlaylist = async () => {
    if (!editedName.trim() || !activePlaylist) {
      setIsEditingName(false);
      return;
    }
    if (editedName.trim() === activePlaylist.name) {
      setIsEditingName(false);
      return;
    }
    try {
      await axios.post("http://127.0.0.1:5000/api/playlists/update_name", {
        playlist_id: activePlaylist._id,
        name: editedName.trim()
      });
      setActivePlaylist(prev => prev ? { ...prev, name: editedName.trim() } : null);
      setIsEditingName(false);
      fetchLibraryData();
      window.dispatchEvent(new Event('libraryUpdate'));
    } catch (error) {
      console.error("Failed to rename playlist", error);
    }
  };

  const handleDragSort = async () => {
    if (dragItem.current === null || dragOverItem.current === null || !activePlaylist) return;
    
    // Create copy of the tracks
    const tracksCopy = [...activePlaylist.tracks];
    // Remove the dragged item
    const draggedItemContent = tracksCopy.splice(dragItem.current, 1)[0];
    // Insert it at the new position
    tracksCopy.splice(dragOverItem.current, 0, draggedItemContent);
    
    // Update local state immediately for snappy UI
    setActivePlaylist(prev => ({ ...prev, tracks: tracksCopy }));
    
    // Reset refs
    dragItem.current = null;
    dragOverItem.current = null;

    // Persist to backend
    try {
      await axios.post("http://127.0.0.1:5000/api/playlists/reorder", {
        playlist_id: activePlaylist._id,
        tracks: tracksCopy
      });
      window.dispatchEvent(new Event('libraryUpdate'));
    } catch (error) {
      console.error("Failed to reorder playlist", error);
      // Optional: Handle error by reverting state via fetchLibraryData
    }
  };

  const handleGenerateRadio = async () => {
    if (!activePlaylist || activePlaylist.tracks.length === 0) return;
    setIsGeneratingRadio(true);
    try {
      // Find the most common mood in the playlist to seed the radio
      const moodCounts = {};
      activePlaylist.tracks.forEach(t => {
        const m = t.mood || (t.mood_tags && t.mood_tags[0]);
        if (m) moodCounts[m] = (moodCounts[m] || 0) + 1;
      });
      let dominantMood = "calm";
      let maxCount = 0;
      for (const [m, count] of Object.entries(moodCounts)) {
        if (count > maxCount) { maxCount = count; dominantMood = m; }
      }

      const payload = {
        username: currentUser.username,
        seed_mood: dominantMood
      };
      
      const res = await axios.post("http://127.0.0.1:5000/api/radio/next", payload);
      if (res.data?.success && res.data.tracks?.length > 0) {
        // Create an ephemeral radio playlist and play the first track
        const radioTracks = res.data.tracks;
        onPlayTrack(radioTracks[0], radioTracks);
      }
    } catch (err) {
      console.error("Failed to generate smart radio", err);
    } finally {
      setIsGeneratingRadio(false);
    }
  };

  const renderTrackCard = (track, trackList, idx) => (
    <div key={idx} className="group flex items-center p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-colors shadow-sm hover:shadow-[0_0_20px_rgba(234,179,8,0.15)]" onClick={() => onPlayTrack(track, trackList)}>
      <div className="relative w-14 h-14 shrink-0">
        <img src={track.cover_url || '/placeholder.jpg'} alt="cover" className="w-full h-full object-cover rounded shadow-md bg-zinc-800" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity">
          <span className="text-white text-lg ml-1">▶</span>
        </div>
      </div>
      <div className="ml-4 flex-1 overflow-hidden">
        <p className="text-white font-medium text-sm truncate group-hover:text-gold-400 transition-colors">{track.track_name}</p>
        <p className="text-zinc-400 text-xs truncate mt-1">{track.artist_name}</p>
      </div>
    </div>
  );

  if (activePlaylist) {
    const { _id, name, tracks } = activePlaylist;
    const coverImage = tracks.find(t => t.cover_url)?.cover_url;

    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => setActivePlaylist(null)}
            className="text-zinc-400 hover:text-white flex items-center gap-2 text-sm uppercase tracking-widest transition-colors"
          >
            <span>←</span> Back to Library
          </button>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={async () => {
                const shareUrl = `${window.location.origin}/?play=${encodeURIComponent(tracks[0]?.track_name || name)}`;
                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: `Listen to ${name} on EchoMood`,
                      text: `Check out this playlist I'm vibing to!`,
                      url: shareUrl
                    });
                  } catch (e) {}
                } else {
                  navigator.clipboard.writeText(shareUrl);
                  alert("Playlist link copied!");
                }
              }}
              className="text-gold-400 hover:text-gold-300 hover:bg-gold-500/10 px-3 py-2 rounded-full text-[10px] sm:text-xs uppercase tracking-widest transition-colors border border-gold-500/20 flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
              Share
            </button>
            <button 
              onClick={() => handleTogglePin(_id)}
              className="text-zinc-400 hover:text-white hover:bg-white/10 px-3 py-2 rounded-full text-[10px] sm:text-xs uppercase tracking-widest transition-colors border border-white/20 flex items-center gap-2"
            >
              {activePlaylist.is_pinned ? "📌 Unpin" : "📌 Pin"}
            </button>
            <button 
              onClick={() => handleDeletePlaylist(_id)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-full text-[10px] sm:text-xs uppercase tracking-widest transition-colors border border-red-500/20"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center md:items-end text-center md:text-left gap-8 mb-10 pb-10 border-b border-white/10">
          <div className="w-48 h-48 md:w-52 md:h-52 shrink-0 rounded-lg overflow-hidden shadow-2xl relative bg-zinc-800">
            {coverImage ? (
              <img src={coverImage} alt="playlist cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-4xl">🎧</div>
            )}
          </div>
          <div className="flex flex-col items-center md:items-start w-full">
            <p className="text-xs uppercase tracking-widest text-white block mb-2 font-bold">Custom Playlist</p>
            {isEditingName ? (
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-lg">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={handleRenamePlaylist}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenamePlaylist();
                    if (e.key === 'Escape') setIsEditingName(false);
                  }}
                  autoFocus
                  className="bg-white/10 text-white text-3xl md:text-5xl font-black rounded px-3 py-1 outline-none border border-gold-500 w-full text-center md:text-left"
                />
                <button onClick={handleRenamePlaylist} className="px-4 py-2 bg-gold-500 text-black font-bold rounded">Save</button>
              </div>
            ) : (
              <div className="flex items-center justify-center md:justify-start gap-3 group/title w-full">
                <h1 
                  className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tighter mb-4 cursor-pointer hover:text-gold-400 transition-colors text-center md:text-left break-words max-w-full"
                  onDoubleClick={() => {
                    setEditedName(name);
                    setIsEditingName(true);
                  }}
                >
                  {name}
                </h1>
                <button
                  onClick={() => {
                    setEditedName(name);
                    setIsEditingName(true);
                  }}
                  className="opacity-0 group-hover/title:opacity-100 text-zinc-400 hover:text-white p-2 mb-4 transition-opacity text-xl"
                  title="Rename playlist"
                >
                  ✏️
                </button>
              </div>
            )}
            <p className="text-zinc-500 text-xs mt-2 font-bold tracking-widest uppercase">
              {tracks.length} songs
            </p>
          </div>
        </div>

        {tracks.length > 0 && (
          <div className="mb-10 flex flex-wrap gap-4 items-center justify-center md:justify-start">
            <button 
              onClick={() => onPlayTrack(tracks[0], tracks)}
              className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 flex items-center justify-center rounded-full bg-gold-500 text-black hover:scale-105 transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)]"
            >
              <span className="text-xl sm:text-2xl ml-1">▶</span>
            </button>
            <button
              onClick={handleGenerateRadio}
              disabled={isGeneratingRadio}
              className="px-4 py-3 sm:px-6 sm:py-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all text-xs sm:text-sm font-medium tracking-wide border border-white/10 disabled:opacity-50 flex items-center gap-2"
            >
              {isGeneratingRadio ? "📻 Generating..." : "📻 Start Smart Radio"}
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {tracks.length === 0 ? (
            <p className="text-zinc-500 text-center py-10">This playlist is empty. Add songs to it from the player!</p>
          ) : (
            tracks.map((track, idx) => (
              <div 
                key={idx}
                draggable
                onDragStart={(e) => (dragItem.current = idx)}
                onDragEnter={(e) => (dragOverItem.current = idx)}
                onDragEnd={handleDragSort}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => onPlayTrack(track, tracks)}
                className="group flex items-center p-3 hover:bg-white/10 rounded-lg cursor-grab active:cursor-grabbing transition-colors"
              >
                <div className="w-8 text-center text-zinc-500 group-hover:hidden text-xs sm:text-sm flex items-center justify-center cursor-move" title="Drag to reorder">
                  <span className="text-[10px] sm:text-xs opacity-50 mr-0.5 sm:mr-1">☰</span>
                  {idx + 1}
                </div>
                <div className="w-8 text-center text-white hidden group-hover:block text-xs sm:text-sm">
                  ▶
                </div>
                
                <img src={track.cover_url || '/placeholder.jpg'} alt="cover" className="w-12 h-12 object-cover rounded mr-4 bg-zinc-800 pointer-events-none" />
                
                <div className="flex-grow flex-shrink min-w-0 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium group-hover:text-gold-400 transition-colors line-clamp-1">{track.track_name}</p>
                    <p className="text-zinc-400 text-sm line-clamp-1">{track.artist_name}</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {track.mood && (
                      <div className="hidden md:block">
                        <span className="text-[10px] tracking-widest uppercase px-2 py-1 rounded-full border border-white/20 text-zinc-300">
                          {track.mood}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (window.confirm("Remove this song from the playlist?")) {
                          try {
                            await axios.post("http://127.0.0.1:5000/api/playlists/remove_track", {
                              playlist_id: _id,
                              file_url: track.file_url
                            });
                            const updatedTracks = tracks.filter(t => t.file_url !== track.file_url);
                            setActivePlaylist(prev => ({ ...prev, tracks: updatedTracks }));
                            fetchLibraryData();
                            window.dispatchEvent(new Event('libraryUpdate'));
                          } catch (error) {
                            console.error("Failed to remove track from playlist", error);
                          }
                        }
                      }}
                      className="opacity-100 md:opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-400 p-2 transition-all flex-shrink-0"
                      title="Remove from playlist"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-20 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <h1 className="text-4xl font-serif text-white">Your Library</h1>
        
        <form onSubmit={handleCreatePlaylist} className="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/10 focus-within:border-gold-500/50 transition-colors">
          <input
            type="text"
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            placeholder="New Playlist Name..."
            className="bg-transparent text-sm text-white px-4 py-2 outline-none w-48 placeholder-zinc-500"
          />
          <button 
            type="submit" 
            disabled={isCreating || !newPlaylistName.trim()}
            className="bg-gold-500 text-black px-4 py-2 rounded-full text-sm font-medium tracking-wide disabled:opacity-50 hover:bg-gold-400 transition-colors"
          >
            Create
          </button>
        </form>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-16">
          <section>
            <div className="flex items-center gap-4 mb-6 px-1">
              <div className="w-12 h-12 bg-white/5 rounded-xl" />
              <div className="h-8 bg-white/5 rounded w-48" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4 p-2 bg-white/5 rounded-xl h-20" />
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-16">
          {/* Liked Songs */}
          <section>
            <div className="flex items-center gap-4 mb-6 px-1">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">❤️</span>
              </div>
              <h2 className="text-3xl font-serif text-white">Liked Songs</h2>
              <span className="text-zinc-500 ml-2">{favorites.length} tracks</span>
            </div>
            
            {favorites.length === 0 ? (
              <div className="p-8 border border-white/10 border-dashed rounded-2xl text-center">
                <p className="text-zinc-500">You haven't liked any songs yet. Click the heart icon on any track to save it here!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {favorites.map((track, idx) => renderTrackCard(track, favorites, idx))}
              </div>
            )}
          </section>

          {/* Custom Playlists */}
          <section>
            <h2 className="text-3xl font-serif text-white mb-6 px-1">Your Playlists</h2>
            {playlists.length === 0 ? (
              <div className="p-8 border border-white/10 border-dashed rounded-2xl text-center">
                <p className="text-zinc-500">You don't have any custom playlists yet. Create one above!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:gap-8">
                {playlists.map((pl) => (
                    <div 
                      key={pl._id} 
                      onClick={() => setActivePlaylist(pl)}
                      className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 hover:border-white/20 transition-all cursor-pointer hover:scale-105 group"
                    >
                      <div className="flex justify-between items-start mb-2 sm:mb-4">
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-xl font-medium text-white mb-1 group-hover:text-gold-400 transition-colors truncate">{pl.name}</h3>
                          <p className="text-xs sm:text-sm text-zinc-400">{pl.tracks.length} tracks</p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (pl.tracks.length > 0) onPlayTrack(pl.tracks[0], pl.tracks);
                          }}
                          className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-gold-500 text-black flex items-center justify-center hover:scale-110 transition-transform opacity-0 group-hover:opacity-100 shadow-lg shrink-0"
                        >
                          <span className="ml-0.5 sm:ml-1 text-xs sm:text-base">▶</span>
                        </button>
                      </div>
                      {pl.tracks.length === 0 ? (
                        <p className="text-xs sm:text-sm text-zinc-500 italic mt-2 sm:mt-4">Empty playlist.</p>
                      ) : (
                        <div className="space-y-2 mt-4 hidden sm:block">
                          {pl.tracks.slice(0, 5).map((track, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-2 rounded">
                              <img src={track.cover_url || '/placeholder.jpg'} alt="" className="w-8 h-8 rounded object-cover" />
                              <div className="truncate flex-1">
                                <p className="text-sm text-white truncate">{track.track_name}</p>
                                <p className="text-xs text-zinc-400 truncate">{track.artist_name}</p>
                              </div>
                            </div>
                          ))}
                          {pl.tracks.length > 5 && (
                            <p className="text-xs text-zinc-500 mt-2 px-2">+ {pl.tracks.length - 5} more tracks</p>
                          )}
                        </div>
                      )}
                    </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
