"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface CalendarSource {
  id: string;
  name: string;
  kind: "url" | "file";
  url: string | null;
  color: string | null;
  enabled: boolean;
  createdAt: string;
}

export function useSources() {
  return useQuery({
    queryKey: ["calendar-sources"],
    queryFn: () => api.get<CalendarSource[]>("/api/calendar/sources"),
  });
}

export function useAddSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; url?: string; icsContent?: string }) =>
      api.post<CalendarSource & { meetingsCreated?: number }>("/api/calendar/sources", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-sources"] });
      qc.invalidateQueries({ queryKey: ["calendar-range"] });
      qc.invalidateQueries({ queryKey: ["agenda-today"] });
      // Al importar un .ics pueden crearse reuniones (eventos con videollamada).
      qc.invalidateQueries({ queryKey: ["meetings"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useRemoveSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/calendar/sources/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-sources"] });
      qc.invalidateQueries({ queryKey: ["calendar-range"] });
      qc.invalidateQueries({ queryKey: ["agenda-today"] });
    },
  });
}
