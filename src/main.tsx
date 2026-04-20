import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";

// Init error tracking (no-op in dev or without DSN)
initSentry();

createRoot(document.getElementById("root")!).render(<App />);
