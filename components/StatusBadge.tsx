export function StatusBadge({ status }: { status: string }) {
  const published = status === "published";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        published ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"
      }`}
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}
