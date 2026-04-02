export default function Toggle({ checked, onChange, label }) {
  
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div className="relative">
        <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
        <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${checked ? "bg-[var(--accent)]" : "bg-[var(--border2)]"}`} />
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${checked ? "translate-x-5" : ""}`} />
      </div>
      {label && <span className="text-sm text-[var(--text2)]">{label}</span>}
    </label>
  );
}
