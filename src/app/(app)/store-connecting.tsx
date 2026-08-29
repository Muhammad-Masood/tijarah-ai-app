import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChannelBadge, ExecutionStep, SyncStatusPill, type StepStatus } from '@/components/onboarding-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Channels, isChannelId } from '@/constants/channels';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { ApiError, getShopifyAuthorizeUrl } from '@/lib/api';

const STEPS = ['Verifying credentials', 'Establishing secure connection', 'Preparing your workspace'];
const STEP_DELAY_MS = 850;
const HANDOFF_DELAY_MS = 500;

export default function StoreConnectingScreen() {
  const { platform, shop } = useLocalSearchParams<{ platform?: string; shop?: string }>();
  const channelId = isChannelId(platform) ? platform : 'shopify';
  const channel = Channels[channelId];
  const { accessToken } = useAuth();

  const [stepIndex, setStepIndex] = useState(0);
  const [connectError, setConnectError] = useState<string | null>(null);
  const oauthStarted = useRef(false);

  // Shopify: call GET /shopify/get_auth_code?shop=… and open the redirected
  // OAuth authorize URL. Other platforms keep the simulated handshake.
  useEffect(() => {
    if (channelId !== 'shopify') return;
    if (oauthStarted.current) return;

    if (!shop?.trim()) {
      setConnectError('Please enter your Shopify shop domain.');
      return;
    }
    if (!accessToken) {
      setConnectError('Please log in again to connect Shopify.');
      return;
    }

    oauthStarted.current = true;
    let cancelled = false;

    (async () => {
      try {
        setConnectError(null);
        const authorizeUrl = await getShopifyAuthorizeUrl(accessToken, shop);
        if (cancelled) return;
        setStepIndex(STEPS.length);
        console.log('authorizeUrl', authorizeUrl);
        await WebBrowser.openBrowserAsync(authorizeUrl);
        if (cancelled) return;
        router.replace({ pathname: '/store-connected', params: { platform: channelId } });
      } catch (err) {
        if (cancelled) return;
        setConnectError(
          err instanceof ApiError ? err.message : 'Could not start the Shopify connection. Please try again.',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, channelId, shop]);

  // Simulated connection handshake for non-Shopify platforms.
  useEffect(() => {
    if (channelId === 'shopify') return;

    if (stepIndex >= STEPS.length) {
      const timeout = setTimeout(() => {
        router.replace({ pathname: '/store-connected', params: { platform: channelId } });
      }, HANDOFF_DELAY_MS);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(() => setStepIndex((index) => index + 1), STEP_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [stepIndex, channelId]);

  // Advance checklist steps while Shopify OAuth request is in flight.
  useEffect(() => {
    if (channelId !== 'shopify' || connectError || stepIndex >= STEPS.length) return;
    const timeout = setTimeout(() => setStepIndex((index) => Math.min(index + 1, STEPS.length - 1)), STEP_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [channelId, connectError, stepIndex]);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.content}>
          <View style={styles.spacer} />

          <View style={styles.badgeBlock}>
            <ChannelBadge channelId={channelId} />
            <ThemedText type="headlineSm">{channel.name}</ThemedText>
            <SyncStatusPill label={connectError ? 'Connection failed' : 'Connecting…'} />
          </View>

          <ThemedText type="headlineMd" style={styles.heading}>
            {connectError ? `Couldn’t connect to ${channel.name}` : `Connecting to ${channel.name}…`}
          </ThemedText>

          <View style={styles.checklist}>
            {STEPS.map((label, index) => (
              <ExecutionStep key={label} label={label} status={stepStatus(index, stepIndex, Boolean(connectError))} />
            ))}
          </View>

          {connectError ? (
            <ThemedText type="bodySm" themeColor="danger" style={styles.reassurance}>
              {connectError}
            </ThemedText>
          ) : (
            <ThemedText type="bodySm" themeColor="textSecondary" style={styles.reassurance}>
              This usually takes a few seconds. Your store data is not changed during this step.
            </ThemedText>
          )}

          <View style={styles.spacer} />

          <Pressable style={styles.cancelRow} onPress={() => router.back()} hitSlop={8}>
            <ThemedText type="bodyMd" themeColor="textSecondary" style={styles.cancelText}>
              {connectError ? 'Go back' : 'Cancel'}
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function stepStatus(index: number, currentStepIndex: number, hasError: boolean): StepStatus {
  if (hasError) return index < currentStepIndex ? 'done' : 'pending';
  if (index < currentStepIndex) return 'done';
  if (index === currentStepIndex) return 'in-progress';
  return 'pending';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
  },
  spacer: {
    flex: 1,
  },
  badgeBlock: {
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  heading: {
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  checklist: {
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  reassurance: {
    textAlign: 'center',
  },
  cancelRow: {
    alignSelf: 'center',
    paddingBottom: Spacing.four,
  },
  cancelText: {
    textDecorationLine: 'underline',
  },
});
