import { useMood } from '../context/MoodContext';

export default function TabButton({ icon, label, isActive, ...props }) {
  const { borderColor } = useMood();
  const activeClasses = isActive ? `border-b-4 ${borderColor} text-white` : 'border-b-4 border-transparent text-gray-400';

  return (
    <button
      {...props}
      className={`flex-1 flex items-center justify-center gap-3 p-4 text-lg font-semibold transition-all ${activeClasses} hover:text-white hover:bg-white hover:bg-opacity-10`}
    >
      {icon} {label}
    </button>
  );
}