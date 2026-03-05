import { createRoot } from 'react-dom/client'
import { inject } from '@vercel/analytics'
import { language } from "@modules";
import App from './App.tsx'
import './index.css'

inject()

createRoot(document.getElementById("root")!).render(
  <language.LanguageProvider>
    <App />
  </language.LanguageProvider>
);
