/**
 * ChatBot.jsx
 * Premium AI shopping assistant chatbot
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Minus, ShoppingBag } from "lucide-react";
import api from "../../services/api";

const QUICK_CHIPS = [
  { label: "Best phone under Rs 50k", q: "best phone under 50000" },
  { label: "Today's top deals", q: "best deals today" },
  { label: "Best headphones", q: "best headphones" },
  { label: "Hidden gems", q: "hidden gem products" },
  { label: "Recent price drops", q: "price drop" },
];

function TypingDots() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "10px 14px",
        background: "var(--bg3, #22222c)",
        borderRadius: "18px 18px 18px 4px",
        width: "fit-content",
      }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--text3, rgba(240,238,232,.32))",
          }}
        />
      ))}
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: 6,
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "linear-gradient(135deg,var(--gold,#c8a96e),var(--gold2,#e8c98e))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            flexShrink: 0,
            marginRight: 8,
            marginTop: 2,
            border: "1.5px solid var(--border2,rgba(200,169,110,.3))",
          }}
        >
          AI
        </div>
      )}

      <div
        style={{
          maxWidth: "78%",
          padding: isUser ? "9px 14px" : "10px 14px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isUser
            ? "linear-gradient(135deg,var(--gold,#c8a96e),var(--gold2,#e8c98e))"
            : "var(--bg3, #22222c)",
          color: isUser ? "var(--bg,#0f0f13)" : "var(--text,#f0eee8)",
          fontSize: 13,
          lineHeight: 1.55,
          fontFamily: "'DM Sans',sans-serif",
          fontWeight: isUser ? 500 : 400,
          whiteSpace: "pre-line",
          wordBreak: "break-word",
          border: isUser ? "none" : "1px solid var(--border,rgba(200,169,110,.15))",
        }}
      >
        {msg.text}
      </div>
    </motion.div>
  );
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [msgs, setMsgs] = useState([
    {
      role: "bot",
      text:
        "Hi! I'm your ShopSense AI assistant.\n\nI can help you find products, compare options, and spot better deals. What are you looking for?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [focused, setFocused] = useState(false);

  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    if (open && !minimized) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [msgs, open, minimized]);

  const addBotMessages = useCallback(
    (lines, delay = 600) => {
      lines.forEach((line, i) => {
        setTimeout(() => {
          setMsgs((current) => [...current, { role: "bot", text: line }]);
          if (!open) {
            setUnread((current) => current + 1);
          }
        }, delay + i * 350);
      });
    },
    [open]
  );

  const buildHistory = useCallback((messages, latestQuestion) => {
    const history = messages
      .filter((msg) => msg?.text && (msg.role === "user" || msg.role === "bot"))
      .map((msg) => ({
        role: msg.role,
        text: msg.text,
      }));

    history.push({ role: "user", text: latestQuestion });
    return history.slice(-10);
  }, []);

  const send = useCallback(
    async (textOverride) => {
      const q = (textOverride || input).trim();
      if (!q || loading) {
        return;
      }

      setInput("");
      setMsgs((current) => [...current, { role: "user", text: q }]);
      setLoading(true);

      try {
        const { data } = await api.post("/chatbot", {
          message: q,
          context: "User is asking about shopping and products on ShopSense platform",
          history: buildHistory(msgs, q),
        });

        if (data.success && data.message) {
          addBotMessages([data.message], 0);
        } else {
          addBotMessages([data.message || "I couldn't process your request right now. Please try again."], 0);
        }
      } catch (error) {
        console.error("Chatbot error:", error);
        addBotMessages(
          [error?.response?.data?.message || "Something went wrong while contacting Groq. Try again in a moment!"],
          0
        );
      } finally {
        setLoading(false);
      }
    },
    [input, loading, msgs, addBotMessages, buildHistory]
  );

  const showChips = msgs.length <= 2;

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, fontFamily: "'DM Sans',sans-serif" }}>
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "absolute",
              bottom: 72,
              right: 0,
              width: 360,
              background: "var(--bg2, #18181f)",
              border: "1px solid var(--border2, rgba(200,169,110,.32))",
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 24px 60px var(--shadow, rgba(0,0,0,.5)), 0 0 0 1px var(--border, rgba(200,169,110,.15))",
              display: "flex",
              flexDirection: "column",
              height: minimized ? "auto" : 500,
            }}
          >
            <div
              style={{
                padding: "14px 16px",
                borderBottom: minimized ? "none" : "1px solid var(--border,rgba(200,169,110,.15))",
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "var(--bg2,#18181f)",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,var(--gold,#c8a96e),var(--gold2,#e8c98e))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                  border: "2px solid var(--border2,rgba(200,169,110,.32))",
                }}
              >
                AI
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text,#f0eee8)", lineHeight: 1.2 }}>
                  ShopSense AI
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green,#10b981)" }}
                  />
                  <span style={{ fontSize: 11, color: "var(--green,#10b981)", letterSpacing: ".04em" }}>
                    Online - Groq
                  </span>
                </div>
              </div>

              <motion.button
                onClick={() => setMinimized((current) => !current)}
                whileHover={{ background: "var(--hover,rgba(240,238,232,.06))" }}
                whileTap={{ scale: 0.9 }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "var(--card,rgba(240,238,232,.03))",
                  border: "1px solid var(--border,rgba(200,169,110,.15))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text2,rgba(240,238,232,.58))",
                  flexShrink: 0,
                }}
              >
                <Minus size={13} />
              </motion.button>

              <motion.button
                onClick={() => setOpen(false)}
                whileHover={{
                  background: "rgba(244,63,94,.12)",
                  color: "var(--rose,#f43f5e)",
                  borderColor: "rgba(244,63,94,.3)",
                }}
                whileTap={{ scale: 0.9 }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "var(--card,rgba(240,238,232,.03))",
                  border: "1px solid var(--border,rgba(200,169,110,.15))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text2,rgba(240,238,232,.58))",
                  flexShrink: 0,
                }}
              >
                <X size={13} />
              </motion.button>
            </div>

            {!minimized && (
              <>
                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "14px 14px 8px",
                    display: "flex",
                    flexDirection: "column",
                    scrollbarWidth: "thin",
                    scrollbarColor: "var(--border) transparent",
                  }}
                >
                  {msgs.map((msg, i) => (
                    <MessageBubble key={i} msg={msg} />
                  ))}

                  {loading && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 6 }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg,var(--gold,#c8a96e),var(--gold2,#e8c98e))",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0,
                          border: "1.5px solid var(--border2,rgba(200,169,110,.3))",
                        }}
                      >
                        AI
                      </div>
                      <TypingDots />
                    </motion.div>
                  )}

                  <div ref={endRef} />
                </div>

                <AnimatePresence>
                  {showChips && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{
                        padding: "0 12px 10px",
                        borderTop: "1px solid var(--border,rgba(200,169,110,.15))",
                        paddingTop: 10,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text3,rgba(240,238,232,.32))",
                          marginBottom: 7,
                          letterSpacing: ".05em",
                        }}
                      >
                        Quick questions
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {QUICK_CHIPS.map((chip) => (
                          <motion.button
                            key={chip.q}
                            onClick={() => send(chip.q)}
                            whileHover={{
                              background: "var(--active,rgba(200,169,110,.1))",
                              borderColor: "var(--border2,rgba(200,169,110,.32))",
                              color: "var(--gold,#c8a96e)",
                            }}
                            whileTap={{ scale: 0.96 }}
                            style={{
                              fontSize: 11,
                              background: "var(--card,rgba(240,238,232,.03))",
                              border: "1px solid var(--border,rgba(200,169,110,.15))",
                              color: "var(--text2,rgba(240,238,232,.58))",
                              borderRadius: 100,
                              padding: "5px 11px",
                              cursor: "pointer",
                              fontFamily: "'DM Sans',sans-serif",
                              whiteSpace: "nowrap",
                              letterSpacing: ".02em",
                            }}
                          >
                            {chip.label}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div
                  style={{
                    padding: "10px 12px 14px",
                    borderTop: "1px solid var(--border,rgba(200,169,110,.15))",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: focused ? "var(--active,rgba(200,169,110,.1))" : "var(--card,rgba(240,238,232,.03))",
                      border: `1px solid ${
                        focused ? "var(--border2,rgba(200,169,110,.32))" : "var(--border,rgba(200,169,110,.15))"
                      }`,
                      borderRadius: 12,
                      padding: "8px 12px",
                    }}
                  >
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      placeholder="Ask me anything..."
                      style={{
                        flex: 1,
                        background: "none",
                        border: "none",
                        outline: "none",
                        fontSize: 13,
                        color: "var(--text,#f0eee8)",
                        fontFamily: "'DM Sans',sans-serif",
                      }}
                    />
                  </div>

                  <motion.button
                    onClick={() => send()}
                    disabled={!input.trim() || loading}
                    whileHover={input.trim() && !loading ? { scale: 1.06 } : {}}
                    whileTap={input.trim() && !loading ? { scale: 0.92 } : {}}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      flexShrink: 0,
                      background: input.trim() && !loading
                        ? "linear-gradient(135deg,var(--gold,#c8a96e),var(--gold2,#e8c98e))"
                        : "var(--card,rgba(240,238,232,.03))",
                      border: `1px solid ${
                        input.trim() && !loading ? "var(--gold,#c8a96e)" : "var(--border,rgba(200,169,110,.15))"
                      }`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                      opacity: input.trim() && !loading ? 1 : 0.45,
                    }}
                  >
                    <Send
                      size={15}
                      style={{
                        color: input.trim() && !loading ? "var(--bg,#0f0f13)" : "var(--text3,rgba(240,238,232,.32))",
                        marginLeft: 1,
                      }}
                    />
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => {
          setOpen((current) => !current);
          setMinimized(false);
          setUnread(0);
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "linear-gradient(135deg,var(--gold,#c8a96e),var(--gold2,#e8c98e))",
          border: "2px solid var(--border2,rgba(200,169,110,.32))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 8px 28px rgba(200,169,110,.35)",
          position: "relative",
        }}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span
              key="x"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex" }}
            >
              <X size={22} style={{ color: "var(--bg,#0f0f13)" }} />
            </motion.span>
          ) : (
            <motion.span
              key="bot"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex" }}
            >
              <ShoppingBag size={22} style={{ color: "var(--bg,#0f0f13)" }} />
            </motion.span>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {unread > 0 && !open && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "var(--rose,#f43f5e)",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid var(--bg,#0f0f13)",
              }}
            >
              {unread}
            </motion.div>
          )}
        </AnimatePresence>

        {!open && (
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: "50%",
              border: "2px solid var(--gold,#c8a96e)",
              pointerEvents: "none",
            }}
          />
        )}
      </motion.button>
    </div>
  );
}
