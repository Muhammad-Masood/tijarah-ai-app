import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Channels, type ChannelId } from '@/constants/channels';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ChannelBadge({ channelId, size = 'md' }: { channelId: ChannelId; size?: 'sm' | 'md' }) {
  const theme = useTheme();
  const channel = Channels[channelId];
  const box = size === 'sm' ? 40 : 56;
  const glyph = size === 'sm' ? 16 : 22;

  return (
    <View
      style={[
        styles.badge,
        { width: box, height: box, borderRadius: Radius.DEFAULT, backgroundColor: theme.primaryContainer },
      ]}>
      <ThemedText style={{ fontSize: glyph, fontWeight: '700', color: theme.primary }}>
        {channel.initial}
      </ThemedText>
    </View>
  );
}

export function ChannelConnectCard({
  channelId,
  onConnect,
}: {
  channelId: ChannelId;
  onConnect: () => void;
}) {
  const theme = useTheme();
  const channel = Channels[channelId];

  return (
    <View style={[styles.card, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.border }]}>
      <ChannelBadge channelId={channelId} />
      <View style={styles.cardBody}>
        <ThemedText type="headlineSm">{channel.name}</ThemedText>
        <ThemedText type="bodySm" themeColor="textSecondary">
          {channel.benefit}
        </ThemedText>
      </View>
      <Pressable
        onPress={onConnect}
        style={({ pressed }) => [
          styles.connectButton,
          { backgroundColor: theme.primary },
          pressed && styles.pressed,
        ]}>
        <ThemedText type="labelMd" themeColor="onPrimary">
          Connect
        </ThemedText>
      </Pressable>
    </View>
  );
}

export function SyncStatusPill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success';
}) {
  const theme = useTheme();
  const color = tone === 'success' ? theme.success : theme.textSecondary;

  return (
    <View style={[styles.statusPill, { borderColor: theme.border }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <ThemedText type="bodySm" style={{ color }}>
        {label}
      </ThemedText>
    </View>
  );
}

export type StepStatus = 'done' | 'in-progress' | 'pending';

export function ExecutionStep({ label, status }: { label: string; status: StepStatus }) {
  const theme = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status !== 'in-progress') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [status, pulse]);

  return (
    <View style={styles.stepRow}>
      {status === 'done' && (
        <View style={[styles.stepIconDone, { backgroundColor: theme.success }]}>
          <ThemedText style={styles.stepCheck} themeColor="onPrimary">
            ✓
          </ThemedText>
        </View>
      )}
      {status === 'in-progress' && (
        <Animated.View style={[styles.stepIconProgress, { backgroundColor: theme.primary, opacity: pulse }]} />
      )}
      {status === 'pending' && <View style={[styles.stepIconPending, { borderColor: theme.border }]} />}
      <ThemedText type="bodyMd" themeColor={status === 'pending' ? 'textSecondary' : 'text'}>
        {label}
      </ThemedText>
    </View>
  );
}

export function Tag({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: theme.surfaceContainer }]}>
      <ThemedText type="bodySm" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  cardBody: {
    flex: 1,
    gap: Spacing.half,
  },
  connectButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.DEFAULT,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.85,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  stepIconDone: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCheck: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepIconProgress: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  stepIconPending: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
  tag: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
});
