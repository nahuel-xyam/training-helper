import { formatSpeed, formatTime, KIND_STYLES, type TimelineStage, type Workout } from "@/lib/workout";

type Props = {
  workout: Workout;
  current: TimelineStage | null;
  next: TimelineStage | null;
  stageElapsed: number;
  stageRemaining: number;
  finished: boolean;
};

export function StageHeader({ workout, current, next, stageElapsed, stageRemaining, finished }: Props) {
  if (!current) {
    return (
      <section className="mx-4 rounded-3xl border border-fg/10 bg-fg/5 p-5 text-center">
        <p className="text-sm uppercase tracking-widest text-fg/50">{finished ? "¡Entrenamiento completado!" : "Listo para arrancar"}</p>
        <h1 className="mt-1 text-2xl font-bold">{finished ? "🎉 Bien ahí" : workout.name}</h1>
        {!finished && workout.warmup && (
          <p className="mt-2 text-fg/60">
            Primera etapa: {workout.warmup.name} · {formatSpeed(workout.warmup)}
          </p>
        )}
      </section>
    );
  }

  const style = KIND_STYLES[current.stage.kind];
  const pct = Math.min(100, (stageElapsed / current.stage.durationSec) * 100);

  return (
    <section
      className="mx-4 rounded-3xl border p-5 transition-colors duration-500"
      style={{ borderColor: style.color, background: style.bg }}
      aria-live="polite"
    >
      <div className="flex items-center justify-between text-sm font-semibold uppercase tracking-widest">
        <span style={{ color: style.color }}>{current.cycle ? `Ciclo ${current.cycle}/${workout.cycles}` : style.label}</span>
        <span className="tabular-nums text-fg/70">quedan {formatTime(Math.ceil(stageRemaining))}</span>
      </div>
      <h1 className="mt-1 text-4xl font-extrabold leading-tight">{current.stage.name}</h1>
      <p className="text-2xl font-semibold" style={{ color: style.color }}>
        {formatSpeed(current.stage)}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-well">
        <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${pct}%`, background: style.color }} />
      </div>
      <p className="mt-3 text-sm text-fg/60">
        {next ? (
          <>
            Siguiente: <span className="font-semibold text-fg/80">{next.stage.name}</span> · {formatSpeed(next.stage)}
            {next.cycle && next.cycle !== current.cycle ? ` · ciclo ${next.cycle}` : ""}
          </>
        ) : (
          "Última etapa 💪"
        )}
      </p>
    </section>
  );
}
