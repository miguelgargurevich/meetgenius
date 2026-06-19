"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useVocabulary() {
  return useQuery({
    queryKey: ["vocabulary"],
    queryFn: () => api.get<string[]>("/api/vocabulary"),
  });
}

export function useSetVocabulary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (terms: string[]) => api.put<string[]>("/api/vocabulary", { terms }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vocabulary"] }),
  });
}
