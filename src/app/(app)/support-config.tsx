import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthField, PressableScale } from '@/components/auth-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, getWhatsAppSupportConfig, updateWhatsAppSupportConfig } from '@/lib/api';

export default function SupportConfigScreen() {
  const theme = useTheme();
  const { accessToken } = useAuth();
  const [isWhatsAppEnabled, setIsWhatsAppEnabled] = useState(false);
  const [autoConfirmOrders, setAutoConfirmOrders] = useState(false);
  const [timeoutHours, setTimeoutHours] = useState('0');
  const [customInstructions, setCustomInstructions] = useState('');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [whatsappPhoneNumber, setWhatsappPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    let isCurrent = true;
    getWhatsAppSupportConfig(accessToken)
      .then((config) => {
        if (!isCurrent) return;
        setIsWhatsAppEnabled(config.is_whatsapp_enabled);
        setAutoConfirmOrders(config.auto_confirm_orders);
        setTimeoutHours(String(config.confirmation_timeout_hours ?? 0));
        setCustomInstructions(config.custom_instructions ?? '');
        setGreetingMessage(config.greeting_message ?? '');
        setWhatsappPhoneNumber(config.whatsapp_phone_number ?? '');
      })
      .catch((err) => {
        if (isCurrent) {
          setError(err instanceof ApiError ? err.message : 'Could not load WhatsApp settings.');
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [accessToken]);

  async function handleSave() {
    const parsedTimeout = Number(timeoutHours);
    if (!accessToken || !whatsappPhoneNumber.trim() || !greetingMessage.trim()) {
      setError('Enter a WhatsApp number and greeting message.');
      return;
    }
    if (!Number.isInteger(parsedTimeout) || parsedTimeout < 0) {
      setError('Enter a whole number of hours, zero or greater.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateWhatsAppSupportConfig(accessToken, {
        auto_confirm_orders: autoConfirmOrders,
        confirmation_timeout_hours: parsedTimeout,
        custom_instructions: customInstructions.trim(),
        greeting_message: greetingMessage.trim(),
        whatsapp_phone_number: whatsappPhoneNumber.trim(),
        is_whatsapp_enabled: isWhatsAppEnabled,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save WhatsApp settings.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go back">
              <MaterialCommunityIcons name="arrow-left" size={24} color={theme.onSurface} />
            </Pressable>
            <ThemedText type="headlineSm">WhatsApp Confirmation</ThemedText>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.titleRow}>
            <View style={[styles.whatsappIcon, { backgroundColor: theme.primaryContainer }]}>
              <MaterialCommunityIcons name="whatsapp" size={28} color={theme.primary} />
            </View>
            <View style={styles.titleCopy}>
              <ThemedText type="headlineMd">Confirm orders on WhatsApp</ThemedText>
              <ThemedText type="bodyMd" themeColor="textSecondary">
                Send customers a quick message after they place an order.
              </ThemedText>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.stateBlock}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText type="bodyMd" themeColor="textSecondary">Loading settings...</ThemedText>
            </View>
          ) : (
            <>
              <View style={[styles.toggleCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.border }]}>
                <View style={styles.toggleCopy}>
                  <ThemedText type="bodyLg">Enable WhatsApp</ThemedText>
                  <ThemedText type="bodySm" themeColor="textSecondary">
                    Connect WhatsApp to send order confirmation messages.
                  </ThemedText>
                </View>
                <Switch
                  value={isWhatsAppEnabled}
                  onValueChange={(value) => { setIsWhatsAppEnabled(value); setSaved(false); }}
                  trackColor={{ false: theme.border, true: theme.primaryFixedDim }}
                  thumbColor={isWhatsAppEnabled ? theme.primary : theme.surfaceContainerHighest}
                  accessibilityLabel="Enable WhatsApp"
                />
              </View>

              <View style={styles.formSection}>
                <ThemedText type="labelMd" themeColor="textSecondary">WHATSAPP SETUP</ThemedText>
                <AuthField
                  label="WhatsApp phone number"
                  value={whatsappPhoneNumber}
                  onChangeText={(value) => { setWhatsappPhoneNumber(value); setSaved(false); }}
                  placeholder="+92 300 1234567"
                  keyboardType="phone-pad"
                  helperText="Include the country code used by your WhatsApp Business account."
                  required
                />
                <AuthField
                  label="Greeting message"
                  value={greetingMessage}
                  onChangeText={(value) => { setGreetingMessage(value); setSaved(false); }}
                  placeholder="Write the greeting customers will receive"
                  multiline
                  numberOfLines={5}
                  helperText="This message is sent when a customer starts the conversation."
                  required
                />
                <AuthField
                  label="Confirmation timeout (hours)"
                  value={timeoutHours}
                  onChangeText={(value) => { setTimeoutHours(value.replace(/[^0-9]/g, '')); setSaved(false); }}
                  placeholder="0"
                  keyboardType="number-pad"
                  helperText="Use 0 to disable the timeout."
                />
                <AuthField
                  label="Custom instructions"
                  value={customInstructions}
                  onChangeText={(value) => { setCustomInstructions(value); setSaved(false); }}
                  placeholder="Add instructions for order confirmation replies"
                  multiline
                  numberOfLines={4}
                  helperText="Optional guidance for how confirmation messages should be handled."
                />
              </View>

              <View style={[styles.toggleCard, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.border }]}>
                <View style={styles.toggleCopy}>
                  <ThemedText type="bodyLg">Auto-confirm orders</ThemedText>
                  <ThemedText type="bodySm" themeColor="textSecondary">
                    Automatically confirm eligible orders without waiting for a reply.
                  </ThemedText>
                </View>
                <Switch
                  value={autoConfirmOrders}
                  onValueChange={(value) => { setAutoConfirmOrders(value); setSaved(false); }}
                  trackColor={{ false: theme.border, true: theme.primaryFixedDim }}
                  thumbColor={autoConfirmOrders ? theme.primary : theme.surfaceContainerHighest}
                  accessibilityLabel="Automatically confirm orders"
                />
              </View>

              {error && <ThemedText type="bodySm" themeColor="danger">{error}</ThemedText>}
              {saved && <ThemedText type="bodySm" themeColor="success">WhatsApp settings saved.</ThemedText>}

              <PressableScale
                onPress={handleSave}
                disabled={isSaving}
                style={[styles.saveButton, { backgroundColor: theme.primary }]}>
                {isSaving ? <ActivityIndicator color={theme.onPrimary} /> : <ThemedText type="bodyLg" themeColor="onPrimary">Save settings</ThemedText>}
              </PressableScale>
            </>
          )}

          <View style={styles.note}>
            <MaterialCommunityIcons name="information-outline" size={18} color={theme.textSecondary} />
            <ThemedText type="bodySm" themeColor="textSecondary" style={styles.noteText}>
              Customers will receive messages from the WhatsApp number you configure here.
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: { width: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  whatsappIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCopy: { flex: 1, gap: Spacing.one },
  toggleCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  toggleCopy: { flex: 1, gap: Spacing.one },
  formSection: { gap: Spacing.two },
  stateBlock: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  saveButton: {
    minHeight: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.one, paddingTop: Spacing.one },
  noteText: { flex: 1 },
});
