import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { PencilSimple, NotePencil, ArrowSquareOut, Trash, Warning } from 'phosphor-react-native';

import { useTheme } from '../../theme/ThemeProvider.jsx';
import { Sheet } from '../ui/Sheet.jsx';
import { Button } from '../ui/Button.jsx';

/**
 * Per-habit action menu.
 *
 * Delete asks for confirmation inside the same sheet rather than opening a
 * second one — stacked modals on a phone are disorienting, and this is a
 * destructive action that takes the whole streak history with it.
 */
export function HabitMenuSheet({ habit, onClose, onEdit, onNote, onDetails, onDelete }) {
  const { colors } = useTheme();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const close = () => {
    setConfirmingDelete(false);
    onClose?.();
  };

  if (!habit) return null;

  return (
    <Sheet open onClose={close} title={habit.name} description={confirmingDelete ? undefined : 'What would you like to do?'}>
      {confirmingDelete ? (
        <View style={{ paddingBottom: 8 }}>
          <View style={[styles.warning, { backgroundColor: colors.dangerSoft }]}>
            <Warning size={19} color={colors.danger} weight="fill" />
            <Text style={[styles.warningText, { color: colors.text }]}>
              This deletes {habit.stats?.total ?? 0} check-in
              {habit.stats?.total === 1 ? '' : 's'} and a {habit.stats?.longest ?? 0}-{habit.stats?.unit ?? 'day'} best
              streak. It cannot be undone.
            </Text>
          </View>

          <View style={styles.confirmRow}>
            <Button variant="secondary" fullWidth style={{ flex: 1 }} onPress={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" fullWidth style={{ flex: 1 }} onPress={() => onDelete?.(habit)}>
              Delete
            </Button>
          </View>
        </View>
      ) : (
        <View style={{ paddingBottom: 8 }}>
          {habit.checkIn ? (
            <MenuRow
              icon={NotePencil}
              label={habit.checkIn.note ? 'Edit note' : 'Add a note'}
              onPress={() => onNote?.(habit)}
            />
          ) : null}
          <MenuRow icon={PencilSimple} label="Edit habit" onPress={() => onEdit?.(habit)} />
          <MenuRow icon={ArrowSquareOut} label="View details" onPress={() => onDetails?.(habit)} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <MenuRow icon={Trash} label="Delete habit" destructive onPress={() => setConfirmingDelete(true)} />
        </View>
      )}
    </Sheet>
  );
}

function MenuRow({ icon: Icon, label, onPress, destructive = false }) {
  const { colors } = useTheme();
  const tint = destructive ? colors.danger : colors.text;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.surface3 : 'transparent' },
      ]}
    >
      <Icon size={19} color={tint} />
      <Text style={[styles.rowLabel, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  rowLabel: { fontSize: 14.5, fontFamily: 'Inter_500Medium' },
  divider: { height: 1, marginVertical: 6 },
  warning: { flexDirection: 'row', gap: 11, borderRadius: 12, padding: 14 },
  warningText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  confirmRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
});
