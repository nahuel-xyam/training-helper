import { BrowserOnly } from "@/components/BrowserOnly";
import { TrainingApp } from "@/components/TrainingApp";

export default function Home() {
  return (
    <BrowserOnly fallback={<div className="flex min-h-dvh items-center justify-center text-fg/40">Cargando…</div>}>
      <TrainingApp />
    </BrowserOnly>
  );
}
