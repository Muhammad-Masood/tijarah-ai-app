import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthField, BrandMark, GoogleButton, OrDivider, PasswordVisibilityToggle } from '@/components/auth-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { ApiError, useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const theme = useTheme();
  const { signInMerchant } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canSubmit = EMAIL_PATTERN.test(email) && password.length > 0 && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      await signInMerchant(email, password);
      router.replace('/(tabs)');
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.flex}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            <View style={[styles.card, { backgroundColor: theme.surfaceContainerLowest, borderColor: theme.border }]}>
              <BrandMark size="sm" />
              <View style={styles.headerBlock}>
                <ThemedText type="headlineMd" themeColor="primary" style={styles.centerText}>
                  Tijarah AI
                </ThemedText>
                <ThemedText type="bodyLg" themeColor="textSecondary" style={styles.centerText}>
                  Welcome back. Log in to your account.
                </ThemedText>
              </View>

              <View style={styles.form}>
                <AuthField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@company.com"
                  keyboardType="email-address"
                  autoComplete="email"
                />

                <AuthField
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  autoComplete="current-password"
                  error={formError ?? undefined}
                  rightAdornment={
                    <PasswordVisibilityToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
                  }
                />

                <Pressable style={styles.forgotPasswordRow}>
                  <ThemedText type="bodySm" themeColor="primary">
                    Forgot password?
                  </ThemedText>
                </Pressable>

                <Pressable
                  disabled={!canSubmit}
                  onPress={handleSubmit}
                  style={[
                    styles.ctaButton,
                    { backgroundColor: canSubmit ? theme.primary : theme.backgroundElement },
                  ]}>
                  {isSubmitting ? (
                    <ActivityIndicator color={theme.onPrimary} />
                  ) : (
                    <ThemedText
                      type="bodyLg"
                      style={[styles.emphasisText, { color: canSubmit ? theme.onPrimary : theme.textSecondary }]}>
                      Log in
                    </ThemedText>
                  )}
                </Pressable>
              </View>

              <OrDivider label="or" />

              <GoogleButton label="Continue with Google" />

              <View style={styles.switcherRow}>
                <ThemedText type="bodySm" themeColor="textSecondary">
                  New to Tijarah AI?{' '}
                </ThemedText>
                <Pressable onPress={() => router.replace('/signup')}>
                  <ThemedText type="bodySm" themeColor="primary" style={styles.emphasisText}>
                    Sign up
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.containerMargin,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  headerBlock: {
    gap: Spacing.one,
  },
  centerText: {
    textAlign: 'center',
  },
  form: {
    gap: Spacing.three,
  },
  forgotPasswordRow: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.two,
  },
  ctaButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.DEFAULT,
    paddingVertical: Spacing.three,
  },
  emphasisText: {
    fontWeight: '600',
  },
  switcherRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
