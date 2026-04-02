// /**
//  * AppLayout.jsx
//  * FIX: Sidebar + topbar avatars now update instantly when profile photo changes.
//  *
//  * Root cause: browser caches the old image URL. Even though user.avatar changes
//  * in AuthContext, the browser serves the old cached image.
//  *
//  * Solution: a shared AvatarImg component that:
//  *  1. Watches user.avatar via useAuth()
//  *  2. Appends a cache-busting key derived from the URL so browser fetches fresh
//  *  3. Falls back to initials on error
//  */
// import { useState, useEffect, useMemo } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { useTranslation } from "react-i18next";
// import { useAuth }  from "../context/AuthContext";
// import { useTheme } from "../context/ThemeContext";
// import { Bell, Search, Sun, Moon, LogOut, Menu, ChevronRight } from "lucide-react";
// import ChatBot      from "../components/chatbot/ChatBot";
// import DashboardPage     from "./DashboardPage";
// import ProductsPage      from "./ProductsPage";
// import AnalyticsPage     from "./AnalyticsPage";
// import ImageSearchPage   from "./ImageSearchPage";
// import FavoritesPage     from "./FavoritesPage";
// import NotificationsPage from "./NotificationsPage";
// import ProfilePage       from "./ProfilePage";
// import HelpPage          from "./HelpPage";

// const NAV_CONFIG = [
//   { id:"dashboard",     icon:"🏠", key:"nav.dashboard",     group:"main"     },
//   { id:"products",      icon:"🛒", key:"nav.products",      group:"main"     },
//   { id:"analytics",     icon:"📊", key:"nav.analytics",     group:"main"     },
//   { id:"imagesearch",   icon:"📸", key:"nav.imageSearch",   group:"main"     },
//   { id:"favorites",     icon:"❤️",  key:"nav.favorites",     group:"personal" },
//   { id:"notifications", icon:"🔔", key:"nav.notifications", group:"personal" },
//   { id:"profile",       icon:"👤", key:"nav.profile",       group:"personal" },
//   { id:"help",          icon:"🆘", key:"nav.help",          group:"personal" },
// ];

// const W    = 240;
// const EASE = [0.16, 1, 0.3, 1];

// // ─── THE KEY FIX: AvatarImg ───────────────────────────────────────────────────
// // A reactive avatar component that:
// // - Re-renders whenever user.avatar changes (reads from useAuth directly)
// // - Appends ?cb=<hash> to bust browser cache
// // - Shows initials as fallback
// function AvatarImg({ size = 32, fontSize = ".82rem", onClick }) {
//   const { user } = useAuth();                        // live subscription
//   const [broken, setBroken] = useState(false);

//   // Reset broken state when avatar URL changes
//   useEffect(() => { setBroken(false); }, [user?.avatar]);

//   // Build cache-busted URL
//   // user.avatar might already have ?t=xxx from ProfilePage — strip and re-add
//   const src = useMemo(() => {
//     if (!user?.avatar) return null;
//     const base = user.avatar.split("?")[0];          // strip old query string
//     const key  = btoa(base).slice(-8);               // stable short hash from URL
//     return `${base}?cb=${key}`;
//   }, [user?.avatar]);

//   const initials = user?.name?.[0]?.toUpperCase() || "U";

//   return (
//     <motion.div
//       onClick={onClick}
//       whileTap={onClick ? { scale:.93 } : {}}
//       style={{
//         width:size, height:size, borderRadius:"50%",
//         background:"linear-gradient(135deg,var(--gold),var(--gold2))",
//         border:"1.5px solid var(--border2)",
//         display:"flex", alignItems:"center", justifyContent:"center",
//         color:"var(--bg)", fontSize, fontWeight:700,
//         cursor:onClick ? "pointer" : "default",
//         overflow:"hidden", flexShrink:0,
//         userSelect:"none",
//       }}
//     >
//       {src && !broken ? (
//         <img
//           key={src}                                   // key change forces re-mount → fresh fetch
//           src={src}
//           alt="avatar"
//           onError={() => setBroken(true)}
//           style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center", display:"block" }}
//         />
//       ) : (
//         initials
//       )}
//     </motion.div>
//   );
// }

// // ─── NavItem ──────────────────────────────────────────────────────────────────
// function NavItem({ item, label, active, onClick, badge }) {
//   const [hov, setHov] = useState(false);
//   return (
//     <motion.button
//       onClick={onClick}
//       onMouseEnter={() => setHov(true)}
//       onMouseLeave={() => setHov(false)}
//       whileTap={{ scale:.97 }}
//       style={{
//         width:"100%", display:"flex", alignItems:"center",
//         gap:".7rem", padding:".58rem .8rem", borderRadius:10,
//         border: active ? "1px solid var(--border2)" : "1px solid transparent",
//         background: active ? "var(--active)" : hov ? "var(--hover)" : "transparent",
//         cursor:"pointer", marginBottom:2,
//       }}
//     >
//       <span style={{ width:30, height:30, borderRadius:8, background: active ? "var(--active2)" : "var(--card)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:".9rem", flexShrink:0 }}>
//         {item.icon}
//       </span>
//       <span style={{ fontSize:".82rem", fontFamily:"'DM Sans',sans-serif", fontWeight:active?600:400, color:active?"var(--gold)":hov?"var(--text)":"var(--text2)", flex:1, textAlign:"left", letterSpacing:".01em" }}>
//         {label}
//       </span>
//       {badge > 0 && (
//         <span style={{ background:item.id==="notifications"?"var(--rose)":"var(--gold)", color:item.id==="notifications"?"#fff":"var(--bg)", fontSize:".58rem", fontWeight:700, padding:"2px 7px", borderRadius:100, lineHeight:1.6 }}>
//           {badge}
//         </span>
//       )}
//       {active && <ChevronRight size={12} style={{ color:"var(--gold)", flexShrink:0 }}/>}
//     </motion.button>
//   );
// }

// // ─── IconBtn ──────────────────────────────────────────────────────────────────
// function IconBtn({ onClick, children, badge, title }) {
//   const [hov, setHov] = useState(false);
//   return (
//     <motion.button
//       onClick={onClick}
//       onMouseEnter={() => setHov(true)}
//       onMouseLeave={() => setHov(false)}
//       whileTap={{ scale:.92 }} title={title}
//       style={{ width:34, height:34, borderRadius:9, flexShrink:0, background:hov?"var(--active)":"var(--card)", border:`1px solid ${hov?"var(--border2)":"var(--border)"}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:hov?"var(--gold)":"var(--text3)", position:"relative" }}
//     >
//       {children}
//       {badge > 0 && (
//         <span style={{ position:"absolute", top:-4, right:-4, width:16, height:16, background:"var(--rose)", color:"#fff", fontSize:".55rem", fontWeight:700, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid var(--bg2)" }}>
//           {badge}
//         </span>
//       )}
//     </motion.button>
//   );
// }

// // ─── ThemeToggle ──────────────────────────────────────────────────────────────
// function ThemeToggle() {
//   const { isDark, toggleTheme } = useTheme();
//   return (
//     <motion.button
//       onClick={toggleTheme}
//       whileHover={{ scale:1.05 }} whileTap={{ scale:.88 }}
//       title={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
//       style={{ width:34, height:34, borderRadius:9, flexShrink:0, background:"var(--active)", border:"1px solid var(--border2)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"var(--gold)", position:"relative", overflow:"hidden" }}
//     >
//       <AnimatePresence mode="wait">
//         <motion.span key={isDark?"sun":"moon"}
//           initial={{ y:isDark?16:-16, opacity:0 }}
//           animate={{ y:0, opacity:1 }}
//           exit={{    y:isDark?-16:16, opacity:0 }}
//           transition={{ duration:.22, ease:EASE }}
//           style={{ display:"flex", lineHeight:0, position:"absolute" }}
//         >
//           {isDark ? <Sun size={15}/> : <Moon size={15}/>}
//         </motion.span>
//       </AnimatePresence>
//     </motion.button>
//   );
// }

// // ─── LangSelector ────────────────────────────────────────────────────────────
// function LangSelector() {
//   const { i18n } = useTranslation();
//   const changeLang = (lang) => {
//     i18n.changeLanguage(lang);
//     localStorage.setItem("ss-language", lang);
//   };
//   return (
//     <div style={{ position:"relative" }}>
//       <select value={i18n.language} onChange={e => changeLang(e.target.value)}
//         style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:8, padding:".38rem .5rem .38rem .65rem", paddingRight:"1.4rem", fontSize:".72rem", color:"var(--text2)", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", outline:"none", appearance:"none" }}>
//         <option value="en">🇬🇧 English</option>
//         <option value="hi">🇮🇳 हिन्दी</option>
//       </select>
//       <span style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", color:"var(--text3)", fontSize:".6rem" }}>▾</span>
//     </div>
//   );
// }

// // ─── AppLayout ────────────────────────────────────────────────────────────────
// export default function AppLayout() {
//   const { t }            = useTranslation();
//   const { user, logout } = useAuth();
//   const { isDark }       = useTheme();

//   const [page,        setPage]        = useState("dashboard");
//   const [modal,       setModal]       = useState(null);
//   const [sidebarOpen, setSidebarOpen] = useState(false);
//   const [unread,      setUnread]      = useState(2);
//   const [searchVal,   setSearchVal]   = useState("");
//   const [focused,     setFocused]     = useState(false);

//   useEffect(() => {
//     if (!document.getElementById("app-fonts")) {
//       const l = document.createElement("link");
//       l.id = "app-fonts"; l.rel = "stylesheet";
//       l.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap";
//       document.head.appendChild(l);
//     }
//   }, []);

//   const go = (id) => { setPage(id); setSidebarOpen(false); if (id === "notifications") setUnread(0); };
//   const changeLang = (lang) => { };   // handled by LangSelector

//   const renderPage = () => {
//     const p = { onProductClick: setModal };
//     switch (page) {
//       case "dashboard":     return <DashboardPage     {...p}/>;
//       case "products":      return <ProductsPage      {...p}/>;
//       case "analytics":     return <AnalyticsPage     {...p}/>;
//       case "imagesearch":   return <ImageSearchPage   {...p}/>;
//       case "favorites":     return <FavoritesPage     {...p}/>;
//       case "notifications": return <NotificationsPage onRead={() => setUnread(0)}/>;
//       case "profile":       return <ProfilePage/>;
//       case "help":          return <HelpPage/>;
//       default:              return <DashboardPage {...p}/>;
//     }
//   };

//   return (
//     <div style={{ display:"flex", minHeight:"100vh", background:"var(--bg)", color:"var(--text)", fontFamily:"'DM Sans',sans-serif" }}>

//       {/* Mobile overlay */}
//       <AnimatePresence>
//         {sidebarOpen && (
//           <motion.div key="ov" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
//             onClick={() => setSidebarOpen(false)}
//             style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:40, backdropFilter:"blur(4px)" }}
//           />
//         )}
//       </AnimatePresence>

//       {/* ── SIDEBAR ──────────────────────────────────────────────── */}
//       <aside style={{ position:"fixed", top:0, left:0, width:W, height:"100vh", background:"var(--bg2)", borderRight:"1px solid var(--border)", zIndex:50, display:"flex", flexDirection:"column" }}>

//         {/* Logo */}
//         <div style={{ padding:"1.4rem 1.25rem 1.2rem", borderBottom:"1px solid var(--border)" }}>
//           <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.3rem", letterSpacing:".1em", color:"var(--gold)", display:"flex", alignItems:"center", gap:".35rem" }}>
//             ✨ ShopSense <span style={{ color:"var(--text3)", fontSize:"1rem" }}>AI</span>
//           </div>
//           <div style={{ fontSize:".6rem", letterSpacing:".12em", textTransform:"uppercase", color:"var(--text3)", marginTop:".25rem" }}>Shopping Intelligence</div>
//         </div>

//         {/* Nav */}
//         <nav style={{ flex:1, overflowY:"auto", padding:".875rem .75rem", scrollbarWidth:"none" }}>
//           {["main","personal"].map(group => (
//             <div key={group}>
//               <div style={{ fontSize:".58rem", letterSpacing:".15em", textTransform:"uppercase", color:"var(--text3)", padding:"0 .85rem", marginBottom:".4rem", marginTop:group==="personal"?"1.25rem":0 }}>
//                 {group === "main" ? t("nav.groupMain","Main") : t("nav.groupPersonal","Personal")}
//               </div>
//               {NAV_CONFIG.filter(n => n.group === group).map(item => (
//                 <NavItem key={item.id} item={item} label={t(item.key)} active={page===item.id} onClick={() => go(item.id)} badge={item.id==="notifications"?unread:0}/>
//               ))}
//             </div>
//           ))}
//         </nav>

//         {/* ── SIDEBAR USER CARD (uses AvatarImg — updates automatically) ── */}
//         <div style={{ padding:".875rem .75rem", borderTop:"1px solid var(--border)" }}>
//           <div style={{ display:"flex", alignItems:"center", gap:".7rem", padding:".65rem .875rem", borderRadius:10, background:"var(--card)", border:"1px solid var(--border)" }}>

//             {/* AvatarImg reads from AuthContext directly — updates on photo change */}
//             <AvatarImg size={32} fontSize=".85rem" onClick={() => go("profile")} />

//             <div style={{ flex:1, minWidth:0 }}>
//               <div style={{ fontSize:".78rem", fontWeight:600, color:"var(--text)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
//                 {user?.name || "User"}
//               </div>
//               <div style={{ fontSize:".65rem", color:"var(--text3)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
//                 {user?.email || ""}
//               </div>
//             </div>

//             <motion.button onClick={logout} whileHover={{ color:"var(--rose)" }} title={t("nav.signOut")}
//               style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text3)", display:"flex", alignItems:"center", flexShrink:0 }}>
//               <LogOut size={14}/>
//             </motion.button>
//           </div>
//         </div>
//       </aside>

//       {/* ── MAIN ─────────────────────────────────────────────────── */}
//       <div style={{ flex:1, marginLeft:W, display:"flex", flexDirection:"column", minHeight:"100vh" }}>

//         {/* ── TOPBAR ─────────────────────────────────────────────── */}
//         <header style={{ height:58, background:"var(--bg2)", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:".75rem", padding:"0 1.5rem", position:"sticky", top:0, zIndex:30, backdropFilter:"blur(16px)" }}>

//           <motion.button whileTap={{ scale:.92 }} onClick={() => setSidebarOpen(true)}
//             className="ss-hamburger"
//             style={{ display:"none", background:"none", border:"none", cursor:"pointer", color:"var(--text2)", padding:4, flexShrink:0 }}>
//             <Menu size={20}/>
//           </motion.button>

//           {/* Search */}
//           <div style={{ display:"flex", alignItems:"center", gap:".6rem", flex:1, maxWidth:360, background:focused?"var(--active)":"var(--card)", border:`1px solid ${focused?"var(--border2)":"var(--border)"}`, borderRadius:10, padding:".5rem .875rem" }}>
//             <Search size={13} style={{ color:"var(--text3)", flexShrink:0 }}/>
//             <input value={searchVal} onChange={e => setSearchVal(e.target.value)}
//               onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
//               onKeyDown={e => { if (e.key==="Enter" && searchVal.trim()) go("products"); }}
//               placeholder={t("common.search") + "..."}
//               style={{ background:"none", border:"none", outline:"none", fontSize:".82rem", color:"var(--text)", fontFamily:"'DM Sans',sans-serif", width:"100%" }}
//             />
//           </div>

//           {/* Right */}
//           <div style={{ display:"flex", alignItems:"center", gap:".5rem", marginLeft:"auto" }}>
//             <LangSelector/>
//             <ThemeToggle/>
//             <IconBtn onClick={() => go("notifications")} badge={unread} title={t("nav.notifications")}>
//               <Bell size={14}/>
//             </IconBtn>
//             <div style={{ width:1, height:22, background:"var(--border)" }}/>

//             {/* ── TOPBAR AVATAR (uses AvatarImg — updates automatically) ── */}
//             <AvatarImg size={32} fontSize=".82rem" onClick={() => go("profile")} />

//             {/* Name + role */}
//             <div>
//               <div style={{ fontSize:".78rem", fontWeight:600, color:"var(--text)", lineHeight:1.2, maxWidth:90, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
//                 {user?.name?.split(" ")[0] || "User"}
//               </div>
//               <div style={{ fontSize:".62rem", color:"var(--text3)", letterSpacing:".04em" }}>
//                 {user?.profession || "Member"}
//               </div>
//             </div>
//           </div>
//         </header>

//         {/* ── PAGE ───────────────────────────────────────────────── */}
//         <main style={{ flex:1, overflowY:"auto", background:"var(--bg)" }}>
//           <AnimatePresence mode="wait">
//             <motion.div key={page} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }} transition={{ duration:.2, ease:EASE }}>
//               {renderPage()}
//             </motion.div>
//           </AnimatePresence>
//         </main>
//       </div>

//       <ChatBot/>

//       <style>{`
//         nav::-webkit-scrollbar { display:none; }
//         select option { background:var(--bg2); color:var(--text); }
//         @media(max-width:1023px){
//           .ss-hamburger { display:flex !important; }
//           aside { transform:translateX(${sidebarOpen?"0":`-${W}px`}) !important; transition:transform .3s ease !important; }
//         }
//       `}</style>
//     </div>
//   );
// }



/**
 * AppLayout.jsx
 * Collapsible sidebar:
 *  - Expanded (240px): shows icons + labels + group headers + user card
 *  - Collapsed (64px): shows only icons, tooltips on hover
 *  - Toggle button on sidebar edge
 *  - Smooth width transition via CSS
 *  - Main content margin adjusts automatically
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth }  from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  Bell, Search, Sun, Moon, LogOut,
  Menu, ChevronRight, ChevronLeft,
  PanelLeftClose, PanelLeftOpen, LoaderCircle,
} from "lucide-react";
import ChatBot      from "../components/chatbot/ChatBot";
import DashboardPage     from "./DashboardPage";
import ProductsPage      from "./ProductsPage";
import FavoritesPage     from "./FavoritesPage";
import NotificationsPage from "./NotificationsPage";
import ProfilePage       from "./ProfilePage";
import HelpPage          from "./HelpPage";
import ProductDetailPage from "./ProductDetailPage";

// ─── Constants ────────────────────────────────────────────────────────────────
const W_OPEN     = 240;   // expanded width
const W_CLOSED   = 64;    // collapsed width (icon only)
const EASE       = [0.16, 1, 0.3, 1];
const TRANSITION = "width 0.3s cubic-bezier(0.16,1,0.3,1), margin 0.3s cubic-bezier(0.16,1,0.3,1)";
const APP_PAGE_KEY = (userId) => `ss-active-page-${userId || 'guest'}`;
const APP_PAGE_GLOBAL_KEY = "ss-active-page-global";
const APP_SEARCH_INPUT_KEY = (userId) => `ss-search-input-${userId || 'guest'}`;
const APP_SEARCH_QUERY_KEY = (userId) => `ss-search-query-${userId || 'guest'}`;
const APP_DETAIL_STATE_KEY = (userId) => `ss-product-detail-${userId || 'guest'}`;
const APP_DETAIL_STATE_GLOBAL_KEY = "ss-product-detail-active";

function readStoredDetailState() {
  try {
    const raw = localStorage.getItem(APP_DETAIL_STATE_GLOBAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readPageFromHash() {
  const hash = window.location.hash.replace(/^#/, "").trim().toLowerCase();
  if (!hash) return null;

  if (hash === "product-details") return "product-details";

  const validPages = new Set([
    "dashboard",
    "products",
    "imagesearch",
    "favorites",
    "notifications",
    "profile",
    "help",
  ]);

  return validPages.has(hash) ? hash : null;
}

const NAV_CONFIG = [
  { id:"dashboard",     icon:"🏠", key:"nav.dashboard",     group:"main"     },
  { id:"products",      icon:"🛒", key:"nav.products",      group:"main"     },
  { id:"imagesearch",   icon:"📸", key:"nav.imageSearch",   group:"main"     },
  { id:"favorites",     icon:"❤️",  key:"nav.favorites",     group:"personal" },
  { id:"notifications", icon:"🔔", key:"nav.notifications", group:"personal" },
  { id:"profile",       icon:"👤", key:"nav.profile",       group:"personal" },
  { id:"help",          icon:"🆘", key:"nav.help",          group:"personal" },
];

// ─── AvatarImg — reactive, cache-busted ───────────────────────────────────────
function AvatarImg({ size = 32, fontSize = ".82rem", onClick }) {
  const { user } = useAuth();
  const [broken, setBroken] = useState(false);

  useEffect(() => { setBroken(false); }, [user?.avatar]);

  const src = useMemo(() => {
    if (!user?.avatar) return null;
    const base = user.avatar.split("?")[0];
    const key  = btoa(encodeURIComponent(base)).slice(-8);
    return `${base}?cb=${key}`;
  }, [user?.avatar]);

  const initials = user?.name?.[0]?.toUpperCase() || "U";

  return (
    <div onClick={onClick}
      style={{ width:size, height:size, borderRadius:"50%", background:"linear-gradient(135deg,var(--gold),var(--gold2))", border:"1.5px solid var(--border2)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--bg)", fontSize, fontWeight:700, cursor:onClick?"pointer":"default", overflow:"hidden", flexShrink:0, userSelect:"none" }}>
      {src && !broken
        ? <img key={src} src={src} alt="" onError={()=>setBroken(true)} style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center" }}/>
        : initials
      }
    </div>
  );
}

// ─── Tooltip wrapper (shown on hover when sidebar is collapsed) ───────────────
function Tooltip({ label, children, show }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ position:"relative" }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
      <AnimatePresence>
        {show && hov && (
          <motion.div
            initial={{ opacity:0, x:-6 }}
            animate={{ opacity:1, x:0 }}
            exit={{ opacity:0, x:-6 }}
            transition={{ duration:.15 }}
            style={{
              position:"absolute", left:"calc(100% + 12px)", top:"50%",
              transform:"translateY(-50%)",
              background:"var(--bg3,#1a1a26)",
              border:"1px solid var(--border2)",
              color:"var(--text)", fontSize:".78rem",
              padding:".35rem .75rem", borderRadius:7,
              whiteSpace:"nowrap", pointerEvents:"none", zIndex:200,
              boxShadow:"0 4px 16px var(--shadow)",
              fontFamily:"'DM Sans',sans-serif",
            }}
          >
            {/* Arrow */}
            <div style={{ position:"absolute", left:-5, top:"50%", transform:"translateY(-50%)", width:0, height:0, borderTop:"5px solid transparent", borderBottom:"5px solid transparent", borderRight:"5px solid var(--border2)" }}/>
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── NavItem ──────────────────────────────────────────────────────────────────
function NavItem({ item, label, active, onClick, badge, collapsed }) {
  const [hov, setHov] = useState(false);

  const btn = (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      whileTap={{ scale:.96 }}
      style={{
        width:"100%", display:"flex", alignItems:"center",
        gap: collapsed ? 0 : ".7rem",
        padding: collapsed ? ".6rem 0" : ".58rem .8rem",
        justifyContent: collapsed ? "center" : "flex-start",
        borderRadius:10,
        border: active ? "1px solid var(--border2)" : "1px solid transparent",
        background: active ? "var(--active)" : hov ? "var(--hover)" : "transparent",
        cursor:"pointer", marginBottom:2,
        transition:"background .18s, border-color .18s, padding .3s",
      }}
    >
      {/* Icon box */}
      <span style={{
        width:30, height:30, borderRadius:8,
        background: active ? "var(--active2)" : hov ? "var(--hover)" : "var(--card)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:"1rem", flexShrink:0,
        transition:"background .18s",
        position:"relative",
      }}>
        {item.icon}
        {/* Badge on icon when collapsed */}
        {collapsed && badge > 0 && (
          <span style={{ position:"absolute", top:-4, right:-4, width:14, height:14, background:"var(--rose)", color:"#fff", fontSize:".5rem", fontWeight:700, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:"1.5px solid var(--bg2)" }}>
            {badge}
          </span>
        )}
      </span>

      {/* Label + badge — only when expanded */}
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity:0, width:0 }}
            animate={{ opacity:1, width:"auto" }}
            exit={{ opacity:0, width:0 }}
            transition={{ duration:.25, ease:EASE }}
            style={{ display:"flex", alignItems:"center", flex:1, overflow:"hidden", whiteSpace:"nowrap" }}
          >
            <span style={{ fontSize:".82rem", fontFamily:"'DM Sans',sans-serif", fontWeight:active?600:400, color:active?"var(--gold)":hov?"var(--text)":"var(--text2)", flex:1, textAlign:"left", letterSpacing:".01em" }}>
              {label}
            </span>
            {badge > 0 && (
              <span style={{ background:item.id==="notifications"?"var(--rose)":"var(--gold)", color:item.id==="notifications"?"#fff":"var(--bg)", fontSize:".58rem", fontWeight:700, padding:"2px 7px", borderRadius:100, lineHeight:1.6, flexShrink:0 }}>
                {badge}
              </span>
            )}
            {active && <ChevronRight size={12} style={{ color:"var(--gold)", flexShrink:0, marginLeft:4 }}/>}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );

  return (
    <Tooltip label={label} show={collapsed}>
      {btn}
    </Tooltip>
  );
}

// ─── IconBtn (topbar) ─────────────────────────────────────────────────────────
function IconBtn({ onClick, children, badge, title }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} whileTap={{ scale:.92 }} title={title}
      style={{ width:34, height:34, borderRadius:9, flexShrink:0, background:hov?"var(--active)":"var(--card)", border:`1px solid ${hov?"var(--border2)":"var(--border)"}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:hov?"var(--gold)":"var(--text3)", position:"relative" }}>
      {children}
      {badge > 0 && (
        <span style={{ position:"absolute", top:-4, right:-4, width:16, height:16, background:"var(--rose)", color:"#fff", fontSize:".55rem", fontWeight:700, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid var(--bg2)" }}>
          {badge}
        </span>
      )}
    </motion.button>
  );
}

// ─── ThemeToggle ──────────────────────────────────────────────────────────────
function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <motion.button onClick={toggleTheme} whileHover={{ scale:1.05 }} whileTap={{ scale:.88 }}
      title={isDark?"Light mode":"Dark mode"}
      style={{ width:34, height:34, borderRadius:9, flexShrink:0, background:"var(--active)", border:"1px solid var(--border2)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"var(--gold)", position:"relative", overflow:"hidden" }}>
      <AnimatePresence mode="wait">
        <motion.span key={isDark?"sun":"moon"}
          initial={{ y:isDark?16:-16, opacity:0 }}
          animate={{ y:0, opacity:1 }}
          exit={{ y:isDark?-16:16, opacity:0 }}
          transition={{ duration:.22, ease:EASE }}
          style={{ display:"flex", lineHeight:0, position:"absolute" }}>
          {isDark ? <Sun size={15}/> : <Moon size={15}/>}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

// ─── LangSelector ────────────────────────────────────────────────────────────
function LangSelector() {
  const { i18n } = useTranslation();
  return (
    <div style={{ position:"relative" }}>
      <select value={i18n.language} onChange={e => { i18n.changeLanguage(e.target.value); localStorage.setItem("ss-language", e.target.value); }}
        style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:8, padding:".38rem .5rem .38rem .65rem", paddingRight:"1.4rem", fontSize:".72rem", color:"var(--text2)", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", outline:"none", appearance:"none" }}>
        <option value="en">🇬🇧 EN</option>
        <option value="hi">🇮🇳 HI</option>
      </select>
      <span style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", color:"var(--text3)", fontSize:".6rem" }}>▾</span>
    </div>
  );
}

// ─── AppLayout ────────────────────────────────────────────────────────────────
export default function AppLayout() {
  const { t }            = useTranslation();
  const { user, logout, loading: authLoading } = useAuth();
  const initialDetailState = readStoredDetailState();
  const initialPage = readPageFromHash() || localStorage.getItem(APP_PAGE_GLOBAL_KEY) || "dashboard";

  const [page,        setPage]        = useState(initialPage);
  const [selectedProduct, setSelectedProduct] = useState(initialPage === "product-details" ? initialDetailState?.product || null : null);
  const [detailReturnPage, setDetailReturnPage] = useState(initialDetailState?.returnPage || "products");
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [collapsed,   setCollapsed]   = useState(false);   // ← collapse state
  const [unread,      setUnread]      = useState(2);
  const [searchVal,   setSearchVal]   = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [searchToken, setSearchToken] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState("");
  const [focused,     setFocused]     = useState(false);

  // Persist collapse preference
  useEffect(() => {
    const saved = localStorage.getItem("ss-sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed(c => {
      localStorage.setItem("ss-sidebar-collapsed", String(!c));
      return !c;
    });
  };

  useEffect(() => {
    if (!document.getElementById("app-fonts")) {
      const l = document.createElement("link");
      l.id = "app-fonts"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap";
      document.head.appendChild(l);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    const rawDetailState = user
      ? localStorage.getItem(APP_DETAIL_STATE_KEY(user.id)) || localStorage.getItem(APP_DETAIL_STATE_GLOBAL_KEY)
      : localStorage.getItem(APP_DETAIL_STATE_GLOBAL_KEY);

    if (page === "product-details" && rawDetailState && !selectedProduct) {
      try {
        const parsed = JSON.parse(rawDetailState);
        if (parsed?.product) {
          setSelectedProduct(parsed.product);
          setDetailReturnPage(parsed.returnPage || "products");
        }
      } catch {
        if (user?.id) {
          localStorage.removeItem(APP_DETAIL_STATE_KEY(user.id));
        }
        localStorage.removeItem(APP_DETAIL_STATE_GLOBAL_KEY);
      }
    }
  }, [authLoading, page, selectedProduct, user]);

  useEffect(() => {
    if (authLoading) return;

    localStorage.setItem(APP_PAGE_GLOBAL_KEY, page);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${page}`);

    if (user) {
      localStorage.setItem(APP_PAGE_KEY(user.id), page);

      if (page === "product-details" && selectedProduct) {
        const detailState = JSON.stringify({
          product: selectedProduct,
          returnPage: detailReturnPage || "products",
        });
        localStorage.setItem(APP_DETAIL_STATE_KEY(user.id), detailState);
        localStorage.setItem(APP_DETAIL_STATE_GLOBAL_KEY, detailState);
      } else {
        localStorage.removeItem(APP_DETAIL_STATE_KEY(user.id));
        localStorage.removeItem(APP_DETAIL_STATE_GLOBAL_KEY);
      }
    } else if (page !== "product-details") {
      localStorage.removeItem(APP_DETAIL_STATE_GLOBAL_KEY);
    }
  }, [authLoading, detailReturnPage, page, selectedProduct, user?.id]);

  // Restore search query on mount/user change
  useEffect(() => {
    if (user?.id) {
      const savedSearch = localStorage.getItem(APP_SEARCH_QUERY_KEY(user.id));
      if (savedSearch) {
        setSearchVal(savedSearch);
        setSubmittedSearch(savedSearch);
      }
    }
  }, [user?.id]);

  // Save search query to localStorage
  useEffect(() => {
    if (user?.id && submittedSearch) {
      localStorage.setItem(APP_SEARCH_QUERY_KEY(user.id), submittedSearch);
    }
  }, [user?.id, submittedSearch]);

  const go = (id) => {
    setPage(id);
    setMobileOpen(false);
    if (id === "notifications") setUnread(0);
  };

  const openProductDetails = (product) => {
    if (!product) return;
    const nextReturnPage = page;
    const detailState = JSON.stringify({
      product,
      returnPage: nextReturnPage || "products",
    });

    localStorage.setItem(APP_DETAIL_STATE_GLOBAL_KEY, detailState);
    if (user?.id) {
      localStorage.setItem(APP_DETAIL_STATE_KEY(user.id), detailState);
    }

    setSelectedProduct(product);
    setDetailReturnPage(nextReturnPage);
    setPage("product-details");
    setMobileOpen(false);
  };

  const closeProductDetails = () => {
    localStorage.removeItem(APP_DETAIL_STATE_GLOBAL_KEY);
    if (user?.id) {
      localStorage.removeItem(APP_DETAIL_STATE_KEY(user.id));
    }
    setSelectedProduct(null);
    setPage(detailReturnPage || "products");
  };

  const handleResetSearch = useCallback(() => {
    setSubmittedSearch("");
    setSearchVal("");
    if (user?.id) {
      localStorage.removeItem(APP_SEARCH_QUERY_KEY(user.id));
    }
  }, [user?.id]);

  const sidebarW = collapsed ? W_CLOSED : W_OPEN;

  const renderPage = () => {
    const p = {
      onProductClick: openProductDetails,
      onSearchStateChange: setSearching,
      onSearchStatusChange: setSearchStatus,
      onResetSearch: handleResetSearch,
    };
    switch (page) {
      case "dashboard":     return <DashboardPage     {...p}/>;
      case "products":      return <ProductsPage      {...p} initialQuery={submittedSearch} searchToken={searchToken} />;
      case "favorites":     return <FavoritesPage     {...p}/>;
      case "notifications": return <NotificationsPage onRead={() => setUnread(0)}/>;
      case "profile":       return <ProfilePage/>;
      case "help":          return <HelpPage/>;
      case "product-details":
        return <ProductDetailPage product={selectedProduct} onBack={closeProductDetails} />;
      default:              return <DashboardPage {...p}/>;
    }
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"var(--bg)", color:"var(--text)", fontFamily:"'DM Sans',sans-serif" }}>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div key="ov" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setMobileOpen(false)}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:40, backdropFilter:"blur(4px)" }}
          />
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════════════ */}
      <aside style={{
        position:   "fixed",
        top:        0,
        left:       0,
        width:      sidebarW,
        height:     "100vh",
        background: "var(--bg2)",
        borderRight:"1px solid var(--border)",
        zIndex:     50,
        display:    "flex",
        flexDirection:"column",
        overflow:   "hidden",
        transition: TRANSITION,
      }}>

        {/* ── Logo ── */}
        <div style={{ padding: collapsed ? ".875rem 0" : "1.4rem 1.25rem 1.2rem", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent: collapsed ? "center" : "flex-start", gap:".35rem", transition:"padding .3s, justify-content .3s", flexShrink:0 }}>
          {collapsed ? (
            <span style={{ fontSize:"1.25rem" }}>✨</span>
          ) : (
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"1.3rem", letterSpacing:".1em", color:"var(--gold)", display:"flex", alignItems:"center", gap:".35rem" }}>
                ✨ ShopSense <span style={{ color:"var(--text3)", fontSize:"1rem" }}>AI</span>
              </div>
              <div style={{ fontSize:".6rem", letterSpacing:".12em", textTransform:"uppercase", color:"var(--text3)", marginTop:".25rem", whiteSpace:"nowrap" }}>
                Shopping Intelligence
              </div>
            </div>
          )}
        </div>

        {/* ── Nav ── */}
        <nav style={{ flex:1, overflowY:"auto", overflowX:"hidden", padding: collapsed ? ".875rem .55rem" : ".875rem .75rem", scrollbarWidth:"none", transition:"padding .3s" }}>
          {["main","personal"].map(group => (
            <div key={group}>
              {/* Group label — hidden when collapsed */}
              {!collapsed && (
                <div style={{ fontSize:".58rem", letterSpacing:".15em", textTransform:"uppercase", color:"var(--text3)", padding:"0 .85rem", marginBottom:".4rem", marginTop:group==="personal"?"1.25rem":0, whiteSpace:"nowrap" }}>
                  {group === "main" ? t("nav.groupMain","Main") : t("nav.groupPersonal","Personal")}
                </div>
              )}
              {/* Divider line when collapsed */}
              {collapsed && group === "personal" && (
                <div style={{ height:1, background:"var(--border)", margin:".75rem .25rem", borderRadius:1 }}/>
              )}
              {NAV_CONFIG.filter(n => n.id !== "imagesearch" && n.group === group).map(item => (
                <NavItem
                  key={item.id}
                  item={item}
                  label={t(item.key)}
                  active={page === item.id}
                  onClick={() => go(item.id)}
                  badge={item.id === "notifications" ? unread : 0}
                  collapsed={collapsed}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* ── User card ── */}
        <div style={{ padding: collapsed ? ".875rem .55rem" : ".875rem .75rem", borderTop:"1px solid var(--border)", flexShrink:0, transition:"padding .3s" }}>
          {collapsed ? (
            // Collapsed: just avatar centered with tooltip
            <Tooltip label={user?.name || "User"} show={collapsed}>
              <div style={{ display:"flex", justifyContent:"center" }}>
                <AvatarImg size={36} onClick={() => go("profile")} />
              </div>
            </Tooltip>
          ) : (
            // Expanded: full user card
            <div style={{ display:"flex", alignItems:"center", gap:".7rem", padding:".65rem .875rem", borderRadius:10, background:"var(--card)", border:"1px solid var(--border)" }}>
              <AvatarImg size={32} fontSize=".85rem" onClick={() => go("profile")} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:".78rem", fontWeight:600, color:"var(--text)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {user?.name || "User"}
                </div>
                <div style={{ fontSize:".65rem", color:"var(--text3)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {user?.email || ""}
                </div>
              </div>
              <motion.button onClick={logout} whileHover={{ color:"var(--rose)" }} title={t("nav.signOut")}
                style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text3)", display:"flex", alignItems:"center", flexShrink:0 }}>
                <LogOut size={14}/>
              </motion.button>
            </div>
          )}
        </div>

        {/* ── COLLAPSE TOGGLE BUTTON (on sidebar edge) ── */}
        <motion.button
          onClick={toggleCollapsed}
          whileHover={{ background:"var(--active2)", borderColor:"var(--border2)" }}
          whileTap={{ scale:.9 }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            position:   "absolute",
            top:        "50%",
            right:      -14,
            transform:  "translateY(-50%)",
            width:      28,
            height:     28,
            borderRadius:"50%",
            background: "var(--bg2)",
            border:     "1.5px solid var(--border2)",
            display:    "flex",
            alignItems: "center",
            justifyContent:"center",
            cursor:     "pointer",
            color:      "var(--gold)",
            zIndex:     60,
            boxShadow:  "0 2px 8px var(--shadow)",
            transition: "background .2s, border-color .2s",
          }}
        >
          <motion.span
            animate={{ rotate: collapsed ? 0 : 180 }}
            transition={{ duration:.3, ease:EASE }}
            style={{ display:"flex", lineHeight:0 }}
          >
            <ChevronRight size={14}/>
          </motion.span>
        </motion.button>
      </aside>

      {/* ══════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════ */}
      <div style={{
        flex:          1,
        marginLeft:    sidebarW,
        display:       "flex",
        flexDirection: "column",
        minHeight:     "100vh",
        transition:    TRANSITION,
      }}>

        {/* ── TOPBAR ── */}
        <header style={{ height:58, background:"var(--bg2)", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:".75rem", padding:"0 1.5rem", position:"sticky", top:0, zIndex:30, backdropFilter:"blur(16px)" }}>

          {/* Mobile hamburger */}
          <motion.button whileTap={{ scale:.92 }} onClick={() => setMobileOpen(true)}
            className="ss-hamburger"
            style={{ display:"none", background:"none", border:"none", cursor:"pointer", color:"var(--text2)", padding:4, flexShrink:0 }}>
            <Menu size={20}/>
          </motion.button>

          {/* Search */}
          <div style={{ display:"flex", alignItems:"center", gap:".6rem", flex:1, maxWidth:440, background:searching||focused?"var(--active)":"var(--card)", border:`1px solid ${searching||focused?"var(--border2)":"var(--border)"}`, borderRadius:12, padding:".5rem .875rem", boxShadow:searching?"0 0 0 3px rgba(212,175,55,.08)":"none", transition:"all .2s ease" }}>
            {searching ? (
              <LoaderCircle size={13} className="animate-spin" style={{ color:"var(--gold)", flexShrink:0 }}/>
            ) : (
              <Search size={13} style={{ color:"var(--text3)", flexShrink:0 }}/>
            )}
            <input
              className="ss-search-input"
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              onKeyDown={e => {
                if (e.key === "Enter" && searchVal.trim().length >= 3) {
                  const normalizedSearch = searchVal.trim();
                  setSearchVal(normalizedSearch);
                  setSubmittedSearch(normalizedSearch);
                  setSearchToken((current) => current + 1);
                  setSearching(true);
                  setSearchStatus("Searching");
                  go("products");
                }
              }}
              placeholder={t("common.search") + "..."}
              style={{
                background:"none",
                border:"none",
                outline:"none",
                fontSize:".82rem",
                color:"var(--text)",
                caretColor:"var(--gold)",
                WebkitTextFillColor:"var(--text)",
                fontFamily:"'DM Sans',sans-serif",
                width:"100%"
              }}
            />
            {searching && (
              <span style={{ flexShrink:0, padding:"4px 8px", borderRadius:999, background:"rgba(212,175,55,.14)", color:"var(--gold)", fontSize:".66rem", fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", whiteSpace:"nowrap" }}>
                {searchStatus || "Working"}
              </span>
            )}
          </div>

          {/* Right */}
          <div style={{ display:"flex", alignItems:"center", gap:".5rem", marginLeft:"auto" }}>
            <LangSelector/>
            <ThemeToggle/>
            <IconBtn onClick={() => go("notifications")} badge={unread} title={t("nav.notifications")}>
              <Bell size={14}/>
            </IconBtn>
            <div style={{ width:1, height:22, background:"var(--border)" }}/>
            <AvatarImg size={32} fontSize=".82rem" onClick={() => go("profile")}/>
            <div>
              <div style={{ fontSize:".78rem", fontWeight:600, color:"var(--text)", lineHeight:1.2, maxWidth:90, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {user?.name?.split(" ")[0] || "User"}
              </div>
              <div style={{ fontSize:".62rem", color:"var(--text3)", letterSpacing:".04em" }}>
                {user?.profession || "Member"}
              </div>
            </div>
          </div>
        </header>

        {/* ── PAGE ── */}
        <main style={{ flex:1, overflowY:"auto", background:"var(--bg)" }}>
          <AnimatePresence mode="wait">
            <motion.div key={page} initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:.2, ease:EASE }}>
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <ChatBot/>

      <style>{`
        nav::-webkit-scrollbar { display:none; }
        select option { background:var(--bg2); color:var(--text); }
        .ss-search-input::placeholder { color: var(--text3); opacity: 1; }
        .ss-search-input::-ms-input-placeholder { color: var(--text3); }
        .ss-search-input:-webkit-autofill,
        .ss-search-input:-webkit-autofill:hover,
        .ss-search-input:-webkit-autofill:focus {
          -webkit-text-fill-color: var(--text);
          caret-color: var(--gold);
          transition: background-color 9999s ease-in-out 0s;
          box-shadow: inset 0 0 0 1000px var(--card);
        }
        @media(max-width:1023px){
          .ss-hamburger { display:flex !important; }
        }
      `}</style>
    </div>
  );
}
