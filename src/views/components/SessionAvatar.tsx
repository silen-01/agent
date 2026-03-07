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
          relative flex items-center justify-center rounded-full bg-[#111827] border-2
          w-44 h-44 md:w-56 md:h-56 shrink-0 overflow-hidden
          transition-[border-color] duration-500
          ${isSpeaking ? "session-avatar-speaking border-blue-500 ring-2 ring-blue-500/50 ring-offset-2 ring-offset-[#0B1118]" : "border-gray-700"}
        `}
      >
        <Bot size={64} className="text-gray-500 w-14 h-14 md:w-16 md:h-16" />
      </div>
    </div>
  );
};
