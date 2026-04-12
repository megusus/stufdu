// ════════════════════════════════════════
// ── iCal Export / Import Helpers ──
// ════════════════════════════════════════

import { CONFIG } from './config.js';
import { DAYS, schedule, getDayLabel } from './schedule.js';
import { state, saveDeadlines, getStatus, nowInTZ, STATUS_DONE, STATUS_SKIP } from './state.js';

function _icsEscape(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function _dateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
}

function _dateISO(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function _nextDateKey(iso) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return _dateKey(d);
}

function _uid(seed) {
  return `${String(seed).replace(/[^\w.-]+/g, '-')}-${CONFIG.storagePrefix || 'study'}@study-plan`;
}

function _weekMonday() {
  const now = nowInTZ();
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const monday = new Date(now);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - dow);
  return monday;
}

function _event({ uid, summary, description, location, allDay, date, endDate, startDateTime, endDateTime, category }) {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${_uid(uid)}`,
    `DTSTAMP:${_dateKey(new Date())}T000000Z`,
    `SUMMARY:${_icsEscape(summary)}`,
  ];
  if (allDay) {
    lines.push(`DTSTART;VALUE=DATE:${date}`);
    lines.push(`DTEND;VALUE=DATE:${endDate || date}`);
  } else {
    lines.push(`DTSTART;TZID=${CONFIG.timezone}:${startDateTime}`);
    lines.push(`DTEND;TZID=${CONFIG.timezone}:${endDateTime}`);
  }
  if (description) lines.push(`DESCRIPTION:${_icsEscape(description)}`);
  if (location) lines.push(`LOCATION:${_icsEscape(location)}`);
  if (category) lines.push(`CATEGORIES:${_icsEscape(category)}`);
  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

function _scheduleEvents() {
  const monday = _weekMonday();
  const events = [];
  DAYS.forEach((dayName, di) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + di);
    const ds = _dateKey(date);
    const dayISO = _dateISO(date);
    (schedule[dayName]?.sections || []).forEach(section => {
      (section.items || []).forEach(item => {
        const status = getStatus(item.id);
        if (status === STATUS_DONE || status === STATUS_SKIP) return;
        const time = item.text.match(/(\d{1,2}):(\d{2})\s*[—-]\s*(\d{1,2}):(\d{2})/);
        const summaryBase = item.text.split('—')[0].trim();
        const desc = [
          item.text,
          section.label ? `Section: ${section.label}` : '',
          item.hint ? `Hint: ${item.hint}` : '',
        ].filter(Boolean).join('\n');

        if (time) {
          events.push(_event({
            uid: `schedule-${item.id}-${dayISO}`,
            summary: summaryBase || item.text,
            description: desc,
            location: item.hint || '',
            startDateTime: `${ds}T${String(time[1]).padStart(2, '0')}${time[2]}00`,
            endDateTime: `${ds}T${String(time[3]).padStart(2, '0')}${time[4]}00`,
            category: item.cat || 'study',
          }));
        } else if (item.cat !== 'routine') {
          events.push(_event({
            uid: `task-${item.id}-${dayISO}`,
            summary: `Study: ${item.text}`,
            description: desc,
            allDay: true,
            date: ds,
            endDate: _nextDateKey(dayISO),
            category: item.cat || 'study',
          }));
        }
      });
    });
  });
  return events;
}

function _deadlineEvents() {
  return (state.deadlines || []).map((dl, idx) => {
    const ds = String(dl.date || '').replace(/-/g, '');
    if (!/^\d{8}$/.test(ds)) return '';
    return _event({
      uid: `deadline-${idx}-${dl.name}-${dl.date}`,
      summary: `Deadline: ${dl.name}`,
      description: `Deadline from Study Plan${dl.cat ? `\nCategory: ${dl.cat}` : ''}`,
      allDay: true,
      date: ds,
      endDate: _nextDateKey(dl.date),
      category: dl.cat || 'deadline',
    });
  }).filter(Boolean);
}

export function buildStudyCalendarICS() {
  const events = [..._deadlineEvents(), ..._scheduleEvents()];
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StudyPlan//Study Plan Hub//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${_icsEscape(CONFIG.appTitle || 'Study Plan')}`,
    `X-WR-TIMEZONE:${CONFIG.timezone}`,
    ...events,
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

export function downloadStudyCalendar(showToast) {
  const ics = buildStudyCalendarICS();
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `study-plan-calendar-${new Date().toISOString().slice(0, 10)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  showToast?.('Calendar exported (.ics)');
}

export function googleCalendarUrlForDeadline(dl) {
  const ds = String(dl?.date || '').replace(/-/g, '');
  const end = _nextDateKey(dl?.date || new Date().toISOString().slice(0, 10));
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Deadline: ${dl?.name || 'Study deadline'}`,
    dates: `${ds}/${end}`,
    details: `From Study Plan${dl?.cat ? `\nCategory: ${dl.cat}` : ''}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function _unfoldICS(text) {
  return String(text || '').replace(/\r?\n[ \t]/g, '');
}

function _prop(block, name) {
  const re = new RegExp(`^${name}(?:;[^:]*)?:(.*)$`, 'im');
  return block.match(re)?.[1]?.trim() || '';
}

function _icsDateToISO(value) {
  const m = String(value || '').match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return '';
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export function parseICSDeadlines(text) {
  const unfolded = _unfoldICS(text);
  return unfolded.split(/BEGIN:VEVENT/i).slice(1).map(raw => raw.split(/END:VEVENT/i)[0]).map(block => {
    const summary = _prop(block, 'SUMMARY').replace(/^Deadline:\s*/i, '');
    const dt = _prop(block, 'DTSTART') || _prop(block, 'DUE');
    const date = _icsDateToISO(dt);
    if (!summary || !date) return null;
    return { name: summary.replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/g, ' '), date, cat: 'imported' };
  }).filter(Boolean);
}

export async function importICSFromUrl(url, render, showToast) {
  const clean = String(url || '').trim();
  if (!/^https?:\/\//i.test(clean)) {
    showToast?.('Paste a valid https:// .ics URL');
    return;
  }
  const res = await fetch(clean);
  if (!res.ok) throw new Error(`Calendar fetch failed (${res.status})`);
  const text = await res.text();
  const imported = parseICSDeadlines(text);
  if (!imported.length) {
    showToast?.('No dated events found in calendar');
    return;
  }
  const existing = new Set((state.deadlines || []).map(dl => `${dl.name}|${dl.date}`));
  const next = imported.filter(dl => !existing.has(`${dl.name}|${dl.date}`));
  state.deadlines.push(...next);
  state.deadlines.sort((a, b) => a.date.localeCompare(b.date));
  saveDeadlines();
  render?.();
  showToast?.(`Imported ${next.length} deadline${next.length === 1 ? '' : 's'}`);
}
