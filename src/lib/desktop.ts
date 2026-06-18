/** Acceso tipado al puente de Electron expuesto en preload (`window.meetgenius`). */

export interface MeetingStatus {
  active: boolean;
  app: "meet" | "teams" | "zoom" | null;
  detail: string | null;
  error?: boolean;
}

interface DesktopBridge {
  platform: string;
  isDesktop?: boolean;
  version?: string;
  getScreenAccess?: () => Promise<string>;
  getMeetingStatus?: () => Promise<MeetingStatus>;
  onMeetingStatus?: (cb: (status: MeetingStatus) => void) => () => void;
}

export function desktop(): DesktopBridge | undefined {
  return (globalThis as unknown as { meetgenius?: DesktopBridge }).meetgenius;
}

export function isDesktopApp(): boolean {
  return Boolean(desktop()?.isDesktop);
}
