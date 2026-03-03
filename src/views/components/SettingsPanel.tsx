import { useState, useCallback, useEffect } from "react";

import { type AgentSettings, type Tone } from "@types";
import { getPersonalityByLang, language, constants } from "@modules";
import { CustomSelect } from "../ui";

const TONE_OPTIONS: Tone[] = ["friendly", "neutral", "aggressive"];

export const SettingsPanel = ({
  settings,
  defaultSettings,
  onClose,
  onSave,
}: {
  settings: AgentSettings;
  defaultSettings: AgentSettings;
  onClose: () => void;
  onSave: (settings: AgentSettings) => void;
}) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [isClosing, setIsClosing] = useState(false);
  const { t, lang } = language.useLanguage();

  const getPersonalityName = (id: string) => getPersonalityByLang(constants.personalities, constants.language.defaultLang, id, lang).name;
  const getPersonalityPrompt = (id: string) => getPersonalityByLang(constants.personalities, constants.language.defaultLang, id, lang).prompt;

  const runCloseAnimation = useCallback((callback: () => void) => {
    setIsClosing(true);
    setTimeout(callback, constants.settingsPanel.closeAnimationMs);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isClosing) runCloseAnimation(onClose);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isClosing, runCloseAnimation, onClose]);

  // При открытии панели: если поле «точная настройка» пустое — подставить промпт выбранной личности по текущему языку
  useEffect(() => {
    setLocalSettings((prev) => {
      if (prev.personalityPrompt.trim()) return prev;
      const prompt = getPersonalityByLang(constants.personalities, constants.language.defaultLang, prev.personality, lang).prompt;
      return { ...prev, personalityPrompt: prompt };
    });
  }, [settings.personality, settings.personalityPrompt, lang]);

  const toneKey = (tone: Tone): language.TranslationKey =>
    `tone${tone.charAt(0).toUpperCase() + tone.slice(1)}` as language.TranslationKey;

  const handleOverlayClick = () => {
    if (!isClosing) runCloseAnimation(onClose);
  };

  return (
    <div
      role="presentation"
      onClick={handleOverlayClick}
      className={
        isClosing
          ? "settings-panel-overlay-out fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          : "settings-panel-overlay fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      }
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("agentSettings")}
        onClick={(e) => e.stopPropagation()}
        className={
          isClosing
            ? "settings-panel-modal-out bg-[#111827] border border-gray-700 rounded-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/50"
            : "settings-panel-modal bg-[#111827] border border-gray-700 rounded-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/50"
        }
      >
        <h2 className="text-xl mb-6 font-semibold text-white">{t("agentSettings")}</h2>

        {/* Personality */}
        <div className="mb-5">
          <label className="block mb-2 text-sm text-gray-300">
            {t("personalityLabel")}
          </label>
          <CustomSelect
            value={localSettings.personality}
            options={constants.personalities.map((p) => p.id)}
            getOptionLabel={getPersonalityName}
            onChange={(personalityId) =>
              setLocalSettings({
                ...localSettings,
                personality: personalityId,
                personalityPrompt: getPersonalityPrompt(personalityId),
              })
            }
            aria-label={t("personalityLabel")}
          />
        </div>

        {/* Tone */}
        <div className="mb-5">
          <label className="block mb-2 text-sm text-gray-300">
            {t("toneLabel")}
          </label>
          <CustomSelect
            value={localSettings.tone}
            options={TONE_OPTIONS}
            getOptionLabel={(tone) => t(toneKey(tone as Tone))}
            onChange={(tone) =>
              setLocalSettings({ ...localSettings, tone: tone as Tone })
            }
            aria-label={t("toneLabel")}
          />
        </div>

        {/* Allow profanity - styled toggle */}
        <div className="mb-5 flex items-center justify-between">
          <label className="text-sm text-gray-300">{t("allowProfanity")}</label>
          <button
            type="button"
            role="switch"
            aria-checked={localSettings.allowProfanity}
            onClick={() =>
              setLocalSettings({
                ...localSettings,
                allowProfanity: !localSettings.allowProfanity,
              })
            }
            className={`w-11 h-6 rounded-full transition-colors relative ${
              localSettings.allowProfanity ? "bg-blue-500" : "bg-gray-600"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all duration-200 ${
                localSettings.allowProfanity ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </div>

        {/* Personality prompt */}
        <div className="mb-5 pt-1 border-t border-gray-700/80">
          <label className="block mb-2 text-sm text-gray-300">
            {t("personalityPromptLabel")}
          </label>
          <textarea
            value={localSettings.personalityPrompt}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                personalityPrompt: e.target.value,
              })
            }
            placeholder={t("personalityPromptPlaceholder")}
            rows={3}
            className="w-full bg-[#0B1118] border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 resize-y min-h-[80px] transition-shadow select-text"
          />
        </div>

        {/* Reaction timeout slider */}
        <div className="mb-5">
          <div className="flex justify-between items-baseline mb-2">
            <label className="text-sm text-gray-300">
              {t("reactionTimeoutLabel")}
            </label>
            <span className="text-sm text-blue-400 tabular-nums">
              {localSettings.reactionTimeoutSeconds} {t("reactionTimeoutSuffix")}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-2">{t("reactionTimeoutHint")}</p>
          <input
            type="range"
            min={constants.settingsPanel.reactionTimeout.min}
            max={constants.settingsPanel.reactionTimeout.max}
            value={localSettings.reactionTimeoutSeconds}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                reactionTimeoutSeconds: Number(e.target.value),
              })
            }
            className="w-full"
          />
        </div>

        {/* Emotionality slider */}
        <div className="mb-6">
          <div className="flex justify-between items-baseline mb-2">
            <label className="text-sm text-gray-300">
              {t("emotionalityLabel")}
            </label>
            <span className="text-sm text-blue-400 tabular-nums">
              {localSettings.emotionality} {t("emotionalityPercent")}
            </span>
          </div>
          <input
            type="range"
            min={constants.settingsPanel.emotionality.min}
            max={constants.settingsPanel.emotionality.max}
            value={localSettings.emotionality}
            onChange={(e) =>
              setLocalSettings({
                ...localSettings,
                emotionality: Number(e.target.value),
              })
            }
            className="w-full"
          />
        </div>

        <div className="flex justify-between items-center gap-3 pt-4 border-t border-gray-700/80">
          <button
            type="button"
            onClick={() => {
              const personalityPrompt = getPersonalityByLang(
                constants.personalities,
                constants.language.defaultLang,
                defaultSettings.personality,
                lang
              ).prompt;
              setLocalSettings({ ...defaultSettings, personalityPrompt });
            }}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            {t("resetToDefaults")}
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => runCloseAnimation(onClose)}
              className="px-4 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium"
            >
              {t("cancel")}
            </button>
            <button
              onClick={() => runCloseAnimation(() => onSave(localSettings))}
              className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors text-sm shadow-lg shadow-blue-500/20"
            >
              {t("save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
