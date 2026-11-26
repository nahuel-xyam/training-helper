import { formatSpeed, formatTime, KIND_STYLES, type TimelineStage, type Workout } from "@/lib/workout";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Cuenta regresiva en formato MM:SS:CC (centésimas). */
function Countdown({ seconds }: { seconds: number }) {
  const cs = Math.floor(Math.max(0, seconds) * 100);
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  return (
    <div className="flex items-baseline justify-center font-mono font-bold leading-none tabular-nums tracking-tight">
      <span className="text-[clamp(3.25rem,17vw,8rem)]">
        {h > 0 && `${h}:`}
        {pad(m)}:{pad(s)}
      </span>
      <span className="text-[clamp(1.75rem,9vw,4rem)] text-fg/55">:{pad(c)}</span>
    </div>
  );
}

type Props = {
  workout: Workout;
  /** etapa a mostrar: la actual, o la primera si todavía no arrancó */
  stage: TimelineStage | null;
  next: TimelineStage | null;
  /** segundos que faltan de la etapa */
  remaining: number;
  started: boolean;
  finished: boolean;
  total: number;
};

/** Card de la etapa actual: tipo/ciclo, nombre, velocidad, cuenta regresiva y lo que sigue. */
export function StageCard({ workout, stage, next, remaining, started, finished, total }: Props) {
  if (finished || !stage) {
    return (
      <section className="mx-4 flex flex-col items-center gap-2 rounded-[2rem] border border-fg/10 bg-fg/5 px-5 py-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-fg/50">¡Entrenamiento completado!</p>
        <p className="text-5xl">🎉</p>
        <h1 className="text-3xl font-extrabold">Bien ahí</h1>
        <p className="text-fg/60 tabular-nums">Tiempo total {formatTime(total)}</p>
      </section>
    );
  }

  const style = KIND_STYLES[stage.stage.kind];
  const duration = stage.stage.durationSec;
  const pct = duration ? Math.min(100, ((duration - Math.max(0, remaining)) / duration) * 100) : 0;
  const chip = !started ? "Primera etapa" : stage.cycle ? `Ciclo ${stage.cycle}/${workout.cycles}` : style.label;

  return (
    <section
      className="mx-4 flex flex-col gap-7 rounded-[2rem] border px-6 py-7 short:gap-4 short:py-5 transition-colors duration-500"
      style={{ borderColor: style.color, background: style.bg }}
      aria-live="polite"
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: style.color }}>
            {chip}
          </p>
          <p className="shrink-0 rounded-full px-3.5 py-1 text-lg font-bold tabular-nums" style={{ color: style.color, background: style.bg }}>
            {formatSpeed(stage.stage)}
          </p>
        </div>
        <h1 className="mt-1 text-[clamp(1.75rem,8.5vw,2.5rem)] font-extrabold leading-tight break-words">{stage.stage.name}</h1>
      </div>

      <div className="flex flex-col items-center gap-3 py-3 short:gap-2 short:py-0">
        <Countdown seconds={remaining} />
        <p className="text-sm uppercase tracking-widest text-fg/55 tabular-nums">
          {started ? "quedan" : "dura"} · etapa de {formatTime(duration)}
        </p>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-well">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: style.color }} />
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-widest text-fg/45">{next ? "Siguiente" : "Última etapa"}</p>
        <p className="text-base text-fg/70">
          {next ? (
            <>
              <span className="font-semibold text-fg/90">{next.stage.name}</span> · {formatSpeed(next.stage)}
              {next.cycle && next.cycle !== stage.cycle ? ` · ciclo ${next.cycle}` : ""}
            </>
          ) : (
            "¡Ya casi! 💪"
          )}
        </p>
      </div>
    </section>
  );
}
