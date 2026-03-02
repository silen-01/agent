import { Bot } from "lucide-react";

type SessionAvatarProps = {
  /** Когда true — можно включить анимацию «ИИ говорит» */
  isSpeaking?: boolean;
};

export const SessionAvatar = ({ isSpeaking = false }: SessionAvatarProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-0 min-w-0 p-4">
      <div
        className={`
          relative flex items-center justify-center rounded-full bg-[#111827] border-2 border-gray-700
          w-44 h-44 md:w-56 md:h-56 shrink-0
          transition-all duration-300
          ${isSpeaking ? "ring-4 ring-blue-500/50 ring-offset-2 ring-offset-[#0B1118] scale-105" : ""}
        `}
      >
        <Bot size={64} className="text-gray-500 w-14 h-14 md:w-16 md:h-16" />
        {isSpeaking && (
          <span className="absolute inset-0 rounded-full animate-ping bg-blue-500/20" aria-hidden />
        )}
      </div>
    </div>
  );
};
