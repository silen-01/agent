import { type AgentSettings } from "@types";
import { constants } from "@modules";
import { language } from "@modules";
import { isScreenShareAvailable } from "../screenShareSupport.ts";

const ToggleRow = ({
  label,
  value,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  hint?: string;
}) => (
  <div className={`flex justify-between items-center gap-2 ${disabled ? "opacity-60" : ""}`}>
    <div className="flex flex-col gap-0.5 min-w-0">
      <span>{label}</span>
      {disabled && hint != null && (
        <span className="text-xs text-gray-500">{hint}</span>
      )}
    </div>
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`w-12 h-6 rounded-full transition shrink-0 ${
        disabled
          ? "bg-gray-700 cursor-not-allowed"
          : value
            ? "bg-blue-500"
            : "bg-gray-600"
      }`}
      title={disabled ? hint : undefined}
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
  const screenShareAvailable = isScreenShareAvailable();

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
          {screenShareAvailable && (
            <ToggleRow
              label={t("screenShare")}
              value={settings.screenShare}
              onChange={(v) => onSettingsChange({ screenShare: v })}
            />
          )}
          <ToggleRow
            label={t("camera")}
            value={settings.camera}
            onChange={(v) => onSettingsChange({ camera: v })}
            disabled={!constants.controls.cameraEnabled}
            hint={!constants.controls.cameraEnabled ? t("controlsCameraUnavailable") : undefined}
          />
        </div>
      </div>
    </div>
  );
};
