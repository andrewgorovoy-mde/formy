export function SourceBadge({
  source,
  agentName,
}: {
  source: string;
  agentName?: string | null;
}) {
  if (source === "agent") {
    return (
      <span
        title={agentName ?? undefined}
        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
        style={{ backgroundColor: "color-mix(in srgb, var(--accent) 16%, white)", color: "var(--accent)" }}
      >
        Agent
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-500">
      Human
    </span>
  );
}
