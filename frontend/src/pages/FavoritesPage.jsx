import { useState } from "react";
import ProductCard from "../components/products/ProductCard";
import { useFavorites } from "../hooks/useFavorites";

/* ─── tokens ─────────────────────────────────────────────── */
const C = {
  gold: "#c9aa6f",
  gold2: "#e4c98a",
  goldAlpha: "rgba(201,170,111,0.10)",
  goldBorder: "rgba(201,170,111,0.20)",
  goldBorder2: "rgba(201,170,111,0.38)",
  bg: "#0c0a07",
  s1: "#141009",
  s2: "#1a1510",
  s3: "#201b11",
  text: "#f2ede3",
  text2: "#ab9878",
  text3: "#5e5038",
  border: "rgba(201,170,111,0.13)",
  border2: "rgba(201,170,111,0.26)",
  red: "#f87171",
};

/* ─── tiny icons ──────────────────────────────────────────── */
function HeartFilled({ size = 16, color = C.gold }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}
function HeartOutline({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}
function Grid3Icon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function Grid2Icon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="8" height="18" rx="1" /><rect x="13" y="3" width="8" height="18" rx="1" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3" cy="6" r="1.5" fill="currentColor" /><circle cx="3" cy="12" r="1.5" fill="currentColor" /><circle cx="3" cy="18" r="1.5" fill="currentColor" />
    </svg>
  );
}
function SortIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="10" y1="18" x2="14" y2="18" />
    </svg>
  );
}
function SparkleIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
      <path d="M6 0l1.3 3.2L11 4.5 8.2 7l.8 3.8L6 9.1 3 10.8l.8-3.8L1 4.5l3.7-1.3z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  );
}

/* ─── skeleton card ───────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div style={{
      borderRadius: 24, border: `1px solid ${C.border}`,
      background: C.s2, overflow: "hidden",
      animation: "pulse 1.6s ease-in-out infinite",
    }}>
      <div style={{ height: 200, background: C.s3 }} />
      <div style={{ padding: "18px 20px" }}>
        <div style={{ height: 12, borderRadius: 6, background: C.s3, marginBottom: 10, width: "70%" }} />
        <div style={{ height: 10, borderRadius: 6, background: C.s3, marginBottom: 14, width: "45%" }} />
        <div style={{ height: 32, borderRadius: 10, background: C.s3 }} />
      </div>
    </div>
  );
}

/* ─── empty state ─────────────────────────────────────────── */
function EmptyState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "80px 24px", textAlign: "center",
    }}>
      {/* animated heart */}
      <div style={{
        position: "relative", width: 100, height: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 28,
      }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "rgba(201,170,111,0.08)", border: `1px solid ${C.goldBorder}`,
          animation: "ping 2.4s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", inset: 14, borderRadius: "50%",
          background: "rgba(201,170,111,0.06)", border: `1px solid ${C.goldBorder}`,
          animation: "ping 2.4s ease-in-out infinite 0.4s",
        }} />
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "rgba(201,170,111,0.10)", border: `1px solid ${C.goldBorder2}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", zIndex: 1,
          color: C.gold,
        }}>
          <HeartOutline size={26} />
        </div>
      </div>

      <h2 style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: 28, fontWeight: 600, color: C.text, marginBottom: 10,
      }}>
        Nothing saved yet
      </h2>
      <p style={{
        fontSize: 14, color: C.text2, lineHeight: 1.75,
        maxWidth: 320, fontWeight: 300,
      }}>
        Save products from recommendations or search — they'll collect here for easy comparison.
      </p>

      {/* decorative line */}
      <div style={{
        marginTop: 32, width: 48, height: 1,
        background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`,
      }} />
    </div>
  );
}

/* ─── view toggle button ──────────────────────────────────── */
function ViewBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 34, height: 34, borderRadius: 10,
        border: `1px solid ${active ? C.goldBorder2 : C.border}`,
        background: active ? C.goldAlpha : "transparent",
        color: active ? C.gold : C.text3,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "all 0.18s",
      }}
    >
      {children}
    </button>
  );
}

/* ─── sort pill ───────────────────────────────────────────── */
function SortPill({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          height: 34, padding: "0 14px",
          borderRadius: 10, border: `1px solid ${open ? C.goldBorder2 : C.border}`,
          background: open ? C.goldAlpha : "transparent",
          color: open ? C.gold : C.text2,
          fontSize: 12, fontWeight: 500, cursor: "pointer",
          fontFamily: "inherit", transition: "all 0.18s",
        }}
      >
        <SortIcon />
        {options.find((o) => o.value === value)?.label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform .18s" }}>
          <path d="M2 3.5L5 6.5L8 3.5" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50,
          background: C.s2, border: `1px solid ${C.border2}`,
          borderRadius: 14, padding: 6, minWidth: 160,
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        }}>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8,
                padding: "9px 12px", borderRadius: 10, border: "none",
                background: value === opt.value ? C.goldAlpha : "transparent",
                color: value === opt.value ? C.gold : C.text2,
                fontSize: 13, fontWeight: value === opt.value ? 500 : 400,
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                transition: "background 0.15s",
              }}
            >
              {value === opt.value && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill={C.gold}>
                  <path d="M2 5l2.5 2.5L8 2.5" stroke={C.gold} strokeWidth="1.5" fill="none" />
                </svg>
              )}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── stat chip ───────────────────────────────────────────── */
function StatChip({ label, value }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      padding: "10px 18px", borderRadius: 14,
      background: "rgba(255,255,255,0.025)", border: `1px solid ${C.border}`,
    }}>
      <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: C.text3, marginBottom: 4 }}>
        {label}
      </span>
      <span style={{ fontSize: 16, fontWeight: 600, color: C.text }}>
        {value}
      </span>
    </div>
  );
}

/* ─── main page ───────────────────────────────────────────── */
const SORT_OPTIONS = [
  { value: "recent", label: "Recently saved" },
  { value: "name", label: "Name A–Z" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export default function FavoritesPage({ onProductClick }) {
  const { favorites, toggle, isFavorite, loading } = useFavorites();
  const [view, setView] = useState("grid3");
  const [sort, setSort] = useState("recent");

  const raw = favorites
    .map((f) => f?.productId || f)
    .filter((p) => p?._id);

  const products = [...raw].sort((a, b) => {
    if (sort === "name") return (a.name || "").localeCompare(b.name || "");
    if (sort === "price-asc") return (a.price || 0) - (b.price || 0);
    if (sort === "price-desc") return (b.price || 0) - (a.price || 0);
    return 0;
  });

  const cols = view === "list" ? 1 : view === "grid2" ? 2 : 3;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,600&family=Outfit:wght@300;400;500;600&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        @keyframes ping  { 0%{transform:scale(1);opacity:.6} 80%,100%{transform:scale(1.7);opacity:0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fav-card-wrap { animation: fadeUp .4s ease both; }
        .fav-card-wrap:nth-child(1){animation-delay:.04s}
        .fav-card-wrap:nth-child(2){animation-delay:.08s}
        .fav-card-wrap:nth-child(3){animation-delay:.12s}
        .fav-card-wrap:nth-child(4){animation-delay:.16s}
        .fav-card-wrap:nth-child(5){animation-delay:.20s}
        .fav-card-wrap:nth-child(6){animation-delay:.24s}
        .fav-card-wrap:nth-child(n+7){animation-delay:.28s}
      `}</style>

      <div style={{
        fontFamily: "'Outfit', 'Segoe UI', system-ui, sans-serif",
        padding: "32px 28px",
        minHeight: "100vh",
        background: C.bg,
      }}>

        {/* ── HEADER ── */}
        <div style={{
          position: "relative", overflow: "hidden",
          borderRadius: 28, border: `1px solid ${C.goldBorder}`,
          padding: "40px 44px",
          background: `
            radial-gradient(ellipse 60% 70% at 4% 20%, rgba(201,170,111,0.15) 0%, transparent 55%),
            radial-gradient(ellipse 45% 50% at 95% 80%, rgba(167,139,250,0.09) 0%, transparent 55%),
            linear-gradient(155deg, #1d1710 0%, #0e0b07 100%)
          `,
          boxShadow: "0 32px 64px rgba(0,0,0,0.4)",
          marginBottom: 28,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 28,
        }}>
          {/* dot texture */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "radial-gradient(circle, rgba(201,170,111,0.07) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }} />

          <div style={{ position: "relative" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              border: `1px solid ${C.goldBorder2}`, borderRadius: 100,
              padding: "5px 13px", fontSize: 10, fontWeight: 600,
              letterSpacing: "0.22em", textTransform: "uppercase",
              color: C.gold, background: C.goldAlpha, marginBottom: 16,
            }}>
              <SparkleIcon /> My Collection
            </div>

            <h1 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 44, fontWeight: 600, lineHeight: 1.1,
              color: C.text, letterSpacing: "-0.01em", marginBottom: 10,
            }}>
              My Favorites
            </h1>
            <p style={{ fontSize: 14, color: C.text2, fontWeight: 300, lineHeight: 1.6 }}>
              Products you've saved for easy comparison and tracking.
            </p>
          </div>

          {!loading && products.length > 0 && (
            <div style={{ position: "relative", display: "flex", gap: 12, flexShrink: 0 }}>
              <StatChip label="Saved" value={products.length} />
              <StatChip label="Categories" value={[...new Set(products.map((p) => p.category).filter(Boolean))].length || "—"} />
            </div>
          )}
        </div>

        {/* ── TOOLBAR ── */}
        {!loading && products.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 22, gap: 12,
          }}>
            <div style={{ fontSize: 13, color: C.text3, fontWeight: 400 }}>
              {products.length} product{products.length !== 1 ? "s" : ""}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <SortPill options={SORT_OPTIONS} value={sort} onChange={setSort} />

              <div style={{
                display: "flex", gap: 4, padding: "3px",
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${C.border}`, borderRadius: 13,
              }}>
                <ViewBtn active={view === "grid3"} onClick={() => setView("grid3")}><Grid3Icon /></ViewBtn>
                <ViewBtn active={view === "grid2"} onClick={() => setView("grid2")}><Grid2Icon /></ViewBtn>
                <ViewBtn active={view === "list"}  onClick={() => setView("list")}><ListIcon /></ViewBtn>
              </div>
            </div>
          </div>
        )}

        {/* ── CONTENT ── */}
        {loading ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: 20,
          }}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: view === "list"
              ? "1fr"
              : view === "grid2"
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(3, minmax(0, 1fr))",
            gap: view === "list" ? 12 : 20,
            transition: "grid-template-columns 0.25s",
          }}>
            {products.map((product) => (
              <div
                key={product._id}
                className="fav-card-wrap"
                style={{
                  position: "relative",
                  borderRadius: 24,
                  border: `1px solid ${C.border}`,
                  background: C.s2,
                  overflow: "hidden",
                  transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = C.goldBorder;
                  e.currentTarget.style.boxShadow = `0 20px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,170,111,0.12)`;
                  e.currentTarget.style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* fav badge */}
                <div style={{
                  position: "absolute", top: 14, right: 14, zIndex: 10,
                  width: 34, height: 34, borderRadius: "50%",
                  background: "rgba(12,10,7,0.75)",
                  border: `1px solid ${C.goldBorder2}`,
                  backdropFilter: "blur(8px)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "transform 0.18s, background 0.18s",
                }}
                  onClick={(e) => { e.stopPropagation(); toggle(product._id); }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.background = "rgba(201,170,111,0.15)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.background = "rgba(12,10,7,0.75)"; }}
                >
                  <HeartFilled size={15} color={isFavorite(product._id) ? C.gold : C.text3} />
                </div>

                {/* remove pill — appears on hover via CSS class would need Tailwind; using onMouseEnter overlay instead */}
                <ProductCard
                  product={product}
                  isFav={isFavorite(product._id)}
                  onFav={toggle}
                  onClick={onProductClick}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── FOOTER HINT ── */}
        {!loading && products.length > 0 && (
          <div style={{
            marginTop: 40, padding: "18px 24px",
            borderRadius: 18, border: `1px solid ${C.border}`,
            background: "rgba(255,255,255,0.015)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <HeartFilled size={14} color={C.gold} />
              <span style={{ fontSize: 13, color: C.text2, fontWeight: 300 }}>
                Favorites are private and synced to your account.
              </span>
            </div>
            <span style={{ fontSize: 11, color: C.text3 }}>
              {products.length} / ∞
            </span>
          </div>
        )}
      </div>
    </>
  );
}
