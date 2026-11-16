import { FaPause, FaPlay, FaRedo, FaStop } from "react-icons/fa";
import type { TimerStatus } from "@/hooks/useWorkoutTimer";

type Props = {
  status: TimerStatus;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
};

const round = "flex flex-col items-center justify-center rounded-full font-bold shadow-lg active:scale-95 transition-transform";

export function Controls({ status, onStart, onPause, onResume, onStop }: Props) {
  if (status === "idle" || status === "finished") {
    return (
      <button type="button" onClick={onStart} className={`${round} h-40 w-40 gap-2 bg-green-500 text-black shadow-green-500/30`}>
        {status === "finished" ? <FaRedo size={40} /> : <FaPlay size={44} className="ml-2" />}
        <span className="text-lg">{status === "finished" ? "Otra vez" : "Empezar"}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-8">
      {status === "running" ? (
        <button type="button" onClick={onPause} className={`${round} h-32 w-32 gap-1 bg-amber-400 text-black`}>
          <FaPause size={36} />
          <span>Pausa</span>
        </button>
      ) : (
        <button type="button" onClick={onResume} className={`${round} h-32 w-32 gap-1 bg-green-500 text-black`}>
          <FaPlay size={34} className="ml-1" />
          <span>Seguir</span>
        </button>
      )}
      <button type="button" onClick={onStop} className={`${round} h-24 w-24 gap-1 bg-red-500 text-white`}>
        <FaStop size={26} />
        <span className="text-sm">Stop</span>
      </button>
    </div>
  );
}
