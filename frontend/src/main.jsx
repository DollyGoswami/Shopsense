import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import App from "./App.jsx";
import { AuthProvider }  from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import "./i18n/index.js";
import "./styles/globals.css";

/**
 * CustomToast — renders every pop notification with a ✕ close button.
 * The X calls toast.dismiss(t.id) to instantly remove that specific toast.
 */
function CustomToast({ t: toast_obj, message, type }) {
  const isSuccess = type === "success";
  const isError   = type === "error";

  const iconColor = isSuccess ? "#10b981" : isError ? "#f43f5e" : "var(--gold, #c8a96e)";
  const icon      = isSuccess ? "✅" : isError ? "❌" : "🔔";

  return (
    <div
      style={{
        display:        "flex",
        alignItems:     "center",
        gap:            "10px",
        background:     "var(--bg2, #18181f)",
        border:         "1px solid var(--border2, rgba(200,169,110,.32))",
        borderRadius:   "12px",
        padding:        "12px 14px",
        boxShadow:      "0 8px 32px var(--shadow, rgba(0,0,0,.4))",
        minWidth:       "280px",
        maxWidth:       "360px",
        fontFamily:     "'DM Sans', sans-serif",
        fontSize:       "13px",
        color:          "var(--text, #f0eee8)",
        opacity:        toast_obj.visible ? 1 : 0,
        transition:     "opacity .3s ease",
        borderLeft:     `3px solid ${iconColor}`,
      }}
    >
      {/* Icon */}
      <span style={{ fontSize: "16px", flexShrink: 0 }}>{icon}</span>

      {/* Message */}
      <span style={{ flex: 1, lineHeight: 1.45, color: "var(--text, #f0eee8)" }}>
        {message}
      </span>

      {/* ✕ Close button */}
      <button
        onClick={() => toast.dismiss(toast_obj.id)}
        style={{
          width:           "22px",
          height:          "22px",
          borderRadius:    "50%",
          background:      "var(--card, rgba(240,238,232,.04))",
          border:          "1px solid var(--border, rgba(200,169,110,.15))",
          color:           "var(--text3, rgba(240,238,232,.32))",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          cursor:          "pointer",
          flexShrink:      0,
          fontSize:        "12px",
          lineHeight:      1,
          transition:      "background .2s, color .2s, border-color .2s",
          fontFamily:      "inherit",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background    = "rgba(244,63,94,.15)";
          e.currentTarget.style.color         = "var(--rose, #f43f5e)";
          e.currentTarget.style.borderColor   = "rgba(244,63,94,.3)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background    = "var(--card, rgba(240,238,232,.04))";
          e.currentTarget.style.color         = "var(--text3, rgba(240,238,232,.32))";
          e.currentTarget.style.borderColor   = "var(--border, rgba(200,169,110,.15))";
        }}
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />

          {/**
           * Toaster with custom render — every toast gets a ✕ close button.
           * duration: 5000ms default, user can close early with ✕.
           */}
          <Toaster
            position="top-right"
            gutter={10}
            toastOptions={{
              duration: 5000,
              style: {
                /* Reset default styles — our CustomToast handles everything */
                background:   "transparent",
                boxShadow:    "none",
                padding:      0,
                margin:       0,
                maxWidth:     "none",
              },
            }}
          >
            {(t) => (
              <CustomToast
                t={t}
                message={t.message}
                type={t.type}
              />
            )}
          </Toaster>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
