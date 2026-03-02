import { language } from "@modules";

export type SessionDialogPanelProps = {
  /** Скрыть заголовок (когда панель в окне с собственным заголовком) */
  hideTitle?: boolean;
};

export const SessionDialogPanel = ({ hideTitle = false }: SessionDialogPanelProps) => {
  const { t } = language.useLanguage();

  return (
    <div className="min-w-0 min-h-0 flex flex-col flex-1">
      {!hideTitle && (
        <h2 className="text-lg font-semibold mb-2 shrink-0">{t("sessionDialogTitle")}</h2>
      )}
      <div className="flex-1 flex flex-col overflow-hidden min-h-[80px] rounded-b-2xl border border-gray-700 border-t-0 bg-[#111827] p-3">
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center text-gray-500 text-sm py-2">
          {t("sessionDialogEmpty")}
        </div>
      </div>
    </div>
  );
};
