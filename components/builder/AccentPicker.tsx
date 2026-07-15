import { ACCENT_PRESETS } from "@/lib/colors";

export function AccentPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {ACCENT_PRESETS.map((preset) => (
        <button
          key={preset.value}
          type="button"
          title={preset.name}
          onClick={() => onChange(preset.value)}
          className="h-6 w-6 rounded-full ring-offset-2 transition"
          style={{
            backgroundColor: preset.value,
            boxShadow: value === preset.value ? `0 0 0 2px ${preset.value}` : undefined,
            outline: value === preset.value ? "2px solid white" : undefined,
            outlineOffset: value === preset.value ? "-4px" : undefined,
          }}
        />
      ))}
    </div>
  );
}
