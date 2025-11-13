import { useMood } from '../context/MoodContext';

export default function Header() {
  const { uiColors, borderColor } = useMood();

  return (
    <header className={`text-center p-6 bg-black bg-opacity-30 rounded-t-xl border-b-2 ${borderColor}`}>
      <h1 className="text-5xl font-bold">EchoMood</h1>
      <p className="text-xl mt-2 opacity-80">
        Real-time music recommendations based on your mood.
      </p>
    </header>
  );
}