import { useState } from 'react';
import axios from 'axios';

export default function TextInputPanel({ userProfile, username, onAnalyzeComplete }) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusText, setStatusText] = useState('Type your mood or vibe and let AI DJ interpret it.');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const cleanText = text.trim();
    if (!cleanText) {
      setStatusText('Please enter a mood prompt before analyzing.');
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusText('Analyzing text resonance...');

      const response = await axios.post('https://sumukh25-echomood-api.hf.space/api/analyze/text', {
        text: cleanText,
        languages: userProfile?.languages || ['Hindi'],
        username: username
      });

      setStatusText('Vibe detected.');
      if (onAnalyzeComplete) {
        onAnalyzeComplete(response.data.detected_mood, response.data.tracks, response.data.explanation);
      }
    } catch (error) {
      console.error('Text analysis failed', error);
      setStatusText('Error communicating with AI Brain.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full p-6 md:p-8 border bg-white/5 backdrop-blur-md border-white/10 rounded-3xl shadow-2xl mt-8">
      <h3 className="mb-4 font-serif text-2xl tracking-wide text-white">Text Resonance</h3>
      <p className="text-xs tracking-[0.15em] uppercase text-zinc-400 mb-4">Describe how you feel right now</p>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={4}
        placeholder="Example: I need calm focus for deep work, maybe some nostalgic indie."
        className="w-full p-4 text-sm text-white border rounded-2xl bg-black/40 border-white/15 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-gold-500/60"
      />

      <div className="flex items-center justify-between mt-4 gap-4">
        <p className="text-xs tracking-widest uppercase text-zinc-400">{statusText}</p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 text-xs tracking-widest uppercase rounded-full transition-all bg-gold-500 text-black hover:bg-gold-400 disabled:opacity-60"
        >
          {isSubmitting ? 'Analyzing...' : 'Analyze Text'}
        </button>
      </div>
    </form>
  );
}
