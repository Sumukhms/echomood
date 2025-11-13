export default function LoadingSpinner() {
  return (
    <div className="text-center p-10">
      <div className="w-12 h-12 border-4 border-dashed border-white rounded-full animate-spin mx-auto"></div>
      <p className="mt-4 text-lg">Detecting mood and finding music...</p>
    </div>
  );
}