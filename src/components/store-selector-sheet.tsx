import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { Marketplace } from '@/lib/api';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** `'all'` or a `Marketplace.id` from `GET /marketplace/`. */
export type StoreOption = 'all' | string;

/**
 * Bottom-sheet store picker for the Home top bar — replaces the old
 * tap-to-cycle store selector with a proper drawer, per the spec ("tappable
 * to filter by Shopify / Daraz / Amazon"). Driven by the same
 * `useSupportedMarketplaces()` / `GET /marketplace/` data as the Connect
 * Stores screen (lifted to the caller so both screens share one fetch)
 * instead of the old hardcoded `ChannelOrder` list.
 */
export function StoreSelectorSheet({
  visible,
  selected,
  marketplaces,
  isLoading,
  error,
  onRetry,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: StoreOption;
  marketplaces: Marketplace[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelect: (value: StoreOption) => void;
  onClose: () => void;
}) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Standard modal scrim — an intentional exception to "no hardcoded
          hex colors", since a backdrop dimmer isn't a themed surface. */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.border },
        ]}>
        <View style={[styles.handle, { backgroundColor: theme.border }]} />
        <ThemedText type="headlineSm" style={styles.title}>
          Select store
        </ThemedText>

        <StoreRow
          label="All Stores"
          isSelected={selected === 'all'}
          onPress={() => onSelect('all')}
          leading={
            <View style={[styles.allBadge, { backgroundColor: theme.primaryContainer }]}>
              <ThemedText type="labelMd" themeColor="primary">
                All
              </ThemedText>
            </View>
          }
        />

        {isLoading && (
          <View style={styles.statusRow}>
            <ActivityIndicator color={theme.primary} />
            <ThemedText type="bodySm" themeColor="textSecondary">
              Loading your stores…
            </ThemedText>
          </View>
        )}

        {!isLoading && error && (
          <View style={styles.statusRow}>
            <ThemedText type="bodySm" themeColor="danger" style={styles.statusText}>
              {error}
            </ThemedText>
            <Pressable onPress={onRetry} hitSlop={8}>
              <ThemedText type="bodySm" themeColor="primary" style={styles.retryText}>
                Try again
              </ThemedText>
            </Pressable>
          </View>
        )}

        {!isLoading && !error && marketplaces.length === 0 && (
          <View style={styles.statusRow}>
            <ThemedText type="bodySm" themeColor="textSecondary" style={styles.statusText}>
              No stores connected yet.
            </ThemedText>
          </View>
        )}

        {!isLoading &&
          !error &&
          marketplaces.map((marketplace) => (
            <StoreRow
              key={marketplace.id}
              label={marketplace.name}
              isSelected={selected === marketplace.id}
              onPress={() => onSelect(marketplace.id)}
              leading={
                <View style={[styles.marketplaceBadge, { backgroundColor: theme.primaryContainer }]}>
                  <Image source={{ uri: marketplace.logo_url }} style={styles.marketplaceLogo} contentFit="contain" />
                </View>
              }
            />
          ))}

        <Pressable
          style={[styles.manageRow, { borderTopColor: theme.border }]}
          onPress={() => {
            onClose();
            router.push('/connect-stores');
          }}
          hitSlop={8}>
          <ThemedText type="bodyMd" themeColor="primary">
            Manage connected stores
          </ThemedText>
        </Pressable>
      </View>
    </Modal>
  );
}

function StoreRow({
  label,
  isSelected,
  onPress,
  leading,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  leading: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {leading}
      <ThemedText type="bodyLg" style={styles.rowLabel}>
        {label}
      </ThemedText>
      {isSelected && (
        <ThemedText type="bodyLg" themeColor="primary">
          ✓
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopWidth: 1,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
    gap: Spacing.one,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: Radius.full,
    marginBottom: Spacing.two,
  },
  title: {
    marginBottom: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rowLabel: {
    flex: 1,
  },
  allBadge: {
    width: 40,
    height: 40,
    borderRadius: Radius.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marketplaceBadge: {
    width: 40,
    height: 40,
    borderRadius: Radius.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marketplaceLogo: {
    width: 24,
    height: 24,
  },
  pressed: {
    opacity: 0.7,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  statusText: {
    flex: 1,
  },
  retryText: {
    textDecorationLine: 'underline',
  },
  manageRow: {
    borderTopWidth: 1,
    marginTop: Spacing.two,
    paddingTop: Spacing.three,
    alignItems: 'center',
  },
});
