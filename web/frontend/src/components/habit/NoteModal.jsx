import { useState } from 'react';

import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Textarea } from '../ui/Input.jsx';
import { MOODS } from '../../lib/format.js';

/**
 * Optional note and mood on a check-in (brief §03 feature 8).
 * Everything here is optional by design — the point of a one-tap check-in is
 * that it stays one tap, with reflection available for those who want it.
 */
export function NoteModal({ open, habit, onClose, onSave }) {
  const [note, setNote] = useState(habit?.checkIn?.note ?? '');
  const [mood, setMood] = useState(habit?.checkIn?.mood ?? null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ note: note.trim(), mood });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="How did it go?"
      description={habit?.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} fullWidth>
            Skip
          </Button>
          <Button onClick={handleSave} loading={saving} fullWidth>
            Save note
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-[0.8125rem] font-semibold text-[var(--text)]">Mood</p>
          <div className="flex gap-1.5">
            {MOODS.map((option) => {
              const selected = mood === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  // Tapping the selected mood clears it — no way to get stuck
                  // having recorded a feeling you didn't mean to.
                  onClick={() => setMood(selected ? null : option.value)}
                  aria-pressed={selected}
                  className={[
                    'flex flex-1 flex-col items-center gap-1 rounded-[12px] border py-2.5 transition-colors',
                    selected
                      ? 'border-[var(--accent-strong)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border)] hover:border-[var(--border-strong)]',
                  ].join(' ')}
                >
                  <span className="text-xl leading-none" aria-hidden="true">
                    {option.emoji}
                  </span>
                  <span
                    className={[
                      'text-[0.6875rem] font-semibold',
                      selected ? 'text-[var(--accent-strong)]' : 'text-[var(--text-muted)]',
                    ].join(' ')}
                  >
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Textarea
          label="Note"
          placeholder="How did it go?"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={4}
          maxLength={500}
          hint={`${note.length}/500`}
        />
      </div>
    </Modal>
  );
}
