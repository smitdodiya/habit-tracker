import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider.jsx';
import { Sheet } from '../ui/Sheet.jsx';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { MOODS } from '@habit-tracker/shared/format';

/**
 * Optional note and mood on a check-in (brief §03 feature 8).
 * Everything is optional by design — the point of a one-tap check-in is that it
 * stays one tap, with reflection available for those who want it.
 */
export function NoteSheet({ habit, onClose, onSave }) {
  const { colors } = useTheme();
  const [note, setNote] = useState('');
  const [mood, setMood] = useState(null);
  const [saving, setSaving] = useState(false);

  // Reload whenever a different habit opens the sheet, so it never shows the
  // previous habit's note.
  useEffect(() => {
    setNote(habit?.checkIn?.note ?? '');
    setMood(habit?.checkIn?.mood ?? null);
  }, [habit]);

  if (!habit) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave?.({ note: note.trim(), mood });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="How did it go?"
      description={habit.name}
      footer={
        <>
          <Button variant="secondary" fullWidth style={{ flex: 1 }} onPress={onClose}>
            Skip
          </Button>
          <Button fullWidth style={{ flex: 1 }} loading={saving} onPress={handleSave}>
            Save note
          </Button>
        </>
      }
    >
      <Text style={[styles.label, { color: colors.text }]}>Mood</Text>
      <View style={styles.moods}>
        {MOODS.map((option) => {
          const selected = mood === option.value;
          return (
            <Pressable
              key={option.value}
              // Tapping the selected mood clears it — no way to get stuck having
              // recorded a feeling you didn't mean to.
              onPress={() => setMood(selected ? null : option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              style={[
                styles.mood,
                {
                  borderColor: selected ? colors.accentStrong : colors.border,
                  backgroundColor: selected ? colors.accentSoft : 'transparent',
                },
              ]}
            >
              <Text style={styles.moodEmoji}>{option.emoji}</Text>
              <Text
                style={[
                  styles.moodLabel,
                  { color: selected ? colors.accentStrong : colors.textMuted },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Input
        label="Note"
        placeholder="How did it go?"
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={500}
        hint={`${note.length}/500`}
        style={{ marginTop: 18 }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  moods: { flexDirection: 'row', gap: 6 },
  mood: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
  },
  moodEmoji: { fontSize: 20 },
  moodLabel: { fontSize: 10.5, fontFamily: 'Inter_600SemiBold' },
});
