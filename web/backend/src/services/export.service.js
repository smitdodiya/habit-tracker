/**
 * Habit data export — CSV and PDF (brief §03 feature 11).
 *
 * Both formats are generated in-process with no paid dependencies: CSV by hand
 * (it is a simple format and hand-rolling avoids a dependency for 20 lines),
 * PDF via pdfkit.
 */

import PDFDocument from 'pdfkit';
import { computeStreak } from './streak.service.js';
import { groupDatesByHabit } from './stats.service.js';

const BRAND = {
  navy: '#1A1A2E',
  accent: '#E94560',
  muted: '#6B7280',
};

const CATEGORY_LABELS = {
  'morning-routine': 'Morning Routine',
  health: 'Health',
  learning: 'Learning',
  personal: 'Personal',
  work: 'Work',
  custom: 'Custom',
};

/** Escapes a value for CSV: quotes it if it contains a delimiter, quote or newline. */
function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Row-per-check-in CSV — the shape that opens cleanly in Excel or Sheets and
 * can be pivoted however the user likes.
 */
export function buildCsv({ habits, checkIns, range }) {
  const habitsById = new Map(habits.map((h) => [h._id.toString(), h]));

  const lines = [
    ['Habit', 'Category', 'Frequency', 'Date', 'Mood', 'Note'].map(csvCell).join(','),
  ];

  const sorted = [...checkIns].sort((a, b) => a.date.localeCompare(b.date));

  for (const checkIn of sorted) {
    const habit = habitsById.get(checkIn.habitId.toString());
    if (!habit) continue;

    lines.push(
      [
        habit.name,
        CATEGORY_LABELS[habit.category] ?? habit.category,
        describeFrequency(habit),
        checkIn.date,
        checkIn.mood ?? '',
        checkIn.note ?? '',
      ]
        .map(csvCell)
        .join(','),
    );
  }

  // A trailing blank line then the range, so the file is self-describing when
  // someone opens it six months later.
  lines.push('');
  lines.push([`Exported range`, `${range.start} to ${range.end}`].map(csvCell).join(','));

  return lines.join('\n');
}

/**
 * Streams a formatted PDF report to `stream`.
 * Resolves when the document has been fully written.
 */
export function buildPdf({ user, habits, checkIns, range, summary }, stream) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    doc.on('error', reject);
    stream.on('error', reject);
    stream.on('finish', resolve);
    doc.pipe(stream);

    const datesByHabit = groupDatesByHabit(checkIns);

    // ---- Header ----
    doc.rect(0, 0, doc.page.width, 96).fill(BRAND.navy);
    doc
      .fillColor('#FFFFFF')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('Habit Tracker Report', 50, 34);
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#C9CBD6')
      .text(`${user.name} · ${range.start} to ${range.end}`, 50, 64);

    doc.fillColor(BRAND.navy).y = 130;

    // ---- Summary ----
    section(doc, 'Summary');
    const summaryRows = [
      ['Habits tracked', String(summary.totalHabits)],
      ['Check-ins in range', String(summary.checkInsInRange)],
      ['Overall completion', `${Math.round(summary.completionRate * 100)}%`],
      ['Best active streak', String(summary.currentBestStreak)],
      ['Longest streak ever', String(summary.longestStreak)],
    ];

    doc.font('Helvetica').fontSize(11);
    for (const [label, value] of summaryRows) {
      doc.fillColor(BRAND.muted).text(label, 50, doc.y, { continued: true, width: 300 });
      doc.fillColor(BRAND.navy).font('Helvetica-Bold').text(value, { align: 'right' });
      doc.font('Helvetica');
      doc.moveDown(0.4);
    }

    // ---- Per-habit breakdown ----
    doc.moveDown(1);
    section(doc, 'Habits');

    for (const habit of habits) {
      if (doc.y > doc.page.height - 130) doc.addPage();

      const completed = datesByHabit.get(habit._id.toString()) ?? new Set();
      const stats = computeStreak(habit, completed, range.end);
      const inRange = [...completed].filter((d) => d >= range.start && d <= range.end).length;

      // Colour chip so each habit is scannable at a glance.
      doc.roundedRect(50, doc.y + 2, 8, 8, 2).fill(habit.color);

      doc
        .fillColor(BRAND.navy)
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(habit.name, 66, doc.y);

      doc
        .fillColor(BRAND.muted)
        .font('Helvetica')
        .fontSize(9.5)
        .text(
          `${CATEGORY_LABELS[habit.category] ?? habit.category} · ${describeFrequency(habit)} · ` +
            `${inRange} check-ins in range · current streak ${stats.current} ${stats.unit}${stats.current === 1 ? '' : 's'} · ` +
            `longest ${stats.longest} · ${Math.round(stats.completionRate * 100)}% completion`,
          66,
          doc.y + 2,
          { width: doc.page.width - 116 },
        );

      doc.moveDown(0.9);
    }

    // ---- Notes log ----
    const noted = checkIns.filter((c) => c.note).sort((a, b) => b.date.localeCompare(a.date));
    if (noted.length > 0) {
      doc.moveDown(0.5);
      if (doc.y > doc.page.height - 160) doc.addPage();
      section(doc, 'Notes');

      const habitsById = new Map(habits.map((h) => [h._id.toString(), h]));
      for (const checkIn of noted.slice(0, 60)) {
        if (doc.y > doc.page.height - 90) doc.addPage();
        const habit = habitsById.get(checkIn.habitId.toString());

        doc
          .fillColor(BRAND.muted)
          .font('Helvetica')
          .fontSize(9)
          .text(`${checkIn.date} · ${habit?.name ?? 'Deleted habit'}${checkIn.mood ? ` · ${checkIn.mood}` : ''}`, 50, doc.y);
        doc
          .fillColor(BRAND.navy)
          .fontSize(10.5)
          .text(checkIn.note, 50, doc.y + 1, { width: doc.page.width - 100 });
        doc.moveDown(0.6);
      }
    }

    // ---- Footer ----
    doc
      .fontSize(8)
      .fillColor(BRAND.muted)
      .text('Habit Tracker · Asense Branding', 50, doc.page.height - 42, {
        width: doc.page.width - 100,
        align: 'center',
      });

    doc.end();
  });
}

/** Section heading with the brand accent rule beneath it. */
function section(doc, title) {
  doc.fillColor(BRAND.navy).font('Helvetica-Bold').fontSize(14).text(title, 50, doc.y);
  const y = doc.y + 3;
  doc.moveTo(50, y).lineTo(doc.page.width - 50, y).lineWidth(1).strokeColor(BRAND.accent).stroke();
  doc.y = y + 12;
}

/** Human-readable frequency, e.g. 'Mon, Wed, Fri' or '3× per week'. */
export function describeFrequency(habit) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const { type, daysOfWeek = [], timesPerWeek = 3 } = habit.frequency ?? {};

  if (type === 'custom' && daysOfWeek.length > 0) {
    return [...daysOfWeek].sort((a, b) => a - b).map((d) => dayNames[d]).join(', ');
  }
  if (type === 'weekly') return `${timesPerWeek}x per week`;
  return 'Daily';
}
