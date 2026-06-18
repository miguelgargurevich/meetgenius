import { Badge } from "@/components/ui/badge";

type MapEntry = { label: string; variant: React.ComponentProps<typeof Badge>["variant"] };

export function StatusBadge({
  value,
  map,
  pulse,
}: {
  value: string | null | undefined;
  map: Record<string, MapEntry>;
  pulse?: boolean;
}) {
  if (!value || !map[value]) return null;
  const { label, variant } = map[value];
  return (
    <Badge variant={variant}>
      {pulse && value === "RECORDING" && (
        <span className="size-1.5 animate-recording rounded-full bg-current" />
      )}
      {label}
    </Badge>
  );
}
