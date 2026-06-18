"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CreateMeetingInput, UpdateMeetingInput } from "@/server/validators";
import type { DashboardData } from "@/server/services/dashboard.service";
import { desktop, isDesktopApp } from "@/lib/desktop";

export interface MeetingListItem {
  id: string;
  title: string;
  description: string | null;
  status: keyof typeof import("@/lib/domain").MEETING_STATUS;
  durationSec: number;
  participants: string[];
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | null;
  scheduledAt: string | null;
  scheduledMinutes: number | null;
  meetingUrl: string | null;
  externalEventId: string | null;
  createdAt: string;
  owner: { name: string } | null;
  _count: { tasks: number; agreements: number; risks: number };
}

export function useMeetings(filters?: Record<string, string | undefined>) {
  const qs = new URLSearchParams(
    Object.entries(filters ?? {}).filter(([, v]) => v) as [string, string][],
  ).toString();
  return useQuery({
    queryKey: ["meetings", filters],
    queryFn: () => api.get<MeetingListItem[]>(`/api/meetings${qs ? `?${qs}` : ""}`),
  });
}

export function useMeeting(id: string) {
  return useQuery({
    queryKey: ["meeting", id],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => api.get<any>(`/api/meetings/${id}`),
    refetchInterval: (q) => {
      const status = (q.state.data as { status?: string } | undefined)?.status;
      return status === "PROCESSING" || status === "RECORDING" ? 3000 : false;
    },
  });
}

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMeetingInput) =>
      api.post<{ id: string }>("/api/meetings", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });
}

export function useUpdateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateMeetingInput & { id: string }) =>
      api.patch<{ id: string }>(`/api/meetings/${id}`, input),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      qc.invalidateQueries({ queryKey: ["meeting", vars.id] });
    },
  });
}

/**
 * Borra una reunión y, si es de escritorio y tenía evento sincronizado,
 * también lo elimina del calendario de macOS (sync bidireccional).
 */
export function useDeleteMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, externalEventId }: { id: string; externalEventId?: string | null }) => {
      if (isDesktopApp() && externalEventId) {
        await desktop()?.deleteCalendarEvent?.(externalEventId).catch(() => {});
      }
      return api.del(`/api/meetings/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardData>("/api/dashboard"),
  });
}

export function useUpdateTask(meetingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: string; priority?: string }) =>
      api.patch(`/api/tasks/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting", meetingId] }),
  });
}
