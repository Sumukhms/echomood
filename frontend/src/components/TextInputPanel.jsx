import { useState } from 'react';
import { FaPaperPlane } from 'react-icons/fa';

// Pass the 'getRecommendations' function from our hook
export default function TextInputPanel({ getRecommendations, isLoading }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text || isLoading) return;
    getRecommendations('detect', { text });
  };

  return (
    <div>
      <h3 className="text-2xl font-semibold mb-4">How are you feeling?</h3>
      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g., Today was a fantastic day!"
          rows="4"
          className="w-full p-4 rounded-lg bg-gray-800 bg-opacity-70 border-2 border-gray-600 focus:border-white focus:ring-0 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={isLoading || !text}
          className="w-full mt-4 p-4 text-lg font-bold bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-3
                     disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          <FaPaperPlane />
          {isLoading ? 'Detecting...' : 'Detect Mood & Get Music'}
        </button>
      </form>
    </div>
  );
}