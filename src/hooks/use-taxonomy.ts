"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface Taxon {
  id: string;
  name: string;
  color: string | null;
  _count?: { meetings: number };
}

export function useFolders() {
  return useQuery({ queryKey: ["folders"], queryFn: () => api.get<Taxon[]>("/api/folders") });
}
export function useTags() {
  return useQuery({ queryKey: ["tags"], queryFn: () => api.get<Taxon[]>("/api/tags") });
}

function useTaxonMutations(kind: "folders" | "tags") {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: [kind] });
    qc.invalidateQueries({ queryKey: ["meetings"] });
  };
  const create = useMutation({
    mutationFn: (input: { name: string; color?: string | null }) =>
      api.post<Taxon>(`/api/${kind}`, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/api/${kind}/${id}`),
    onSuccess: invalidate,
  });
  return { create, remove };
}

export const useFolderMutations = () => useTaxonMutations("folders");
export const useTagMutations = () => useTaxonMutations("tags");

export function useSetMeetingTaxonomy(meetingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { folderIds?: string[]; tagIds?: string[] }) =>
      api.put(`/api/meetings/${meetingId}/taxonomy`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meeting", meetingId] });
      qc.invalidateQueries({ queryKey: ["meetings"] });
      qc.invalidateQueries({ queryKey: ["folders"] });
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}
