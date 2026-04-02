import { useState } from "react";
import { Heart, Star } from "lucide-react";

const CARD_CSS = `
  @keyframes pc-lift {
    from { transform: translateY(0) scale(1); }
    to   { transform: translateY(-6px) scale(1.01); }
  }

  .pc-card {
    --pc-surface: #fffcf6;
    --pc-border: rgba(140, 112, 69, 0.18);
    --pc-text: #17120d;
    --pc-text2: rgba(46, 36, 22, 0.76);
    --pc-text3: rgba(88, 72, 46, 0.55);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 26px;
    background: var(--pc-surface);
    border: 1px solid var(--pc-border);
    box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
    cursor: pointer;
    width: 100%;
    min-width: 0;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
    will-change: transform;
  }

  .pc-card:hover {
    transform: translateY(-6px) scale(1.01);
    box-shadow: 0 28px 52px rgba(15, 23, 42, 0.14);
  }

  .pc-img-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    aspect-ratio: 4 / 5;
    min-height: 250px;
    max-height: 360px;
    background: radial-gradient(circle at top, rgba(255,255,255,0.98) 0%, rgba(247,244,238,0.95) 52%, rgba(239,233,224,0.92) 100%);
  }

  .pc-img {
    max-height: 100%;
    max-width: 100%;
    object-fit: contain;
    padding: 24px;
    width: auto;
    height: auto;
    transition: transform 0.3s ease;
  }

  .pc-card:hover .pc-img { transform: scale(1.05); }

  .pc-fav-btn {
    position: absolute;
    right: 16px;
    top: 16px;
    z-index: 10;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    border: 1.5px solid #111111;
    backdrop-filter: blur(8px);
  }

  .pc-fav-btn:hover { transform: scale(1.1); }
  .pc-fav-btn:disabled { opacity: 0.55; cursor: not-allowed; }

  .pc-img-badges {
    pointer-events: none;
    position: absolute;
    inset: auto 16px 16px 16px;
    z-index: 10;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 8px;
  }

  .pc-rating-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 10px;
    font-weight: 500;
    background: rgba(255,255,255,0.92);
    border: 1px solid rgba(15,23,42,0.08);
    color: var(--pc-text);
    backdrop-filter: blur(10px);
  }

  .pc-decision-badge {
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
  }

  .pc-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px 20px 20px;
    background: linear-gradient(180deg, rgba(255,252,246,0.98) 0%, rgba(244,238,229,0.98) 100%);
    flex: 1;
  }

  .pc-source {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: rgba(58, 44, 24, 0.72);
    margin-bottom: 4px;
  }

  .pc-name {
    font-size: 15px;
    font-weight: 600;
    line-height: 1.5;
    color: var(--pc-text);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
  }

  .pc-desc {
    font-size: 12px;
    line-height: 1.6;
    color: var(--pc-text2);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 2.75rem;
  }

  .pc-price-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-top: 4px;
  }

  .pc-price {
    font-size: 22px;
    font-weight: 600;
    line-height: 1;
    color: var(--pc-text);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .pc-orig-price {
    font-size: 14px;
    font-weight: 500;
    color: var(--pc-text3);
    text-decoration: line-through;
    text-decoration-thickness: 1.5px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .pc-discount {
    font-size: 14px;
    font-weight: 600;
    color: #43a047;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .pc-score-wrap {
    flex-shrink: 0;
    text-align: right;
  }

  .pc-score-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: rgba(88, 72, 46, 0.78);
  }

  .pc-score-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 48px;
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 16px;
    font-weight: 600;
    margin-top: 4px;
    color: #5b21b6;
    background: rgba(109, 40, 217, 0.1);
    border: 1px solid rgba(109, 40, 217, 0.18);
  }

  .pc-signal-box {
    border-radius: 20px;
    padding: 12px 14px;
    background: rgba(255,255,255,0.54);
    border: 1px solid rgba(140,112,69,0.16);
  }

  .pc-signal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    font-size: 11px;
    color: rgba(58, 44, 24, 0.76);
  }

  .pc-signal-label {
    letter-spacing: 0.04em;
  }

  .pc-signal-tag {
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 600;
  }

  .pc-signal-bar-track {
    margin-top: 8px;
    height: 8px;
    border-radius: 999px;
    background: rgba(15,23,42,0.08);
    overflow: hidden;
  }

  .pc-signal-bar-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #6a0efd 0%, #8b5cf6 100%);
    transition: width 0.4s ease;
  }

  .pc-fallback {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    font-weight: 500;
    color: var(--pc-text3);
  }
`;

let cssInjected = false;
function injectCardCSS() {
  if (cssInjected || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.textContent = CARD_CSS;
  document.head.appendChild(el);
  cssInjected = true;
}

const SOURCE_LABELS = {
  amazon: "Amazon",
  flipkart: "Flipkart",
  myntra: "Myntra",
  apollo_pharmacy: "Apollo Pharmacy",
};

function resolveSourceLabel(product = {}) {
  const rawSource = String(product.source ?? product.store ?? "").trim().toLowerCase();
  const normalized = rawSource;

  if (SOURCE_LABELS[normalized]) return SOURCE_LABELS[normalized];

  if (normalized) {
    return normalized
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  if (product.url) {
    if (product.url.includes("amazon.")) return SOURCE_LABELS.amazon;
    if (product.url.includes("flipkart.")) return SOURCE_LABELS.flipkart;
    if (product.url.includes("myntra.")) return SOURCE_LABELS.myntra;
    if (product.url.includes("apollopharmacy.")) return SOURCE_LABELS.apollo_pharmacy;
  }

  return "Marketplace";
}

const DECISION_STYLES = {
  BUY: { label: "Buy now", color: "#15803d", background: "#e8f7ed" },
  WAIT: { label: "Wait", color: "#a16207", background: "#fff4d6" },
  AVOID: { label: "Avoid", color: "#b91c1c", background: "#fde8e8" },
};

export default function ProductCard({ product, onFav, isFav, onClick }) {
  injectCardCSS();

  const [imgError, setImgError] = useState(false);
  const p = product ?? {};

  const productId = p._id ?? p.productId ?? p.product_id ?? p.id ?? null;
  const currentPrice = p.currentPrice ?? p.current_price;
  const origPrice = p.originalPrice ?? p.original_price;
  const hasPrice = currentPrice != null && !Number.isNaN(Number(currentPrice));
  const discount =
    p.discountPct ??
    p.discount_pct ??
    (hasPrice && origPrice && origPrice > currentPrice
      ? Math.round(((origPrice - currentPrice) / origPrice) * 100)
      : 0);

  const decision = (p.buyDecision ?? p.buy_decision ?? "BUY").toUpperCase();
  const decStyle = DECISION_STYLES[decision] ?? DECISION_STYLES.BUY;
  const sourceLabel = resolveSourceLabel(p);
  const rating = Number(p.rating ?? 0);
  const reviewCount = Number(p.reviewCount ?? p.review_count ?? 0);
  const finalScore = Math.round(
    p?.scores?.finalScore ?? p?.scores?.final_score ?? p.ai_score ?? p.aiScore ?? 0
  );
  const description =
    p.description ?? p.shortDescription ?? p.short_description ?? p.summary ?? "";
  const reviewLabel =
    reviewCount >= 1000 ? `${(reviewCount / 1000).toFixed(1)}k` : reviewCount > 0 ? String(reviewCount) : null;

  return (
    <article className="pc-card" onClick={() => onClick?.(p)}>
      <div className="pc-img-wrap">
        <button
          type="button"
          className="pc-fav-btn"
          aria-label={isFav ? "Remove favourite" : "Add favourite"}
          disabled={!productId}
          style={{
            background: isFav ? "rgba(255,240,244,0.98)" : "rgba(255,255,255,0.96)",
            boxShadow: isFav
              ? "0 10px 24px rgba(225,29,72,0.18)"
              : "0 8px 22px rgba(15,23,42,0.12)",
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (productId) onFav?.(productId);
          }}
        >
          <Heart
            size={18}
            style={{
              color: isFav ? "#e11d48" : "#111111",
              fill: isFav ? "#e11d48" : "none",
              stroke: isFav ? "#e11d48" : "#111111",
              strokeWidth: 2.1,
            }}
          />
        </button>

        {p.image && !imgError ? (
          <img
            src={p.image}
            alt={p.name ?? "Product"}
            loading="lazy"
            className="pc-img"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="pc-fallback">{(p.name ?? "?").charAt(0).toUpperCase()}</div>
        )}

        <div className="pc-img-badges">
          {rating > 0 ? (
            <div className="pc-rating-badge">
              <Star size={10} style={{ flexShrink: 0, fill: "#fbbf24", color: "#fbbf24" }} />
              <span>{rating.toFixed(1)}</span>
              {reviewLabel && <span style={{ color: "var(--pc-text3)" }}>({reviewLabel})</span>}
            </div>
          ) : (
            <span />
          )}

          <div
            className="pc-decision-badge"
            style={{ background: decStyle.background, color: decStyle.color, border: `1px solid ${decStyle.color}33` }}
          >
            {decStyle.label}
          </div>
        </div>
      </div>

      <div className="pc-body">
        <div>
          <p className="pc-source">{sourceLabel}</p>
          <h3 className="pc-name">{p.name ?? "Untitled product"}</h3>
        </div>

        <p className="pc-desc">
          {description || "Smart product pick with pricing, ratings, and AI recommendation in one glance."}
        </p>

        <div className="pc-price-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flexWrap: "wrap", flex: 1 }}>
            <span className="pc-price">{hasPrice ? `Rs ${Number(currentPrice).toLocaleString("en-IN")}` : "N/A"}</span>
            {hasPrice && origPrice && origPrice > currentPrice && (
              <span className="pc-orig-price">Rs {Number(origPrice).toLocaleString("en-IN")}</span>
            )}
            {discount > 0 && <span className="pc-discount">{discount}% off</span>}
          </div>

          <div className="pc-score-wrap">
            <div className="pc-score-label">AI Score</div>
            <div className="pc-score-pill">{finalScore}</div>
          </div>
        </div>

        <div className="pc-signal-box">
          <div className="pc-signal-header">
            <span className="pc-signal-label">Shopping signal :</span>
            <span
              className="pc-signal-tag"
              style={{ background: decStyle.background, color: decStyle.color, border: `1px solid ${decStyle.color}22` }}
            >
              {decStyle.label}
            </span>
          </div>
          <div className="pc-signal-bar-track">
            <div className="pc-signal-bar-fill" style={{ width: `${Math.max(12, Math.min(100, finalScore || 0))}%` }} />
          </div>
        </div>
      </div>
    </article>
  );
}
