import { Entry } from "@/models/entry";

const fmtDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const fmtTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

function toKey(d: Date): string {
   const y = d.getFullYear();
   const m = d.getMonth() + 1;
   const day = d.getDate();
   return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatDate(input: Date | string) {
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? '' : fmtDate.format(d);
}

export function getDateParts(entry: Entry) {
  const d = new Date(entry.createdAt);
  if (Number.isNaN(d.getTime())) return { dateKey: 'invalid', dateLabel: '' };

  const dateKey = toKey(d);
  const now = new Date();
  const todayKey = toKey(now);
  const yesterdayKey = toKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));

  const dateLabel =
    dateKey === todayKey ? 'Today' :
    dateKey === yesterdayKey ? 'Yesterday' :
    fmtDate.format(d);

  return { dateKey, dateLabel };
}

export function getTimeLabel(entry: Entry) {
  const d = new Date(entry.createdAt);
  return Number.isNaN(d.getTime()) ? '' : fmtTime.format(d);
}