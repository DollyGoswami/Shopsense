import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import ProductCard from "../components/products/ProductCard";
import { useProducts } from "../hooks/useProducts";
import { useFavorites } from "../hooks/useFavorites";

/* ─── constants ─────────────────────────────────────────────────────── */
const SORTS = [
  { value: "score",      label: "Recommended" },
  { value: "price_asc",  label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating",     label: "Top rated" },
  { value: "discount",   label: "Best discount" },
  { value: "newest",     label: "Newest first" },
];

const PRICE_PRESETS = [
  { label: "Under ₹2k",    min: "",      max: "2000"  },
  { label: "₹2k – ₹10k",  min: "2000",  max: "10000" },
  { label: "₹10k – ₹50k", min: "10000", max: "50000" },
  { label: "₹50k+",        min: "50000", max: ""      },
];

/* ─── helpers ───────────────────────────────────────────────────────── */
function formatCurrency(v) {
  if (v == null || Number.isNaN(Number(v))) return "N/A";
  return `₹${Number(v).toLocaleString("en-IN")}`;
}

/* ─── global styles ─────────────────────────────────────────────────── */
const GLOBAL_CSS = `

  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

  @keyframes ps-spin    { to { transform: rotate(360deg); } }
  @keyframes ps-fadein  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
  @keyframes ps-shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  @keyframes ps-dot {
    0%,80%,100%{ transform:scale(0.55); opacity:0.35; }
    40%        { transform:scale(1);    opacity:1;    }
  }

  *, *::before, *::after { box-sizing: border-box; }

  .ps-root {
    --ps-surface: #fffcf6;
    --ps-border: rgba(140, 112, 69, 0.18);
    --ps-text: #17120d;
    --ps-text2: rgba(46, 36, 22, 0.76);
    --ps-text3: rgba(88, 72, 46, 0.55);
    --ps-gold: #c8a96e;
    --ps-gold-dim: rgba(200, 169, 110, 0.55);
    font-family: 'DM Sans', sans-serif;
    min-height: 100vh;
    background: #0c0b09;
    color: rgba(240,235,220,0.9);
  }

  /* shimmer skeleton */
  .ps-skel {
    background: linear-gradient(100deg,
      rgba(200,169,110,0.03) 25%,
      rgba(200,169,110,0.09) 50%,
      rgba(200,169,110,0.03) 75%
    );
    background-size: 600px 100%;
    animation: ps-shimmer 1.8s infinite linear;
    border-radius: 26px;
  }

  /* product grid */
  .ps-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: start;
    gap: 18px;
  }
  @media (max-width: 1100px) {
    .ps-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 720px) {
    .ps-grid { grid-template-columns: 1fr; }
  }

  /* FAB */
  .ps-fab {
    position: fixed; right: 0; top: 50%; transform: translateY(-50%);
    z-index: 60;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    padding: 18px 11px;
    background: #141210;
    border: 1px solid rgba(200,169,110,0.2);
    border-right: none;
    border-radius: 14px 0 0 14px;
    cursor: pointer;
    box-shadow: -8px 0 32px rgba(0,0,0,0.5);
    transition: background 0.2s, border-color 0.2s;
  }
  .ps-fab:hover {
    background: rgba(200,169,110,0.07);
    border-color: rgba(200,169,110,0.38);
  }

  /* Drawer */
  .ps-drawer {
    position: fixed; top: 0; right: 0; bottom: 0; width: 320px;
    z-index: 80;
    background: #110f0c;
    border-left: 1px solid rgba(200,169,110,0.16);
    box-shadow: -28px 0 70px rgba(0,0,0,0.65);
    display: flex; flex-direction: column;
    transition: transform 0.3s cubic-bezier(0.32,0,0.15,1);
  }

  /* preset buttons */
  .ps-preset {
    width: 100%; text-align: left;
    padding: 13px 16px;
    border-radius: 12px;
    border: 1px solid rgba(200,169,110,0.14);
    background: transparent;
    color: rgba(240,235,220,0.52);
    font-family: 'DM Sans', sans-serif;
    font-size: 13px; cursor: pointer;
    transition: all 0.18s;
    display: flex; align-items: center; gap: 10px;
  }
  .ps-preset:hover {
    border-color: rgba(200,169,110,0.3);
    color: rgba(240,235,220,0.85);
    background: rgba(200,169,110,0.04);
  }
  .ps-preset.active {
    border-color: rgba(200,169,110,0.5);
    background: rgba(200,169,110,0.09);
    color: rgba(232,213,168,0.95);
    font-weight: 500;
  }

  /* sort select */
  .ps-sort {
    background: transparent; border: none; outline: none;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px; font-weight: 500;
    color: rgba(240,235,220,0.9);
    cursor: pointer;
    appearance: none; -webkit-appearance: none;
    padding-right: 18px;
  }
  .ps-sort option { background: #141210; color: #fff; }

  /* buttons */
  .ps-btn-gold {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 11px 22px; border-radius: 10px;
    font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
    background: linear-gradient(135deg, #c8a96e 0%, #9e7434 100%);
    color: #0c0b09;
    border: 1px solid rgba(232,201,142,0.3);
    cursor: pointer;
    box-shadow: 0 8px 28px rgba(200,169,110,0.3), inset 0 1px 0 rgba(255,255,255,0.15);
    transition: opacity 0.2s, box-shadow 0.2s, transform 0.15s;
  }
  .ps-btn-gold:hover  { opacity: 0.88; box-shadow: 0 14px 36px rgba(200,169,110,0.38); transform: translateY(-1px); }
  .ps-btn-gold:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }

  .ps-btn-ghost {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 11px 22px; border-radius: 10px;
    font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 400;
    background: rgba(240,235,220,0.03);
    color: rgba(240,235,220,0.52);
    border: 1px solid rgba(200,169,110,0.16);
    cursor: pointer;
    transition: all 0.18s;
  }
  .ps-btn-ghost:hover   { border-color: rgba(200,169,110,0.32); color: rgba(240,235,220,0.85); background: rgba(200,169,110,0.04); }
  .ps-btn-ghost:disabled { opacity: 0.3; cursor: not-allowed; }

  /* section label */
  .ps-eyebrow {
    font-family: 'DM Sans', sans-serif;
    font-size: 10px; font-weight: 600;
    letter-spacing: 0.2em; text-transform: uppercase;
    color: rgba(200,169,110,0.55);
    margin-bottom: 10px;
  }

  /* live dots */
  .ps-dots { display: inline-flex; gap: 3px; align-items: center; }
  .ps-dots span {
    width: 4px; height: 4px; border-radius: 50%;
    background: #c8a96e;
    animation: ps-dot 1.4s ease-in-out infinite;
  }
  .ps-dots span:nth-child(2) { animation-delay: 0.18s; }
  .ps-dots span:nth-child(3) { animation-delay: 0.36s; }

  /* toolbar card */
  .ps-toolbar-card {
    border-radius: 20px;
    background: linear-gradient(145deg, rgba(200,169,110,0.05) 0%, rgba(14,13,11,0) 60%);
    border: 1px solid rgba(200,169,110,0.14);
    padding: 18px 22px;
    backdrop-filter: blur(10px);
  }

  /* busy overlay */
  .ps-overlay {
    position: absolute; inset: 0; z-index: 10;
    border-radius: 20px;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
    background: rgba(12,11,9,0.75);
    backdrop-filter: blur(6px);
  }

  /* divider line */
  .ps-rule {
    height: 1px;
    background: linear-gradient(90deg, transparent 0%, rgba(200,169,110,0.3) 30%, rgba(200,169,110,0.3) 70%, transparent 100%);
    border: none; margin: 0;
  }

  /* Chip */
  .ps-chip {
    display: inline-flex; align-items: center;
    padding: 5px 12px; border-radius: 999px;
    font-size: 11px; font-weight: 400;
    color: rgba(200,169,110,0.75);
    background: rgba(200,169,110,0.06);
    border: 1px solid rgba(200,169,110,0.18);
    letter-spacing: 0.02em;
  }
`;

/* ─── Spinner ───────────────────────────────────────────────────────── */
function Spinner({ size = 18, color = "#c8a96e" }) {
  return (
    <span style={{
      display: "inline-block", flexShrink: 0,
      width: size, height: size,
      border: `2px solid rgba(200,169,110,0.18)`,
      borderTopColor: color,
      borderRadius: "50%",
      animation: "ps-spin 0.75s linear infinite",
    }} />
  );
}

/* ─── LiveDots ──────────────────────────────────────────────────────── */
function LiveDots() {
  return <div className="ps-dots"><span /><span /><span /></div>;
}

/* ─── FilterFAB ─────────────────────────────────────────────────────── */
function FilterFAB({ activeCount, onClick }) {
  return (
    <button className="ps-fab" onClick={onClick} aria-label="Open budget filter">
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none"
        style={{ transform: "rotate(90deg)", flexShrink: 0 }}>
        <path d="M1.5 3h12L9 9.5V13l-3-1.5V9.5L1.5 3z"
          stroke="rgba(200,169,110,0.65)" strokeWidth="1.3"
          strokeLinejoin="round" fill="none" />
      </svg>
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: "0.16em",
        color: "rgba(200,169,110,0.65)",
        writingMode: "vertical-rl", textTransform: "uppercase",
      }}>
        Filter
      </span>
      {activeCount > 0 && (
        <span style={{
          width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg,#c8a96e,#9e7434)",
          color: "#0c0b09", fontSize: 9, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 12px rgba(200,169,110,0.5)",
        }}>
          {activeCount}
        </span>
      )}
    </button>
  );
}

/* ─── FilterDrawer ──────────────────────────────────────────────────── */
function FilterDrawer({ open, onClose, applied, setApplied, setPage }) {
  const [local, setLocal] = useState({ min: applied.minPrice, max: applied.maxPrice });
  useEffect(() => { setLocal({ min: applied.minPrice, max: applied.maxPrice }); }, [applied]);

  const applyPreset = (preset) => {
    const isActive = preset.min === local.min && preset.max === local.max;
    const next = isActive ? { min: "", max: "" } : { min: preset.min, max: preset.max };
    setLocal(next);
    setApplied(p => ({ ...p, minPrice: next.min, maxPrice: next.max }));
    setPage(1);
  };

  const applyClose = () => {
    setApplied(p => ({ ...p, minPrice: local.min, maxPrice: local.max }));
    setPage(1);
    onClose();
  };

  const clearAll = () => {
    setLocal({ min: "", max: "" });
    setApplied(p => ({ ...p, minPrice: "", maxPrice: "" }));
    setPage(1);
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 70,
        background: "rgba(0,0,0,0.6)",
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.28s",
        backdropFilter: open ? "blur(4px)" : "none",
      }} />

      <div className="ps-drawer" style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}>
        {/* Header */}
        <div style={{
          padding: "24px 24px 20px",
          borderBottom: "1px solid rgba(200,169,110,0.1)",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        }}>
          <div>
            <p style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: 24, fontWeight: 400, lineHeight: 1.1,
              color: "rgba(240,235,220,0.95)",
            }}>
              Budget<br /><em style={{ fontStyle: "italic", color: "rgba(200,169,110,0.8)" }}>filter</em>
            </p>
            <p style={{ fontSize: 11, color: "rgba(200,169,110,0.5)", marginTop: 8, letterSpacing: "0.03em" }}>
              Narrow results by price range
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            border: "1px solid rgba(200,169,110,0.16)",
            background: "transparent", cursor: "pointer",
            color: "rgba(240,235,220,0.4)", fontSize: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.18s",
          }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 24px" }}>
          <p className="ps-eyebrow">Quick ranges</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PRICE_PRESETS.map(p => {
              const active = p.min === local.min && p.max === local.max;
              return (
                <button key={p.label} className={`ps-preset${active ? " active" : ""}`}
                  onClick={() => applyPreset(p)}>
                  <span style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    border: `1px solid ${active ? "rgba(200,169,110,0.6)" : "rgba(200,169,110,0.2)"}`,
                    background: active ? "rgba(200,169,110,0.15)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, color: active ? "#c8a96e" : "rgba(200,169,110,0.3)",
                    transition: "all 0.18s",
                  }}>
                    {active ? "✦" : ""}
                  </span>
                  {p.label}
                </button>
              );
            })}
          </div>

          {(local.min || local.max) && (
            <div style={{
              marginTop: 20,
              padding: "14px 16px", borderRadius: 12,
              background: "rgba(200,169,110,0.06)",
              border: "1px solid rgba(200,169,110,0.22)",
            }}>
              <p className="ps-eyebrow" style={{ marginBottom: 6 }}>Selected range</p>
              <p style={{ fontSize: 15, fontWeight: 500, color: "rgba(240,235,220,0.9)" }}>
                {local.min ? formatCurrency(local.min) : "Any"}
                <span style={{ color: "rgba(200,169,110,0.5)", margin: "0 8px" }}>→</span>
                {local.max ? formatCurrency(local.max) : "Any"}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "20px 24px",
          borderTop: "1px solid rgba(200,169,110,0.1)",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <button className="ps-btn-gold" style={{ width: "100%", padding: "13px" }} onClick={applyClose}>
            Apply filter
          </button>
          <button className="ps-btn-ghost" style={{ width: "100%", padding: "13px" }} onClick={clearAll}>
            Clear range
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── SkeletonGrid ──────────────────────────────────────────────────── */
function SkeletonGrid() {
  return (
    <div className="ps-grid">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="ps-skel" style={{ aspectRatio: "4/5" }} />
      ))}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function ProductsPage({
  onProductClick,
  initialQuery = "",
  searchToken = 0,
  onSearchStateChange,
  onSearchStatusChange,
  onResetSearch,
}) {
  const MIN_QUERY_LENGTH   = 3;
  const AUTO_REFRESH_INTERVAL = 3000;
  const AUTO_REFRESH_MAX   = 10;
  const DISPLAY_PAGES_LIMIT = 10;

  const { products, loading, error, search, pagination } = useProducts();
  const { toggle, isFavorite } = useFavorites();

  const [query,      setQuery]      = useState("");
  const [sort,       setSort]       = useState("score");
  const [minPrice,   setMinPrice]   = useState("");
  const [maxPrice,   setMaxPrice]   = useState("");
  const [page,       setPage]       = useState(1);
  const [isLive,     setIsLive]     = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [liveMsg,    setLiveMsg]    = useState("");
  const [applied,    setApplied]    = useState({ query: "", minPrice: "", maxPrice: "" });
  const [filterOpen, setFilterOpen] = useState(false);

  const runRef   = useRef(0);
  const timerRef = useRef(null);

  const getSourceSignature = useCallback((items = []) => {
    const sources = Array.from(new Set(
      items.map((item) => String(item?.source || "").trim()).filter(Boolean)
    )).sort();
    return { count: sources.length, key: sources.join("|") };
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  useEffect(() => {
    const q = initialQuery.trim();
    setQuery(q); setMinPrice(""); setMaxPrice("");
    setApplied({ query: q, minPrice: "", maxPrice: "" });
    setPage(1);
  }, [initialQuery, searchToken]);

  useEffect(() => { onSearchStateChange?.(loading || isLive); }, [isLive, loading, onSearchStateChange]);
  useEffect(() => {
    onSearchStatusChange?.(loading ? "Searching" : isLive ? "Scraping" : "");
  }, [isLive, loading, onSearchStatusChange]);

  const startPolling = useCallback(async (runId, liveQuery, scrapeQuery, baseline = {}) => {
    let attempts = 0;
    setIsUpdating(true);
    const poll = async () => {
      if (runRef.current !== runId) return;
      attempts++;
      const qs = String(liveQuery ?? "").trim();
      const eq = qs.length >= MIN_QUERY_LENGTH ? qs : "";
      const params = {
        page: 1, limit: 15, sort, skipAutoScrape: true,
        minPrice: applied?.minPrice || undefined,
        maxPrice: applied?.maxPrice || undefined,
      };
      if (eq) params.q = eq;
      const next = await search(params, { background: true });
      if (runRef.current !== runId) return;
      const total        = Number(next?.total ?? 0);
      const nextProducts = Array.isArray(next?.products) ? next.products : [];
      const count        = nextProducts.length;
      const sourceState  = getSourceSignature(nextProducts);
      const baselineTotal       = Number(baseline.total ?? 0);
      const baselineSourceCount = Number(baseline.sourceCount ?? 0);
      const baselineSourceKey   = String(baseline.sourceKey ?? "");
      const hasMeaningfulGrowth =
        total > baselineTotal || count > baselineTotal ||
        sourceState.count > baselineSourceCount ||
        sourceState.key !== baselineSourceKey;

      if (hasMeaningfulGrowth && (sourceState.count >= 2 || total >= 8 || count >= 8)) {
        setIsLive(false);
        setLiveMsg(`Fresh results added for "${scrapeQuery || liveQuery}".`);
        const fp = { page: 1, limit: 15, sort, minPrice: applied?.minPrice || undefined, maxPrice: applied?.maxPrice || undefined };
        if (eq) fp.q = eq;
        await search(fp);
        setIsUpdating(false);
        timerRef.current = setTimeout(() => { if (runRef.current === runId) setLiveMsg(""); }, 3000);
        return;
      }
      if (attempts >= AUTO_REFRESH_MAX) {
        setIsLive(false); setIsUpdating(false);
        setLiveMsg(`No new results after ${AUTO_REFRESH_MAX} checks.`);
        return;
      }
      timerRef.current = setTimeout(poll, AUTO_REFRESH_INTERVAL);
    };
    timerRef.current = setTimeout(poll, AUTO_REFRESH_INTERVAL);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, AUTO_REFRESH_INTERVAL, AUTO_REFRESH_MAX, getSourceSignature, sort, applied]);

  const doSearch = useCallback(async () => {
    runRef.current++;
    const runId = runRef.current;
    clearTimer();
    const qs = String(applied?.query ?? "").trim();
    const eq = qs.length >= MIN_QUERY_LENGTH ? qs : "";
    const params = { page, limit: 15, sort, minPrice: applied?.minPrice || undefined, maxPrice: applied?.maxPrice || undefined };
    if (eq) params.q = eq;
    const data = await search(params);
    if (!data || runRef.current !== runId) return;
    if (!eq || !data.scrapeQueued) { setIsLive(false); setLiveMsg(""); return; }
    const baselineProducts = Array.isArray(data?.products) ? data.products : [];
    const baselineSources  = getSourceSignature(baselineProducts);
    setIsLive(true);
    setLiveMsg(`Fetching live results for "${data.scrapeQuery || eq}"…`);
    startPolling(runId, eq, data.scrapeQuery, {
      total: Number(data?.total ?? baselineProducts.length ?? 0),
      sourceCount: baselineSources.count,
      sourceKey:   baselineSources.key,
    });
  }, [applied, page, sort, clearTimer, search, startPolling, getSourceSignature]);

  useEffect(() => { void doSearch(); }, [doSearch]);

  const refreshSearch = useCallback(() => { clearTimer(); void doSearch(); }, [clearTimer, doSearch]);

  const handleSearch = useCallback((nq = query) => {
    const q = nq.trim();
    setQuery(q);
    setApplied({ query: q, minPrice, maxPrice });
    setPage(1);
  }, [maxPrice, minPrice, query]);

  const resetAll = useCallback(() => {
    setQuery(""); setMinPrice(""); setMaxPrice(""); setSort("score");
    setApplied({ query: "", minPrice: "", maxPrice: "" }); setPage(1);
    onResetSearch?.();
  }, [onResetSearch]);

  /* derived */
  const totalFiltered     = Number(pagination?.total ?? products.length ?? 0);
  const totalPages        = Math.max(1, Number(pagination?.pages ?? 1));
  const effectivePageCount = Math.min(totalPages, DISPLAY_PAGES_LIMIT);
  const visibleProducts   = useMemo(() => products, [products]);

  const activeChips = useMemo(() => {
    const chips = [];
    if (applied.query.length >= MIN_QUERY_LENGTH) chips.push(`"${applied.query}"`);
    if (applied.minPrice) chips.push(`Min ${formatCurrency(applied.minPrice)}`);
    if (applied.maxPrice) chips.push(`Max ${formatCurrency(applied.maxPrice)}`);
    return chips;
  }, [applied]);

  const activeFilterCount = [applied.minPrice, applied.maxPrice].filter(Boolean).length;
  const isBusy = loading || isUpdating || isLive;

  return (
    <div className="ps-root">
      <style>{GLOBAL_CSS}</style>

      <FilterFAB activeCount={activeFilterCount} onClick={() => setFilterOpen(true)} />
      <FilterDrawer
        open={filterOpen} onClose={() => setFilterOpen(false)}
        applied={applied} setApplied={setApplied} setPage={setPage}
      />

      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "clamp(24px,4vw,56px) clamp(16px,4vw,52px)" }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: 44 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <hr className="ps-rule" style={{ width: 36 }} />
            <span style={{
              fontFamily: "'DM Sans',sans-serif",
              fontSize: 10, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase",
              color: "rgba(200,169,110,0.55)",
            }}>
              Products
            </span>
            <hr className="ps-rule" style={{ flex: 1 }} />
          </div>

          <h1 style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: "clamp(38px,5.5vw,64px)",
            fontWeight: 300, lineHeight: 1.06,
            color: "rgba(240,235,220,0.95)",
            letterSpacing: "-0.01em", marginBottom: 16,
          }}>
            Shop by search,{" "}
            <em style={{ fontStyle: "italic", color: "rgba(200,169,110,0.82)" }}>
              not by clutter
            </em>
          </h1>

          <p style={{
            fontFamily: "'DM Sans',sans-serif",
            fontSize: 14, lineHeight: 1.75,
            color: "rgba(240,235,220,0.38)",
            maxWidth: 460,
          }}>
            Intelligent sorting, live results, and a clean grid — all in one place.
          </p>
        </div>

        {/* ── Toolbar ── */}
        <div className="ps-toolbar-card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", justifyContent: "space-between" }}>

            {/* Left: count + chips */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
              {/* Count pill */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: "8px 14px 8px 9px",
                borderRadius: 999,
                background: "rgba(200,169,110,0.07)",
                border: "1px solid rgba(200,169,110,0.2)",
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: "linear-gradient(135deg,rgba(200,169,110,0.18),rgba(200,169,110,0.07))",
                  border: "1px solid rgba(200,169,110,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect x="0.5" y="0.5" width="4" height="4" rx="0.8" fill="rgba(200,169,110,0.85)" />
                    <rect x="7.5" y="0.5" width="4" height="4" rx="0.8" fill="rgba(200,169,110,0.5)" />
                    <rect x="0.5" y="7.5" width="4" height="4" rx="0.8" fill="rgba(200,169,110,0.5)" />
                    <rect x="7.5" y="7.5" width="4" height="4" rx="0.8" fill="rgba(200,169,110,0.25)" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1, color: "rgba(240,235,220,0.95)" }}>
                    {totalFiltered}
                  </p>
                  <p style={{ fontSize: 10, lineHeight: 1, marginTop: 2, color: "rgba(200,169,110,0.5)", letterSpacing: "0.04em" }}>
                    products
                  </p>
                </div>
              </div>

              {activeChips.map(c => (
                <span key={c} className="ps-chip">{c}</span>
              ))}
            </div>

            {/* Right: controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button className="ps-btn-ghost" onClick={refreshSearch} disabled={loading}
                style={{ padding: "8px 16px", fontSize: 12 }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M11.5 6.5a5 5 0 1 1-1.34-3.38" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
                  <path d="M9 2.5l1.5 1-1 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
                Refresh
              </button>

              {/* Live pill */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "7px 13px", borderRadius: 999,
                border: `1px solid ${isLive ? "rgba(200,169,110,0.4)" : "rgba(200,169,110,0.12)"}`,
                background: isLive ? "rgba(200,169,110,0.09)" : "transparent",
                transition: "all 0.3s",
              }}>
                {isLive
                  ? <LiveDots />
                  : <span style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(200,169,110,0.3)", display: "inline-block" }} />
                }
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
                  color: isLive ? "rgba(200,169,110,0.9)" : "rgba(240,235,220,0.28)",
                }}>
                  {isLive ? "Updating" : "Live"}
                </span>
              </div>

              {/* Sort */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 14px", borderRadius: 10,
                background: "rgba(200,169,110,0.04)",
                border: "1px solid rgba(200,169,110,0.14)",
              }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(200,169,110,0.45)", flexShrink: 0 }}>
                  Sort
                </span>
                <div style={{ position: "relative" }}>
                  <select className="ps-sort" value={sort} onChange={e => setSort(e.target.value)}>
                    {SORTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <svg width="9" height="5" viewBox="0 0 9 5" fill="none"
                    style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                    <path d="M1 1l3.5 3L8 1" stroke="rgba(200,169,110,0.45)" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live message bar */}
        {liveMsg && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 16px", borderRadius: 12, marginBottom: 16,
            background: "rgba(200,169,110,0.05)",
            border: "1px solid rgba(200,169,110,0.18)",
            animation: "ps-fadein 0.3s ease both",
          }}>
            {isLive ? <LiveDots /> : <span style={{ color: "rgba(200,169,110,0.6)", fontSize: 12 }}>✦</span>}
            <span style={{ fontSize: 12, color: "rgba(200,169,110,0.75)", letterSpacing: "0.02em" }}>
              {liveMsg}
            </span>
          </div>
        )}

        {/* ── Product area ── */}
        {isBusy ? (
          <div style={{ position: "relative" }}>
            <SkeletonGrid />
            <div className="ps-overlay">
              <Spinner size={38} />
              <div style={{ textAlign: "center" }}>
                <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 400, color: "rgba(240,235,220,0.75)", lineHeight: 1 }}>
                  {isLive ? "Fetching live results" : "Loading products"}
                </p>
                <p style={{ fontSize: 11, color: "rgba(200,169,110,0.5)", marginTop: 6, letterSpacing: "0.04em" }}>
                  {isLive ? "Scraping fresh data for you…" : "Just a moment…"}
                </p>
              </div>
            </div>
          </div>

        ) : error ? (
          <div style={{
            textAlign: "center", padding: "80px 24px", borderRadius: 20,
            background: "rgba(244,63,94,0.03)", border: "1px solid rgba(244,63,94,0.12)",
            animation: "ps-fadein 0.35s ease both",
          }}>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: "rgba(240,235,220,0.8)", marginBottom: 10 }}>
              Something went wrong
            </p>
            <p style={{ fontSize: 13, color: "rgba(240,235,220,0.35)", marginBottom: 28 }}>{error}</p>
            <button className="ps-btn-ghost" onClick={() => handleSearch()}>Try again</button>
          </div>

        ) : visibleProducts.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "90px 24px", borderRadius: 20,
            background: "linear-gradient(160deg,rgba(200,169,110,0.03) 0%,transparent 100%)",
            border: "1px solid rgba(200,169,110,0.1)",
            animation: "ps-fadein 0.35s ease both",
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, margin: "0 auto 20px",
              background: "rgba(200,169,110,0.07)", border: "1px solid rgba(200,169,110,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="9" cy="9" r="6.5" stroke="rgba(200,169,110,0.65)" strokeWidth="1.4" />
                <path d="M14 14l4 4" stroke="rgba(200,169,110,0.65)" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, fontWeight: 400, color: "rgba(240,235,220,0.82)", marginBottom: 10 }}>
              No products found yet
            </p>
            <p style={{ fontSize: 13, color: "rgba(240,235,220,0.35)", maxWidth: 300, margin: "0 auto 32px", lineHeight: 1.75 }}>
              Try a different search term or widen the price range.
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <button className="ps-btn-gold" onClick={() => handleSearch()}>
                Search {query || "products"}
              </button>
              <button className="ps-btn-ghost" onClick={resetAll}>Clear filters</button>
            </div>
          </div>

        ) : (
          <>
            <div className="ps-grid" style={{ animation: "ps-fadein 0.4s ease both" }}>
              {visibleProducts.map(product => {
                const favId = product?._id ?? product?.productId ?? product?.product_id ?? product?.id ?? null;
                const key   = product?._id ?? product?.productId ?? product?.product_id ??
                  `${product?.source ?? "u"}-${product?.sourceId ?? product?.name ?? "p"}`;
                return (
                  <ProductCard
                    key={key} product={product}
                    isFav={favId ? isFavorite(favId) : false}
                    onFav={toggle} onClick={onProductClick}
                  />
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, paddingTop: 24 }}>
                <button className="ps-btn-ghost" disabled={page <= 1}
                  onClick={() => setPage(c => Math.max(1, c - 1))}
                  style={{ padding: "10px 20px", gap: 8 }}>
                  <svg width="13" height="9" viewBox="0 0 13 9" fill="none">
                    <path d="M12 4.5H1M4.5 1L1 4.5l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Prev
                </button>

                <span style={{
                  padding: "8px 18px", borderRadius: 999,
                  background: "rgba(200,169,110,0.06)", border: "1px solid rgba(200,169,110,0.18)",
                  fontSize: 13, color: "rgba(240,235,220,0.6)",
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {page}
                  <span style={{ color: "rgba(200,169,110,0.35)", margin: "0 6px" }}>/</span>
                  {effectivePageCount}{totalPages > DISPLAY_PAGES_LIMIT ? "+" : ""}
                </span>

                <button
                  className={page >= effectivePageCount ? "ps-btn-ghost" : "ps-btn-gold"}
                  disabled={page >= effectivePageCount}
                  onClick={() => setPage(c => Math.min(effectivePageCount, c + 1))}
                  style={{ padding: "10px 20px", gap: 8 }}>
                  Next
                  <svg width="13" height="9" viewBox="0 0 13 9" fill="none">
                    <path d="M1 4.5h11M8.5 1L12 4.5 8.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
