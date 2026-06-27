/**
 * NotificationsPage.jsx
 * - Each notification has a ✕ cross button to delete it
 * - Mark all read button
 * - Click notification to mark as read
 * - Smooth exit animation when deleted
 * - Notification channel toggles
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, CheckCheck, Trash2 } from "lucide-react";
import { notificationService } from "../services/authService";
import Toggle from "../components/ui/Toggle";
import toast from "react-hot-toast";

// ─── Mock data (used when DB is empty) ───────────────────────────────────────
const MOCK_NOTIFS = [
  { id:"1", type:"price_drop",  title:"Price Drop Alert!",   message:"Samsung Galaxy S24 Ultra dropped ₹5,000 — now ₹89,999",  time:"5 min ago",  isRead:false },
  { id:"2", type:"trend_alert", title:"Trending Now 🔥",     message:"Sony WH-1000XM5 is going viral on Twitter",               time:"1 hr ago",   isRead:false },
  { id:"3", type:"buy_now",     title:"Best Time to Buy!",   message:"AirPods Pro 2 is at its lowest price this month",         time:"2 hrs ago",  isRead:true  },
  { id:"4", type:"flash_sale",  title:"Flash Sale Detected", message:"Flipkart Big Billion Days starting in 2 days",            time:"3 hrs ago",  isRead:true  },
  { id:"5", type:"system",      title:"Weekly AI Report",    message:"Your ShopSense AI report is ready — 3 gems found!",       time:"1 day ago",  isRead:true  },
];

const TYPE_META = {
  price_drop:  { icon:"📉", bg:"rgba(16,185,129,.12)",  border:"rgba(16,185,129,.25)",  color:"#10b981" },
  trend_alert: { icon:"🔥", bg:"rgba(244,63,94,.12)",   border:"rgba(244,63,94,.25)",   color:"#f43f5e" },
  buy_now:     { icon:"⏰", bg:"rgba(200,169,110,.12)", border:"rgba(200,169,110,.25)", color:"var(--gold)" },
  flash_sale:  { icon:"🎉", bg:"rgba(251,191,36,.12)",  border:"rgba(251,191,36,.25)",  color:"#fbbf24" },
  system:      { icon:"📢", bg:"rgba(56,189,248,.12)",  border:"rgba(56,189,248,.25)",  color:"#38bdf8" },
};

const CHANNELS = [
  { key:"email",    label:"📧 Email Notifications",   on:true  },
  { key:"sms",      label:"📱 SMS Alerts",             on:true  },
  { key:"whatsapp", label:"💬 WhatsApp Notifications", on:false },
  { key:"push",     label:"🔔 Push Notifications",     on:true  },
];

export default function NotificationsPage({ onRead }) {
  const [notifs,   setNotifs]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [channels, setChannels] = useState(CHANNELS);

  // Load from API
  useEffect(() => {
    notificationService.getAll()
      .then(({ data }) => {
        const list = (data.notifications || []).map((item) => ({
          ...item,
          id: item._id || item.id,
          time: item.createdAt
            ? new Date(item.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
            : item.time,
        }));
        setNotifs(list);
      })
      .catch(() => setNotifs([]))
      .finally(() => setLoading(false));
  }, []);

  const unreadCount = notifs.filter(n => !n.isRead).length;

  // ── Mark single as read ────────────────────────────────────────────────────
  const markRead = async (id) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    try { await notificationService.markRead(id); } catch {}
    if (notifs.filter(n => !n.isRead).length <= 1) onRead?.();
  };

  // ── Mark all read ──────────────────────────────────────────────────────────
  const markAllRead = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    onRead?.();
    toast.success("All notifications marked as read");
    try { await notificationService.markAllRead(); } catch {}
  };

  // ── Delete single notification ─────────────────────────────────────────────
  const deleteNotif = async (id, e) => {
    e.stopPropagation();   // don't trigger markRead
    setNotifs(prev => prev.filter(n => n.id !== id));
    toast.success("Notification removed", { duration: 2000 });
    try { await notificationService.delete(id); } catch {}
  };

  // ── Delete all ─────────────────────────────────────────────────────────────
  const deleteAll = async () => {
    setNotifs([]);
    onRead?.();
    toast.success("All notifications cleared");
    try { await notificationService.deleteAll(); } catch {}
  };

  // ── Toggle channel ─────────────────────────────────────────────────────────
  const toggleChannel = (key) => {
    setChannels(prev => prev.map(c => c.key === key ? { ...c, on: !c.on } : c));
  };

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: 760, margin: "0 auto" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: ".6rem", marginBottom: ".4rem" }}>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.8rem", color: "var(--text)", margin: 0 }}>
              Notifications
            </h1>
            <Bell size={22} style={{ color: "var(--gold)" }} />
          </div>
          <p style={{ fontSize: ".875rem", color: "var(--text2)", margin: 0 }}>
            {unreadCount > 0
              ? <><span style={{ color: "var(--gold)", fontWeight: 600 }}>{unreadCount} unread</span> alerts</>
              : "All caught up! No unread notifications."
            }
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: ".625rem" }}>
          {unreadCount > 0 && (
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: .96 }}
              onClick={markAllRead}
              style={{
                display: "flex", alignItems: "center", gap: ".5rem",
                background: "var(--active)", border: "1px solid var(--border2)",
                color: "var(--gold)",
                borderRadius: 8, padding: ".55rem 1rem",
                fontSize: ".78rem", fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                cursor: "pointer", letterSpacing: ".03em",
              }}
            >
              <CheckCheck size={14} />
              Mark all read
            </motion.button>
          )}
          {notifs.length > 0 && (
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: .96 }}
              onClick={deleteAll}
              style={{
                display: "flex", alignItems: "center", gap: ".5rem",
                background: "rgba(244,63,94,.08)", border: "1px solid rgba(244,63,94,.2)",
                color: "var(--rose)",
                borderRadius: 8, padding: ".55rem 1rem",
                fontSize: ".78rem", fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                cursor: "pointer", letterSpacing: ".03em",
              }}
            >
              <Trash2 size={14} />
              Clear all
            </motion.button>
          )}
        </div>
      </div>

      {/* ── Notification list ───────────────────────────────────────────────── */}
      {loading ? (
        // Skeleton
        <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 76, borderRadius: 12, background: "var(--card)", border: "1px solid var(--border)", animation: "ss-pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      ) : notifs.length === 0 ? (
        // Empty state
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: "center", padding: "4rem 2rem", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16 }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔔</div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.2rem", color: "var(--text)", marginBottom: ".5rem" }}>No notifications</div>
          <div style={{ fontSize: ".875rem", color: "var(--text2)" }}>You're all caught up! Notifications will appear here.</div>
        </motion.div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: ".625rem", marginBottom: "2rem" }}>
          <AnimatePresence initial={false}>
            {notifs.map(n => {
              const meta = TYPE_META[n.type] || TYPE_META.system;
              return (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0,  height: "auto" }}
                  exit={{   opacity: 0, x: 60,  height: 0, marginBottom: 0 }}
                  transition={{ duration: .28, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => !n.isRead && markRead(n.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "1rem 1.125rem",
                    borderRadius: 12,
                    background: "var(--bg2)",
                    border: `1px solid ${!n.isRead ? meta.border : "var(--border)"}`,
                    borderLeft: !n.isRead ? `3px solid ${meta.color}` : "1px solid var(--border)",
                    cursor: !n.isRead ? "pointer" : "default",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Unread background glow */}
                  {!n.isRead && (
                    <div style={{ position: "absolute", inset: 0, background: meta.bg, pointerEvents: "none", borderRadius: 12 }} />
                  )}

                  {/* Icon */}
                  <div style={{
                    width: 42, height: 42, borderRadius: 10,
                    background: meta.bg,
                    border: `1px solid ${meta.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.15rem", flexShrink: 0, position: "relative",
                  }}>
                    {meta.icon}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".25rem" }}>
                      <span style={{
                        fontSize: ".875rem", fontWeight: n.isRead ? 500 : 700,
                        color: "var(--text)", fontFamily: "'DM Sans', sans-serif",
                      }}>
                        {n.title}
                      </span>
                      {/* Unread dot */}
                      {!n.isRead && (
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: meta.color, flexShrink: 0, display: "inline-block" }} />
                      )}
                    </div>
                    <div style={{ fontSize: ".8rem", color: "var(--text2)", marginBottom: ".3rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: ".7rem", color: "var(--text3)", letterSpacing: ".03em" }}>
                      {n.time}
                    </div>
                  </div>

                  {/* ✕ Cross / Delete button */}
                  <motion.button
                    onClick={(e) => deleteNotif(n.id, e)}
                    whileHover={{ scale: 1.15, background: "rgba(244,63,94,.15)", color: "var(--rose)" }}
                    whileTap={{ scale: .9 }}
                    title="Remove notification"
                    style={{
                      width: 28, height: 28,
                      borderRadius: "50%",
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer",
                      color: "var(--text3)",
                      flexShrink: 0,
                      position: "relative", zIndex: 1,
                      fontFamily: "inherit",
                    }}
                  >
                    <X size={13} strokeWidth={2.5} />
                  </motion.button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── Notification channel settings ───────────────────────────────────── */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.5rem" }}>
        <div style={{ fontSize: ".65rem", letterSpacing: ".15em", textTransform: "uppercase", color: "var(--text3)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
          <div style={{ width: 20, height: 1, background: "var(--gold)" }} />
          Notification Channels
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {channels.map((item, i) => (
            <div
              key={item.key}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: ".875rem 0",
                borderBottom: i < channels.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div>
                <div style={{ fontSize: ".875rem", color: "var(--text)", marginBottom: ".15rem" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: ".72rem", color: "var(--text3)" }}>
                  {item.on ? "✅ Active" : "⛔ Paused"}
                </div>
              </div>
              <Toggle
                checked={item.on}
                onChange={() => toggleChannel(item.key)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Keyframe for skeleton pulse */}
      <style>{`
        @keyframes ss-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
