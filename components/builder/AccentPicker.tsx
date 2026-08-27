"use client";

import { useRef, useState } from "react";
import { ACCENT_PRESETS } from "@/lib/colors";
import { useClickOutside } from "@/components/hooks/useClickOutside";

export function AccentPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Theme color"
        aria-label="Theme color"
        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-stone-100"
      >
        <span className="h-4 w-4 rounded-full ring-2 ring-white ring-offset-1" style={{ backgroundColor: value, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.1)" }} />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1 flex gap-1.5 rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              title={preset.name}
              onClick={() => {
                onChange(preset.value);
                setOpen(false);
              }}
              className="h-6 w-6 rounded-full transition hover:scale-110"
              style={{
                backgroundColor: preset.value,
                outline: value === preset.value ? `2px solid ${preset.value}` : "none",
                outlineOffset: "2px",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
