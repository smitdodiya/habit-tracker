import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import { Check, CaretLeft } from 'phosphor-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTheme } from '../../theme/ThemeProvider.jsx';
import { Sheet } from '../ui/Sheet.jsx';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { Toggle } from '../ui/Toggle.jsx';
import { getIcon, ICON_NAMES, HABIT_COLORS } from '../../lib/icons.js';
import { habitApi } from '../../lib/endpoints.js';
import { errorMessage, fieldErrors } from '../../lib/api.js';
import { toast } from '../ui/Toast.jsx';
import { HABIT_TEMPLATES, templateToHabit } from '@habit-tracker/shared/templates';
import {
  CATEGORIES,
  WEEKDAY_INITIALS,
  WEEKDAY_LABELS,
  formatTime,
  withAlpha,
  readableTextOn,
} from '@habit-tracker/shared/format';

/**
 * Create / edit habit (brief §04).
 *
 * A new habit opens on the template picker first: the blank form is the hardest
 * screen in the app, because it asks someone to invent a habit, a schedule and
 * a colour before they've seen the product work. Editing skips straight to the
 * form, since the habit already exists and templates would be meaningless.
 */

const EMPTY = {
  name: '',
  description: '',
  icon: 'Target',
  color: '#E94560',
  category: 'personal',
  frequency: { type: 'daily', daysOfWeek: [1, 2, 3, 4, 5], timesPerWeek: 3 },
  reminder: { enabled: false, time: '09:00' },
};

export function HabitSheet({ open, habit, onClose, onSaved }) {
  const { colors } = useTheme();
  const isEditing = Boolean(habit);

  const [step, setStep] = useState(isEditing ? 'form' : 'templates');
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (habit) {
      setValues({
        ...EMPTY,
        ...habit,
        frequency: { ...EMPTY.frequency, ...habit.frequency },
        reminder: { ...EMPTY.reminder, ...habit.reminder },
      });
      setStep('form');
    } else {
      setValues(EMPTY);
      setStep('templates');
    }
  }, [open, habit]);

  const set = (patch) => setValues((v) => ({ ...v, ...patch }));
  const setFrequency = (patch) => setValues((v) => ({ ...v, frequency: { ...v.frequency, ...patch } }));
  const setReminder = (patch) => setValues((v) => ({ ...v, reminder: { ...v.reminder, ...patch } }));

  const toggleDay = (day) => {
    const days = values.frequency.daysOfWeek.includes(day)
      ? values.frequency.daysOfWeek.filter((d) => d !== day)
      : [...values.frequency.daysOfWeek, day].sort((a, b) => a - b);
    setFrequency({ daysOfWeek: days });
  };

  const handleSubmit = async () => {
    setErrors({});

    if (!values.name.trim()) {
      setErrors({ name: 'Give your habit a name' });
      return;
    }
    if (values.frequency.type === 'custom' && values.frequency.daysOfWeek.length === 0) {
      setErrors({ name: 'Pick at least one day' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: values.name,
        description: values.description,
        icon: values.icon,
        color: values.color,
        category: values.category,
        frequency: values.frequency,
        reminder: values.reminder,
      };

      if (isEditing) await habitApi.update(habit.id, payload);
      else await habitApi.create(payload);

      toast.success(isEditing ? 'Habit updated' : 'Habit created');
      await onSaved?.();
    } catch (error) {
      setErrors(fieldErrors(error));
      toast.error(errorMessage(error, 'Could not save that habit'));
    } finally {
      setSaving(false);
    }
  };

  const PreviewIcon = getIcon(values.icon);

  // ---- Template picker ----
  if (step === 'templates') {
    return (
      <Sheet
        open={open}
        onClose={onClose}
        title="New habit"
        description="Pick one, or write your own."
        fullHeight
      >
        <View style={styles.templateGrid}>
          {HABIT_TEMPLATES.map((template) => {
            const Icon = getIcon(template.icon);
            return (
              <Pressable
                key={template.id}
                onPress={() => {
                  setValues({ ...EMPTY, ...templateToHabit(template) });
                  setStep('form');
                }}
                accessibilityRole="button"
                accessibilityLabel={template.name}
                style={({ pressed }) => [
                  styles.template,
                  {
                    borderColor: colors.border,
                    backgroundColor: pressed ? colors.surface3 : 'transparent',
                  },
                ]}
              >
                <View style={[styles.templateIcon, { backgroundColor: withAlpha(template.color, 0.14) }]}>
                  <Icon size={20} color={template.color} weight="duotone" />
                </View>
                <Text style={[styles.templateName, { color: colors.text }]} numberOfLines={2}>
                  {template.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Button
          variant="secondary"
          fullWidth
          style={{ marginTop: 16, marginBottom: 8 }}
          onPress={() => {
            setValues(EMPTY);
            setStep('form');
          }}
        >
          Write my own
        </Button>
      </Sheet>
    );
  }

  // ---- Form ----
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit habit' : 'New habit'}
      description={isEditing ? habit.name : undefined}
      fullHeight
      footer={
        <>
          <Button
            variant="secondary"
            fullWidth
            style={{ flex: 1 }}
            onPress={isEditing ? onClose : () => setStep('templates')}
            icon={isEditing ? undefined : CaretLeft}
          >
            {isEditing ? 'Cancel' : 'Back'}
          </Button>
          <Button fullWidth style={{ flex: 1 }} loading={saving} onPress={handleSubmit}>
            {isEditing ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      {/* Live preview — the habit as it will appear on Today */}
      <View style={[styles.preview, { backgroundColor: withAlpha(values.color, 0.08), borderColor: colors.border }]}>
        <View style={[styles.previewIcon, { backgroundColor: values.color }]}>
          <PreviewIcon size={23} color={readableTextOn(values.color)} weight="duotone" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.previewName, { color: colors.text }]} numberOfLines={1}>
            {values.name.trim() || 'Your new habit'}
          </Text>
          <Text style={[styles.previewMeta, { color: colors.textMuted }]}>
            {values.frequency.type === 'daily' && 'Every day'}
            {values.frequency.type === 'weekly' && `${values.frequency.timesPerWeek}× per week`}
            {values.frequency.type === 'custom' &&
              (values.frequency.daysOfWeek.length
                ? values.frequency.daysOfWeek.map((d) => WEEKDAY_LABELS[d]).join(', ')
                : 'Pick your days')}
          </Text>
        </View>
      </View>

      <Input
        label="Habit name"
        placeholder="e.g. Morning meditation"
        value={values.name}
        onChangeText={(name) => set({ name })}
        error={errors.name}
        maxLength={60}
        style={{ marginTop: 18 }}
      />

      <Input
        label="Description"
        placeholder="Optional — what does doing this look like?"
        value={values.description}
        onChangeText={(description) => set({ description })}
        multiline
        maxLength={240}
        style={{ marginTop: 16 }}
      />

      {/* ---- Icon ---- */}
      <Text style={[styles.fieldLabel, { color: colors.text }]}>Icon</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconRow}>
        {ICON_NAMES.map((name) => {
          const Icon = getIcon(name);
          const selected = values.icon === name;
          return (
            <Pressable
              key={name}
              onPress={() => set({ icon: name })}
              accessibilityRole="button"
              accessibilityLabel={name}
              accessibilityState={{ selected }}
              style={[
                styles.iconOption,
                {
                  backgroundColor: selected ? values.color : 'transparent',
                  borderColor: selected ? 'transparent' : colors.border,
                },
              ]}
            >
              <Icon
                size={19}
                color={selected ? readableTextOn(values.color) : colors.textMuted}
                weight={selected ? 'fill' : 'regular'}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ---- Colour ---- */}
      <Text style={[styles.fieldLabel, { color: colors.text }]}>Colour</Text>
      <View style={styles.colorRow}>
        {HABIT_COLORS.map((color) => {
          const selected = values.color.toLowerCase() === color.toLowerCase();
          return (
            <Pressable
              key={color}
              onPress={() => set({ color })}
              accessibilityRole="button"
              accessibilityLabel={`Colour ${color}`}
              accessibilityState={{ selected }}
              style={[
                styles.colorSwatch,
                {
                  backgroundColor: color,
                  borderColor: selected ? colors.text : 'transparent',
                  borderWidth: selected ? 2.5 : 0,
                },
              ]}
            >
              {selected ? <Check size={14} color={readableTextOn(color)} weight="bold" /> : null}
            </Pressable>
          );
        })}
      </View>

      {/* ---- Category ---- */}
      <Text style={[styles.fieldLabel, { color: colors.text }]}>Category</Text>
      <View style={styles.chipRow}>
        {CATEGORIES.map((category) => {
          const selected = values.category === category.value;
          return (
            <Chip key={category.value} selected={selected} onPress={() => set({ category: category.value })}>
              {category.label}
            </Chip>
          );
        })}
      </View>

      {/* ---- Frequency ---- */}
      <Text style={[styles.fieldLabel, { color: colors.text }]}>How often?</Text>
      <View style={styles.segmented}>
        {[
          { value: 'daily', label: 'Every day' },
          { value: 'custom', label: 'Certain days' },
          { value: 'weekly', label: 'X per week' },
        ].map((option) => {
          const selected = values.frequency.type === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setFrequency({ type: option.value })}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[
                styles.segment,
                {
                  borderColor: selected ? colors.accentStrong : colors.border,
                  backgroundColor: selected ? colors.accentSoft : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: selected ? colors.accentStrong : colors.textMuted },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {values.frequency.type === 'custom' ? (
        <View style={{ marginTop: 12 }}>
          <View style={styles.dayRow}>
            {WEEKDAY_INITIALS.map((initial, day) => {
              const selected = values.frequency.daysOfWeek.includes(day);
              return (
                <Pressable
                  key={day}
                  onPress={() => toggleDay(day)}
                  accessibilityRole="checkbox"
                  accessibilityLabel={WEEKDAY_LABELS[day]}
                  accessibilityState={{ checked: selected }}
                  style={[
                    styles.day,
                    {
                      backgroundColor: selected ? colors.accentStrong : 'transparent',
                      borderColor: selected ? 'transparent' : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.dayText, { color: selected ? '#FFFFFF' : colors.textMuted }]}
                  >
                    {initial}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.helper, { color: colors.textMuted }]}>
            Only the days you pick count. The rest are days off.
          </Text>
        </View>
      ) : null}

      {values.frequency.type === 'weekly' ? (
        <View style={{ marginTop: 12 }}>
          <View style={styles.dayRow}>
            {[1, 2, 3, 4, 5, 6, 7].map((times) => {
              const selected = values.frequency.timesPerWeek === times;
              return (
                <Pressable
                  key={times}
                  onPress={() => setFrequency({ timesPerWeek: times })}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[
                    styles.day,
                    {
                      backgroundColor: selected ? colors.accentStrong : 'transparent',
                      borderColor: selected ? 'transparent' : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.dayText, { color: selected ? '#FFFFFF' : colors.textMuted }]}>
                    {times}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.helper, { color: colors.textMuted }]}>
            Any {values.frequency.timesPerWeek} days a week counts. This streak is measured in weeks.
          </Text>
        </View>
      ) : null}

      {/* ---- Reminder ---- */}
      <Text style={[styles.fieldLabel, { color: colors.text }]}>Reminder</Text>
      <View style={[styles.reminderBox, { borderColor: colors.border }]}>
        <Toggle
          checked={values.reminder.enabled}
          onChange={(enabled) => setReminder({ enabled })}
          label="Remind me"
          description="A nudge at the time you choose"
        />

        {values.reminder.enabled ? (
          <View style={[styles.timeRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.timeLabel, { color: colors.textMuted }]}>Time</Text>
            <Pressable
              onPress={() => setShowTimePicker(true)}
              accessibilityRole="button"
              accessibilityLabel={`Reminder time, ${formatTime(values.reminder.time)}`}
              style={[styles.timeButton, { borderColor: colors.borderStrong }]}
            >
              <Text style={[styles.timeText, { color: colors.text }]}>
                {formatTime(values.reminder.time)}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {showTimePicker ? (
        <DateTimePicker
          value={timeToDate(values.reminder.time)}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selected) => {
            // Android fires with type 'dismissed' when cancelled; keeping the
            // old value in that case avoids silently resetting to midnight.
            if (Platform.OS === 'android') setShowTimePicker(false);
            if (event.type === 'dismissed' || !selected) return;
            setReminder({ time: dateToTime(selected) });
          }}
        />
      ) : null}

      {Platform.OS === 'ios' && showTimePicker ? (
        <Button variant="secondary" fullWidth style={{ marginTop: 10 }} onPress={() => setShowTimePicker(false)}>
          Done
        </Button>
      ) : null}

      <View style={{ height: 12 }} />
    </Sheet>
  );
}

function Chip({ selected, onPress, children }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        {
          borderColor: selected ? colors.accentStrong : colors.border,
          backgroundColor: selected ? colors.accentSoft : 'transparent',
        },
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? colors.accentStrong : colors.textMuted }]}>
        {children}
      </Text>
    </Pressable>
  );
}

/** 'HH:mm' → a Date today at that time, which is what the picker wants. */
function timeToDate(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function dateToTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  template: {
    width: '31.5%',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 13,
    paddingVertical: 13,
    paddingHorizontal: 6,
  },
  templateIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  templateName: { fontSize: 11.5, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 12 },
  previewIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  previewName: { fontSize: 14.5, fontFamily: 'Inter_700Bold' },
  previewMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginTop: 20, marginBottom: 9 },
  iconRow: { gap: 7, paddingRight: 8 },
  iconOption: { width: 42, height: 42, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  colorSwatch: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  chipText: { fontSize: 12.5, fontFamily: 'Inter_600SemiBold' },
  segmented: { flexDirection: 'row', gap: 7 },
  segment: { flex: 1, borderWidth: 1, borderRadius: 11, paddingVertical: 11, alignItems: 'center' },
  segmentText: { fontSize: 12.5, fontFamily: 'Inter_600SemiBold' },
  dayRow: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, height: 42, borderWidth: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  helper: { fontSize: 11.5, fontFamily: 'Inter_400Regular', marginTop: 9, lineHeight: 16 },
  reminderBox: { borderWidth: 1, borderRadius: 13, padding: 14 },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 14,
  },
  timeLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  timeButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  timeText: { fontSize: 13.5, fontFamily: 'Inter_600SemiBold' },
});
