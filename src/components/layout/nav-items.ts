import { LayoutDashboard, Mic, History, MessageSquareText, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/meetings", label: "Reuniones", icon: Mic },
  { href: "/history", label: "Historial", icon: History },
  { href: "/chat", label: "Ask MeetGenius", icon: MessageSquareText },
];
