// ════════════════════════════════════════
// ── Obsidian / Markdown Export ──
// ════════════════════════════════════════
// Generates a ZIP of .md files that can be dropped into an Obsidian vault.
// Structure:
//   Study Plan/
//     Daily Notes/YYYY-MM-DD.md  (one per week-day with tasks as checkboxes)
//     Subjects/<subject>.md       (grades, tasks, lecture notes per category)
//     Deadlines.md                (all deadlines as table)
//     Weekly Review/<week>.md     (saved review reflections)
//     Goals.md                    (current goals + progress)
//     Reading List.md             (book list)

import { CONFIG }                from './config.js';
import { DAYS, schedule, getDayLabel } from './schedule.js';
import { state, getStatus, getDayProgress, nowInTZ, STATUS_DONE, STATUS_SKIP } from './state.js';
import { loadGrades, getCatAverage, getLetter } from './grades.js';
import { loadGoals, isGoalMet }  from './goals.js';
import { CategoryRegistry }      from './categories.js';
import { Storage }               from './storage.js';

function _date(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function _esc(s) { return String(s ?? '').replace(/\|/g, '\\|'); }

// ── Per-day daily note ──
function _dailyNote(dayName) {
  const day = schedule[dayName];
  if (!day) return null;
  const today = nowInTZ();
  // Find approximate calendar date for this day (current week)
  const todayDow = today.getDay() === 0 ? 6 : today.getDay() - 1; // 0=Mon
  const targetDow = DAYS.indexOf(dayName);
  const diff = targetDow - todayDow;
  const target = new Date(today);
  target.setDate(target.getDate() + diff);
  const dateStr = _date(target);
  const prog = getDayProgress(dayName);

  let md = `---\ntags: [study-plan, daily-note]\ndate: ${dateStr}\nday: ${dayName}\nprogress: ${prog.pct}%\n---\n\n`;
  md += `# 📅 ${dayName} — ${dateStr}\n\n`;
  if (day.meta) md += `> ${day.meta}\n\n`;
  md += `**Progress:** ${prog.done}/${prog.total} tasks (${prog.pct}%)\n\n`;

  day.sections.forEach(sec => {
    md += `## ${sec.label}\n\n`;
    sec.items.forEach(item => {
      const st = getStatus(item.id);
      const check = st === STATUS_DONE ? 'x' : st === STATUS_SKIP ? '~' : ' ';
      const note = state.taskNotes[item.id] ? ` — _${state.taskNotes[item.id]}_` : '';
      const cat = CategoryRegistry.getLabel(item.cat);
      const tag = cat ? ` \`${cat}\`` : '';
      md += `- [${check}] ${item.text}${tag}${note}\n`;
      if (state.lectureNotes?.[item.id]) {
        md += `\n  > **Notes:** ${state.lectureNotes[item.id].replace(/\n/g, '\n  > ')}\n\n`;
      }
    });
    md += '\n';
  });

  return { filename: `Daily Notes/${dateStr}-${dayName}.md`, content: md };
}

// ── Per-subject note ──
function _subjectNote(catKey) {
  const label = CategoryRegistry.getLabel(catKey) || catKey;
  const grades = loadGrades();
  const catGrades = grades[catKey] || [];
  const avg = getCatAverage(catKey);

  let md = `---\ntags: [study-plan, subject]\nsubject: ${label}\ngrade: ${avg !== null ? avg + '%' : 'N/A'}\n---\n\n`;
  md += `# 📚 ${label}\n\n`;

  if (avg !== null) {
    md += `**Current Average:** ${avg}% (${getLetter(avg)})\n\n`;
  }

  // Grades table
  if (catGrades.length > 0) {
    md += `## Grades\n\n| Assessment | Score | Weight | Date | Type |\n|---|---|---|---|---|\n`;
    catGrades.forEach(g => {
      const pct = Math.round((g.score / g.maxScore) * 100);
      md += `| ${_esc(g.name)} | ${g.score}/${g.maxScore} (${pct}%) | ${g.weight}% | ${g.date || '—'} | ${g.type || '—'} |\n`;
    });
    md += '\n';
  }

  // Tasks for this subject
  const tasks = [];
  DAYS.forEach(day => {
    (schedule[day]?.sections || []).forEach(sec => {
      sec.items.forEach(item => {
        if (item.cat === catKey) tasks.push({ ...item, day });
      });
    });
  });

  if (tasks.length > 0) {
    md += `## Tasks\n\n`;
    tasks.forEach(item => {
      const st = getStatus(item.id);
      const check = st === STATUS_DONE ? 'x' : ' ';
      md += `- [${check}] [${item.day}] ${item.text}\n`;
    });
    md += '\n';
  }

  return { filename: `Subjects/${label}.md`, content: md };
}

// ── Deadlines note ──
function _deadlinesNote() {
  const dls = [...state.deadlines].sort((a, b) => a.date.localeCompare(b.date));
  let md = `---\ntags: [study-plan, deadlines]\nupdated: ${_date()}\n---\n\n# 📅 Deadlines\n\n`;

  if (dls.length === 0) {
    md += '_No deadlines set._\n';
    return { filename: 'Deadlines.md', content: md };
  }

  md += `| Deadline | Date | Subject | Days Left |\n|---|---|---|---|\n`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  dls.forEach(dl => {
    const d = new Date(dl.date); d.setHours(0, 0, 0, 0);
    const days = Math.round((d - today) / 86400000);
    const label = days < 0 ? `${-days}d ago` : days === 0 ? 'TODAY' : `${days}d`;
    const cat = CategoryRegistry.getLabel(dl.cat) || dl.cat || '—';
    md += `| ${_esc(dl.name)} | ${dl.date} | ${_esc(cat)} | ${label} |\n`;
  });

  return { filename: 'Deadlines.md', content: md };
}

// ── Weekly reviews ──
function _reviewNotes() {
  const reviews = Storage.get('weekly-reviews', {});
  return Object.entries(reviews).map(([weekKey, rev]) => {
    let md = `---\ntags: [study-plan, weekly-review]\nweek: ${weekKey}\nprogress: ${rev.wp ?? '?'}%\n---\n\n`;
    md += `# 📋 Weekly Review — ${weekKey}\n\n`;
    md += `**Progress:** ${rev.wp ?? '?'}% | Done: ${rev.skippedCount ?? 0} skipped, ${rev.incompleteCount ?? 0} incomplete\n\n`;
    if (rev.highlight)    md += `## Highlight\n\n${rev.highlight}\n\n`;
    if (rev.improvement) md += `## To Improve\n\n${rev.improvement}\n\n`;
    if (rev.reflection)  md += `## Reflection\n\n${rev.reflection}\n\n`;
    return { filename: `Weekly Reviews/${weekKey}.md`, content: md };
  });
}

// ── Goals note ──
function _goalsNote() {
  const goals = loadGoals();
  let md = `---\ntags: [study-plan, goals]\nupdated: ${_date()}\n---\n\n# 🎯 Goals\n\n`;
  if (goals.length === 0) { md += '_No goals set._\n'; return { filename: 'Goals.md', content: md }; }
  md += `| Goal | Progress | Target | Status |\n|---|---|---|---|\n`;
  goals.forEach(g => {
    const pct = Math.min(100, Math.round((g.current / g.target) * 100));
    md += `| ${g.icon} ${_esc(g.label)} | ${g.current}/${g.target}${_esc(g.unit)} | ${g.target}${_esc(g.unit)} | ${isGoalMet(g) ? '✅ Done' : `${pct}%`} |\n`;
  });
  return { filename: 'Goals.md', content: md };
}

// ── Reading list note ──
function _readingNote() {
  const books = state.readingList || [];
  let md = `---\ntags: [study-plan, reading]\nupdated: ${_date()}\n---\n\n# 📚 Reading List\n\n`;
  if (books.length === 0) { md += '_Empty._\n'; return { filename: 'Reading List.md', content: md }; }
  books.forEach(b => { md += `- [ ] **${_esc(b.title)}** — ${_esc(b.author)}\n`; });
  return { filename: 'Reading List.md', content: md };
}

// ── Index note ──
function _indexNote() {
  const prog = getDayProgress(DAYS[state.selectedDay] || DAYS[0]);
  const cats = CategoryRegistry.keys();
  let md = `---\ntags: [study-plan, index]\napp: ${CONFIG.appTitle}\nsemester: ${CONFIG.semester}\nupdated: ${_date()}\n---\n\n`;
  md += `# 📘 ${CONFIG.appTitle} — ${CONFIG.semester}\n\n`;
  md += `> Exported from Study Plan on ${new Date().toLocaleString()}\n\n`;
  md += `## Subjects\n\n`;
  cats.forEach(k => {
    const label = CategoryRegistry.getLabel(k) || k;
    const avg = getCatAverage(k);
    md += `- [[Subjects/${label}]] ${avg !== null ? `— ${avg}%` : ''}\n`;
  });
  md += `\n## Navigation\n\n- [[Deadlines]]\n- [[Goals]]\n- [[Reading List]]\n- Daily Notes folder\n- Weekly Reviews folder\n`;
  return { filename: 'Study Plan Index.md', content: md };
}

// ── Main export function ──
// Returns array of { filename, content } objects.
// Caller is responsible for creating a ZIP (we use the JSZip approach if available,
// else offer each file as a download).
export function buildObsidianExport() {
  const files = [];

  files.push(_indexNote());
  files.push(_deadlinesNote());
  files.push(_goalsNote());
  files.push(_readingNote());

  DAYS.forEach(day => {
    const note = _dailyNote(day);
    if (note) files.push(note);
  });

  CategoryRegistry.keys().forEach(cat => {
    files.push(_subjectNote(cat));
  });

  _reviewNotes().forEach(r => files.push(r));

  return files;
}

// ── Download as ZIP (uses JSZip CDN if loaded, else text fallback) ──
export async function downloadObsidianExport(showToast) {
  const files = buildObsidianExport();

  // Try JSZip (loaded on demand)
  if (typeof JSZip === 'undefined') {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    }).catch(() => null);
  }

  if (typeof JSZip !== 'undefined') {
    const zip = new JSZip();
    const folder = zip.folder('Study Plan');
    files.forEach(({ filename, content }) => folder.file(filename, content));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-plan-obsidian-${_date()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    showToast?.(`📦 Exported ${files.length} files as ZIP`);
  } else {
    // Fallback: download a single combined markdown file
    const combined = files.map(f => `\n\n---\n\n<!-- ${f.filename} -->\n\n${f.content}`).join('');
    const blob = new Blob([combined], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-plan-obsidian-${_date()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast?.(`📄 Exported as combined Markdown (${files.length} notes)`);
  }
}
