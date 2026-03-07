import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { inject } from '@vercel/analytics'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { language } from "@modules";
import App from './App.tsx'
import './index.css'

// При перезагрузке на /session чанк сессии грузим сразу, параллельно с инитом React
if (typeof window !== "undefined" && window.location.pathname === "/session") {
  void import("@views/AgentSessionPage")
}

if (import.meta.env.PROD) {
  inject()
}

createRoot(document.getElementById("root")!).render(
  <language.LanguageProvider>
    <BrowserRouter>
      <App />
      {import.meta.env.PROD && <SpeedInsights />}
    </BrowserRouter>
  </language.LanguageProvider>
);
