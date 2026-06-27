import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { productService } from "../services/productService";
import { useRecommendations } from "../hooks/useProducts";

const TEXT = {
  "dashboard.greeting": "Good morning",
  "dashboard.greetingAfter": "Good afternoon",
  "dashboard.greetingEvening": "Good evening",
  "dashboard.greetingNight": "Good night",
  "dashboard.avgScore": "Avg AI Score",
  "dashboard.greetingSub": "Your AI shopping intelligence is ready",
  "dashboard.trendGraph": "Live Trend Signals",
  "dashboard.alertsTitle": "Live Notifications",
  "dashboard.topRec": "Today's Top Recommendations",
};

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay },
});

export default function DashboardPage({ onProductClick }) {
  const t = (key, fallback = key) => TEXT[key] ?? fallback;
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { recommendations, recentSearchProducts, loading, load } = useRecommendations();

  useEffect(() => {
    load({ limit: 9, trend_limit: 6 });
  }, [load]);

  const firstName = user?.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t("dashboard.greeting", "Good morning")
      : hour < 17
        ? t("dashboard.greetingAfter", "Good afternoon")
        : hour < 21
          ? t("dashboard.greetingEvening", "Good evening")
          : t("dashboard.greetingNight", "Good night");

  const C = {
    bg: "var(--bg)",
    bg2: "var(--bg2)",
    bg3: "var(--bg3)",
    text: "var(--text)",
    text2: "var(--text2)",
    text3: "var(--text3)",
    gold: "var(--gold)",
    border: "var(--border)",
    grid: isDark ? "rgba(200,169,110,0.08)" : "rgba(120,90,40,0.12)",
    tick: isDark ? "rgba(240,238,232,0.35)" : "rgba(28,26,20,0.45)",
    tooltipBg: isDark ? "var(--surface)" : "#ffffff",
    tooltipBorder: isDark ? "rgba(200,169,110,0.3)" : "rgba(120,90,40,0.25)",
  };

  const [upcomingSales, setUpcomingSales] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function loadSales() {
      try {
        const { data } = await productService.getUpcomingSales();
        if (mounted && Array.isArray(data?.sales)) {
          setUpcomingSales(data.sales);
        }
      } catch {
        setUpcomingSales([]);
      }
    }
    loadSales();
    return () => { mounted = false; };
  }, []);

  const Card = ({ title, children, right }) => (
    <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 16, padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: "1rem" }}>
        <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "1.2rem", color: C.text }}>{title}</h2>
        {right ? <div style={{ fontSize: ".75rem", color: C.text3 }}>{right}</div> : null}
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ padding: "2rem 2.5rem", background: C.bg, minHeight: "100vh", fontFamily: "'DM Sans',sans-serif" }}>
      <motion.div {...fadeUp(0)} style={{ marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: `1px solid ${C.border}` }}>
        <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(1.8rem,3vw,2.4rem)", color: C.text, marginBottom: ".45rem" }}>
          {greeting}, <em style={{ color: C.gold }}>{firstName}</em>
        </h1>
        <p style={{ color: C.text2 }}>{t("dashboard.greetingSub", "Your AI shopping intelligence is ready")}</p>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem", marginBottom: "1.5rem", alignItems: "start", gridAutoRows: "auto" }}>
        <motion.div {...fadeUp(0.08)}>
          <Card title="Recently searched">
            <div style={{ display: "grid", gap: ".75rem" }}>
              {recentSearchProducts.length > 0 ? (
                recentSearchProducts.slice(0, 5).map((product, idx) => (
                  <button
                    key={`${product.productId}-${idx}`}
                    type="button"
                    onClick={() => {
                      if (product.productId) {
                        onProductClick({ _id: product.productId });
                      }
                    }}
                    style={{
                      textAlign: "left",
                      border: `1px solid ${C.border}`,
                      borderRadius: 14,
                      background: C.bg3,
                      padding: ".85rem 1rem",
                      cursor: "pointer",
                      color: C.text,
                      display: "flex",
                      gap: ".75rem",
                      alignItems: "center",
                    }}
                  >
                    {product.image && (
                      <img
                        src={product.image}
                        alt={product.name}
                        style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: ".85rem", textOverflow: "ellipsis", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", whiteSpace: "normal", wordBreak: "break-word" }}>
                        {product.name}
                      </div>
                      <div style={{ color: C.text3, fontSize: ".75rem", marginTop: ".2rem" }}>
                        {product.source} • ₹{product.price?.toLocaleString("en-IN") || "N/A"}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div style={{ color: C.text2 }}>
                  Start searching products to see them here.
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div {...fadeUp(0.12)}>
          <Card title="Upcoming sales calendar" right="Plan ahead">
            <div style={{ display: "grid", gap: ".85rem" }}>
              {upcomingSales.length > 0 ? (
                upcomingSales.map((sale) => {
                  const saleDate = sale.date_label || (sale.start_date ? new Date(sale.start_date).toLocaleDateString("en-IN", { month: "short", day: "2-digit" }) : "TBA");
                  return (
                    <div key={sale.id} style={{ display: "flex", justifyContent: "space-between", gap: ".75rem", padding: ".85rem 1rem", background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 14 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: C.text, fontWeight: 600 }}>{sale.title}</div>
                        <div style={{ color: C.text3, fontSize: ".78rem" }}>{sale.description}</div>
                        {sale.note ? (
                          <div style={{ color: C.text2, fontSize: ".72rem", marginTop: ".5rem" }}>{sale.note}</div>
                        ) : null}
                      </div>
                      <div style={{ minWidth: 110, textAlign: "right", color: C.gold, fontWeight: 700, fontSize: ".85rem" }}>
                        <div style={{ textTransform: "uppercase", fontSize: ".72rem", color: C.text3, fontWeight: 600, marginBottom: ".25rem" }}>Date</div>
                        <div>{saleDate}</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: C.text2 }}>
                  No upcoming sales available yet.
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
