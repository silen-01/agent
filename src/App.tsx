import { useState, useCallback, lazy, Suspense, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { type AgentSettings } from "@types";
import { constants, language } from "@modules";
import { memoryStorage, settingsStorage } from "@storages";
import { InitialPage, components, ui, hooks } from "@views";

const AgentSessionPage = lazy(() =>
  import("@views/AgentSessionPage").then((m) => ({ default: m.AgentSessionPage }))
);

const App = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AgentSettings>(settingsStorage.loadSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [memoryItems, setMemoryItems] = useState<string[]>(() => memoryStorage.loadMemoryItems());
  const { toast, toastExiting, showToast } = hooks.useToast();
  const { t } = language.useLanguage();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/") {
      setMemoryItems(memoryStorage.loadMemoryItems());
    }
  }, [location.pathname]);

  // Prefetch чанка сессии после полной загрузки страницы, чтобы не держать вкладку в состоянии «загрузка»
  useEffect(() => {
    const run = () => void import("@views/AgentSessionPage");
    const schedule = () => {
      const id =
        typeof requestIdleCallback !== "undefined"
          ? requestIdleCallback(run, { timeout: 600 })
          : window.setTimeout(run, 300);
      return () =>
        typeof cancelIdleCallback !== "undefined" ? cancelIdleCallback(id) : clearTimeout(id);
    };
    let cancel: (() => void) | undefined;
    if (document.readyState === "complete") {
      cancel = schedule();
    } else {
      const onLoad = () => {
        cancel = schedule();
      };
      window.addEventListener("load", onLoad, { once: true });
      return () => {
        window.removeEventListener("load", onLoad);
        cancel?.();
      };
    }
    return cancel;
  }, []);

  const applySettingsPatch = useCallback((patch: Partial<Pick<AgentSettings, "microphone" | "screenShare" | "camera">>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      settingsStorage.saveSettings(next);
      return next;
    });
  }, []);

  const handleLaunch = useCallback(() => {
    navigate("/session");
  }, [navigate]);

  const handleClearMemory = useCallback(() => {
    setMemoryItems([]);
    memoryStorage.saveMemoryItems([]);
    showToast(t("memoryCleared"));
  }, [showToast, t]);

  const handleRemoveMemoryItem = useCallback((index: number) => {
    setMemoryItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      memoryStorage.saveMemoryItems(next);
      return next;
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0B1118] text-white px-12 pt-12 pb-4 flex flex-col">
      <ui.AppHeader />

      <div className="flex-1 min-h-0 flex flex-col">
        <Routes>
          <Route
            path="/"
            element={
              <InitialPage
                settings={settings}
                onSettingsChange={applySettingsPatch}
                memoryItems={memoryItems}
                onLaunch={handleLaunch}
                onClearMemory={handleClearMemory}
                onRemoveMemoryItem={handleRemoveMemoryItem}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            }
          />
          <Route
            path="/session"
            element={
              <Suspense
                fallback={
                  <div className="flex-1 flex flex-col items-center justify-center min-h-0 text-gray-400">
                    <p>{t("launchConnecting")}</p>
                  </div>
                }
              >
                  <AgentSessionPage />
              </Suspense>
            }
          />
        </Routes>
      </div>

      {isSettingsOpen && (
        <components.SettingsPanel
          settings={settings}
          defaultSettings={constants.agentSettings.default}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(newSettings: AgentSettings) => {
            setSettings(newSettings);
            settingsStorage.saveSettings(newSettings);
            setIsSettingsOpen(false);
            showToast(t("settingsSaved"));
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
