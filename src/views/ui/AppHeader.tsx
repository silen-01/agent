import { language } from "@modules";

export const AppHeader = () => {
  const { lang, setLang, t } = language.useLanguage();

  return (
    <div className="flex justify-between items-center shrink-0 mb-6">
      <h1 className="text-3xl font-bold text-blue-400">{t("appTitle")}</h1>
      <div className="relative flex rounded-full bg-[#111827] p-1 border border-gray-700/80 select-none">
        <div
          className="absolute top-1 bottom-1 rounded-full bg-blue-500 transition-[left] duration-200 ease-out pointer-events-none"
          style={{ width: "calc(50% - 4px)", left: lang === "en" ? "4px" : "calc(50% + 2px)" }}
        />
        <button
          type="button"
          onClick={() => setLang("en")}
          className={"relative z-10 flex items-center justify-center w-14 h-9 text-sm font-medium transition-colors rounded-full leading-none select-none outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-inset " + (lang === "en" ? "text-white" : "text-gray-400 hover:text-gray-300")}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLang("ru")}
          className={"relative z-10 flex items-center justify-center w-14 h-9 text-sm font-medium transition-colors rounded-full leading-none select-none outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-inset " + (lang === "ru" ? "text-white" : "text-gray-400 hover:text-gray-300")}
        >
          RU
        </button>
      </div>
    </div>
  );
};
