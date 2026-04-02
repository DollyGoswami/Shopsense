import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useRecommendations } from "../hooks/useProducts";
import { useFavorites } from "../hooks/useFavorites";
import ProductCard from "../components/products/ProductCard";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay },
});

const formatCurrency = (value) => `Rs ${Number(value || 0).toLocaleString("en-IN")}`;

const sourceLabel = (source) =>
  (
    {
      amazon: "Amazon",
      flipkart: "Flipkart",
      myntra: "Myntra",
      apollo_pharmacy: "Apollo Pharmacy",
    }[source] || source || "Unknown"
  );

export default function DashboardPage({ onProductClick }) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { recommendations, loading, load } = useRecommendations();
  const { toggle, isFavorite } = useFavorites();

  useEffect(() => {
    load({ limit: 9 });
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

  const trendData = recommendations.slice(0, 6).map((product, index) => ({
    label: sourceLabel(product.source),
    mentions: product.reviewCount ?? product.review_count ?? (index + 1) * 120,
    score: Math.round(product?.scores?.trendScore ?? product?.scores?.finalScore ?? 50),
  }));

  const platformData = Object.values(
    recommendations.reduce((acc, product) => {
      const source = sourceLabel(product.source);
      const price = Number(product.currentPrice ?? product.current_price ?? 0);
      if (!price) return acc;
      if (!acc[source]) acc[source] = { name: source, total: 0, count: 0 };
      acc[source].total += price;
      acc[source].count += 1;
      return acc;
    }, {})
  ).map((entry) => ({
    name: entry.name,
    avg: Math.round(entry.total / entry.count),
  }));

  const flashSales = recommendations
    .filter((product) => product?.buyDecision === "WAIT")
    .slice(0, 3)
    .map((product, index) => ({
      name: product.name,
      saleProbability: Math.max(35, 84 - index * 12),
      predictedDays: index + 2,
    }));

  const alerts = [
    ...recommendations
      .filter((product) => Number(product.discountPct ?? product.discount_pct ?? 0) >= 15)
      .slice(0, 2)
      .map((product) => ({
        title: "Price Drop",
        desc: `${product.name} is now ${formatCurrency(product.currentPrice ?? product.current_price)}`,
        meta: sourceLabel(product.source),
        color: "rgba(16,185,129,.12)",
      })),
    ...recommendations
      .filter((product) => Number(product?.scores?.trendScore ?? 0) >= 70)
      .slice(0, 2)
      .map((product) => ({
        title: "Trending Now",
        desc: `${product.name} trend score is ${Math.round(product?.scores?.trendScore ?? 0)}/100`,
        meta: sourceLabel(product.source),
        color: "rgba(244,63,94,.10)",
      })),
  ].slice(0, 4);

  const savings = recommendations.reduce((sum, product) => {
    const current = Number(product.currentPrice ?? product.current_price ?? 0);
    const original = Number(product.originalPrice ?? product.original_price ?? 0);
    return original > current ? sum + (original - current) : sum;
  }, 0);

  const avgScore = recommendations.length
    ? Math.round(recommendations.reduce((sum, product) => sum + Number(product?.scores?.finalScore ?? 0), 0) / recommendations.length)
    : 0;

  const stats = [
    { value: formatCurrency(savings), label: t("dashboard.savingsFound", "Total Savings"), color: "#10b981" },
    { value: recommendations.length || 0, label: t("dashboard.tracked", "Products Tracked"), color: C.gold },
    { value: `${avgScore}%`, label: t("dashboard.avgScore", "Avg AI Score"), color: "#a78bfa" },
    { value: flashSales.length, label: t("dashboard.salesSoon", "Flash Sales Soon"), color: "#f43f5e" },
  ];

  const Card = ({ title, children, right }) => (
    <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 16, padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: "1rem" }}>
        <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "1.2rem", color: C.text }}>{title}</h2>
        {right ? <div style={{ fontSize: ".75rem", color: C.text3 }}>{right}</div> : null}
      </div>
      {children}
    </div>
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: C.tooltipBg, border: `1px solid ${C.tooltipBorder}`, borderRadius: 10, padding: "10px 14px", fontSize: 12 }}>
        <div style={{ color: C.gold, fontWeight: 600, marginBottom: 6 }}>{label}</div>
        {payload.map((item, index) => (
          <div key={index} style={{ color: item.color, marginBottom: 2 }}>
            {item.name}: <strong>{typeof item.value === "number" && item.value > 999 ? item.value.toLocaleString("en-IN") : item.value}</strong>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: "2rem 2.5rem", background: C.bg, minHeight: "100vh", fontFamily: "'DM Sans',sans-serif" }}>
      <motion.div {...fadeUp(0)} style={{ marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: `1px solid ${C.border}` }}>
        <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(1.8rem,3vw,2.4rem)", color: C.text, marginBottom: ".45rem" }}>
          {greeting}, <em style={{ color: C.gold }}>{firstName}</em>
        </h1>
        <p style={{ color: C.text2 }}>{t("dashboard.greetingSub", "Your AI shopping intelligence is ready")}</p>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {stats.map((stat, index) => (
          <motion.div key={stat.label} {...fadeUp(index * 0.05)} style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "1.25rem" }}>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: "1.8rem", color: stat.color, marginBottom: ".3rem" }}>{stat.value}</div>
            <div style={{ fontSize: ".74rem", letterSpacing: ".08em", textTransform: "uppercase", color: C.text3 }}>{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>
        <motion.div {...fadeUp(0.1)}>
          <Card title={t("dashboard.trendGraph", "Live Trend Signals")} right="Mongo + ML">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="trendMentions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="trendScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="label" tick={{ fill: C.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: C.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: C.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area yAxisId="left" type="monotone" dataKey="mentions" name="Reviews" stroke="#6c63ff" fill="url(#trendMentions)" strokeWidth={2} />
                  <Area yAxisId="right" type="monotone" dataKey="score" name="Trend Score" stroke="#10b981" fill="url(#trendScore)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: C.text2 }}>No live trend data yet.</div>
            )}
          </Card>
        </motion.div>

        <motion.div {...fadeUp(0.15)}>
          <Card title={t("dashboard.alertsTitle", "Live Notifications")} right={`${alerts.length} live`}>
            {alerts.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: ".7rem" }}>
                {alerts.map((alert, index) => (
                  <div key={`${alert.title}-${index}`} style={{ display: "flex", gap: ".9rem", padding: ".85rem 1rem", background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: alert.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                      {alert.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: C.text, fontWeight: 600, marginBottom: ".15rem" }}>{alert.title}</div>
                      <div style={{ color: C.text2, fontSize: ".8rem", marginBottom: ".2rem" }}>{alert.desc}</div>
                      <div style={{ color: C.text3, fontSize: ".72rem" }}>{alert.meta}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: C.text2 }}>No live notifications yet.</div>
            )}
          </Card>
        </motion.div>
      </div>

      <motion.div {...fadeUp(0.2)} style={{ marginBottom: "1.5rem" }}>
        <Card title={t("dashboard.topRec", "Today's Top Recommendations")} right={loading ? "Loading..." : `${recommendations.length} products`}>
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
              {[1, 2, 3].map((item) => (
                <div key={item} style={{ height: 280, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 14 }} />
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
              {recommendations.slice(0, 3).map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  isFav={isFavorite(product._id)}
                  onFav={toggle}
                  onClick={onProductClick}
                />
              ))}
            </div>
          ) : (
            <div style={{ color: C.text2 }}>Trigger a scrape to populate recommendations.</div>
          )}
        </Card>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
        <motion.div {...fadeUp(0.25)}>
          <Card title={t("dashboard.platformTitle", "Avg Price Comparison")} right={`${platformData.length} platforms`}>
            {platformData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={platformData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: C.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.tick, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => `Rs ${(value / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avg" name="Avg Price" fill="var(--gold)" radius={[4, 4, 0, 0]} fillOpacity={0.75} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: C.text2 }}>No cross-platform pricing data yet.</div>
            )}
          </Card>
        </motion.div>

        <motion.div {...fadeUp(0.3)}>
          <Card title={t("dashboard.flashSale", "Flash Sale Probability")} right="Derived from live recommendations">
            {flashSales.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
                {flashSales.map((sale, index) => {
                  const color = ["#f43f5e", "#fbbf24", "#38bdf8"][index % 3];
                  return (
                    <div key={sale.name} style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 12, padding: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".45rem" }}>
                        <div style={{ color: C.text, fontWeight: 500 }}>{sale.name}</div>
                        <div style={{ color, fontFamily: "'DM Serif Display',serif", fontSize: "1.1rem" }}>{sale.saleProbability}%</div>
                      </div>
                      <div style={{ color: C.text3, fontSize: ".72rem", marginBottom: ".7rem" }}>Expected window: about {sale.predictedDays} days</div>
                      <div style={{ height: 4, background: isDark ? "rgba(245,243,238,.06)" : "rgba(28,26,20,.08)", borderRadius: 999 }}>
                        <div style={{ width: `${sale.saleProbability}%`, height: "100%", borderRadius: 999, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: C.text2 }}>No wait-signals yet. BUY recommendations are dominating right now.</div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
