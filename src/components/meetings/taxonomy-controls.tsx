"use client";

import * as React from "react";
import { Folder as FolderIcon, Tag as TagIcon, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { CHART_COLORS } from "@/lib/domain";
import {
  useFolders,
  useTags,
  useFolderMutations,
  useTagMutations,
  useSetMeetingTaxonomy,
  type Taxon,
} from "@/hooks/use-taxonomy";

/** Asigna carpetas y etiquetas a una reunión (toggle inmediato + crear nuevas). */
export function TaxonomyControls({
  meetingId,
  selectedFolderIds,
  selectedTagIds,
}: {
  meetingId: string;
  selectedFolderIds: string[];
  selectedTagIds: string[];
}) {
  const folders = useFolders();
  const tags = useTags();
  const folderMut = useFolderMutations();
  const tagMut = useTagMutations();
  const setTaxonomy = useSetMeetingTaxonomy(meetingId);

  const [folderIds, setFolderIds] = React.useState<string[]>(selectedFolderIds);
  const [tagIds, setTagIds] = React.useState<string[]>(selectedTagIds);
  React.useEffect(() => setFolderIds(selectedFolderIds), [selectedFolderIds]);
  React.useEffect(() => setTagIds(selectedTagIds), [selectedTagIds]);

  const applyFolders = (ids: string[]) => {
    setFolderIds(ids);
    setTaxonomy.mutate({ folderIds: ids });
  };
  const applyTags = (ids: string[]) => {
    setTagIds(ids);
    setTaxonomy.mutate({ tagIds: ids });
  };

  return (
    <div className="flex flex-wrap gap-6">
      <Section
        icon={FolderIcon}
        label="Carpetas"
        items={folders.data ?? []}
        selected={folderIds}
        onToggle={(id) =>
          applyFolders(folderIds.includes(id) ? folderIds.filter((x) => x !== id) : [...folderIds, id])
        }
        onCreate={async (name) => {
          const created = await folderMut.create.mutateAsync({
            name,
            color: CHART_COLORS[(folders.data?.length ?? 0) % CHART_COLORS.length],
          });
          applyFolders([...folderIds, created.id]);
        }}
      />
      <Section
        icon={TagIcon}
        label="Etiquetas"
        items={tags.data ?? []}
        selected={tagIds}
        onToggle={(id) =>
          applyTags(tagIds.includes(id) ? tagIds.filter((x) => x !== id) : [...tagIds, id])
        }
        onCreate={async (name) => {
          const created = await tagMut.create.mutateAsync({
            name,
            color: CHART_COLORS[(tags.data?.length ?? 0) % CHART_COLORS.length],
          });
          applyTags([...tagIds, created.id]);
        }}
      />
    </div>
  );
}

function Section({
  icon: Icon,
  label,
  items,
  selected,
  onToggle,
  onCreate,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  items: Taxon[];
  selected: string[];
  onToggle: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
}) {
  const [adding, setAdding] = React.useState(false);
  const [name, setName] = React.useState("");

  const submit = async () => {
    const n = name.trim();
    if (!n) return;
    try {
      await onCreate(n);
      setName("");
      setAdding(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="min-w-[16rem] flex-1">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)]">
        <Icon className="size-3.5" /> {label}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {items.map((it) => {
          const on = selected.includes(it.id);
          return (
            <button
              key={it.id}
              onClick={() => onToggle(it.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                on
                  ? "border-transparent text-[var(--foreground)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
              style={on ? { background: `color-mix(in oklab, ${it.color ?? "var(--primary)"} 22%, transparent)` } : undefined}
            >
              <span className="size-2 rounded-full" style={{ background: it.color ?? "var(--primary)" }} />
              {it.name}
              {on && <Check className="size-3" />}
            </button>
          );
        })}
        {adding ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") setAdding(false);
            }}
            onBlur={() => (name.trim() ? submit() : setAdding(false))}
            placeholder="Nombre…"
            className="w-28 rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-xs outline-none focus:border-[var(--brand-400)]"
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <Plus className="size-3" /> Nueva
          </button>
        )}
      </div>
    </div>
  );
}
