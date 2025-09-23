export function App() {
  return (
    <main className="p-8 flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <button
        className="p-12 text-xl font-mono rounded-full shadow-lg bg-slate-500 hover:bg-pink-300/40 text-white transition-all duration-200 outline-none hover:ring-4 hover:ring-pink-300 "
        onClick={() => alert("!")}
        type="button"
      >
        🦄 Run Silly Test
      </button>
    </main>
  );
}
