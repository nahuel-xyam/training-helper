import { KIND_STYLES, type TimelineStage } from "@/lib/workout";

/** Barra con un segmento por etapa, proporcional a su duración. */
export function Timeline({ timeline, index, total }: { timeline: TimelineStage[]; index: number; total: number }) {
  if (!total) return null;
  return (
    <div className="flex h-4 gap-1" aria-hidden>
      {timeline.map((t) => {
        const style = KIND_STYLES[t.stage.kind];
        const done = index > t.index;
        const active = index === t.index;
        return (
          <div
            key={t.index}
            className={`rounded-sm transition-opacity ${active ? "ring-2 ring-fg" : ""}`}
            style={{
              flexGrow: t.stage.durationSec,
              flexBasis: 0,
              background: style.color,
              opacity: done ? 0.25 : active ? 1 : 0.6,
            }}
          />
        );
      })}
    </div>
  );
}
