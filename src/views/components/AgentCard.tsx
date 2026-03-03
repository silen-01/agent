import { Settings } from "lucide-react";

import { type AgentSettings, type Tone } from "@types";
import { constants, getPersonalityByLang, language } from "@modules";

const toneKey = (tone: Tone): language.TranslationKey =>
  `tone${tone.charAt(0).toUpperCase() + tone.slice(1)}` as language.TranslationKey;

export const AgentCard = ({ settings, onOpenSettings }: { settings: AgentSettings; onOpenSettings: () => void }) => {
  const { t, lang } = language.useLanguage();
  const personalityName = getPersonalityByLang(constants.personalities, constants.language.defaultLang, settings.personality, lang).name;

  return (
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
            onClick={onOpenSettings}
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
              {personalityName}
            </span>
          </div>
          <div className="text-sm text-gray-300">
            {t("tone")}:{" "}
            <span className="text-blue-400 font-medium">
              {t(toneKey(settings.tone))}
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
  );
};
