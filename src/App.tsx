import { useState, useEffect, useRef } from "react";
import { Settings, Trash2 } from "lucide-react";

import { type AgentSettings } from './types';
import { SettingsPanel } from "./components";
import { useLanguage } from "./i18n/LanguageContext";
import type { TranslationKey } from "./i18n/translations";

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

function loadSettings(): AgentSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<AgentSettings>;
      return { ...defaultSettings, ...parsed };
    }
  } catch {}
  return defaultSettings;
}

export default function App() {
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
  const { lang, setLang, t } = useLanguage();

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
      {/* Header */}
      <div className="flex justify-between items-center shrink-0 mb-6">
        <h1 className="text-3xl font-bold text-blue-400">{t("appTitle")}</h1>
        <div className="relative flex rounded-full bg-[#111827] p-1 border border-gray-700/80 select-none">
          <div
            className="absolute top-1 bottom-1 rounded-full bg-blue-500 transition-[left] duration-200 ease-out pointer-events-none"
            style={{
              width: "calc(50% - 4px)",
              left: lang === "en" ? "4px" : "calc(50% + 2px)",
            }}
          />
          <button
            type="button"
            onClick={() => setLang("en")}
            className={`relative z-10 flex items-center justify-center w-14 h-9 text-sm font-medium transition-colors rounded-full leading-none select-none outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-inset ${
              lang === "en" ? "text-white" : "text-gray-400 hover:text-gray-300"
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLang("ru")}
            className={`relative z-10 flex items-center justify-center w-14 h-9 text-sm font-medium transition-colors rounded-full leading-none select-none outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-inset ${
              lang === "ru" ? "text-white" : "text-gray-400 hover:text-gray-300"
            }`}
          >
            RU
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <div className={`w-full flex flex-col gap-6 ${memoryItems.length > 0 ? "max-w-4xl" : "max-w-2xl"}`}>
        {/* Agent + Controls (left) | Memory (right) — высота строки задаёт только левая колонка (h-fit + min-h-0 у Memory) */}
        <div className={`gap-6 ${memoryItems.length > 0 ? "grid grid-cols-1 md:grid-cols-2 grid-rows-[auto]" : "flex flex-col"}`}>
        <div ref={leftColRef} className={`min-w-0 flex flex-col gap-6 ${memoryItems.length > 0 ? "md:h-fit" : ""}`}>
          {/* Agent Info */}
          <div className="min-w-0 flex flex-col">
            <h2 className="text-xl mb-4 font-semibold">{t("activeAgent")}</h2>
            <div className="block-inner bg-[#111827] border border-gray-700 rounded-2xl p-6 flex flex-col">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-white">{t("appTitle")}</h3>
                  <p className="text-gray-400 mt-2 text-sm leading-relaxed">
                    {t("voiceAssistantDescription")}
                  </p>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2 rounded-lg border border-gray-700 hover:border-blue-500 hover:bg-white/5 transition shrink-0"
                  title={t("agentSettings")}
                >
                  <Settings size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-700/60 space-y-2">
                <div className="text-sm text-gray-300">
                  {t("personality")}:{" "}
                  <span className="text-blue-400 font-medium">
                    {t((`personality${settings.personality.charAt(0).toUpperCase() + settings.personality.slice(1)}`) as TranslationKey)}
                  </span>
                </div>
                <div className="text-sm text-gray-300">
                  {t("tone")}:{" "}
                  <span className="text-blue-400 font-medium">
                    {t((`tone${settings.tone.charAt(0).toUpperCase() + settings.tone.slice(1)}`) as TranslationKey)}
                  </span>
                </div>
                <div className="text-sm text-gray-300">
                  {t("profanity")}:{" "}
                  <span className="text-blue-400 font-medium">
                    {settings.allowProfanity ? t("profanityAllowed") : t("profanityDisabled")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls (только карточка, без кнопки Launch) */}
          <div className="min-w-0 flex flex-col">
            <h2 className="text-xl mb-4 font-semibold">{t("controls")}</h2>
            <div className="block-inner bg-[#111827] border border-gray-700 rounded-2xl p-6 flex flex-col">
              <div className="flex flex-col gap-4">
                <ToggleRow
                  label={t("microphone")}
                  value={settings.microphone}
                  onChange={(v) =>
                    setSettings({ ...settings, microphone: v })
                  }
                />
                <ToggleRow
                  label={t("screenShare")}
                  value={settings.screenShare}
                  onChange={(v) =>
                    setSettings({ ...settings, screenShare: v })
                  }
                />
                <ToggleRow
                  label={t("camera")}
                  value={settings.camera}
                  onChange={(v) =>
                    setSettings({ ...settings, camera: v })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Memory — правая колонка, высота задаётся по ref левой колонки */}
        {memoryItems.length > 0 && (
          <div
            className="min-w-0 min-h-0 overflow-hidden flex flex-col memory-cell md:flex-none"
            style={memoryBlockHeight != null && isMd ? { height: `${memoryBlockHeight}px` } : undefined}
          >
            <h2 className="text-xl mb-4 font-semibold shrink-0">{t("memoryTitle")}</h2>
            <div className="block-inner bg-[#111827] border border-gray-700 rounded-2xl p-6 min-h-0 flex-1 flex flex-col overflow-hidden">
              <div className="flex justify-center shrink-0">
                <button
                  type="button"
                  onClick={() => {
                  setMemoryItems([]);
                  setToast(t("memoryCleared"));
                }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 hover:border-red-500/70 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition text-sm font-medium"
                  title={t("clearAgentMemory")}
                >
                  <Trash2 size={18} />
                  {t("clearAgentMemory")}
                </button>
              </div>
              <ul className="space-y-2 text-sm mt-4 flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin pr-1">
                {memoryItems.map((item, i) => (
                  <li
                    key={i}
                    className="rounded-lg px-3 py-2.5 bg-[#0B1118]/70 border border-gray-700/60 text-gray-300"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
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
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex justify-between items-center">
      <span>{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition ${
          value ? "bg-blue-500" : "bg-gray-600"
        }`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full transform transition ${
            value ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}