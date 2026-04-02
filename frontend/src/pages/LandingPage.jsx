// LandingPage.jsx
// Drop this into your React + Vite + Tailwind + Framer Motion project.
// Install fonts in your index.html:
// <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet"/>

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { productService } from "../services/productService";

// ─── Design tokens ───────────────────────────────────────────────────────────
const T = {
  ink:     "#0a0a0f",
  ink2:    "#12121a",
  ink3:    "#1c1c2a",
  smoke:   "#f5f3ee",
  gold:    "#c8a96e",
  gold2:   "#e8c98e",
  ember:   "#e05a2b",
  border:  "rgba(200,169,110,.18)",
  border2: "rgba(200,169,110,.35)",
  ease:    [0.16, 1, 0.3, 1],
};

// ─── Motion variants ──────────────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial:   { opacity: 0, y: 30 },
  animate:   { opacity: 1, y: 0 },
  transition:{ duration: 0.8, ease: T.ease, delay },
});

const slideUpText = (delay = 0) => ({
  initial:   { y: "100%" },
  animate:   { y: 0 },
  transition:{ duration: 0.9, ease: T.ease, delay },
});

const revealVariants = {
  hidden:  { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: T.ease } },
};

const staggerContainer = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const staggerItem = {
  hidden:  { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: T.ease } },
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: "Home",         href: "#home" },
  { label: "How It Works", href: "#how" },
  { label: "Products",     href: "#products" },
  { label: "Features",     href: "#features" },
  { label: "AI Model",     href: "#formula" },
];

const MARQUEE_ITEMS = [
  "Real-Time Amazon Scraping", "Flipkart Price Tracker", "BERT Sentiment Analysis",
  "LSTM Price Prediction", "Hype vs Quality Detector", "Flash Sale Predictor",
  "Image Search AI", "WhatsApp Price Alerts",
];

const STEPS = [
  { num: "01", icon: "🕷️", title: "Live Data Scraping",   desc: "Real-time prices flow in from Amazon.in, Flipkart, Myntra, and Apollo Pharmacy every 30 minutes." },
  { num: "02", icon: "🧠", title: "AI Scoring Engine",    desc: "BERT transformer analyzes thousands of reviews into sentiment scores. ARIMA models predict 7-day price trajectories. Twitter API tracks social buzz in real time." },
  { num: "03", icon: "⚡", title: "Smart Decision",       desc: "Our hybrid model combines five weighted signals into a final score. Buy Now / Wait / Avoid — delivered instantly with full reasoning and price predictions." },
];

const PRODUCTS = [
  { emoji: "📱", badge: "✅ Buy Now", badgeType: "buy",  name: "Samsung Galaxy S24 Ultra 256GB", source: "amazon.in",   price: "₹89,999",  old: "₹1,09,999", score: 88, scoreType: "high" },
  { emoji: "🎧", badge: "✅ Buy Now", badgeType: "buy",  name: "Sony WH-1000XM5 Headphones",    source: "flipkart.com",price: "₹24,990",  old: "₹34,990",   score: 93, scoreType: "high" },
  { emoji: "📱", badge: "⏳ Wait",    badgeType: "wait", name: "OnePlus 12 5G 256GB Black",      source: "amazon.in",   price: "₹64,999",  old: "₹69,999",   score: 67, scoreType: "mid"  },
  { emoji: "🎵", badge: "💎 Gem",    badgeType: "buy",  name: "Apple AirPods Pro 2nd Gen",      source: "flipkart.com",   price: "₹24,900",  old: "₹26,900",   score: 91, scoreType: "high" },
];

const SCORE_BARS = [
  { label: "Price",     pct: "25%", color: "linear-gradient(90deg,#10b981,#34d399)" },
  { label: "Sentiment", pct: "25%", color: "linear-gradient(90deg,#6c63ff,#a78bfa)" },
  { label: "Rating",    pct: "20%", color: "linear-gradient(90deg,#fbbf24,#f59e0b)" },
  { label: "Trend",     pct: "15%", color: "linear-gradient(90deg,#f43f5e,#e05a2b)" },
  { label: "Deal",      pct: "15%", color: "linear-gradient(90deg,#38bdf8,#0ea5e9)" },
];

const FEATURES = [
  { icon: "📉", title: "Live Price Tracking",       desc: "Scrapes Amazon, Flipkart, Myntra and Apollo Pharmacy every 30 min. Full price history stored in MongoDB." },
  { icon: "🔮", title: "ARIMA Price Prediction",    desc: "Time-series forecasting predicts price for the next 7 days with 87% directional accuracy." },
  { icon: "🧠", title: "BERT Sentiment Analysis",   desc: "Transformer model reads thousands of reviews and extracts a precise sentiment score + pros & cons." },
  { icon: "⚖️", title: "Hype vs Quality Detector", desc: "High trend + low sentiment = Avoid. Low trend + high sentiment = Hidden Gem. Never be misled again." },
  { icon: "📸", title: "Visual Image Search",       desc: "Upload any product photo. AI detects category and finds similar products across all platforms instantly." },
  { icon: "🔔", title: "Multi-Channel Alerts",      desc: "Price drop? You'll know instantly via Email, SMS, WhatsApp, and in-app push — powered by Twilio." },
  { icon: "🎉", title: "Flash Sale Predictor",      desc: "ML model predicts probability and timing of upcoming flash sales across all major platforms." },
  { icon: "🤖", title: "AI Shopping Chatbot",       desc: '"Best phone under ₹50k?" — Get ranked recommendations with buy decisions in seconds.' },
  { icon: "🔄", title: "Smart Alternatives",        desc: "Instantly see cheaper or better-rated alternatives and bundle suggestions based on your cart." },
];

const PLATFORMS = ["Amazon", "Flipkart", "Myntra", "Apollo Pharmacy", "Zepto", "Vijay Sales"];

const FOOTER_LINKS = {
  Product: ["Dashboard", "Price Tracker", "AI Chatbot", "Image Search", "Alerts"],
  Company: ["About", "Blog", "Careers", "Press"],
  Legal:   ["Privacy Policy", "Terms of Service", "Cookie Policy", "Disclaimer"],
};

const formatMoney = (value) => {
  if (value == null) return "N/A";
  return `Rs ${Number(value).toLocaleString("en-IN")}`;
};

const mapLandingProduct = (product) => {
  const finalScore = Math.round(product?.scores?.finalScore ?? product?.ai_score ?? 0);
  const decision = (product?.buyDecision ?? product?.buy_decision ?? "BUY").toUpperCase();
  const hype = product?.hypeLabel;

  return {
    id: product?._id ?? product?.product_id ?? product?.source_id ?? product?.name,
    image: product?.image,
    badge: decision === "WAIT" ? "Wait" : hype === "hot" ? "Hot" : "Buy Now",
    badgeType: decision === "WAIT" ? "wait" : hype === "hot" ? "hot" : "buy",
    name: product?.name ?? "Untitled product",
    source: product?.source ?? "live",
    price: formatMoney(product?.currentPrice ?? product?.current_price),
    old: product?.originalPrice ?? product?.original_price ? formatMoney(product?.originalPrice ?? product?.original_price) : "",
    score: finalScore,
    scoreType: finalScore >= 80 ? "high" : finalScore >= 60 ? "mid" : "low",
  };
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Custom magnetic cursor */
function Cursor() {
  const dotRef  = useRef(null);
  const ringRef = useRef(null);
  const pos     = useRef({ mx: 0, my: 0, rx: 0, ry: 0 });
  const rafRef  = useRef(null);

  useEffect(() => {
    const onMove = (e) => {
      pos.current.mx = e.clientX;
      pos.current.my = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.left = e.clientX + "px";
        dotRef.current.style.top  = e.clientY + "px";
      }
    };
    window.addEventListener("mousemove", onMove);

    const animate = () => {
      const p = pos.current;
      p.rx += (p.mx - p.rx) * 0.12;
      p.ry += (p.my - p.ry) * 0.12;
      if (ringRef.current) {
        ringRef.current.style.left = p.rx + "px";
        ringRef.current.style.top  = p.ry + "px";
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    // Hover expand
    const expand = () => {
      if (dotRef.current)  { dotRef.current.style.width = "20px";  dotRef.current.style.height = "20px"; }
      if (ringRef.current) { ringRef.current.style.width = "60px"; ringRef.current.style.height = "60px"; }
    };
    const shrink = () => {
      if (dotRef.current)  { dotRef.current.style.width = "10px";  dotRef.current.style.height = "10px"; }
      if (ringRef.current) { ringRef.current.style.width = "36px"; ringRef.current.style.height = "36px"; }
    };
    const targets = document.querySelectorAll("button, a, .cursor-grow");
    targets.forEach(el => { el.addEventListener("mouseenter", expand); el.addEventListener("mouseleave", shrink); });

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafRef.current);
      targets.forEach(el => { el.removeEventListener("mouseenter", expand); el.removeEventListener("mouseleave", shrink); });
    };
  }, []);

  return (
    <>
      <div ref={dotRef}  style={{ position:"fixed", width:10, height:10, background:T.gold, borderRadius:"50%", pointerEvents:"none", zIndex:9999, transform:"translate(-50%,-50%)", transition:"width .2s, height .2s", mixBlendMode:"difference" }} />
      <div ref={ringRef} style={{ position:"fixed", width:36, height:36, border:`1px solid ${T.gold}`, borderRadius:"50%", pointerEvents:"none", zIndex:9998, transform:"translate(-50%,-50%)", opacity:.5, transition:"width .3s, height .3s" }} />
    </>
  );
}

/** Navbar */
function Navbar({ onCta }) {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = document.querySelectorAll("section");

    const handleScroll = () => {
      let current = "";

      sections.forEach((section) => {
        const sectionTop = section.offsetTop - 120;
        const sectionHeight = section.clientHeight;

        if (
          window.scrollY >= sectionTop &&
          window.scrollY < sectionTop + sectionHeight
        ) {
          current = section.getAttribute("id");
        }
      });

      setActive(current);
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      style={{
        position:"fixed", top:0, left:0, right:0, zIndex:100,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding: scrolled ? "1rem 4rem" : "1.5rem 4rem",
        background: scrolled ? "rgba(10,10,15,.85)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? `1px solid ${T.border}` : "none",
        transition:"all .4s ease",
      }}
      initial={{ opacity:0, y:-20 }}
      animate={{ opacity:1, y:0 }}
      transition={{ duration:.6, ease:T.ease }}
    >
      {/* Logo */}
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.6rem", letterSpacing:".12em", color:T.gold, display:"flex", gap:".4rem" }}>
        ShopSense <span style={{ color:T.smoke, opacity:.7 }}>AI</span>
      </div>

      {/* Links */}
      <div style={{ display:"flex", alignItems:"center", gap:"2.5rem" }}>
        {NAV_LINKS.map((l) => (
  <a
    key={l.label}
    href={l.href}
    onClick={() => setActive(l.href.replace("#", ""))}
    style={{
      fontSize: ".8rem",
      letterSpacing: ".12em",
      textTransform: "uppercase",
      textDecoration: "none",
      transition: "all .3s",

      color:
        active === l.href.replace("#", "")
          ? T.gold
          : T.smoke,

      opacity:
        active === l.href.replace("#", "")
          ? 1
          : 0.7,

      borderBottom:
        active === l.href.replace("#", "")
          ? `1px solid ${T.gold}`
          : "none",

      paddingBottom: "4px"
    }}
  >
    {l.label}
  </a>
))}

        {/* CTA */}
        <motion.button
          onClick={onCta}
          style={{
    fontFamily:"'DM Sans',sans-serif",
    fontSize:".75rem",
    letterSpacing:".15em",
    textTransform:"uppercase",
    background:T.gold,
    color:T.ink,
    padding:".65rem 1.6rem",
    borderRadius:2,
    fontWeight:500,
    border:"none"
  }}
>
          Get Started
        </motion.button>
      </div>
    </motion.nav>
  );
}

/** Marquee ticker */
function Marquee() {
  const doubled = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div style={{ borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, background:T.ink2, overflow:"hidden", padding:".75rem 0" }}>
      <motion.div
        style={{ display:"flex", width:"max-content" }}
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration:25, ease:"linear", repeat:Infinity }}
      >
        {doubled.map((item, i) => (
          <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:"1.5rem", padding:"0 3rem", whiteSpace:"nowrap", fontSize:".7rem", letterSpacing:".15em", textTransform:"uppercase", color:"rgba(245,243,238,.3)" }}>
            <span style={{ width:4, height:4, borderRadius:"50%", background:T.gold, opacity:.6, display:"inline-block" }} />
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/** Phone mockup shown in hero */
function PhoneMockup() {
  return (
    <motion.div
      style={{ position:"relative" }}
      animate={{ y: [0, -14, 0] }}
      transition={{ duration:6, ease:"easeInOut", repeat:Infinity }}
      {...fadeUp(0.3)}
    >
      {/* Phone frame */}
      <div style={{
        width:280, height:560,
        background:"linear-gradient(160deg,#1c1c2a,#0f0f18)",
        borderRadius:40, border:`1px solid rgba(200,169,110,.25)`,
        boxShadow:"0 40px 80px rgba(0,0,0,.6), 0 0 120px rgba(200,169,110,.06)",
        overflow:"hidden", padding:16,
      }}>
        {/* Notch */}
        <div style={{ width:80, height:20, background:T.ink, borderRadius:"0 0 14px 14px", margin:"0 auto 16px" }} />

        {/* Content */}
        <div style={{ fontSize:10 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", color:T.gold, fontSize:14, letterSpacing:".1em", marginBottom:10 }}>ShopSense AI</div>

          {/* Card 1 */}
          <div style={{ background:"rgba(200,169,110,.08)", border:`1px solid ${T.border}`, borderRadius:10, padding:12, marginBottom:8 }}>
            <div style={{ display:"inline-block", background:"rgba(16,185,129,.15)", color:"#10b981", border:"1px solid rgba(16,185,129,.3)", borderRadius:3, padding:"2px 6px", fontSize:8, letterSpacing:".06em", marginBottom:6 }}>✅ BUY NOW</div>
            <div style={{ fontSize:9, color:"rgba(245,243,238,.6)", marginBottom:4, lineHeight:1.3 }}>Samsung Galaxy S24 Ultra 256GB</div>
            <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:16, color:T.gold, marginBottom:6 }}>₹89,999</div>
            <div style={{ height:4, background:"rgba(245,243,238,.08)", borderRadius:2, marginBottom:3 }}>
              <div style={{ height:"100%", width:"88%", background:"linear-gradient(90deg,#c8a96e,#e8c98e)", borderRadius:2 }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:8, color:"rgba(245,243,238,.4)" }}>
              <span>AI Score</span><span style={{ color:T.gold }}>88/100</span>
            </div>
          </div>

          {/* Alert */}
          <div style={{ background:"rgba(224,90,43,.1)", border:"1px solid rgba(224,90,43,.25)", borderRadius:8, padding:"8px 10px", display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
            <motion.div animate={{ opacity:[1,.3,1] }} transition={{ duration:1.5, repeat:Infinity }} style={{ width:6, height:6, borderRadius:"50%", background:T.ember, flexShrink:0 }} />
            <div style={{ fontSize:8, color:"rgba(245,243,238,.7)", lineHeight:1.4 }}>📉 Sony XM5 dropped ₹3,000 — price prediction says BUY</div>
          </div>

          {/* Mini chart */}
          <div style={{ fontSize:8, color:"rgba(245,243,238,.3)", marginBottom:4 }}>7-Day Price Trend</div>
          <div style={{ height:50, marginBottom:8 }}>
            <svg viewBox="0 0 240 50" style={{ width:"100%", height:"100%" }} preserveAspectRatio="none">
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c8a96e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#c8a96e" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 42 L34 38 L68 35 L102 40 L136 28 L170 20 L204 15 L240 8" fill="none" stroke="#c8a96e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M0 42 L34 38 L68 35 L102 40 L136 28 L170 20 L204 15 L240 8 L240 50 L0 50Z" fill="url(#cg)" />
            </svg>
          </div>

          {/* Card 2 */}
          <div style={{ background:"rgba(200,169,110,.08)", border:`1px solid ${T.border}`, borderRadius:10, padding:12 }}>
            <div style={{ display:"inline-block", background:"rgba(251,191,36,.12)", color:"#fbbf24", border:"1px solid rgba(251,191,36,.25)", borderRadius:3, padding:"2px 6px", fontSize:8, letterSpacing:".06em", marginBottom:6 }}>⏳ WAIT</div>
            <div style={{ fontSize:9, color:"rgba(245,243,238,.6)", marginBottom:4, lineHeight:1.3 }}>Apple AirPods Pro 2nd Gen</div>
            <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:16, color:T.gold, marginBottom:6 }}>₹24,900</div>
            <div style={{ height:4, background:"rgba(245,243,238,.08)", borderRadius:2, marginBottom:3 }}>
              <div style={{ height:"100%", width:"72%", background:"linear-gradient(90deg,#fbbf24,#f59e0b)", borderRadius:2 }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:8, color:"rgba(245,243,238,.4)" }}>
              <span>AI Score</span><span style={{ color:"#fbbf24" }}>72/100</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/** Floating data badge cards around phone */
function FloatCard({ style, label, value, sub, color = T.gold, delay = 0 }) {
  return (
    <motion.div
      style={{
        position:"absolute",
        background:"rgba(18,18,26,.9)",
        border:`1px solid ${T.border2}`,
        borderRadius:10,
        padding:".75rem 1rem",
        backdropFilter:"blur(12px)",
        ...style,
      }}
      animate={{ y:[0,-14,0] }}
      transition={{ duration:5+delay, ease:"easeInOut", repeat:Infinity, delay }}
    >
      <div style={{ fontSize:".6rem", letterSpacing:".1em", textTransform:"uppercase", color:"rgba(245,243,238,.4)", marginBottom:".3rem" }}>{label}</div>
      <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.1rem", color }}>{value}</div>
      {sub && <div style={{ fontSize:".65rem", color:"rgba(245,243,238,.5)", marginTop:".1rem" }}>{sub}</div>}
    </motion.div>
  );
}

/** Section tag (e.g. "Process") */
function SectionTag({ label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:".75rem", fontSize:".7rem", letterSpacing:".2em", textTransform:"uppercase", color:T.gold, marginBottom:"1rem" }}>
      <div style={{ width:30, height:1, background:T.gold }} />
      {label}
    </div>
  );
}

/** Section heading */
function SectionTitle({ children, style = {} }) {
  return (
    <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:"clamp(2.2rem,4vw,3.5rem)", lineHeight:1.15, marginBottom:"4rem", maxWidth:500, ...style }}>
      {children}
    </h2>
  );
}

/** Product card */
function ProdCard({ p, index }) {
  const badgeStyle = {
    buy:  { bg:"rgba(16,185,129,.15)",  color:"#10b981", border:"1px solid rgba(16,185,129,.3)" },
    wait: { bg:"rgba(251,191,36,.12)",  color:"#fbbf24", border:"1px solid rgba(251,191,36,.25)" },
    hot:  { bg:"rgba(224,90,43,.15)",   color:"#e05a2b", border:"1px solid rgba(224,90,43,.3)" },
  }[p.badgeType];

  const fillColor = { high:"linear-gradient(90deg,#10b981,#34d399)", mid:"linear-gradient(90deg,#fbbf24,#f59e0b)", low:"linear-gradient(90deg,#f43f5e,#e05a2b)" }[p.scoreType];

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y:-6, borderColor:T.border2, boxShadow:"0 20px 60px rgba(0,0,0,.5), 0 0 40px rgba(200,169,110,.06)" }}
      style={{ background:T.ink3, border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden", cursor:"none" }}
    >
      {/* Image area */}
      <div style={{ height:160, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"3.5rem", background:"rgba(200,169,110,.04)", borderBottom:`1px solid ${T.border}`, position:"relative", padding:"1rem" }}>
        {p.image ? (
          <img src={p.image} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"contain" }} />
        ) : (
          <span>[IMG]</span>
        )}
        <span style={{ position:"absolute", top:".75rem", left:".75rem", fontSize:".6rem", letterSpacing:".1em", textTransform:"uppercase", padding:".35rem .75rem", borderRadius:2, fontWeight:500, background:badgeStyle.bg, color:badgeStyle.color, border:badgeStyle.border }}>
          {p.badge}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding:"1.25rem" }}>
        <div style={{ fontSize:".875rem", fontWeight:500, marginBottom:".5rem", lineHeight:1.4 }}>{p.name}</div>
        <div style={{ fontSize:".65rem", letterSpacing:".1em", textTransform:"uppercase", color:"rgba(245,243,238,.3)", marginBottom:".5rem" }}>{p.source}</div>
        <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1.4rem", color:T.gold, marginBottom:".2rem" }}>{p.price}</div>
        <div style={{ fontSize:".75rem", color:"rgba(245,243,238,.3)", textDecoration:"line-through", marginBottom:".75rem" }}>{p.old}</div>

        {/* Score bar */}
        <div style={{ display:"flex", alignItems:"center", gap:".75rem" }}>
          <div style={{ flex:1, height:3, background:"rgba(245,243,238,.06)", borderRadius:2, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${p.score}%`, borderRadius:2, background:fillColor }} />
          </div>
          <div style={{ fontSize:".75rem", fontWeight:600 }}>{p.score}</div>
        </div>

        <motion.button
          whileHover={{ borderColor:T.gold, color:T.gold }}
          style={{ width:"100%", background:"none", border:`1px solid ${T.border}`, color:T.smoke, padding:".7rem", fontSize:".75rem", letterSpacing:".1em", textTransform:"uppercase", borderRadius:4, cursor:"none", marginTop:".75rem", transition:"all .3s" }}
        >
          View Analysis →
        </motion.button>
      </div>
    </motion.div>
  );
}

/** Animated score bar for formula section */
function ScoreBar({ item, visible }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"1rem" }}>
      <div style={{ fontSize:".75rem", letterSpacing:".1em", textTransform:"uppercase", color:"rgba(245,243,238,.5)", width:90, flexShrink:0 }}>{item.label}</div>
      <div style={{ flex:1, height:6, background:"rgba(245,243,238,.06)", borderRadius:3, overflow:"hidden" }}>
        <motion.div
          style={{ height:"100%", borderRadius:3, background:item.color }}
          initial={{ width:0 }}
          animate={{ width: visible ? item.pct : 0 }}
          transition={{ duration:1.5, ease:T.ease, delay:.2 }}
        />
      </div>
      <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:".9rem", color:T.gold, width:36, textAlign:"right", flexShrink:0 }}>{item.pct}</div>
    </div>
  );
}

// ─── Section: Hero ────────────────────────────────────────────────────────────
function HeroSection({ onStart, onDemo }) {
  const { scrollY } = useScroll();
  const gridY = useTransform(scrollY, [0, 500], [0, 100]);

  return (
    <section id="home" style={{ position:"relative", minHeight:"100vh", display:"grid", gridTemplateColumns:"1fr 1fr", alignItems:"center", overflow:"hidden" }}>
      {/* Background */}
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 80% 60% at 70% 50%, rgba(200,169,110,.07) 0%, transparent 70%), radial-gradient(ellipse 60% 80% at 10% 80%, rgba(224,90,43,.05) 0%, transparent 60%), linear-gradient(160deg,#0a0a0f,#12121a)" }} />

      {/* Grid */}
      <motion.div
        style={{
          position:"absolute", inset:0, y: gridY,
          backgroundImage:"linear-gradient(rgba(200,169,110,.04) 1px,transparent 1px), linear-gradient(90deg,rgba(200,169,110,.04) 1px,transparent 1px)",
          backgroundSize:"80px 80px",
          maskImage:"radial-gradient(ellipse at center,black 20%,transparent 80%)",
        }}
      />

      {/* Left */}
      <div style={{ position:"relative", zIndex:2, padding:"7rem 4rem 6rem 5rem" }}>
        {/* Badge */}
        <motion.div {...fadeUp(0.1)} style={{ display:"inline-flex", alignItems:"center", gap:".6rem", border:`1px solid ${T.border2}`, borderRadius:2, padding:".4rem 1rem", fontSize:".7rem", letterSpacing:".15em", textTransform:"uppercase", color:T.gold, marginBottom:"2rem" }}>
          <motion.span animate={{ opacity:[1,.3,1] }} transition={{ duration:2, repeat:Infinity }} style={{ width:6, height:6, borderRadius:"50%", background:T.gold, display:"inline-block" }} />
          🔴 Live Price Intelligence
        </motion.div>

        {/* Title */}
        <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(4.5rem,9vw,8rem)", lineHeight:.92, letterSpacing:".02em", marginBottom:"1.5rem" }}>
          {["Shop", "Smarter.", "Save More."].map((word, i) => (
            <div key={i} style={{ display:"block", overflow:"hidden" }}>
              <motion.span
                style={{ display:"inline-block", color: i === 1 ? T.gold : i === 2 ? "transparent" : T.smoke, WebkitTextStroke: i === 2 ? `1px ${T.smoke}` : "none" }}
                initial={{ y:"100%" }}
                animate={{ y:0 }}
                transition={{ duration:.9, ease:T.ease, delay:.2 + i * .12 }}
              >
                {word}
              </motion.span>
            </div>
          ))}
        </h1>

        {/* Sub */}
        <motion.p {...fadeUp(0.55)} style={{ fontSize:"1rem", lineHeight:1.75, color:"rgba(245,243,238,.55)", maxWidth:440, marginBottom:"2.5rem", fontWeight:300 }}>
          Real-time prices from Amazon, Flipkart, Myntra and Apollo Pharmacy — powered by BERT sentiment analysis and LSTM price prediction. Know what to buy. Know when.
        </motion.p>

        <motion.div {...fadeUp(1)} style={{ display:"flex", alignItems:"center", gap:"1.5rem" }}>
        
          <motion.button
            onClick={onStart}
            whileHover={{ y:-2, boxShadow:"0 12px 40px rgba(200,169,110,.3)" }}
            style={{ display:"inline-flex", alignItems:"center", gap:".75rem", background:T.gold, color:T.ink, padding:"1rem 2.2rem", borderRadius:2, fontSize:".8rem", letterSpacing:".12em", textTransform:"uppercase", fontWeight:500, border:"none", cursor:"none", position:"relative", overflow:"hidden" }}
          >
            Start Exploring →
          </motion.button>
          {/* <motion.button
            onClick={onDemo}
            whileHover={{ borderColor:T.gold, color:T.gold, opacity:1 }}
            style={{ display:"inline-flex", alignItems:"center", gap:".6rem", border:`1px solid ${T.border2}`, color:T.smoke, padding:"1rem 2rem", borderRadius:2, fontSize:".8rem", letterSpacing:".12em", textTransform:"uppercase", background:"none", cursor:"none", opacity:.75 }}
          >
            Watch Demo ↗
          </motion.button> */}
        </motion.div>

        {/* Stats */}
        <motion.div {...fadeUp(0.75)} style={{ display:"flex", gap:"2.5rem", marginTop:"3.5rem", paddingTop:"2.5rem", borderTop:`1px solid ${T.border}` }}>
          {[["₹2.4Cr+","User Savings"], ["6","Platforms Tracked"], ["87%","Price Accuracy"]].map(([n, l]) => (
            <div key={l}>
              <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"2rem", color:T.gold, lineHeight:1, marginBottom:".25rem" }}>{n}</div>
              <div style={{ fontSize:".7rem", letterSpacing:".12em", textTransform:"uppercase", color:"rgba(245,243,238,.4)" }}>{l}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Right — phone + floating cards */}
      <div style={{ position:"relative", zIndex:2, padding:"8rem 4rem 6rem 2rem", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <FloatCard label="AI Score"    value="94 /100" sub=""                   color={T.gold}      style={{ left:-110, top:80 }}  delay={1} />
        <FloatCard label="Price Drop"  value="₹5,200"  sub="Samsung S24 Ultra"  color="#10b981"     style={{ right:-90, top:160 }} delay={0.5} />
        <FloatCard label="Trend Score" value="🔥 91"   sub="Viral on X (Twitter)" color={T.gold}    style={{ left:-80, bottom:140 }} delay={1.5} />
        <PhoneMockup />
      </div>
    </section>
  );
}

// ─── Section: How It Works ────────────────────────────────────────────────────
function HowSection() {
  return (
    <section id="how" style={{ padding:"8rem 5rem", position:"relative", overflow:"hidden" }}>
      {/* Ghost text */}
      <div style={{ position:"absolute", fontFamily:"'Bebas Neue'", fontSize:"20vw", color:"rgba(200,169,110,.03)", top:"50%", left:"50%", transform:"translate(-50%,-50%)", pointerEvents:"none", letterSpacing:".05em", whiteSpace:"nowrap" }}>HOW</div>

      <motion.div initial="hidden" whileInView="visible" viewport={{ once:true, margin:"-60px" }} variants={revealVariants}>
        <SectionTag label="Process" />
        <SectionTitle>How ShopSense <em style={{ color:T.gold }}>thinks</em> for you</SectionTitle>
      </motion.div>

      <motion.div
        initial="hidden" whileInView="visible" viewport={{ once:true, margin:"-60px" }}
        variants={staggerContainer}
        style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2 }}
      >
        {STEPS.map((s) => (
          <motion.div key={s.num} variants={staggerItem}>
            <motion.div
              whileHover={{ background:"#16161f" }}
              style={{ background:T.ink2, padding:"3rem 2.5rem", position:"relative", overflow:"hidden" }}
            >
              <span style={{ fontFamily:"'Bebas Neue'", fontSize:"5rem", color:"rgba(200,169,110,.12)", lineHeight:1, marginBottom:"1.5rem", display:"block" }}>{s.num}</span>
              <div style={{ width:48, height:48, borderRadius:8, background:"rgba(200,169,110,.1)", border:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.2rem", marginBottom:"1.5rem" }}>{s.icon}</div>
              <h3 style={{ fontSize:"1.1rem", fontWeight:500, marginBottom:".75rem" }}>{s.title}</h3>
              <p style={{ fontSize:".875rem", color:"rgba(245,243,238,.45)", lineHeight:1.7, fontWeight:300 }}>{s.desc}</p>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

// ─── Section: Products ────────────────────────────────────────────────────────
function ProductsSection({ products }) {
  return (
    <section id="products" style={{ padding:"8rem 5rem", background:T.ink2 }}>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:"3rem" }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={revealVariants}>
          <SectionTag label="Live Intelligence" />
          <SectionTitle style={{ marginBottom:0, fontSize:"2.5rem" }}>Today's <em style={{ color:T.gold }}>Top Picks</em></SectionTitle>
        </motion.div>
        <div style={{ fontSize:".8rem", color:"rgba(245,243,238,.4)", letterSpacing:".08em" }}>
          Live from your API · <a href="#features" style={{ color:T.gold, textDecoration:"none" }}>Why these picks →</a>
        </div>
      </div>

      {products.length > 0 ? (
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once:true, margin:"-60px" }}
          variants={staggerContainer}
          style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"1.5rem" }}
        >
          {products.map((p, i) => <ProdCard key={p.id ?? i} p={p} index={i} />)}
        </motion.div>
      ) : (
        <div style={{ padding:"2rem", border:`1px solid ${T.border}`, borderRadius:12, color:"rgba(245,243,238,.45)", textAlign:"center" }}>
          No live products yet. Trigger a scrape and this section will populate from the real API.
        </div>
      )}
    </section>
  );
}

// ─── Section: Formula ─────────────────────────────────────────────────────────
function FormulaSection() {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisible(true); }, { threshold:.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="formula" style={{ padding:"8rem 5rem", background:"linear-gradient(160deg,#0d0d14,#12121a)", overflow:"hidden" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6rem", alignItems:"center" }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={revealVariants}>
          <SectionTag label="AI Model" />
          <SectionTitle>The <em style={{ color:T.gold }}>formula</em> behind every decision</SectionTitle>
          <p style={{ fontSize:"1rem", color:"rgba(245,243,238,.5)", lineHeight:1.8, maxWidth:440, fontWeight:300 }}>
            Five weighted signals combine into a single actionable score. No guesswork — just data-driven clarity on whether to buy, wait, or skip.
          </p>
        </motion.div>

        <motion.div
          ref={ref}
          initial="hidden" whileInView="visible" viewport={{ once:true }} variants={revealVariants}
          style={{ background:"rgba(200,169,110,.04)", border:`1px solid ${T.border}`, borderRadius:16, padding:"2rem" }}
        >
          <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:"1rem", color:"rgba(245,243,238,.5)", textAlign:"center", marginBottom:"2rem", lineHeight:1.8 }}>
            <span style={{ color:T.gold }}>Score</span> = 0.25×Price + 0.25×Sentiment<br />
            + 0.20×Rating + 0.15×Trend + 0.15×Deal
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
            {SCORE_BARS.map(item => <ScoreBar key={item.label} item={item} visible={visible} />)}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Section: Features ────────────────────────────────────────────────────────
function FeaturesSection() {
  return (
    <section id="features" style={{ padding:"8rem 5rem", background:T.ink }}>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={revealVariants}>
        <SectionTag label="Capabilities" />
        <SectionTitle>Everything you need to <em style={{ color:T.gold }}>never overpay</em> again</SectionTitle>
      </motion.div>

      <motion.div
        initial="hidden" whileInView="visible" viewport={{ once:true, margin:"-60px" }}
        variants={staggerContainer}
        style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2 }}
      >
        {FEATURES.map((f, i) => (
          <motion.div
            key={i}
            variants={staggerItem}
            whileHover={{ background:"#16161f" }}
            style={{ padding:"2.5rem", background:T.ink2, borderRight:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, position:"relative", overflow:"hidden" }}
          >
            <span style={{ fontSize:"1.5rem", marginBottom:"1.25rem", display:"block" }}>{f.icon}</span>
            <h4 style={{ fontSize:"1rem", fontWeight:500, marginBottom:".6rem" }}>{f.title}</h4>
            <p style={{ fontSize:".825rem", color:"rgba(245,243,238,.4)", lineHeight:1.7, fontWeight:300 }}>{f.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

// ─── Section: Platforms ───────────────────────────────────────────────────────
function PlatformsSection() {
  return (
    <section id="platforms" style={{ padding:"6rem 5rem", borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, background:T.ink2, textAlign:"center" }}>
      <motion.p initial="hidden" whileInView="visible" viewport={{ once:true }} variants={revealVariants}
        style={{ fontSize:".8rem", letterSpacing:".15em", textTransform:"uppercase", color:"rgba(245,243,238,.3)", marginBottom:"2.5rem" }}
      >
        Tracking prices across India's biggest platforms
      </motion.p>
      <motion.div
        initial="hidden" whileInView="visible" viewport={{ once:true }} variants={staggerContainer}
        style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"4rem", flexWrap:"wrap" }}
      >
        {PLATFORMS.map(p => (
          <motion.div
            key={p} variants={staggerItem}
            whileHover={{ color:T.gold }}
            style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.4rem", letterSpacing:".1em", color:"rgba(245,243,238,.2)", cursor:"none" }}
          >
            {p}
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

// ─── Section: CTA ─────────────────────────────────────────────────────────────
// function CTASection() {
//   const [email, setEmail] = useState("");
//   const [submitted, setSubmitted] = useState(false);

//   const handleSubmit = () => {
//     if (email.trim()) { setSubmitted(true); }
//   };

//   return (
//     <section id="cta" style={{ padding:"10rem 5rem", background:"radial-gradient(ellipse 80% 60% at 50% 50%, rgba(200,169,110,.08), transparent 70%), #0a0a0f", textAlign:"center", position:"relative", overflow:"hidden" }}>
//       {/* Ghost text */}
//       <div style={{ position:"absolute", fontFamily:"'Bebas Neue'", fontSize:"22vw", top:"50%", left:"50%", transform:"translate(-50%,-50%)", color:"rgba(200,169,110,.025)", letterSpacing:".05em", pointerEvents:"none" }}>START</div>

//       <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={revealVariants} style={{ position:"relative", zIndex:1 }}>
//         <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(3rem,7vw,6rem)", letterSpacing:".04em", lineHeight:1, marginBottom:"1.5rem" }}>
//           Ready to shop<br /><span style={{ color:T.gold }}>smarter?</span>
//         </h2>
//         <p style={{ fontSize:"1rem", color:"rgba(245,243,238,.45)", maxWidth:480, margin:"0 auto 2.5rem", fontWeight:300, lineHeight:1.7 }}>
//           Join thousands of smart shoppers who never pay full price. Free to start — no credit card needed.
//         </p>

//         <AnimatePresence mode="wait">
//           {submitted ? (
//             <motion.div key="done" initial={{ opacity:0, scale:.9 }} animate={{ opacity:1, scale:1 }} style={{ fontSize:"1.1rem", color:T.gold, marginBottom:"1.5rem" }}>
//               🎉 You're on the list! We'll be in touch soon.
//             </motion.div>
//           ) : (
//             <motion.div key="form" initial={{ opacity:1 }} exit={{ opacity:0 }} style={{ display:"flex", maxWidth:440, margin:"0 auto 1.5rem", border:`1px solid ${T.border2}`, borderRadius:3, overflow:"hidden" }}>
//               <input
//                 type="email"
//                 value={email}
//                 onChange={e => setEmail(e.target.value)}
//                 onKeyDown={e => e.key === "Enter" && handleSubmit()}
//                 placeholder="Enter your email address"
//                 style={{ flex:1, background:"rgba(200,169,110,.06)", border:"none", padding:"1rem 1.25rem", fontFamily:"'DM Sans',sans-serif", fontSize:".875rem", color:T.smoke, outline:"none" }}
//               />
//               <motion.button
//                 onClick={handleSubmit}
//                 whileHover={{ background:T.gold2 }}
//                 style={{ background:T.gold, color:T.ink, padding:"1rem 1.75rem", fontSize:".75rem", letterSpacing:".12em", textTransform:"uppercase", fontWeight:500, border:"none", cursor:"none", whiteSpace:"nowrap" }}
//               >
//                 Get Early Access
//               </motion.button>
//             </motion.div>
//           )}
//         </AnimatePresence>

//         <p style={{ fontSize:".75rem", color:"rgba(245,243,238,.25)", letterSpacing:".06em" }}>
//           No spam. Unsubscribe anytime. Free forever plan available.
//         </p>
//       </motion.div>
//     </section>
//   );
// }

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background:T.ink2, borderTop:`1px solid ${T.border}`, padding:"4rem 5rem 2.5rem" }}>
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:"4rem", marginBottom:"4rem" }}>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.4rem", letterSpacing:".12em", color:T.gold, marginBottom:"1rem" }}>ShopSense AI</div>
          <p style={{ fontSize:".825rem", color:"rgba(245,243,238,.35)", lineHeight:1.7, maxWidth:260, fontWeight:300 }}>
            India's most intelligent price tracking and shopping recommendation platform — powered by real-time scraping across Amazon, Flipkart, Myntra and Apollo Pharmacy.
          </p>
        </div>
        {Object.entries(FOOTER_LINKS).map(([col, links]) => (
          <div key={col}>
            <h4 style={{ fontSize:".7rem", letterSpacing:".15em", textTransform:"uppercase", color:"rgba(245,243,238,.35)", marginBottom:"1.25rem" }}>{col}</h4>
            <ul style={{ listStyle:"none" }}>
              {links.map(l => (
                <li key={l} style={{ marginBottom:".75rem" }}>
                  <a
                    href="#"
                    style={{ fontSize:".825rem", color:"rgba(245,243,238,.5)", textDecoration:"none", transition:"color .2s" }}
                    onMouseEnter={e => e.currentTarget.style.color = T.gold}
                    onMouseLeave={e => e.currentTarget.style.color = "rgba(245,243,238,.5)"}
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:"2rem", borderTop:`1px solid ${T.border}`, fontSize:".75rem", color:"rgba(245,243,238,.25)" }}>
        <span>© 2026 ShopSense AI. All rights reserved.</span>
        <div style={{ display:"flex", gap:"1.25rem" }}>
          {["Twitter","LinkedIn","GitHub","Instagram"].map(s => (
            <a
              key={s} href="#"
              style={{ fontSize:".7rem", letterSpacing:".1em", textTransform:"uppercase", color:"rgba(245,243,238,.3)", textDecoration:"none", transition:"color .2s" }}
              onMouseEnter={e => e.currentTarget.style.color = T.gold}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(245,243,238,.3)"}
            >
              {s}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────
export default function LandingPage({ onGetStarted, onDemo }) {
  const [liveProducts, setLiveProducts] = useState([]);

  // Inject Google Fonts if not already in index.html
  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
  }, []);

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([
      productService.getTrending(),
      productService.getDeals(),
    ]).then((results) => {
      if (!mounted) return;

      const merged = results.flatMap((result) =>
        result.status === "fulfilled" ? result.value.data?.products || [] : []
      );

      const seen = new Set();
      const mapped = merged
        .filter((product) => {
          const key = product?._id ?? product?.product_id ?? product?.source_id ?? product?.name;
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 4)
        .map(mapLandingProduct);

      setLiveProducts(mapped);
    });

    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    const id = "shopsense-fonts";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id   = id;
      link.rel  = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&family=DM+Serif+Display:ital@0;1&display=swap";
      document.head.appendChild(link);
    }

    // Global body styles
    document.body.style.background   = T.ink;
    document.body.style.color        = T.smoke;
    document.body.style.cursor       = "none";
    document.body.style.overflowX    = "hidden";
    document.body.style.fontFamily   = "'DM Sans', sans-serif";

    // Noise overlay
    const noiseId = "shopsense-noise";
    if (!document.getElementById(noiseId)) {
      const el = document.createElement("div");
      el.id = noiseId;
      el.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:1000;opacity:.4;background-image:url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")";
      document.body.appendChild(el);
    }

    return () => {
      document.body.style.cursor = "";
      const noise = document.getElementById("shopsense-noise");
      if (noise) noise.remove();
    };
  }, []);

  return (
    <div style={{ background: T.ink, color: T.smoke, fontFamily: "'DM Sans', sans-serif" }}>
      <Cursor />
      <Navbar onCta={onGetStarted} />
      <HeroSection onStart={onGetStarted} onDemo={onDemo} />
      <Marquee />
      <HowSection />
      <ProductsSection products={liveProducts} />
      <FeaturesSection />
      <FormulaSection />
      <PlatformsSection />
      {/* <CTASection /> */}
      <Footer />
    </div>
  );
}
