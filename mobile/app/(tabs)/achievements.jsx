import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lock, Snowflake, Lightning } from 'phosphor-react-native';
import * as PhosphorIcons from 'phosphor-react-native';

import { useTheme } from '../../src/theme/ThemeProvider.jsx';
import { useProgressStore } from '../../src/store/progressStore.js';
import { toast } from '../../src/components/ui/Toast.jsx';
import { errorMessage } from '../../src/lib/api.js';

import { Card, SectionTitle, ScreenHeader } from '../../src/components/ui/Card.jsx';
import { Skeleton } from '../../src/components/ui/Feedback.jsx';
import { LevelBar } from '../../src/components/gamification/LevelBar.jsx';

/**
 * Rewards: level, XP, freeze balance and the achievement catalogue.
 *
 * Locked achievements are shown as silhouettes rather than hidden — knowing
 * what's out there is most of the pull. Secret ones stay masked until earned.
 */
export default function AchievementsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { progress, load } = useProgressStore();

  const [loading, setLoading] = useState(!progress);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      await load();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not load your rewards'));
    }
  }, [load]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const achievements = progress?.achievements ?? [];
  const unlocked = achievements.filter((a) => a.unlocked);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 14 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await refresh();
            setRefreshing(false);
          }}
          tintColor={colors.accent}
        />
      }
    >
      <ScreenHeader
        title="Rewards"
        subtitle={
          progress ? `${unlocked.length} of ${achievements.length} achievements unlocked` : undefined
        }
      />

      {loading && !progress ? (
        <View style={{ gap: 14 }}>
          <Skeleton height={110} />
          <Skeleton height={220} />
        </View>
      ) : (
        <>
          <LevelBar progress={progress} onPress={() => {}} />

          <Card>
            <SectionTitle>Streak freezes</SectionTitle>
            <View style={styles.freezeRow}>
              <View style={[styles.freezeIcon, { backgroundColor: colors.freezeSoft ?? colors.accentSoft }]}>
                <Snowflake size={22} color={colors.freeze ?? colors.accentStrong} weight="fill" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.freezeCount, { color: colors.text }]}>
                  {progress?.freezes?.available ?? 0}
                  <Text style={{ color: colors.textMuted }}> / {progress?.freezes?.max ?? 3}</Text>
                </Text>
                <Text style={[styles.freezeHint, { color: colors.textMuted }]}>
                  Miss a day and one is spent automatically to save your streaks.
                </Text>
              </View>
            </View>

            {progress?.freezes ? (
              <View style={{ marginTop: 12 }}>
                <View style={[styles.track, { backgroundColor: colors.surface3 }]}>
                  <View
                    style={{
                      height: '100%',
                      borderRadius: 4,
                      backgroundColor: colors.freeze ?? colors.accent,
                      width: `${(progress.freezes.progress / progress.freezes.progressTarget) * 100}%`,
                    }}
                  />
                </View>
                <Text style={[styles.freezeProgress, { color: colors.textSubtle }]}>
                  {progress.freezes.progress}/{progress.freezes.progressTarget} active days toward the next
                  freeze
                </Text>
              </View>
            ) : null}
          </Card>

          <Card>
            <SectionTitle>Achievements</SectionTitle>
            <View style={styles.grid}>
              {achievements.map((achievement) => (
                <AchievementTile key={achievement.key} achievement={achievement} />
              ))}
            </View>
          </Card>

          <Card>
            <SectionTitle>How XP works</SectionTitle>
            <View style={{ marginTop: 12, gap: 9 }}>
              <XpRow amount="+10" label="Every check-in" />
              <XpRow amount="+5" label="A day where you complete everything due" />
              <XpRow amount="+25" label="Reaching a streak milestone" />
            </View>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function AchievementTile({ achievement }) {
  const { colors } = useTheme();
  const { unlocked, secret } = achievement;

  // Secret achievements stay masked until earned — the mystery is the point.
  const masked = secret && !unlocked;
  const Icon = PhosphorIcons[achievement.icon] ?? PhosphorIcons.Trophy;

  return (
    <View
      style={[
        styles.tile,
        {
          borderColor: unlocked ? colors.accent : colors.border,
          backgroundColor: unlocked ? colors.accentSoft : 'transparent',
        },
      ]}
      accessibilityLabel={
        masked
          ? 'Locked secret achievement'
          : `${achievement.name}. ${achievement.description}. ${unlocked ? 'Unlocked' : 'Locked'}`
      }
    >
      <View
        style={[
          styles.tileIcon,
          { backgroundColor: unlocked ? colors.surface : colors.surface3 },
        ]}
      >
        {masked ? (
          <Lock size={18} color={colors.textSubtle} />
        ) : (
          <Icon
            size={20}
            color={unlocked ? colors.accentStrong : colors.textSubtle}
            weight={unlocked ? 'fill' : 'regular'}
          />
        )}
      </View>

      <Text
        style={[styles.tileName, { color: unlocked ? colors.text : colors.textMuted }]}
        numberOfLines={2}
      >
        {masked ? '???' : achievement.name}
      </Text>

      <Text style={[styles.tileDesc, { color: colors.textSubtle }]} numberOfLines={2}>
        {masked ? 'Keep going to find out' : achievement.description}
      </Text>
    </View>
  );
}

function XpRow({ amount, label }) {
  const { colors } = useTheme();
  return (
    <View style={styles.xpRow}>
      <View style={[styles.xpBadge, { backgroundColor: colors.accentSoft }]}>
        <Lightning size={11} color={colors.accentStrong} weight="fill" />
        <Text style={[styles.xpAmount, { color: colors.accentStrong }]}>{amount}</Text>
      </View>
      <Text style={[styles.xpLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 28, gap: 14 },
  freezeRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 },
  freezeIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  freezeCount: { fontSize: 22, fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.5 },
  freezeHint: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2, lineHeight: 16 },
  track: { height: 7, borderRadius: 4, overflow: 'hidden' },
  freezeProgress: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  tile: {
    width: '31.5%',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 13,
    paddingVertical: 13,
    paddingHorizontal: 6,
  },
  tileIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  tileName: { fontSize: 11.5, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  tileDesc: { fontSize: 9.5, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 13 },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  xpBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  xpAmount: { fontSize: 11.5, fontFamily: 'Inter_700Bold' },
  xpLabel: { fontSize: 12.5, fontFamily: 'Inter_400Regular', flex: 1 },
});
