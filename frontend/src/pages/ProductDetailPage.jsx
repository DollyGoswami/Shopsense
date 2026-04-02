import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ExternalLink,
  Info,
  Share2,
  ShieldCheck,
  Star,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useProductDetail } from "../hooks/useProducts";

/* ─── constants ─────────────────────────────────────────────────────────── */
const SOURCE_LABELS = {
  amazon: "Amazon",
  flipkart: "Flipkart",
  myntra: "Myntra",
  apollo_pharmacy: "Apollo Pharmacy",
  zepto: "Zepto",
};

const SOURCE_META = {
  amazon:          { bg: "#FF9900", letter: "A" },
  flipkart:        { bg: "#2874F0", letter: "F" },
  myntra:          { bg: "#FF3E6B", letter: "M" },
  apollo_pharmacy: { bg: "#00A651", letter: "A" },
  zepto:           { bg: "#8B5CF6", letter: "Z" },
};

const DECISION_MAP = {
  BUY:     { label: "Buy Now",  color: "#22D3A0", glow: "rgba(34,211,160,.25)" },
  BUY_NOW: { label: "Buy Now",  color: "#22D3A0", glow: "rgba(34,211,160,.25)" },
  WAIT:    { label: "Wait",     color: "#F59E0B", glow: "rgba(245,158,11,.25)" },
  AVOID:   { label: "Avoid",    color: "#F87171", glow: "rgba(248,113,113,.25)" },
};

/* ─── helpers ────────────────────────────────────────────────────────────── */
function money(v) {
  return v != null && !isNaN(+v)
    ? `₹${(+v).toLocaleString("en-IN")}`
    : "—";
}

function sourceLabel(s) {
  const k = String(s || "").trim().toLowerCase();
  return SOURCE_LABELS[k] || String(s || "Store");
}
function sourceMeta(s) {
  return SOURCE_META[String(s || "").trim().toLowerCase()] || { bg: "#444", letter: (s || "?")[0].toUpperCase() };
}

function decision(product, bestTime) {
  const raw = String(product?.buyDecision || product?.buy_decision || bestTime?.decision || "WAIT").toUpperCase();
  return DECISION_MAP[raw] || DECISION_MAP.WAIT;
}

function cleanProductName(product = {}) {
  const raw =
    product?.name ??
    product?.title ??
    product?.productName ??
    product?.product_name ??
    "";

  const cleaned = String(raw)
    .replace(/sponsored/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || "Product";
}

function buildStoreSearchUrl(storeProduct = {}, referenceProduct = storeProduct) {
  const source = String(storeProduct?.source || "").trim().toLowerCase();
  const name = cleanProductName(referenceProduct);
  const brand = String(referenceProduct?.brand || "").trim();
  const query = encodeURIComponent([brand, name].filter(Boolean).join(" ").trim() || name);

  if (!query) return null;

  switch (source) {
    case "amazon":
      return `https://www.amazon.in/s?k=${query}`;
    case "flipkart":
      return `https://www.flipkart.com/search?q=${query}`;
    case "myntra":
      return `https://www.myntra.com/${query}`;
    case "apollo_pharmacy":
      return `https://www.apollopharmacy.in/search-medicines/${query}`;
    default:
      return null;
  }
}

function looksLikeMatchingUrl(product = {}, urlValue = "") {
  const url = String(urlValue || "").toLowerCase();
  if (!/^https?:\/\//i.test(url)) return false;

  const source = String(product?.source || "").trim().toLowerCase();
  if (source === "amazon") {
    const sourceId = String(product?.sourceId ?? product?.source_id ?? "").trim();
    const asin = sourceId.match(/[A-Z0-9]{10}/i)?.[0]?.toLowerCase();
    return asin ? url.includes(asin) : false;
  }

  const tokens = tokenizeName(cleanProductName(product)).slice(0, 4);
  if (!tokens.length) return false;

  const matched = tokens.filter((token) => url.includes(token));
  return matched.length >= Math.min(2, tokens.length);
}

function resolveProductUrl(product = {}, referenceProduct = product) {
  const candidates = [
    product?.affiliateUrl,
    product?.affiliate_url,
    product?.url,
    product?.product_url,
    product?.link,
  ].filter(Boolean);

  if (product?._id && referenceProduct?._id && product._id === referenceProduct._id) {
    const directCandidate = candidates.find((candidate) => /^https?:\/\//i.test(String(candidate || "").trim()));
    if (directCandidate) return String(directCandidate).trim();
  }

  const matchedCandidate = candidates.find((candidate) => looksLikeMatchingUrl(referenceProduct, candidate));
  if (matchedCandidate && product?._id && referenceProduct?._id && product._id === referenceProduct._id) {
    return String(matchedCandidate).trim();
  }

  return buildStoreSearchUrl(product, referenceProduct);
}

function tokenizeName(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function isComparableListing(baseProduct = {}, candidate = {}) {
  if (!candidate) return false;

  const baseBrand = String(baseProduct?.brand || "").trim().toLowerCase();
  const candidateBrand = String(candidate?.brand || "").trim().toLowerCase();
  if (baseBrand && candidateBrand && baseBrand !== candidateBrand) return false;

  const baseCategory = String(baseProduct?.category || "").trim().toLowerCase();
  const candidateCategory = String(candidate?.category || "").trim().toLowerCase();
  if (baseCategory && candidateCategory && baseCategory !== candidateCategory) return false;

  const baseTokens = tokenizeName(cleanProductName(baseProduct));
  const candidateTokens = tokenizeName(cleanProductName(candidate));
  if (!baseTokens.length || !candidateTokens.length) return true;

  const candidateSet = new Set(candidateTokens);
  const shared = baseTokens.filter((token) => candidateSet.has(token));
  const minShared = Math.min(2, Math.max(1, Math.floor(baseTokens.length / 3)));
  return shared.length >= minShared;
}

function proscons(product, bestTime) {
  if (product?.insights?.pros?.length || product?.insights?.cons?.length)
    return { pros: product.insights.pros || [], cons: product.insights.cons || [] };

  const pros = [], cons = [];
  const rating = +(product?.rating ?? 0);
  const reviews = +(product?.reviewCount ?? product?.review_count ?? 0);
  const features = Array.isArray(product?.features) ? product.features.filter(Boolean) : [];
  const description = String(product?.description ?? "").trim();
  const score = +(product?.scores?.finalScore ?? product?.finalScore ?? 0);
  const lowerDescription = description.toLowerCase();

  if (rating >= 4)    pros.push(`Excellent rating — ${rating.toFixed(1)} out of 5.`);
  if (features.length) {
    pros.push(`One clear strength is ${features[0]}.`);
    if (features.length >= 3) pros.push(`The product shows a more complete feature set with ${features.length} listed highlights.`);
  } else if (description) {
    const summary = description.split(/[.!?]/)[0].trim();
    if (summary) pros.push(`The listing highlights this quality: ${summary}.`);
  }
  if (rating >= 4.2) pros.push(`Build confidence is strong because users rate it ${rating.toFixed(1)}/5.`);
  else if (rating >= 3.8) pros.push(`Overall quality looks decent with a ${rating.toFixed(1)}/5 rating.`);
  if (reviews >= 250) pros.push(`Quality feedback is more trustworthy because it has ${reviews.toLocaleString("en-IN")} reviews.`);
  if (/premium|durable|comfortable|lightweight|powerful|fast|stable|reliable/.test(lowerDescription)) {
    pros.push("The description suggests strong product quality or usability.");
  }

  if (rating > 0 && rating < 3.8) cons.push(`A weakness is the lower user rating of ${rating.toFixed(1)}/5.`);
  if (reviews > 0 && reviews < 25) cons.push("Quality confidence is limited because very few buyers have reviewed it.");
  if (!features.length && !description) cons.push("The listing does not clearly explain the product's quality or standout features.");
  if (score > 0 && score < 60) cons.push(`Overall product confidence is weaker with an AI score of ${Math.round(score)}/100.`);
  if (!features.length && description) cons.push("The description is present, but concrete feature details are missing.");
  if (features.length > 0 && features.length <= 1) cons.push("Only one clear feature is described, so the product strengths are not fully proven.");
  if (/basic|simple|entry level|compact/.test(lowerDescription)) cons.push("The description suggests a simpler product with fewer premium qualities.");

  const uniquePros = [];
  let hasRatingStrength = false;
  for (const item of [...new Set(pros.filter(Boolean))]) {
    const normalized = String(item).toLowerCase();
    if (normalized.includes("rating")) {
      if (hasRatingStrength) continue;
      hasRatingStrength = true;
    }
    uniquePros.push(item);
    if (uniquePros.length >= 6) break;
  }
  const uniqueCons = [...new Set(cons.filter(Boolean))].slice(0, 4);

  if (!uniquePros.length) uniquePros.push("No strong product-quality advantage is clearly described in the current listing.");
  if (!uniqueCons.length) uniqueCons.push("No major product-quality weakness is clearly described in the current listing.");

  return { pros: uniquePros, cons: uniqueCons };
}

function specs(product = {}) {
  return [
    ["Brand",          product.brand],
    ["Rating",         product.rating ? `${(+product.rating).toFixed(1)} / 5` : null],
    ["Current price",  money(product.currentPrice ?? product.current_price)],
    ["Original price", (product.originalPrice ?? product.original_price) ? money(product.originalPrice ?? product.original_price) : null],
    ["Discount",       (product.discountPct ?? product.discount_pct) ? `${product.discountPct ?? product.discount_pct}%` : null],
    ["Source",         sourceLabel(product.source)],
  ].filter(([, v]) => v != null && v !== "");
}

function scores(product = {}) {
  const final    = +(product?.scores?.finalScore ?? product?.finalScore ?? 0);
  const rating   = +(product?.rating ?? 0);
  const reviews  = +(product?.reviewCount ?? product?.review_count ?? 0);
  const discount = +(product?.discountPct ?? product?.discount_pct ?? 0);
  return [
    { label: "Score",     value: Math.max(55, Math.min(100, Math.round(final || 78))),             color: "#22D3A0" },
    { label: "Trust",     value: Math.max(45, Math.min(100, Math.round((rating / 5) * 100 || 72))),color: "#818CF8" },
    { label: "Longevity", value: Math.max(40, Math.min(100, Math.round(reviews > 0 ? Math.min(reviews / 20, 100) : 62))), color: "#38BDF8" },
    { label: "Value",     value: Math.max(35, Math.min(100, Math.round(55 + discount))),           color: "#F59E0B" },
  ];
}

/* ─── micro-components ───────────────────────────────────────────────────── */
function Avatar({ source, size = 44 }) {
  const m = sourceMeta(source);
  return (
    <div style={{
      width: size, height: size,
      borderRadius: "50%",
      background: m.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size < 36 ? 11 : 15, color: "#fff",
      flexShrink: 0,
    }}>
      {m.letter}
    </div>
  );
}

function Pill({ children, color = "#22D3A0" }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 999,
      background: `${color}18`,
      border: `1px solid ${color}44`,
      color, fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
    }}>
      {children}
    </span>
  );
}

function ScoreRing({ value, color, label, size = 64 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (value / 100);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={6} />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: "stroke-dasharray .8s cubic-bezier(.4,0,.2,1)" }}
        />
        <text
          x={size/2} y={size/2}
          textAnchor="middle" dominantBaseline="middle"
          style={{ fill: "#fff", fontSize: 14, fontWeight: 700, transform: "rotate(90deg)", transformOrigin: `${size/2}px ${size/2}px` }}
        >
          {value}
        </text>
      </svg>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,.45)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

function InsightRow({ tone, text }) {
  const isGood = tone === "good";
  const color  = isGood ? "#22D3A0" : "#F87171";
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "13px 0",
      borderBottom: "1px solid rgba(255,255,255,.06)",
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: "50%",
        background: `${color}18`, border: `1px solid ${color}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, marginTop: 1,
      }}>
        {isGood
          ? <Check size={12} color={color} />
          : <X size={12} color={color} />}
      </div>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: "rgba(255,255,255,.72)" }}>{text}</p>
    </div>
  );
}

/* ─── main component ─────────────────────────────────────────────────────── */
const TABS = ["summary", "specs", "stores"];

export default function ProductDetailPage({ product: initialProduct, onBack }) {
  const [tab, setTab] = useState("summary");
  const [shareMessage, setShareMessage] = useState("");
  const { product: fetched, priceHistory, bestTime, comparison, loading } = useProductDetail(initialProduct?._id);
  const product = fetched ? { ...initialProduct, ...fetched } : initialProduct;

  const storeList = useMemo(() => {
    const combined = [];
    if (product) combined.push(product);
    (comparison || []).forEach((item) => {
      if (isComparableListing(product, item)) combined.push(item);
    });

    const map = new Map();
    for (const item of combined) {
      if (!item?.source) continue;
      const k  = String(item.source).toLowerCase();
      const cp = +(item?.currentPrice ?? item?.current_price ?? Infinity);
      const ep = +(map.get(k)?.currentPrice ?? map.get(k)?.current_price ?? Infinity);
      const currentUrl = resolveProductUrl(item);
      const existing = map.get(k);
      const existingUrl = resolveProductUrl(existing);
      const isExactSourceListing = Boolean(product?._id && item?._id && String(item._id) === String(product._id));
      const isExistingExactSourceListing = Boolean(product?._id && existing?._id && String(existing._id) === String(product._id));

      if (!map.has(k)) {
        map.set(k, item);
        continue;
      }

      // Prefer the actual clicked product's own listing for its source.
      if (isExactSourceListing) {
        map.set(k, item);
        continue;
      }

      // Never replace the exact clicked listing for its own source with another same-source candidate.
      if (isExistingExactSourceListing) {
        continue;
      }

      // Prefer entries that have a valid outbound link.
      if (currentUrl && !existingUrl) {
        map.set(k, item);
        continue;
      }

      if (cp < ep) map.set(k, item);
    }
    return [...map.values()].sort((a, b) =>
      +(a.currentPrice ?? a.current_price ?? Infinity) - +(b.currentPrice ?? b.current_price ?? Infinity));
  }, [comparison, product]);

  const trustedStoreList = useMemo(() => {
    if (!product) return [];

    return storeList.map((item) => ({
      ...item,
      isPrimaryExact: String(item?._id || "") === String(product?._id || ""),
      trustedPrice:
        String(item?._id || "") === String(product?._id || "")
          ? (item.currentPrice ?? item.current_price ?? null)
          : null,
    }));
  }, [product, storeList]);

  const dec      = decision(product, bestTime);
  const pc       = proscons(product, bestTime);
  const specRows = specs(product);
  const chartData = [];
  const scoreRows= scores(product);
  const aiScoreRaw = +(
    product?.scores?.finalScore ??
    product?.scores?.final_score ??
    product?.finalScore ??
    product?.final_score ??
    product?.aiScore ??
    product?.ai_score ??
    initialProduct?.scores?.finalScore ??
    initialProduct?.scores?.final_score ??
    initialProduct?.finalScore ??
    initialProduct?.final_score ??
    initialProduct?.aiScore ??
    initialProduct?.ai_score ??
    0
  );
  const aiScore  = Math.max(0, Math.min(100, Math.round(aiScoreRaw)));
  const discount = +(product?.discountPct ?? product?.discount_pct ?? 0);
  const rating   = +(product?.rating ?? 0);
  const displayName = cleanProductName(product);

  const handleShare = async () => {
    const outboundUrl = resolveProductUrl(product, product) || window.location.href;
    const shareData = {
      title: displayName,
      text: `Check out ${displayName} on ShopSense`,
      url: outboundUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareMessage("Shared");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(outboundUrl);
        setShareMessage("Link copied");
      } else {
        setShareMessage("Share not supported");
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        setShareMessage("Could not share");
      }
      return;
    }

    window.setTimeout(() => setShareMessage(""), 2200);
  };

  if (!product) return (
    <div style={{ padding: 24 }}>
      <BackBtn onClick={onBack} />
      <p style={{ color: "rgba(255,255,255,.4)", marginTop: 32 }}>Product not found.</p>
    </div>
  );

  /* shared surface style */
  const card = {
    borderRadius: 20,
    background: "rgba(255,255,255,.04)",
    border: "1px solid rgba(255,255,255,.09)",
    overflow: "hidden",
  };

  return (
    <div style={{
      maxWidth: 720, margin: "0 auto", padding: "16px 18px 56px",
      fontFamily: "'Sora', 'DM Sans', system-ui, sans-serif",
      background: "#0A0A0F",
      minHeight: "100vh",
    }}>
      {/* Google font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap');`}</style>

      {/* ── top bar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <button onClick={onBack} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.10)",
          borderRadius: 999, padding: "8px 16px 8px 12px",
          color: "rgba(255,255,255,.75)", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>
          <ArrowLeft size={14} />
          Back
        </button>
        {loading && (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)", letterSpacing: "0.05em" }}>REFRESHING…</span>
        )}
      </div>

      {/* ── hero image card ── */}
      <div style={{ ...card, marginBottom: 14, position: "relative" }}>
        {/* share btn */}
        <button
          onClick={handleShare}
          title={shareMessage || "Share product"}
          aria-label="Share product"
          style={{
          position: "absolute", top: 14, right: 14, zIndex: 10,
          width: 38, height: 38, borderRadius: "50%",
          background: "rgba(0,0,0,.55)", backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "rgba(255,255,255,.8)",
        }}>
          <Share2 size={15} />
        </button>

        {/* discount badge */}
        {discount > 0 && (
          <div style={{
            position: "absolute", top: 14, left: 14, zIndex: 10,
            background: "#22D3A0", color: "#041A13",
            borderRadius: 999, padding: "4px 12px",
            fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
          }}>
            {discount}% OFF
          </div>
        )}

        {/* image */}
        <div style={{
          background: "linear-gradient(160deg, #111118 0%, #0D0D14 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          height: 300,
        }}>
          {product.image
            ? <img src={product.image} alt={product.name} style={{ height: 260, width: "100%", objectFit: "contain", padding: "0 24px" }} />
            : <div style={{ color: "rgba(255,255,255,.2)", fontSize: 13 }}>No image available</div>
          }
        </div>

        {/* product name + meta */}
        <div style={{ padding: "20px 20px 22px" }}>
          <h1 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700, lineHeight: 1.4, color: "#fff" }}>
            {displayName}
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {rating > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Star size={13} color="#F59E0B" fill="#F59E0B" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#F59E0B" }}>{rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, letterSpacing: "0.08em", color: "rgba(255,255,255,.38)", textTransform: "uppercase" }}>
              Shopping signal
            </span>
            <Pill color={dec.color}>{dec.label}</Pill>
          </div>
        </div>
      </div>

      {/* ── price row ── */}
      <div style={{ ...card, marginBottom: 14, padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <TrendingUp size={13} color="rgba(255,255,255,.4)" />
          <span style={{ fontSize: 11, letterSpacing: "0.08em", color: "rgba(255,255,255,.35)", textTransform: "uppercase" }}>
            Price comparison
          </span>
        </div>

        <div>
          {trustedStoreList.slice(0, 3).map((s, i) => {
            const targetUrl = resolveProductUrl(s, product);
            return (
              <a
                key={s._id || s.source}
                href={targetUrl || "#"}
                target={targetUrl ? "_blank" : undefined}
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 0",
                  borderBottom: i < Math.min(trustedStoreList.length, 3) - 1 ? "1px solid rgba(255,255,255,.06)" : "none",
                  textDecoration: "none",
                  pointerEvents: targetUrl ? "auto" : "none",
                  opacity: targetUrl ? 1 : 0.65,
                }}
              >
                <Avatar source={s.source} size={38} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{sourceLabel(s.source)}</div>
                  {s.isPrimaryExact ? (
                    <div style={{ fontSize: 11, color: "#22D3A0", marginTop: 1 }}>Exact listing price</div>
                  ) : (
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginTop: 1 }}>Search this product on store</div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  {s.isPrimaryExact ? (
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#22D3A0" }}>
                      {money(s.trustedPrice)}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.55)" }}>
                      Check latest price
                    </div>
                  )}
                </div>
                <ExternalLink size={13} color="rgba(255,255,255,.25)" />
              </a>
            );
          })}
        </div>

        {trustedStoreList.length > 3 && (
          <button
            onClick={() => setTab("stores")}
            style={{
              marginTop: 12, width: "100%",
              background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.10)",
              borderRadius: 12, padding: "11px 0",
              color: "rgba(255,255,255,.7)", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            View all {storeList.length} stores →
          </button>
        )}
      </div>

      {/* ── tab bar ── */}
      <div style={{
        display: "flex", gap: 4,
        background: "rgba(255,255,255,.04)",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 14, padding: 4,
        marginBottom: 14,
      }}>
        {["summary", "specs", "stores"].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "9px 0",
              borderRadius: 10, border: "none",
              background: tab === t ? "rgba(255,255,255,.12)" : "transparent",
              color: tab === t ? "#fff" : "rgba(255,255,255,.38)",
              fontSize: 13, fontWeight: tab === t ? 600 : 500,
              cursor: "pointer",
              transition: "all .2s",
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ─────────── SUMMARY TAB ─────────── */}
      {tab === "summary" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* AI recommendation block */}
          <div style={{ ...card, padding: "28px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
              <Zap size={15} color="#818CF8" fill="#818CF8" />
              <span style={{ fontSize: 12, letterSpacing: "0.08em", color: "rgba(255,255,255,.4)", textTransform: "uppercase" }}>
                AI Recommendation
              </span>
            </div>

            {/* overall score */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 22 }}>
              <div style={{
                width: 96, height: 96, borderRadius: "50%",
                background: `conic-gradient(${dec.color} 0deg ${Math.max(12, Math.min(360, (aiScore / 100) * 360))}deg, rgba(255,255,255,.08) ${Math.max(12, Math.min(360, (aiScore / 100) * 360))}deg 360deg)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <div style={{
                  width: 70, height: 70, borderRadius: "50%",
                  background: "#0A0A0F",
                  border: "1px solid rgba(255,255,255,.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 0 20px ${dec.glow}`,
                }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: dec.color }}>{String(aiScore).padStart(2, "0")}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", lineHeight: 1.1 }}>Overall AI Score</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.48)", marginTop: 7 }}>Scored out of 100</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: "rgba(129,140,248,0.12)",
                    border: "1px solid rgba(129,140,248,0.22)",
                    color: "#a5b4fc",
                    fontSize: 12.5,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}>
                    AI Score: {String(aiScore).padStart(2, "0")}
                  </span>
                  <span style={{ fontSize: 14, color: dec.color, fontWeight: 600 }}>{dec.label}</span>
                </div>
              </div>
            </div>

            {/* score bar */}
            <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,.08)", marginBottom: 20 }}>
              <div style={{
                height: "100%", borderRadius: 999,
                width: `${Math.max(8, Math.min(100, aiScore))}%`,
                background: `linear-gradient(90deg, ${dec.color}aa, ${dec.color})`,
              }} />
            </div>

            {/* reason text */}
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, color: "rgba(255,255,255,.55)" }}>
              {bestTime?.reason || product.description || "This product stands out for its pricing, market fit, and shopper feedback. Compare stores below and choose the best listing for your budget."}
            </p>

            {/* score rings */}
            <div style={{
              display: "flex", justifyContent: "space-around",
              marginTop: 22, padding: "18px 0 6px",
              borderTop: "1px solid rgba(255,255,255,.07)",
            }}>
              {scoreRows.map(s => <ScoreRing key={s.label} value={s.value} color={s.color} label={s.label} />)}
            </div>
          </div>

          {/* sources analyzed */}
          <div style={{
            ...card, padding: "14px 18px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 8 }}>
                {storeList.length || 1} sources analysed
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {storeList.slice(0, 5).map(s => <Avatar key={s._id || s.source} source={s.source} size={26} />)}
                {storeList.length > 5 && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)", alignSelf: "center" }}>+{storeList.length - 5}</span>
                )}
              </div>
            </div>
            <ShieldCheck size={28} color="rgba(255,255,255,.12)" />
          </div>

          {/* pros */}
          <div style={{ ...card, padding: "18px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#22D3A0", letterSpacing: "0.04em", marginBottom: 4 }}>
              Key Strengths ({pc.pros.length})
            </div>
            {pc.pros.length
              ? pc.pros.map(t => <InsightRow key={t} tone="good" text={t} />)
              : <p style={{ margin: "12px 0 0", fontSize: 13, color: "rgba(255,255,255,.3)" }}>No strengths detected yet.</p>}
          </div>

          {/* cons */}
          <div style={{ ...card, padding: "18px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#F87171", letterSpacing: "0.04em", marginBottom: 4 }}>
              Key Limitations ({pc.cons.length})
            </div>
            {pc.cons.length
              ? pc.cons.map(t => <InsightRow key={t} tone="warn" text={t} />)
              : <p style={{ margin: "12px 0 0", fontSize: 13, color: "rgba(255,255,255,.3)" }}>No major concerns detected.</p>}
          </div>
        </div>
      )}

      {/* ─────────── SPECS TAB ─────────── */}
      {tab === "specs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
          }}>
            {specRows.map(([label, value]) => (
              <div key={label} style={{
                ...card, padding: "14px 16px",
                ...(label === "Current price" ? { gridColumn: "1 / -1" } : {}),
              }}>
                <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", marginBottom: 5 }}>
                  {label}
                </div>
                <div style={{ fontSize: label === "Current price" ? 24 : 15, fontWeight: 700, color: label === "Current price" ? "#22D3A0" : "#fff" }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          
            {false ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="phGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#818CF8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#818CF8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
                  <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,.3)", fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={v => [`₹${(+v).toLocaleString("en-IN")}`, "Price"]}
                    contentStyle={{ background: "#16161F", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, fontSize: 12, color: "#fff" }}
                    cursor={{ stroke: "rgba(255,255,255,.15)", strokeWidth: 1 }}
                  />
                  <Area type="monotone" dataKey="price" stroke="#818CF8" fill="url(#phGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              null
            )}
        </div>
      )}

      {/* ─────────── STORES TAB ─────────── */}
      {tab === "stores" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {trustedStoreList.length ? trustedStoreList.map((s, i) => {
            const d = decision(s, bestTime);
            const targetUrl = resolveProductUrl(s, product);
            return (
              <a
                key={s._id || s.source}
                href={targetUrl || "#"}
                target={targetUrl ? "_blank" : undefined}
                rel="noopener noreferrer"
                style={{
                  ...card,
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "16px 18px",
                  textDecoration: "none",
                  pointerEvents: targetUrl ? "auto" : "none",
                  opacity: targetUrl ? 1 : 0.65,
                  ...(i === 0 ? { border: `1px solid ${d.color}44` } : {}),
                }}
              >
                <Avatar source={s.source} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{sourceLabel(s.source)}</div>
                  {s.isPrimaryExact ? (
                    <div style={{ fontSize: 11, color: d.color, marginTop: 1 }}>Exact listing price</div>
                  ) : (
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginTop: 1 }}>Search on store</div>
                  )}
                  <div style={{
                    fontSize: 12, color: "rgba(255,255,255,.35)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    marginTop: 2,
                  }}>{s.name}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {s.isPrimaryExact ? (
                    <div style={{ fontSize: 20, fontWeight: 800, color: d.color }}>
                      {money(s.trustedPrice)}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.55)" }}>
                      Check latest price
                    </div>
                  )}
                  <Pill color={d.color}>{d.label}</Pill>
                </div>
                <ExternalLink size={13} color="rgba(255,255,255,.2)" />
              </a>
            );
          }) : (
            <p style={{ color: "rgba(255,255,255,.3)", fontSize: 13 }}>No store data available yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
