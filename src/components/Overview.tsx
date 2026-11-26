import { Timeline } from "./Timeline";
import { formatTime, type TimelineStage } from "@/lib/workout";

type Props = {
  name: string;
  timeline: TimelineStage[];
  /** índice de la etapa actual (timeline.length si terminó, -1 si no empezó) */
  index: number;
  elapsed: number;
  total: number;
};

/** Resumen general: nombre, tiempo total y la barra con todas las etapas. */
export function Overview({ name, timeline, index, elapsed, total }: Props) {
  return (
    <section className="mx-4 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="truncate text-sm font-semibold uppercase tracking-wider text-fg/60">{name}</h2>
        <p className="shrink-0 font-mono text-lg font-semibold tabular-nums text-fg/85">
          <span className="mr-1.5 font-sans text-xs uppercase tracking-widest text-fg/50">Total</span>
          {formatTime(elapsed)}
          <span className="text-fg/40"> / {formatTime(total)}</span>
        </p>
      </div>
      <Timeline timeline={timeline} index={index} total={total} />
    </section>
  );
}
