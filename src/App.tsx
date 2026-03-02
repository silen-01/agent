import { useState } from "react";

import { type AgentSettings } from "@types";
import { config, language } from "@modules";
import { settingsStorage } from "@storages";
import { InitialPage, AgentSessionPage, components, ui, hooks } from "@views";

const App = () => {
  const [settings, setSettings] = useState<AgentSettings>(settingsStorage.loadSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLaunched, setIsLaunched] = useState(false);
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
  const { toast, toastExiting, showToast } = hooks.useToast();
  const { t } = language.useLanguage();

  return (
    <div className="min-h-screen bg-[#0B1118] text-white px-12 pt-12 pb-4 flex flex-col">
      <ui.AppHeader />

      <div className="flex-1 min-h-0 relative flex flex-col">
        <InitialPage
          settings={settings}
          setSettings={setSettings}
          memoryItems={memoryItems}
          isLaunched={isLaunched}
          onLaunch={() => {
            setIsLaunched(true);
            // TODO: бек — запуск агента
          }}
          onClearMemory={() => {
            setMemoryItems([]);
            showToast(t("memoryCleared"));
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        {isLaunched && (
          <div className="absolute inset-0 flex flex-col session-page-in">
            <AgentSessionPage
              memoryItems={memoryItems}
              initialMicOn={settings.microphone}
              initialScreenSharing={settings.screenShare}
              onBack={() => setIsLaunched(false)}
              onClearMemory={() => {
                setMemoryItems([]);
                showToast(t("memoryCleared"));
              }}
              onRemoveMemoryItem={(index) => {
                setMemoryItems((prev) => prev.filter((_, i) => i !== index));
              }}
            />
          </div>
        )}
      </div>

      {isSettingsOpen && (
        <components.SettingsPanel
          settings={settings}
          defaultSettings={config.agentSettings.default}
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
