// /**
//  * ThemeContext.jsx
//  * Sets data-theme on <html>. CSS variables update automatically.
//  * Every component using var(--bg), var(--text) etc. reacts instantly.
//  */
// import { createContext, useContext, useState, useEffect, useCallback } from "react";
// const THEME_CSS = `
//   :root,[data-theme="dark"]{
//     --bg:#0f0f13;--bg2:#18181f;--bg3:#22222c;
//     --text:#f0eee8;--text2:rgba(240,238,232,.58);--text3:rgba(240,238,232,.32);
//     --gold:#c8a96e;--gold2:#e8c98e;
//     --border:rgba(200,169,110,.15);--border2:rgba(200,169,110,.32);
//     --card:rgba(240,238,232,.03);--hover:rgba(240,238,232,.06);
//     --active:rgba(200,169,110,.1);--active2:rgba(200,169,110,.18);
//     --rose:#f43f5e;--green:#10b981;--sky:#38bdf8;--amber:#fbbf24;--violet:#a78bfa;
//     --shadow:rgba(0,0,0,.5);
//   }
//   [data-theme="light"]{
//     --bg:#f5f3ee;--bg2:#ffffff;--bg3:#ebe7de;
//     --text:#1c1a14;--text2:rgba(28,26,20,.62);--text3:rgba(28,26,20,.38);
//     --gold:#9a6f32;--gold2:#b88a48;
//     --border:rgba(154,111,50,.18);--border2:rgba(154,111,50,.36);
//     --card:rgba(28,26,20,.04);--hover:rgba(28,26,20,.07);
//     --active:rgba(154,111,50,.12);--active2:rgba(154,111,50,.2);
//     --rose:#dc2626;--green:#059669;--sky:#0284c7;--amber:#d97706;--violet:#7c3aed;
//     --shadow:rgba(0,0,0,.1);
//   }
//   *,*::before,*::after{
//     transition-property:background-color,border-color,color,box-shadow;
//     transition-duration:.35s;transition-timing-function:ease;
//   }
//   body{background:var(--bg);color:var(--text);margin:0;}
//   ::-webkit-scrollbar{width:5px;}
//   ::-webkit-scrollbar-track{background:var(--bg);}
//   ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px;}
//   ::selection{background:rgba(200,169,110,.25);}
// `;

// const ThemeContext = createContext(null);

// export function ThemeProvider({ children }) {
//   const [theme, setTheme] = useState(() => localStorage.getItem("ss-theme") || "dark");

//   useEffect(() => {
//     if (!document.getElementById("ss-theme-css")) {
//       const s = document.createElement("style");
//       s.id = "ss-theme-css";
//       s.textContent = THEME_CSS;
//       document.head.prepend(s);
//     }
//   }, []);

//   useEffect(() => {
//     document.documentElement.setAttribute("data-theme", theme);
//     localStorage.setItem("ss-theme", theme);
//   }, [theme]);

//   const toggleTheme = useCallback(() => setTheme(t => t === "dark" ? "light" : "dark"), []);

//   return (
//     <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
//       {children}
//     </ThemeContext.Provider>
//   );
// }

// export const useTheme = () => {
//   const ctx = useContext(ThemeContext);
//   if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
//   return ctx;
// };



/**
 * ThemeContext.jsx
 * Sets data-theme="dark" | "light" on <html>.
 * globals.css defines all CSS variables per [data-theme].
 * Every component using var(--bg), var(--text) etc reacts instantly.
 * 0.35s smooth transition on all color properties.
 */
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("ss-theme") || "dark"
  );

  useEffect(() => {
    // Set data-theme on <html> — CSS variables in globals.css react to this
    document.documentElement.setAttribute("data-theme", theme);
    // Also keep Tailwind dark class in sync (for any dark: utilities)
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("ss-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme(t => t === "dark" ? "light" : "dark"),
    []
  );

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
};
