import ICAL from "ical.js";

export type CalendarEventTag = "settlement" | "report" | "operations" | "counseling" | "program" | "expense" | "other";

export type CalendarEventItem = {
  id: string;
  calendarName: string;
  title: string;
  rawTitle: string;
  tag: CalendarEventTag;
  tagLabel: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string;
  description: string;
  url: string;
};

export type CalendarAgenda = {
  configured: boolean;
  calendarName: string;
  generatedAt: string;
  today: CalendarEventItem[];
  upcoming: CalendarEventItem[];
  deadlines: CalendarEventItem[];
  error?: string;
};

type IcalTime = InstanceType<typeof ICAL.Time>;
type IcalComponent = InstanceType<typeof ICAL.Component>;

const TIME_ZONE = "Asia/Seoul";
const UPCOMING_DAYS = 14;
const DEADLINE_DAYS = 60;
const MAX_OCCURRENCES_PER_EVENT = 500;

const tagRules: Array<{ keyword: string; tag: CalendarEventTag; label: string }> = [
  { keyword: "정산", tag: "settlement", label: "정산" },
  { keyword: "보고", tag: "report", label: "보고" },
  { keyword: "운영", tag: "operations", label: "운영" },
  { keyword: "상담", tag: "counseling", label: "상담" },
  { keyword: "프로그램", tag: "program", label: "프로그램" },
  { keyword: "지출", tag: "expense", label: "지출" },
];

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getSeoulDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: parts.find((part) => part.type === "year")?.value ?? "1970",
    month: parts.find((part) => part.type === "month")?.value ?? "01",
    day: parts.find((part) => part.type === "day")?.value ?? "01",
  };
}

function startOfSeoulDay(date = new Date()) {
  const { year, month, day } = getSeoulDateParts(date);
  return new Date(`${year}-${month}-${day}T00:00:00+09:00`);
}

function toSeoulAllDayDate(time: IcalTime) {
  const year = String(time.year).padStart(4, "0");
  const month = String(time.month).padStart(2, "0");
  const day = String(time.day).padStart(2, "0");
  return new Date(`${year}-${month}-${day}T00:00:00+09:00`);
}

function toDate(time: IcalTime) {
  return time.isDate ? toSeoulAllDayDate(time) : time.toJSDate();
}

function overlapsRange(start: Date, end: Date, rangeStart: Date, rangeEnd: Date) {
  return end > rangeStart && start < rangeEnd;
}

function classifyTitle(summary: string) {
  const match = summary.match(/^\s*\[([^\]]+)\]\s*(.*)$/);
  const explicitTag = match?.[1]?.trim() ?? "";
  const title = (match?.[2] || summary).trim() || summary;
  const rule = tagRules.find((item) => item.keyword === explicitTag) ?? tagRules.find((item) => summary.includes(`[${item.keyword}]`));

  return {
    title,
    tag: rule?.tag ?? "other",
    tagLabel: rule?.label ?? "기타",
  };
}

function readTextValue(component: IcalComponent, propertyName: string) {
  const value = component.getFirstPropertyValue(propertyName);
  return typeof value === "string" ? value : "";
}

function buildCalendarItem({
  event,
  occurrenceStart,
  occurrenceEnd,
  calendarName,
  index,
}: {
  event: InstanceType<typeof ICAL.Event>;
  occurrenceStart: IcalTime;
  occurrenceEnd: IcalTime;
  calendarName: string;
  index: number;
}): CalendarEventItem {
  const rawTitle = event.summary || "(제목 없음)";
  const classified = classifyTitle(rawTitle);
  const start = toDate(occurrenceStart);
  const end = toDate(occurrenceEnd);

  return {
    id: `${event.uid || rawTitle}-${start.toISOString()}-${index}`,
    calendarName,
    title: classified.title,
    rawTitle,
    tag: classified.tag,
    tagLabel: classified.tagLabel,
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: Boolean(occurrenceStart.isDate),
    location: event.location || "",
    description: event.description || "",
    url: readTextValue(event.component, "url"),
  };
}

function expandCalendarEvent(
  component: IcalComponent,
  calendarName: string,
  rangeStart: Date,
  rangeEnd: Date,
) {
  const event = new ICAL.Event(component);
  const items: CalendarEventItem[] = [];

  if (event.isRecurrenceException()) return items;

  if (!event.isRecurring()) {
    const start = toDate(event.startDate);
    const end = toDate(event.endDate);
    if (overlapsRange(start, end, rangeStart, rangeEnd)) {
      items.push(
        buildCalendarItem({
          event,
          occurrenceStart: event.startDate,
          occurrenceEnd: event.endDate,
          calendarName,
          index: 0,
        }),
      );
    }
    return items;
  }

  const iterator = event.iterator();
  let occurrence = iterator.next();
  let index = 0;

  while (occurrence && index < MAX_OCCURRENCES_PER_EVENT) {
    const occurrenceStartDate = toDate(occurrence);
    if (occurrenceStartDate >= rangeEnd) break;

    const details = event.getOccurrenceDetails(occurrence);
    const start = toDate(details.startDate);
    const end = toDate(details.endDate);

    if (overlapsRange(start, end, rangeStart, rangeEnd)) {
      items.push(
        buildCalendarItem({
          event: details.item,
          occurrenceStart: details.startDate,
          occurrenceEnd: details.endDate,
          calendarName,
          index,
        }),
      );
    }

    occurrence = iterator.next();
    index += 1;
  }

  return items;
}

function isSameSeoulDay(a: Date, b: Date) {
  const left = getSeoulDateParts(a);
  const right = getSeoulDateParts(b);
  return left.year === right.year && left.month === right.month && left.day === right.day;
}

export async function getCalendarAgenda(): Promise<CalendarAgenda> {
  const calendarUrl = process.env.GOOGLE_CALENDAR_ICAL_URL;
  const calendarName = process.env.GOOGLE_CALENDAR_NAME || "2026년 청년 다다름 사업";
  const todayStart = startOfSeoulDay();
  const upcomingEnd = addDays(todayStart, UPCOMING_DAYS);
  const deadlineEnd = addDays(todayStart, DEADLINE_DAYS);
  const rangeEnd = deadlineEnd > upcomingEnd ? deadlineEnd : upcomingEnd;

  if (!calendarUrl) {
    return {
      configured: false,
      calendarName,
      generatedAt: new Date().toISOString(),
      today: [],
      upcoming: [],
      deadlines: [],
    };
  }

  try {
    const response = await fetch(calendarUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Google Calendar iCal fetch failed: ${response.status}`);

    const text = await response.text();
    const calendar = new ICAL.Component(ICAL.parse(text));
    const events = calendar
      .getAllSubcomponents("vevent")
      .flatMap((component) => expandCalendarEvent(component, calendarName, todayStart, rangeEnd))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const today = events.filter((event) => isSameSeoulDay(new Date(event.start), todayStart));
    const upcoming = events.filter((event) => {
      const start = new Date(event.start);
      return start >= todayStart && start < upcomingEnd;
    });
    const deadlines = events.filter((event) => {
      const start = new Date(event.start);
      return (
        start >= todayStart &&
        start < deadlineEnd &&
        (event.tag === "settlement" || event.tag === "report")
      );
    });

    return {
      configured: true,
      calendarName,
      generatedAt: new Date().toISOString(),
      today,
      upcoming,
      deadlines,
    };
  } catch (error) {
    return {
      configured: true,
      calendarName,
      generatedAt: new Date().toISOString(),
      today: [],
      upcoming: [],
      deadlines: [],
      error: error instanceof Error ? error.message : "Google Calendar 일정을 읽지 못했습니다.",
    };
  }
}
