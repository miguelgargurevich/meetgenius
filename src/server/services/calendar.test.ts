import { describe, expect, it } from "vitest";
import { parseIcsRange } from "./calendar.service";

const ICS = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//test//EN
BEGIN:VEVENT
UID:evt-meet
SUMMARY:Reunión con Carola
DTSTART:20260618T140000Z
DTEND:20260618T150000Z
LOCATION:https://meet.google.com/abc-defg-hij
END:VEVENT
BEGIN:VEVENT
UID:evt-allday
SUMMARY:Día del Padre
DTSTART;VALUE=DATE:20260621
DTEND;VALUE=DATE:20260622
END:VEVENT
BEGIN:VEVENT
UID:evt-weekly
SUMMARY:Daily standup
DTSTART:20260615T130000Z
DTEND:20260615T131500Z
RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR
END:VEVENT
END:VCALENDAR`;

describe("parseIcsRange", () => {
  const events = parseIcsRange(
    ICS,
    new Date("2026-06-15T00:00:00Z"),
    new Date("2026-06-29T00:00:00Z"),
    "Trabajo",
  );

  it("incluye eventos simples, all-day y expande recurrencias", () => {
    const titles = events.map((e) => e.title);
    expect(titles).toContain("Reunión con Carola");
    expect(titles).toContain("Día del Padre");
    // Daily standup recurre Lun/Mié/Vie → varias ocurrencias en 2 semanas
    expect(titles.filter((t) => t === "Daily standup").length).toBeGreaterThanOrEqual(4);
  });

  it("marca all-day y detecta plataforma de videollamada", () => {
    const allday = events.find((e) => e.title === "Día del Padre");
    expect(allday?.allDay).toBe(true);
    const meet = events.find((e) => e.title === "Reunión con Carola");
    expect(meet?.platform).toBe("meet");
    expect(meet?.joinUrl).toContain("meet.google.com");
    expect(meet?.calendar).toBe("Trabajo");
  });
});
