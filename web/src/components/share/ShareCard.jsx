import { useState } from 'react';
import { DownloadSimple, ShareNetwork, CheckCircle } from '@phosphor-icons/react';
import { Button } from '../ui/Button.jsx';
import { readableTextOn } from '../../lib/format.js';

/**
 * Generates a shareable milestone image.
 *
 * Drawn on a canvas rather than screenshotting the DOM: it gives a fixed
 * 1080×1350 portrait frame that looks right in a social feed regardless of the
 * user's screen, needs no third-party library, and works identically in every
 * browser.
 *
 * Where the Web Share API is available — which is most phones — the PNG goes
 * straight into WhatsApp or Instagram. Everywhere else it downloads.
 */

const WIDTH = 1080;
const HEIGHT = 1350;

/**
 * Draws the card and resolves a PNG blob.
 *
 * @param ratio  0–1 fill for the ring. Defaults to a near-full arc, but where
 *               the card also states a percentage it should be passed through —
 *               a ring at 88% beside the words "72% complete" reads as sloppy.
 */
export async function renderShareCard({ value, unit, habitName, subtitle, accent = '#E94560', ratio = 0.92 }) {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');

  // Background: deep navy, the brand primary.
  ctx.fillStyle = '#1A1A2E';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // A soft wash of the habit's own colour, so every card feels personal.
  const glow = ctx.createRadialGradient(WIDTH / 2, HEIGHT * 0.42, 60, WIDTH / 2, HEIGHT * 0.42, 620);
  glow.addColorStop(0, hexToRgba(accent, 0.35));
  glow.addColorStop(1, hexToRgba(accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.textAlign = 'center';

  // Accent ring around the number.
  ctx.beginPath();
  ctx.arc(WIDTH / 2, HEIGHT * 0.42, 300, -Math.PI / 2, Math.PI * 1.5);
  ctx.strokeStyle = hexToRgba('#FFFFFF', 0.1);
  ctx.lineWidth = 14;
  ctx.stroke();

  const sweep = Math.max(0.04, Math.min(1, ratio)) * Math.PI * 2;
  ctx.beginPath();
  ctx.arc(WIDTH / 2, HEIGHT * 0.42, 300, -Math.PI / 2, -Math.PI / 2 + sweep);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.stroke();

  // The number itself — the whole point of the card.
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 260px Inter, system-ui, sans-serif';
  ctx.fillText(String(value), WIDTH / 2, HEIGHT * 0.42 + 88);

  ctx.fillStyle = accent;
  ctx.font = '700 44px Inter, system-ui, sans-serif';
  ctx.fillText(unit.toUpperCase(), WIDTH / 2, HEIGHT * 0.42 + 168);

  // Habit name, truncated rather than allowed to overflow the frame.
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 62px Inter, system-ui, sans-serif';
  ctx.fillText(truncate(ctx, habitName, WIDTH - 160), WIDTH / 2, HEIGHT * 0.75);

  if (subtitle) {
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.font = '500 36px Inter, system-ui, sans-serif';
    ctx.fillText(truncate(ctx, subtitle, WIDTH - 160), WIDTH / 2, HEIGHT * 0.75 + 62);
  }

  // Footer mark.
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '600 30px Inter, system-ui, sans-serif';
  ctx.fillText('Habit Tracker', WIDTH / 2, HEIGHT - 84);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/** Buttons that generate and then share or download the card. */
export function ShareCardActions({ value, unit, habitName, subtitle, accent, ratio, compact = false }) {
  const [busy, setBusy] = useState(null);
  const [done, setDone] = useState(false);

  const filename = `${habitName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${value}-${unit.split(' ')[0]}.png`;

  const build = () => renderShareCard({ value, unit, habitName, subtitle, accent, ratio });

  const handleDownload = async () => {
    setBusy('download');
    try {
      const blob = await build();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setDone(true);
      setTimeout(() => setDone(false), 2200);
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    setBusy('share');
    try {
      const blob = await build();
      const file = new File([blob], filename, { type: 'image/png' });

      // canShare must be checked with the actual file: a browser can support
      // sharing text and still refuse images.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${value} ${unit} — ${habitName}`,
        });
      } else {
        await handleDownload();
      }
    } catch (error) {
      // AbortError just means the user closed the share sheet.
      if (error.name !== 'AbortError') await handleDownload();
    } finally {
      setBusy(null);
    }
  };

  const canShareFiles = typeof navigator !== 'undefined' && Boolean(navigator.canShare);

  return (
    <div className={compact ? 'flex gap-2' : 'flex gap-2.5'}>
      {canShareFiles && (
        <Button
          variant="secondary"
          size={compact ? 'sm' : 'md'}
          onClick={handleShare}
          loading={busy === 'share'}
          fullWidth={!compact}
        >
          <ShareNetwork size={compact ? 14 : 16} />
          Share
        </Button>
      )}

      <Button
        variant="secondary"
        size={compact ? 'sm' : 'md'}
        onClick={handleDownload}
        loading={busy === 'download'}
        fullWidth={!compact}
      >
        {done ? <CheckCircle size={compact ? 14 : 16} weight="fill" /> : <DownloadSimple size={compact ? 14 : 16} />}
        {done ? 'Saved' : 'Save image'}
      </Button>
    </div>
  );
}

/** Shrinks text until it fits the given width. */
function truncate(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export { readableTextOn };
