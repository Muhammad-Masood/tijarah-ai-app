import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AuthField, AuthFormScaffold, BrandMark, GoogleButton, OrDivider, PasswordVisibilityToggle } from '@/components/auth-kit';
import { ThemedText } from '@/components/themed-text';
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
    <AuthFormScaffold>
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
    </AuthFormScaffold>
  );
}

const styles = StyleSheet.create({
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
