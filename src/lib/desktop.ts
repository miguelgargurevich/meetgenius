/** Acceso tipado al puente de Electron expuesto en preload (`window.meetgenius`). */

export interface MeetingStatus {
  active: boolean;
  app: "meet" | "teams" | "zoom" | null;
  detail: string | null;
  error?: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string;
  url: string;
  notes: string;
  attendees: string[];
  calendar: string;
  joinUrl: string | null;
  platform: "meet" | "teams" | "zoom" | "webex" | null;
}

export interface TodayAgenda {
  events: CalendarEvent[];
  error?: string;
}

interface DesktopBridge {
  platform: string;
  isDesktop?: boolean;
  version?: string;
  getScreenAccess?: () => Promise<string>;
  getMeetingStatus?: () => Promise<MeetingStatus>;
  onMeetingStatus?: (cb: (status: MeetingStatus) => void) => () => void;
  getTodayAgenda?: () => Promise<TodayAgenda>;
}

export function desktop(): DesktopBridge | undefined {
  return (globalThis as unknown as { meetgenius?: DesktopBridge }).meetgenius;
}

export function isDesktopApp(): boolean {
  return Boolean(desktop()?.isDesktop);
}
