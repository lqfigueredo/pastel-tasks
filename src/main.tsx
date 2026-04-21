import { initSentry } from "./lib/sentry";
import { captureSentryError } from "./lib/sentry";
import "./index.css";

function renderFallback(error: unknown) {
  const root = document.getElementById("root");
  if (!root) return;
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Erro desconhecido";
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,-apple-system,sans-serif;background:#fafafa;color:#111;">
      <div style="max-width:480px;width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;text-align:center;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
        <h1 style="font-size:20px;font-weight:600;margin:0 0 8px;">Não foi possível carregar o aplicativo</h1>
        <p style="font-size:14px;color:#6b7280;margin:0 0 20px;">Tente recarregar a página. Se o erro persistir, limpe o cache do navegador.</p>
        <pre style="text-align:left;font-size:12px;background:#f3f4f6;padding:12px;border-radius:8px;overflow:auto;max-height:160px;color:#374151;margin:0 0 20px;">${message.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string))}</pre>
        <button onclick="window.location.reload()" style="background:#111;color:#fff;border:0;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:500;cursor:pointer;">Recarregar página</button>
      </div>
    </div>
  `;
}

let bootstrapFailed = false;

window.addEventListener("error", (event) => {
  if (bootstrapFailed) return;
  // Only intercept if React hasn't mounted yet
  const root = document.getElementById("root");
  if (root && root.childElementCount === 0) {
    bootstrapFailed = true;
    captureSentryError(event.error ?? new Error(event.message), { phase: "window.error" });
    renderFallback(event.error ?? event.message);
  }
});

window.addEventListener("unhandledrejection", (event) => {
  if (bootstrapFailed) return;
  const root = document.getElementById("root");
  if (root && root.childElementCount === 0) {
    bootstrapFailed = true;
    captureSentryError(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      { phase: "unhandledrejection" }
    );
    renderFallback(event.reason);
  }
});

async function bootstrap() {
  try {
    initSentry();
    const [{ default: App }, { createRoot }] = await Promise.all([
      import("./App"),
      import("react-dom/client"),
    ]);
    const container = document.getElementById("root");
    if (!container) throw new Error('Elemento #root não encontrado no DOM.');
    createRoot(container).render(<App />);
  } catch (error) {
    bootstrapFailed = true;
    captureSentryError(error instanceof Error ? error : new Error(String(error)), {
      phase: "bootstrap",
    });
    renderFallback(error);
  }
}

bootstrap();
