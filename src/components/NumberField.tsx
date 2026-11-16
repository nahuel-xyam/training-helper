"use client";

import { useState } from "react";

type Props = {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  decimal?: boolean;
  label: string;
  suffix?: string;
  className?: string;
};

/** Input numérico que acepta coma o punto y no pelea con el usuario mientras escribe. */
export function NumberField({ value, onChange, min = 0, max = 999, decimal, label, suffix, className = "" }: Props) {
  const [text, setText] = useState(String(value).replace(".", decimal ? "," : "."));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(String(value).replace(".", decimal ? "," : "."));
  }

  const commit = (raw: string) => {
    const n = Number(raw.replace(",", "."));
    if (raw.trim() === "" || !Number.isFinite(n)) return;
    const clamped = Math.min(max, Math.max(min, decimal ? Math.round(n * 10) / 10 : Math.round(n)));
    setLastValue(clamped);
    onChange(clamped);
  };

  return (
    <label className={`flex flex-col gap-1 text-xs text-white/50 ${className}`}>
      {label}
      <span className="flex items-center rounded-lg border border-white/10 bg-black/30 focus-within:border-white/40">
        <input
          type="text"
          inputMode={decimal ? "decimal" : "numeric"}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value);
          }}
          onBlur={() => setText(String(lastValue).replace(".", decimal ? "," : "."))}
          className="w-full min-w-0 bg-transparent px-2 py-2 text-base text-white outline-none"
        />
        {suffix && <span className="pr-2 text-white/40">{suffix}</span>}
      </span>
    </label>
  );
}
