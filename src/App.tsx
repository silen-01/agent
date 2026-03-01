import { useState, useEffect, useRef } from "react";

import { type AgentSettings } from './types';
import { AgentCard, ControlsCard, MemoryCard, SettingsPanel } from "./components";
import { AppHeader } from "./components/ui";
import { useLanguage } from "./i18n/LanguageContext";

const defaultSettings: AgentSettings = {
  microphone: true,
  screenShare: true,
  camera: false,
  personality: "jarvis",
  tone: "friendly",
  allowProfanity: false,
  personalityPrompt: "",
  reactionTimeoutSeconds: 30,
  emotionality: 50,
};

const STORAGE_KEY = "agent_settings";

const loadSettings = (): AgentSettings => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<AgentSettings>;
      return { ...defaultSettings, ...parsed };
    }
  } catch {}
  return defaultSettings;
};

const App = () => {
  const [settings, setSettings] = useState<AgentSettings>(loadSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [memoryItems, setMemoryItems] = useState<string[]>([
    'Пользователь предпочитает тёмную тему в приложениях',
    'Последняя команда: открыть браузер на вкладке почты',
    'Имя в системе: Алексей',
    'Часто использует фразу «сделай по умолчанию» для настроек',
    'Любимый редактор — Cursor, работа в папке d:\\projets',
    'Включена трансляция экрана при звонках',
    'Микрофон по умолчанию включён, камера выключена',
    'Задержка авто-реакции установлена на 30 секунд',
    'Уровень эмоциональности: 50%',
    'Личность агента: Джарвис, тон — дружелюбный',
    'Мат в ответах запрещён',
    'Рабочие часы: пн–пт 9:00–18:00, напоминать о перерывах',
    'Часто спрашивает погоду и календарь на день',
    'Предпочитает короткие подтверждения без лишних деталей',
  ]);
  const [toast, setToast] = useState<string | null>(null);
  const [toastExiting, setToastExiting] = useState(false);
  const [memoryBlockHeight, setMemoryBlockHeight] = useState<number | null>(null);
  const [isMd, setIsMd] = useState(false);
  const leftColRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const m = window.matchMedia("(min-width: 768px)");
    setIsMd(m.matches);
    const f = () => setIsMd(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToastExiting(true), 2000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!toastExiting) return;
    const timer = setTimeout(() => {
      setToast(null);
      setToastExiting(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [toastExiting]);

  // Высота блока «Память» = высота левой колонки (Агент + Управление)
  useEffect(() => {
    if (memoryItems.length === 0) {
      setMemoryBlockHeight(null);
      return;
    }
    const el = leftColRef.current;
    if (!el) return;
    const updateHeight = () => setMemoryBlockHeight(el.offsetHeight);
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [memoryItems.length]);

  return (
    <div className="min-h-screen bg-[#0B1118] text-white p-12 flex flex-col">
      <AppHeader />

      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <div className={`w-full flex flex-col gap-6 ${memoryItems.length > 0 ? "max-w-4xl" : "max-w-2xl"}`}>
        {/* Agent + Controls (left) | Memory (right) — высота строки задаёт только левая колонка (h-fit + min-h-0 у Memory) */}
        <div className={`gap-6 ${memoryItems.length > 0 ? "grid grid-cols-1 md:grid-cols-2 grid-rows-[auto]" : "flex flex-col"}`}>
        <div ref={leftColRef} className={`min-w-0 flex flex-col gap-6 ${memoryItems.length > 0 ? "md:h-fit" : ""}`}>
          <AgentCard settings={settings} onOpenSettings={() => setIsSettingsOpen(true)} />
          <ControlsCard
            settings={settings}
            onSettingsChange={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
          />
        </div>

        {memoryItems.length > 0 && (
          <MemoryCard
            items={memoryItems}
            onClear={() => {
              setMemoryItems([]);
              setToast(t("memoryCleared"));
            }}
            height={memoryBlockHeight}
            isMd={isMd}
          />
        )}
        </div>

        {/* Кнопка Launch — под сеткой, блок памяти до неё не доходит */}
        <div className="flex justify-center">
          <button
            type="button"
            className="w-1/2 min-w-[140px] py-3 px-4 rounded-xl font-medium bg-blue-500 hover:bg-blue-600 text-white transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
          >
            {t("launchAgent")}
          </button>
        </div>
        </div>
      </div>

      {isSettingsOpen && (
        <SettingsPanel
          settings={settings}
          defaultSettings={defaultSettings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(newSettings: AgentSettings) => {
            setSettings(newSettings);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
            setIsSettingsOpen(false);
            setToast(t("settingsSaved"));
          }}
        />
      )}

      {toast && (
        <div
          role="status"
          className={`toast-in fixed left-1/2 -translate-x-1/2 top-24 z-[100] min-w-[280px] max-w-[90vw] px-6 py-4 rounded-2xl bg-[#111827] border-2 border-blue-500/80 text-lg font-semibold text-white text-center shadow-2xl shadow-blue-500/30 ${toastExiting ? "toast-out" : ""}`}
        >
          {toast}
        </div>
      )}
    </div>
  );
};

export default App;