"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

/** Renombra los hablantes diarizados de una reunión. */
export function useRenameSpeakers(meetingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (names: Record<string, string>) =>
      api.put(`/api/meetings/${meetingId}/speakers`, { names }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting", meetingId] }),
  });
}
