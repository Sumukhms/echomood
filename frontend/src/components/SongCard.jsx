export default function SongCard({ track }) {
  return (
    <div className="relative flex flex-col p-4 transition-all duration-500 border group bg-white/5 backdrop-blur-md border-white/10 rounded-2xl hover:bg-white/10 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(212,175,55,0.15)]">
      
      {/* YouTube iframe Container */}
      <div className="relative w-full overflow-hidden aspect-video rounded-xl bg-zinc-900">
        <iframe
          src={track.preview_url}
          title={track.track_name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        ></iframe>
      </div>

      {/* Track Info */}
      <div className="pt-4 pb-2 text-left">
        <h4 className="font-serif text-lg text-white truncate line-clamp-1 group-hover:text-gold-400 transition-colors">
          {track.track_name}
        </h4>
        <p className="text-sm font-light text-zinc-400 truncate mt-0.5">
          {track.artist_name}
        </p>
      </div>
      
    </div>
  );
}