import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, ZoomIn } from 'react-native-reanimated';

import { AuthField, AuthFormScaffold, BrandMark, GoogleButton, OrDivider, PasswordVisibilityToggle, PressableScale } from '@/components/auth-kit';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { ApiError, useAuth } from '@/hooks/use-auth';
import { useStagger } from '@/hooks/use-stagger';
import { useTheme } from '@/hooks/use-theme';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordStrength(password: string): { label: string; color: ThemeColor; score: 1 | 2 | 3 } | null {
  if (password.length === 0) return null;
  if (password.length < 8) return { label: 'Weak', color: 'danger', score: 1 };
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumberOrSymbol = /[0-9\W]/.test(password);
  if (hasMixedCase && hasNumberOrSymbol && password.length >= 10) {
    return { label: 'Strong', color: 'success', score: 3 };
  }
  return { label: 'Good', color: 'textSecondary', score: 2 };
}

export default function SignupScreen() {
  const theme = useTheme();
  const stagger = useStagger();
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
  const fieldsValid =
    fullName.trim().length > 0 &&
    businessName.trim().length > 1 &&
    EMAIL_PATTERN.test(email) &&
    password.length >= 8 &&
    agreed;
  const canSubmit = fieldsValid && !isSubmitting;

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
      router.push('/connect-stores');
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthFormScaffold>
      <Animated.View entering={stagger(60)} style={styles.headerBlock}>
        <ThemedText type="headlineMd" themeColor="primary" style={styles.centerText}>
          <BrandMark size="lg" />
        </ThemedText>
        <ThemedText type="bodyLg" themeColor="textSecondary" style={styles.centerText}>
          Create your account to start selling.
        </ThemedText>
      </Animated.View>

      <View style={styles.form}>
        <Animated.View entering={stagger(100)}>
          <AuthField
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Jane Doe"
            autoCapitalize="words"
            autoComplete="name"
          />
        </Animated.View>

        <Animated.View entering={stagger(130)}>
          <AuthField
            label="Business name"
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Acme Trading Co."
            autoCapitalize="words"
          />
        </Animated.View>

        <Animated.View entering={stagger(160)}>
          <AuthField
            label="Work email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            keyboardType="email-address"
            autoComplete="email"
          />
        </Animated.View>

        <Animated.View entering={stagger(190)} style={styles.passwordGroup}>
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
          <PasswordStrengthMeter strength={strength} hidden={!!formError} />
        </Animated.View>

        <Animated.View entering={stagger(220)}>
          <Pressable style={styles.checkboxRow} onPress={() => setAgreed((v) => !v)}>
            <View
              style={[
                styles.checkbox,
                { borderColor: theme.border },
                agreed && { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}>
              {agreed && (
                <Animated.View entering={ZoomIn.springify().damping(12)}>
                  <ThemedText style={{ color: theme.onPrimary, fontSize: 12 }}>✓</ThemedText>
                </Animated.View>
              )}
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
        </Animated.View>

        <Animated.View entering={stagger(250)}>
          <PressableScale
            disabled={!canSubmit}
            onPress={handleSubmit}
            style={[
              styles.ctaButton,
              { backgroundColor: fieldsValid || isSubmitting ? theme.primary : theme.backgroundElement },
            ]}>
            {isSubmitting ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <ThemedText
                type="bodyLg"
                style={[styles.emphasisText, { color: fieldsValid ? theme.onPrimary : theme.textSecondary }]}>
                Create account
              </ThemedText>
            )}
          </PressableScale>
        </Animated.View>
      </View>

      <Animated.View entering={stagger(280)}>
        <OrDivider label="or" />
      </Animated.View>

      <Animated.View entering={stagger(310)}>
        <GoogleButton label="Sign up with Google" />
      </Animated.View>

      <Animated.View entering={stagger(340)} style={styles.switcherRow}>
        <ThemedText type="bodySm" themeColor="textSecondary">
          Already have an account?{' '}
        </ThemedText>
        <Pressable onPress={() => router.replace('/login')}>
          <ThemedText type="bodySm" themeColor="primary" style={styles.emphasisText}>
            Log in
          </ThemedText>
        </Pressable>
      </Animated.View>

      <Animated.View entering={stagger(370)} style={styles.trustStrip}>
        <TrustItem label="Bank-level encryption" />
        <TrustItem label="No store changes without approval" />
        <TrustItem label="Cancel anytime" />
      </Animated.View>
    </AuthFormScaffold>
  );
}

/** Animated width/color bar beneath the password field — a visual read of `passwordStrength`, not just the label text. */
function PasswordStrengthMeter({
  strength,
  hidden,
}: {
  strength: { label: string; color: ThemeColor; score: 1 | 2 | 3 } | null;
  hidden: boolean;
}) {
  const theme = useTheme();
  const progress = useSharedValue(0);
  const score = strength?.score ?? 0;

  useEffect(() => {
    progress.value = withTiming(score / 3, { duration: 200 });
  }, [score, progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
    backgroundColor: strength ? theme[strength.color] : theme.border,
  }));

  return (
    <View style={styles.strengthSlot}>
      {!hidden && strength ? (
        <>
          <View style={[styles.strengthTrack, { backgroundColor: theme.backgroundElement }]}>
            <Animated.View style={[styles.strengthFill, barStyle]} />
          </View>
          <ThemedText type="bodySm" themeColor={strength.color}>
            Password strength: {strength.label}
          </ThemedText>
        </>
      ) : null}
    </View>
  );
}

function TrustItem({ label }: { label: string }) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const dotScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      style={styles.trustItem}
      onPressIn={() => {
        scale.value = withSpring(1.08, { damping: 12 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12 });
      }}>
      <Animated.View style={[styles.trustDot, { borderColor: theme.border }, dotScaleStyle]}>
        <ThemedText style={{ fontSize: 10, color: theme.textSecondary }}>✓</ThemedText>
      </Animated.View>
      <ThemedText type="bodySm" themeColor="textSecondary" style={styles.trustLabel}>
        {label}
      </ThemedText>
    </Pressable>
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
  passwordGroup: {
    gap: Spacing.one,
  },
  strengthSlot: {
    minHeight: 20,
    gap: Spacing.half,
  },
  strengthTrack: {
    height: 4,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: Radius.full,
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
