import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthField, BrandMark, GoogleButton, OrDivider, PasswordVisibilityToggle } from '@/components/auth-kit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { ApiError, useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordStrength(password: string): { label: string; color: ThemeColor } | null {
  if (password.length === 0) return null;
  if (password.length < 8) return { label: 'Weak', color: 'danger' };
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumberOrSymbol = /[0-9\W]/.test(password);
  if (hasMixedCase && hasNumberOrSymbol && password.length >= 10) {
    return { label: 'Strong', color: 'success' };
  }
  return { label: 'Good', color: 'textSecondary' };
}

export default function SignupScreen() {
  const theme = useTheme();
  const { signUpMerchant } = useAuth();
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const strength = passwordStrength(password);
  const canSubmit =
    fullName.trim().length > 0 &&
    businessName.trim().length > 1 &&
    EMAIL_PATTERN.test(email) &&
    password.length >= 8 &&
    agreed &&
    !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      await signUpMerchant({
        full_name: fullName.trim(),
        business_name: businessName.trim(),
        email,
        password,
      });
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
                  Create your account to start selling.
                </ThemedText>
              </View>

              <View style={styles.form}>
                <AuthField label="Full name" value={fullName} onChangeText={setFullName} placeholder="Jane Doe" autoCapitalize="words" autoComplete="name" />

                <AuthField
                  label="Business name"
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="Acme Trading Co."
                  autoCapitalize="words"
                />

                <AuthField
                  label="Work email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@company.com"
                  keyboardType="email-address"
                  autoComplete="email"
                />

                <View style={styles.passwordGroup}>
                  <AuthField
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                    error={formError ?? undefined}
                    rightAdornment={
                      <PasswordVisibilityToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
                    }
                  />
                  {!formError && strength && (
                    <ThemedText type="bodySm" themeColor={strength.color}>
                      Password strength: {strength.label}
                    </ThemedText>
                  )}
                </View>

                <Pressable style={styles.checkboxRow} onPress={() => setAgreed((v) => !v)}>
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: theme.border },
                      agreed && { backgroundColor: theme.primary, borderColor: theme.primary },
                    ]}>
                    {agreed && <ThemedText style={{ color: theme.onPrimary, fontSize: 12 }}>✓</ThemedText>}
                  </View>
                  <ThemedText type="bodySm" themeColor="textSecondary" style={styles.checkboxLabel}>
                    I agree to the{' '}
                    <ThemedText type="bodySm" themeColor="primary">
                      Terms of Service
                    </ThemedText>{' '}
                    and{' '}
                    <ThemedText type="bodySm" themeColor="primary">
                      Privacy Policy
                    </ThemedText>
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
                      Create account
                    </ThemedText>
                  )}
                </Pressable>
              </View>

              <OrDivider label="or" />

              <GoogleButton label="Sign up with Google" />

              <View style={styles.switcherRow}>
                <ThemedText type="bodySm" themeColor="textSecondary">
                  Already have an account?{' '}
                </ThemedText>
                <Pressable onPress={() => router.replace('/login')}>
                  <ThemedText type="bodySm" themeColor="primary" style={styles.emphasisText}>
                    Log in
                  </ThemedText>
                </Pressable>
              </View>

              <View style={styles.trustStrip}>
                <TrustItem label="Bank-level encryption" />
                <TrustItem label="No store changes without approval" />
                <TrustItem label="Cancel anytime" />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function TrustItem({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.trustItem}>
      <View style={[styles.trustDot, { borderColor: theme.border }]}>
        <ThemedText style={{ fontSize: 10, color: theme.textSecondary }}>✓</ThemedText>
      </View>
      <ThemedText type="bodySm" themeColor="textSecondary" style={styles.trustLabel}>
        {label}
      </ThemedText>
    </View>
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
  passwordGroup: {
    gap: Spacing.one,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxLabel: {
    flex: 1,
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
  trustStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  trustItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  trustDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustLabel: {
    textAlign: 'center',
  },
});
