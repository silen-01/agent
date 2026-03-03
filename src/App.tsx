import { useState, useCallback } from "react";

import { type AgentSettings } from "@types";
import { config, constants, language, buildSystemInstruction } from "@modules";
import { memoryStorage, settingsStorage } from "@storages";
import { createLiveClient, type ILiveSession } from "./api/index.ts";
import { InitialPage, AgentSessionPage, components, ui, hooks } from "@views";

const App = () => {
  const [settings, setSettings] = useState<AgentSettings>(settingsStorage.loadSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLaunched, setIsLaunched] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [liveSession, setLiveSession] = useState<ILiveSession | null>(null);
  const [memoryItems, setMemoryItems] = useState<string[]>(() => memoryStorage.loadMemoryItems());
  const { toast, toastExiting, showToast } = hooks.useToast();
  const { t } = language.useLanguage();

  const handleLaunch = useCallback(async () => {
    setConnectionError(null);
    setIsConnecting(true);
    const apiKey = config.api.geminiApiKey;
    if (!apiKey.trim()) {
      const msg = t("connectionErrorNoKey");
      setConnectionError(msg);
      showToast(msg);
      setIsConnecting(false);
      return;
    }
    try {
      const client = createLiveClient("gemini", { apiKey });
      const systemInstruction = buildSystemInstruction(settings, memoryItems, t);
      const session = await client.connect({
        systemInstruction,
        callbacks: {
          onerror: (err) => {
            console.error("Live session error:", err);
          },
        },
      });
      setLiveSession(session);
      setIsLaunched(true);
    } catch (err) {
      console.error("Connect failed:", err);
      const msg = t("connectionErrorGeneric");
      setConnectionError(msg);
      showToast(msg);
    } finally {
      setIsConnecting(false);
    }
  }, [settings, memoryItems, t, showToast]);

  const handleBack = useCallback(() => {
    liveSession?.close();
    setLiveSession(null);
    setIsLaunched(false);
  }, [liveSession]);

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

      <div className="flex-1 min-h-0 relative flex flex-col">
        <InitialPage
          settings={settings}
          setSettings={setSettings}
          memoryItems={memoryItems}
          isLaunched={isLaunched}
          isConnecting={isConnecting}
          connectionError={connectionError}
          onLaunch={handleLaunch}
          onClearMemory={handleClearMemory}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        {isLaunched && liveSession && (
          <div className="absolute inset-0 flex flex-col session-page-in">
            <AgentSessionPage
              session={liveSession}
              memoryItems={memoryItems}
              initialMicOn={settings.microphone}
              initialScreenSharing={settings.screenShare}
              onBack={handleBack}
              onClearMemory={handleClearMemory}
              onRemoveMemoryItem={handleRemoveMemoryItem}
            />
          </div>
        )}
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
