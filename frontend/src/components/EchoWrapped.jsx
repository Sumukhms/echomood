import React, { useState, useEffect } from 'react';

export default function EchoWrapped({ wrappedData, onClose }) {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((prev) => {
        if (prev === 2) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    if (slide < 2) setSlide(slide + 1);
  };

  if (!wrappedData) return null;

  const totalMinutes = wrappedData.total_minutes || wrappedData.totalMinutes || 0;
  const topMood = wrappedData.top_mood || wrappedData.topMood || 'Vibing';
  const topTracks = wrappedData.top_tracks || wrappedData.topTracks || [];

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black animate-fade-in font-sans">
      <div className="absolute top-4 right-4 z-50">
        <button onClick={onClose} className="text-white bg-white/20 hover:bg-white/40 rounded-full p-2 w-10 h-10 flex items-center justify-center transition-colors">
          ✕
        </button>
      </div>

      {/* Progress Bars */}
      <div className="absolute top-4 left-4 right-16 flex gap-2 z-50">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-white transition-all ease-linear ${slide === i ? 'duration-[4000ms]' : 'duration-0'}`}
              style={{ width: slide > i ? '100%' : slide === i ? '100%' : '0%' }}
            />
          </div>
        ))}
      </div>

      <div className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-pointer" onClick={nextSlide}>
        {slide === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black animate-fade-in p-6 text-center">
            <h2 className="text-3xl md:text-6xl font-bold text-white mb-6 tracking-tight">Total Minutes Listened</h2>
            <p className="text-6xl sm:text-7xl md:text-[10rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500 drop-shadow-[0_0_30px_rgba(236,72,153,0.8)] md:scale-110">
              {totalMinutes.toLocaleString()}
            </p>
            <p className="text-lg md:text-3xl text-white/80 mt-12 font-light">You couldn't get enough of the music this year.</p>
          </div>
        )}

        {slide === 1 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-emerald-900 via-teal-900 to-black animate-fade-in p-6 text-center">
            <h2 className="text-3xl md:text-6xl font-bold text-white mb-6 tracking-tight">Your Top Mood</h2>
            <div className="relative my-8">
              <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full"></div>
              <p className="relative text-5xl sm:text-6xl md:text-[8rem] leading-none font-black text-emerald-400 uppercase tracking-tighter drop-shadow-[0_0_40px_rgba(52,211,153,0.8)] md:scale-110 transition-transform break-words max-w-full">
                {topMood}
              </p>
            </div>
            <p className="text-lg md:text-3xl text-white/80 mt-12 font-light">That was the energy you brought everywhere.</p>
          </div>
        )}

        {slide === 2 && (
          <div className="absolute inset-0 flex flex-col items-center justify-start overflow-y-auto bg-gradient-to-bl from-rose-900 via-red-900 to-black animate-fade-in p-6 pt-24 custom-scrollbar">
            <h2 className="text-3xl md:text-6xl font-bold text-white mb-8 tracking-tight text-center">Your Top Tracks</h2>
            <div className="flex flex-col gap-3 w-full max-w-3xl">
              {topTracks.length > 0 ? topTracks.map((track, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 hover:scale-[1.02] transition-transform">
                  <span className="text-2xl md:text-5xl font-black text-white/30 w-8 md:w-12 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl md:text-3xl font-bold text-white truncate">{track.title || track.name || track}</h3>
                    <p className="text-sm md:text-xl text-white/60 mt-1 truncate">{track.artist || 'Unknown Artist'}</p>
                  </div>
                </div>
              )) : (
                <p className="text-xl text-white/50 text-center">No top tracks found</p>
              )}
            </div>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="mt-10 mb-10 px-8 py-4 bg-white text-black font-bold text-xl rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.3)] shrink-0">
              Share Wrap
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
