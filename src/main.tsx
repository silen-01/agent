import { createRoot } from 'react-dom/client'
import { language } from "@modules";
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(
  <language.LanguageProvider>
    <App />
  </language.LanguageProvider>
);
