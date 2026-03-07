import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "next-themes";

const IS_LOCALHOST = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);

// Avoid stale cached bundles during local development
if (typeof window !== "undefined" && "serviceWorker" in navigator && !IS_LOCALHOST && Boolean(import.meta.env.PROD)) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // ignore
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <App />
  </ThemeProvider>
);
