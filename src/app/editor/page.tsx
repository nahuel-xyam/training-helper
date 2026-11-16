import type { Metadata } from "next";
import { BrowserOnly } from "@/components/BrowserOnly";
import { WorkoutEditor } from "@/components/WorkoutEditor";

export const metadata: Metadata = { title: "Editar entrenamiento · Training Helper" };

export default function EditorPage() {
  return (
    <BrowserOnly fallback={<div className="flex min-h-dvh items-center justify-center text-white/40">Cargando…</div>}>
      <WorkoutEditor />
    </BrowserOnly>
  );
}
