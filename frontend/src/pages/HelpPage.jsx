import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Clock3,
  Headphones,
  Mail,
  Send,
  ShieldCheck,
  Sparkles,
  Target
} from "lucide-react";
import toast from "react-hot-toast";

const FAQS = [
  {
    q: "How does the AI recommendation work?",
    a: "ShopSense combines price history, review sentiment, ratings, trend signals, and current deal quality into one practical recommendation so you can decide whether to buy now, wait, or skip."
  },
  {
    q: "How is data fetched from Amazon and Flipkart?",
    a: "The platform uses automated scraping services and scheduled refresh cycles to keep product data, pricing, and availability current across supported marketplaces."
  },
  {
    q: "How accurate is price prediction?",
    a: "Predictions are directional guides based on historical price movement, not guarantees. They work best as a decision aid alongside live price, reviews, and deal quality."
  },
  {
    q: "What is the Hidden Gem detector?",
    a: "It highlights products with unusually strong user satisfaction relative to popularity, helping you spot underrated options."
  },
  {
    q: "How do price drop alerts work?",
    a: "Once you track or favorite a product, ShopSense can notify you when the price reaches a target threshold or when a notably stronger deal appears."
  },
  {
    q: "Is image search accurate?",
    a: "Image search is strongest when the uploaded photo is clear and the item exists in the current catalog. Better lighting and less clutter usually improve results."
  },
  {
    q: "Is my data secure?",
    a: "Account data is protected with standard backend safeguards and authentication controls. Sensitive secrets are handled server-side rather than exposed in the client."
  },
  {
    q: "How do I enable WhatsApp notifications?",
    a: "Open your profile settings, review notification preferences, and turn on WhatsApp alerts once your phone number is set up and verified."
  }
];

const STATS = [
  { icon: Clock3, label: "Typical response", value: "Within 24 hours" },
  { icon: ShieldCheck, label: "Support scope", value: "Account, alerts & tracking" },
  { icon: Target, label: "Help style", value: "Human + product context" }
];

const SUBJECTS = ["Bug Report", "Feature Request", "Account Issue", "Scraping / Data Issue", "Billing", "Other"];

function HeroStat({ icon: Icon, label, value }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(201,170,111,0.13)",
        borderRadius: 20,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        backdropFilter: "blur(12px)",
        marginBottom: 11
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 13,
          background: "rgba(201,170,111,0.12)",
          border: "1px solid rgba(201,170,111,0.22)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#c9aa6f",
          flexShrink: 0
        }}
      >
        <Icon size={17} />
      </div>
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: ".16em",
            color: "#5e5038",
            marginBottom: 3
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "#f2ede3" }}>{value}</div>
      </div>
    </div>
  );
}

function FaqItem({ faq, isOpen, onToggle }) {
  return (
    <motion.div
      layout
      style={{
        borderRadius: 18,
        overflow: "hidden",
        marginBottom: 10,
        border: `1px solid ${isOpen ? "rgba(201,170,111,0.28)" : "rgba(201,170,111,0.13)"}`,
        background: isOpen ? "rgba(201,170,111,0.07)" : "#1c1710"
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "16px 20px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "'Outfit', sans-serif"
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: "#f2ede3", lineHeight: 1.5 }}>{faq.q}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.22 }}
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: `1px solid ${isOpen ? "rgba(201,170,111,0.5)" : "rgba(201,170,111,0.18)"}`,
            background: isOpen ? "rgba(201,170,111,0.12)" : "transparent",
            color: isOpen ? "#c9aa6f" : "#5e5038"
          }}
        >
          <ChevronDown size={11} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              style={{
                padding: "0 20px 18px",
                fontSize: 13,
                color: "#ab9878",
                lineHeight: 1.75,
                borderTop: "1px solid rgba(201,170,111,0.13)",
                fontWeight: 300
              }}
            >
              <div style={{ paddingTop: 14 }}>{faq.a}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState(0);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const messageCount = useMemo(() => form.message.trim().length, [form.message]);

  const submitForm = async () => {
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSending(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      setSent(true);
      toast.success("Message sent.");
    } catch {
      toast.error("Could not send your message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="animate-fade-in"
      style={{
        background: "#0c0a07",
        minHeight: "100vh",
        padding: 28,
        color: "#f2ede3",
        fontFamily: "'Outfit', sans-serif"
      }}
    >
      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 32,
            border: "1px solid rgba(201,170,111,0.22)",
            padding: "64px 56px",
            background:
              "radial-gradient(ellipse 70% 60% at 6% 16%, rgba(201,170,111,0.17) 0%, transparent 56%), radial-gradient(ellipse 55% 45% at 94% 84%, rgba(167,139,250,0.12) 0%, transparent 55%), linear-gradient(155deg, #1d1710 0%, #0d0b07 100%)",
            boxShadow: "0 48px 96px rgba(0,0,0,0.5)",
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr",
            gap: 52,
            alignItems: "center"
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              backgroundImage: "radial-gradient(circle, rgba(201,170,111,0.08) 1px, transparent 1px)",
              backgroundSize: "30px 30px"
            }}
          />
          <div
            style={{
              position: "absolute",
              top: -60,
              right: 140,
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(167,139,250,0.14) 0%, transparent 70%)",
              pointerEvents: "none"
            }}
          />

          <div style={{ position: "relative" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                border: "1px solid rgba(201,170,111,0.4)",
                borderRadius: 100,
                padding: "7px 16px",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: ".22em",
                textTransform: "uppercase",
                color: "#c9aa6f",
                background: "rgba(201,170,111,0.12)",
                marginBottom: 22
              }}
            >
              <Sparkles size={10} fill="currentColor" />
              Help & Support
            </div>

            <h1
              style={{
                fontSize: 54,
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: "-.01em",
                color: "#f2ede3",
                marginBottom: 20,
                fontFamily: "'Cormorant Garamond', Georgia, serif"
              }}
            >
              Support that's{" "}
              <em
                style={{
                  fontStyle: "italic",
                  background: "linear-gradient(135deg, #c9aa6f, #e4c98a)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}
              >
                calm,
              </em>
              <br />
              clear, and useful.
            </h1>

            <p style={{ fontSize: 15, color: "#ab9878", lineHeight: 1.8, maxWidth: 480, fontWeight: 300 }}>
              Get quick answers, troubleshoot account issues, and reach the ShopSense team without digging through clutter.
            </p>

            <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 16 }}>
              <a
                href="mailto:support@shopsense.ai"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "linear-gradient(135deg, #c9aa6f, #e4c98a)",
                  color: "#14100a",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "12px 22px",
                  borderRadius: 14,
                  textDecoration: "none",
                  boxShadow: "0 12px 28px rgba(201,170,111,0.28)"
                }}
              >
                <Mail size={14} />
                Email us
              </a>
              <span style={{ fontSize: 12, color: "#5e5038" }}>support@shopsense.ai</span>
            </div>
          </div>

          <div style={{ position: "relative" }}>
            {STATS.map((item) => (
              <HeroStat key={item.label} {...item} />
            ))}
          </div>
        </div>

        <div style={{ marginTop: 28, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 28,
              border: "1px solid rgba(201,170,111,0.4)",
              padding: "34px 42px",
              width: "100%",
              maxWidth: 440,
              background: "linear-gradient(150deg, rgba(30,24,14,0.97), rgba(13,10,6,0.99))",
              boxShadow: "0 32px 64px rgba(0,0,0,0.45)"
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: -50,
                right: -50,
                width: 200,
                height: 200,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(201,170,111,0.22) 0%, transparent 70%)",
                pointerEvents: "none"
              }}
            />
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 18,
                background: "rgba(201,170,111,0.12)",
                border: "1px solid rgba(201,170,111,0.32)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 22
              }}
            >
              <Mail size={22} color="#c9aa6f" />
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, color: "#f2ede3", marginBottom: 6 }}>Email Support</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#c9aa6f", marginBottom: 12 }}>support@shopsense.ai</div>
            <div style={{ fontSize: 13, color: "#ab9878", lineHeight: 1.7, fontWeight: 300 }}>
              Best for account, billing, and detailed troubleshooting. We reply within one business day.
            </div>
          </div>
        </div>

        <div style={{ margin: "36px 0", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1, height: 1, background: "rgba(201,170,111,0.13)" }} />
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".2em", color: "#5e5038" }}>
            FAQ & Contact
          </span>
          <div style={{ flex: 1, height: 1, background: "rgba(201,170,111,0.13)" }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 24 }}>
          <div
            style={{
              borderRadius: 30,
              border: "1px solid rgba(201,170,111,0.13)",
              padding: "34px 30px",
              background: "linear-gradient(180deg, #1d1810, #110e0a)"
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".2em",
                color: "#c9aa6f",
                marginBottom: 10
              }}
            >
              <Headphones size={12} />
              Knowledge base
            </div>
            <h2
              style={{
                fontSize: 26,
                fontWeight: 600,
                color: "#f2ede3",
                marginBottom: 8,
                fontFamily: "'Cormorant Garamond', Georgia, serif"
              }}
            >
              Frequently asked questions
            </h2>
            <p style={{ fontSize: 13, color: "#ab9878", lineHeight: 1.7, marginBottom: 26, fontWeight: 300 }}>
              The fastest answers for issues users hit most often.
            </p>

            <div>
              {FAQS.map((faq, index) => (
                <FaqItem
                  key={faq.q}
                  faq={faq}
                  isOpen={openFaq === index}
                  onToggle={() => setOpenFaq(openFaq === index ? null : index)}
                />
              ))}
            </div>
          </div>

          <div
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 30,
              border: "1px solid rgba(201,170,111,0.28)",
              padding: "34px 30px",
              background: "radial-gradient(ellipse at top right, rgba(167,139,250,0.10), transparent 42%), linear-gradient(155deg, #1d1810, #0d0a06)",
              boxShadow: "0 32px 64px rgba(0,0,0,0.32)"
            }}
          >
            <div
              style={{
                position: "absolute",
                right: -50,
                bottom: -50,
                width: 250,
                height: 250,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(56,189,248,0.09) 0%, transparent 70%)",
                pointerEvents: "none"
              }}
            />

            <div style={{ position: "relative" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: ".2em",
                  color: "#c9aa6f",
                  marginBottom: 10
                }}
              >
                <Send size={11} />
                Contact team
              </div>
              <h2
                style={{
                  fontSize: 26,
                  fontWeight: 600,
                  color: "#f2ede3",
                  marginBottom: 8,
                  fontFamily: "'Cormorant Garamond', Georgia, serif"
                }}
              >
                Tell us what's wrong
              </h2>
              <p style={{ fontSize: 13, color: "#ab9878", lineHeight: 1.7, marginBottom: 24, fontWeight: 300 }}>
                Share the issue once, we'll route it to the right person.
              </p>

              {sent ? (
                <div
                  style={{
                    borderRadius: 22,
                    border: "1px solid rgba(16,185,129,0.25)",
                    padding: "44px 24px",
                    textAlign: "center",
                    background: "rgba(16,185,129,0.07)"
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: "rgba(16,185,129,0.15)",
                      border: "1px solid rgba(16,185,129,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 18px",
                      color: "#10b981"
                    }}
                  >
                    <ShieldCheck size={26} />
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      color: "#f2ede3",
                      marginBottom: 8,
                      fontFamily: "'Cormorant Garamond', Georgia, serif"
                    }}
                  >
                    Message sent
                  </div>
                  <div style={{ fontSize: 13, color: "#ab9878", lineHeight: 1.7, marginBottom: 22, fontWeight: 300 }}>
                    We'll reply to <span style={{ color: "#f2ede3" }}>{form.email}</span> as soon as possible.
                  </div>
                  <button
                    onClick={() => {
                      setSent(false);
                      setForm({ name: "", email: "", subject: "", message: "" });
                    }}
                    style={{
                      border: "1px solid rgba(201,170,111,0.4)",
                      borderRadius: 12,
                      padding: "10px 22px",
                      background: "rgba(201,170,111,0.12)",
                      color: "#c9aa6f",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "'Outfit', sans-serif"
                    }}
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".15em", color: "#5e5038", marginBottom: 7 }}>
                        Your name
                      </div>
                      <input
                        value={form.name}
                        onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                        type="text"
                        placeholder="Purvi Sharma"
                        style={{
                          width: "100%",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(201,170,111,0.18)",
                          borderRadius: 13,
                          padding: "11px 14px",
                          color: "#f2ede3",
                          fontSize: 13,
                          outline: "none"
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".15em", color: "#5e5038", marginBottom: 7 }}>
                        Email
                      </div>
                      <input
                        value={form.email}
                        onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                        type="email"
                        placeholder="you@example.com"
                        style={{
                          width: "100%",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(201,170,111,0.18)",
                          borderRadius: 13,
                          padding: "11px 14px",
                          color: "#f2ede3",
                          fontSize: 13,
                          outline: "none"
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".15em", color: "#5e5038", marginBottom: 7 }}>
                      Subject
                    </div>
                    <select
                      value={form.subject}
                      onChange={(e) => setForm((current) => ({ ...current, subject: e.target.value }))}
                      style={{
                        width: "100%",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(201,170,111,0.18)",
                        borderRadius: 13,
                        padding: "11px 14px",
                        color: form.subject ? "#f2ede3" : "#5e5038",
                        fontSize: 13,
                        outline: "none"
                      }}
                    >
                      <option value="">Select a topic</option>
                      {SUBJECTS.map((subject) => (
                        <option key={subject} value={subject} style={{ background: "#1c1710", color: "#f2ede3" }}>
                          {subject}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".15em", color: "#5e5038" }}>
                        Message
                      </div>
                      <span style={{ fontSize: 11, color: messageCount > 10 ? "#c9aa6f" : "#5e5038" }}>
                        {messageCount} / 500
                      </span>
                    </div>
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm((current) => ({ ...current, message: e.target.value }))}
                      maxLength={500}
                      placeholder="Describe the problem, what you expected, and what happened instead."
                      style={{
                        width: "100%",
                        minHeight: 120,
                        resize: "none",
                        display: "block",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(201,170,111,0.18)",
                        borderRadius: 13,
                        padding: "11px 14px",
                        color: "#f2ede3",
                        fontSize: 13,
                        outline: "none"
                      }}
                    />
                  </div>

                  <div
                    style={{
                      borderRadius: 13,
                      border: "1px solid rgba(201,170,111,0.13)",
                      padding: "10px 14px",
                      fontSize: 12,
                      color: "#ab9878",
                      background: "rgba(255,255,255,0.02)",
                      lineHeight: 1.65,
                      marginBottom: 12,
                      fontWeight: 300
                    }}
                  >
                    Include screenshots, product names, or the page where the issue happened.
                  </div>

                  <button
                    onClick={submitForm}
                    disabled={sending}
                    style={{
                      width: "100%",
                      border: "none",
                      borderRadius: 16,
                      padding: 14,
                      background: "linear-gradient(135deg, #c9aa6f, #e4c98a)",
                      color: "#14100a",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: "0 14px 32px rgba(201,170,111,0.26)",
                      opacity: sending ? 0.6 : 1
                    }}
                  >
                    <Send size={14} />
                    {sending ? "Sending..." : "Send message"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 40,
            padding: "22px 28px",
            borderRadius: 22,
            border: "1px solid rgba(201,170,111,0.13)",
            background: "rgba(255,255,255,0.015)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ fontSize: 13, color: "#5e5038", fontWeight: 300 }}>
            Questions? Reach us at <span style={{ color: "#c9aa6f" }}>support@shopsense.ai</span>
          </div>
          <div style={{ fontSize: 11, color: "#5e5038", fontWeight: 300 }}>ShopSense · Help & Support · 2025</div>
        </div>
      </div>
    </div>
  );
}
