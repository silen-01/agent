import { type AgentSettings } from "@types";
import { language } from "@modules";

const ToggleRow = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) => (
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

export const ControlsCard = ({
  settings,
  onSettingsChange,
}: {
  settings: AgentSettings;
  onSettingsChange: (patch: Partial<Pick<AgentSettings, "microphone" | "screenShare" | "camera">>) => void;
}) => {
  const { t } = language.useLanguage();

  return (
    <div className="min-w-0 flex flex-col">
      <h2 className="text-xl mb-4 font-semibold">{t("controls")}</h2>
      <div className="block-inner bg-[#111827] border border-gray-700 rounded-2xl p-6 flex flex-col">
        <div className="flex flex-col gap-4">
          <ToggleRow
            label={t("microphone")}
            value={settings.microphone}
            onChange={(v) => onSettingsChange({ microphone: v })}
          />
          <ToggleRow
            label={t("screenShare")}
            value={settings.screenShare}
            onChange={(v) => onSettingsChange({ screenShare: v })}
          />
          <ToggleRow
            label={t("camera")}
            value={settings.camera}
            onChange={(v) => onSettingsChange({ camera: v })}
          />
        </div>
      </div>
    </div>
  );
};
