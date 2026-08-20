import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AuthField, AuthFormScaffold, BrandMark, GoogleButton, OrDivider, PasswordVisibilityToggle, PressableScale } from '@/components/auth-kit';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { ApiError, useAuth } from '@/hooks/use-auth';
import { useStagger } from '@/hooks/use-stagger';
import { useTheme } from '@/hooks/use-theme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const theme = useTheme();
  const stagger = useStagger();
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
      // No navigation here: a successful sign-in flips `session` in
      // AuthProvider, and the root `Stack.Protected` switch reacts by
      // mounting the (app) group and discarding the (auth) group's history.
      await signInMerchant(email, password);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthFormScaffold>
      <Animated.View entering={stagger(0)}>
        <BrandMark size="sm" />
      </Animated.View>

      <Animated.View entering={stagger(60)} style={styles.headerBlock}>
        <ThemedText type="headlineMd" themeColor="primary" style={styles.centerText}>
          Tijarah AI
        </ThemedText>
        <ThemedText type="bodyLg" themeColor="textSecondary" style={styles.centerText}>
          Welcome back. Log in to your account.
        </ThemedText>
      </Animated.View>

      <View style={styles.form}>
        <Animated.View entering={stagger(120)}>
          <AuthField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            keyboardType="email-address"
            autoComplete="email"
          />
        </Animated.View>

        <Animated.View entering={stagger(160)}>
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
        </Animated.View>

        <Pressable style={styles.forgotPasswordRow}>
          <ThemedText type="bodySm" themeColor="primary">
            Forgot password?
          </ThemedText>
        </Pressable>

        <Animated.View entering={stagger(200)}>
          <PressableScale
            disabled={!canSubmit}
            onPress={handleSubmit}
            style={[styles.ctaButton, { backgroundColor: canSubmit ? theme.primary : theme.backgroundElement }]}>
            {isSubmitting ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <ThemedText
                type="bodyLg"
                style={[styles.emphasisText, { color: canSubmit ? theme.onPrimary : theme.textSecondary }]}>
                Log in
              </ThemedText>
            )}
          </PressableScale>
        </Animated.View>
      </View>

      <Animated.View entering={stagger(240)}>
        <OrDivider label="or" />
      </Animated.View>

      <Animated.View entering={stagger(280)}>
        <GoogleButton label="Continue with Google" />
      </Animated.View>

      <Animated.View entering={stagger(320)} style={styles.switcherRow}>
        <ThemedText type="bodySm" themeColor="textSecondary">
          New to Tijarah AI?{' '}
        </ThemedText>
        <Pressable onPress={() => router.replace('/signup')}>
          <ThemedText type="bodySm" themeColor="primary" style={styles.emphasisText}>
            Sign up
          </ThemedText>
        </Pressable>
      </Animated.View>
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
