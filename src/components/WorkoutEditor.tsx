"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MdAdd, MdArrowBack, MdArrowDownward, MdArrowUpward, MdDelete, MdRestore, MdSave } from "react-icons/md";
import { NumberField } from "./NumberField";
import { isCustomWorkout, loadRun, loadWorkout, resetWorkout, saveWorkout } from "@/lib/storage";
import { DEFAULT_WORKOUT, formatTime, KIND_STYLES, newStageId, totalDuration, type Stage, type StageKind, type Workout } from "@/lib/workout";

const KINDS: StageKind[] = ["warmup", "fast", "recovery", "cooldown", "custom"];

function StageEditor({
  stage,
  onChange,
  onRemove,
  onUp,
  onDown,
}: {
  stage: Stage;
  onChange: (s: Stage) => void;
  onRemove?: () => void;
  onUp?: () => void;
  onDown?: () => void;
}) {
  const color = KIND_STYLES[stage.kind].color;
  const min = Math.floor(stage.durationSec / 60);
  const sec = stage.durationSec % 60;
  const set = (patch: Partial<Stage>) => onChange({ ...stage, ...patch });

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-fg/10 bg-fg/5 p-3" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="flex gap-2">
        <input
          value={stage.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="Nombre"
          aria-label="Nombre de la etapa"
          className="min-w-0 flex-1 rounded-lg border border-fg/10 bg-well px-2 py-2 text-base outline-none focus:border-fg/40"
        />
        <select
          value={stage.kind}
          onChange={(e) => set({ kind: e.target.value as StageKind })}
          aria-label="Tipo (color)"
          className="rounded-lg border border-fg/10 bg-surface px-2 text-sm"
          style={{ color }}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_STYLES[k].label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <NumberField label="Min" value={min} max={180} onChange={(v) => set({ durationSec: v * 60 + sec })} />
        <NumberField label="Seg" value={sec} max={59} onChange={(v) => set({ durationSec: min * 60 + v })} />
        <NumberField label="Vel. mín" value={stage.speedMin} max={30} decimal onChange={(v) => set({ speedMin: v })} />
        <NumberField label="Vel. máx" value={stage.speedMax} max={30} decimal onChange={(v) => set({ speedMax: v })} />
      </div>
      {(onRemove || onUp || onDown) && (
        <div className="flex justify-end gap-1 text-fg/60">
          {onUp && (
            <button type="button" onClick={onUp} aria-label="Subir" className="rounded-lg p-2 hover:bg-fg/10">
              <MdArrowUpward size={20} />
            </button>
          )}
          {onDown && (
            <button type="button" onClick={onDown} aria-label="Bajar" className="rounded-lg p-2 hover:bg-fg/10">
              <MdArrowDownward size={20} />
            </button>
          )}
          {onRemove && (
            <button type="button" onClick={onRemove} aria-label="Eliminar" className="rounded-lg p-2 text-red-400 hover:bg-red-500/10">
              <MdDelete size={20} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function OptionalStage({
  title,
  stage,
  fallback,
  onChange,
}: {
  title: string;
  stage: Stage | null;
  fallback: Stage;
  onChange: (s: Stage | null) => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      <label className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="flex items-center gap-2 text-sm text-fg/60">
          Incluir
          <input type="checkbox" checked={!!stage} onChange={(e) => onChange(e.target.checked ? fallback : null)} className="h-5 w-5 accent-green-500" />
        </span>
      </label>
      {stage && <StageEditor stage={stage} onChange={onChange} />}
    </section>
  );
}

export function WorkoutEditor() {
  const router = useRouter();
  const [draft, setDraft] = useState<Workout>(loadWorkout);
  const [custom, setCustom] = useState(isCustomWorkout);
  const [running] = useState(() => loadRun() !== null);

  const set = (patch: Partial<Workout>) => setDraft((d) => ({ ...d, ...patch }));
  const setCycleStage = (i: number, s: Stage) => set({ cycle: draft.cycle.map((x, j) => (j === i ? s : x)) });
  const moveCycleStage = (i: number, dir: -1 | 1) => {
    const next = [...draft.cycle];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    set({ cycle: next });
  };

  const total = totalDuration(draft);
  const valid = total > 0 && draft.cycle.every((s) => s.speedMin <= s.speedMax);

  const save = () => {
    saveWorkout(draft);
    router.push("/");
  };
  const restore = () => {
    if (!window.confirm("¿Volver al entrenamiento standard? Se pierden tus cambios.")) return;
    resetWorkout();
    setCustom(false);
    setDraft(DEFAULT_WORKOUT);
  };

  if (running) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
        <p>Hay un entrenamiento en curso. Paralo para poder editar.</p>
        <Link href="/" className="rounded-xl bg-fg/10 px-4 py-2">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-fg/10 bg-page/90 px-3 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2 backdrop-blur">
        <Link href="/" aria-label="Volver" className="rounded-full p-2 hover:bg-fg/10">
          <MdArrowBack size={24} />
        </Link>
        <h1 className="flex-1 text-lg font-bold">Editar entrenamiento</h1>
        <span className="tabular-nums text-fg/60">{formatTime(total)}</span>
      </header>

      <main className="flex flex-col gap-6 p-4 pb-32">
        <label className="flex flex-col gap-1 text-sm text-fg/60">
          Nombre
          <input
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
            className="rounded-lg border border-fg/10 bg-well px-3 py-2 text-lg text-fg outline-none focus:border-fg/40"
          />
        </label>

        <OptionalStage title="Calentamiento" stage={draft.warmup} fallback={DEFAULT_WORKOUT.warmup!} onChange={(s) => set({ warmup: s })} />

        <section className="flex flex-col gap-2">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-lg font-bold">Ciclo</h2>
            <NumberField label="Repeticiones" value={draft.cycles} min={0} max={50} onChange={(v) => set({ cycles: v })} className="w-28" />
          </div>
          {draft.cycle.map((s, i) => (
            <StageEditor
              key={s.id}
              stage={s}
              onChange={(ns) => setCycleStage(i, ns)}
              onRemove={() => set({ cycle: draft.cycle.filter((_, j) => j !== i) })}
              onUp={i > 0 ? () => moveCycleStage(i, -1) : undefined}
              onDown={i < draft.cycle.length - 1 ? () => moveCycleStage(i, 1) : undefined}
            />
          ))}
          <button
            type="button"
            onClick={() => set({ cycle: [...draft.cycle, { id: newStageId(), name: "Nueva etapa", kind: "custom", durationSec: 60, speedMin: 4, speedMax: 5 }] })}
            className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-fg/20 py-3 text-fg/70"
          >
            <MdAdd size={20} /> Agregar etapa al ciclo
          </button>
        </section>

        <OptionalStage title="Enfriamiento" stage={draft.cooldown} fallback={DEFAULT_WORKOUT.cooldown!} onChange={(s) => set({ cooldown: s })} />

        {custom && (
          <button type="button" onClick={restore} className="flex items-center justify-center gap-2 rounded-xl border border-fg/15 py-3 text-fg/70">
            <MdRestore size={20} /> Restaurar entrenamiento standard
          </button>
        )}
        {!custom && (
          <button type="button" onClick={() => setDraft(DEFAULT_WORKOUT)} className="flex items-center justify-center gap-2 rounded-xl border border-fg/15 py-3 text-fg/70">
            <MdRestore size={20} /> Deshacer cambios
          </button>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-fg/10 bg-page/95 p-4 pb-[max(env(safe-area-inset-bottom),1rem)] backdrop-blur">
        <div className="mx-auto max-w-xl">
          {!valid && <p className="mb-2 text-center text-sm text-red-400">Revisá duraciones y que la vel. mínima no supere la máxima.</p>}
          <button
            type="button"
            onClick={save}
            disabled={!valid}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-500 py-4 text-lg font-bold text-black disabled:opacity-40"
          >
            <MdSave size={22} /> Guardar
          </button>
        </div>
      </footer>
    </div>
  );
}
