import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ManropeFamily, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Mode = 'signup' | 'login';

type PreviewState =
  | 'default'
  | 'filled'
  | 'loading'
  | 'invalid'
  | 'exists'
  | 'offline'
  | 'success';

/**
 * Design-review only: lets a reviewer step through every state in the spec
 * without a backend. Swap for real form validation + API/OAuth calls once
 * those exist, then delete this switcher.
 */
const PREVIEW_STATES: { id: PreviewState; label: string; signupOnly?: boolean }[] = [
  { id: 'default', label: 'Default' },
  { id: 'filled', label: 'Filled' },
  { id: 'loading', label: 'Loading' },
  { id: 'invalid', label: 'Invalid creds' },
  { id: 'exists', label: 'Account exists', signupOnly: true },
  { id: 'offline', label: 'Offline' },
  { id: 'success', label: 'Success' },
];

const DEMO_VALUES = {
  fullName: 'Amina Raza',
  email: 'amina@northstarapparel.com',
  password: 'Corr3ctHorse!',
};

function passwordStrength(password: string): { label: string; color: 'danger' | 'textSecondary' | 'success' } | null {
  if (password.length === 0) return null;
  if (password.length < 8) return { label: 'Weak', color: 'danger' };
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumberOrSymbol = /[0-9\W]/.test(password);
  if (hasMixedCase && hasNumberOrSymbol && password.length >= 10) {
    return { label: 'Strong', color: 'success' };
  }
  return { label: 'Good', color: 'textSecondary' };
}

export default function AuthScreen() {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('signup');
  const [previewState, setPreviewState] = useState<PreviewState>('default');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const isSignup = mode === 'signup';

  function selectPreviewState(next: PreviewState) {
    setPreviewState(next);
    if (next === 'default') {
      setFullName('');
      setEmail('');
      setPassword('');
      setAgreed(false);
    } else {
      setFullName(DEMO_VALUES.fullName);
      setEmail(DEMO_VALUES.email);
      setPassword(DEMO_VALUES.password);
      setAgreed(true);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    if (previewState === 'exists' && next === 'login') {
      selectPreviewState('default');
    }
  }

  const isBusy = previewState === 'loading' || previewState === 'success';
  const ctaDisabled = previewState === 'default' || isBusy;
  const ctaLabel = (() => {
    if (previewState === 'success') return "You're in";
    if (previewState === 'loading') return isSignup ? 'Creating account…' : 'Logging in…';
    return isSignup ? 'Create account' : 'Log in';
  })();

  const hasInvalidError = previewState === 'invalid';
  const hasExistsError = previewState === 'exists' && isSignup;
  const isOffline = previewState === 'offline';
  const strength = isSignup ? passwordStrength(password) : null;

  const ctaBackground =
    previewState === 'success'
      ? theme.success
      : previewState === 'default'
        ? theme.backgroundElement
        : theme.primary;
  const ctaTextColor = previewState === 'default' ? theme.textSecondary : theme.onPrimary;

  return (
    <ThemedView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.flex}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            <View style={styles.content}>
              <View style={styles.logoRow}>
                <View style={[styles.logoMark, { backgroundColor: theme.primary }]}>
                  <ThemedText style={[styles.logoMarkText, { color: theme.onPrimary }]}>
                    T
                  </ThemedText>
                </View>
                <ThemedText type="labelMd">Tijarah AI</ThemedText>
              </View>

              <View style={styles.headerBlock}>
                <ThemedText type="displayLgMobile" style={styles.headline}>
                  {isSignup ? 'Set up your commerce command center' : 'Welcome back'}
                </ThemedText>
                <ThemedText type="bodyLg" themeColor="textSecondary">
                  {isSignup
                    ? 'Your data stays private. Connect stores anytime after setup.'
                    : 'Pick up where you left off.'}
                </ThemedText>
              </View>

              <View style={styles.segmentedControl}>
                <ThemedView
                  type="surfaceContainerLow"
                  style={[styles.segmentedTrack, { borderColor: theme.border }]}>
                  <SegmentButton label="Log in" active={mode === 'login'} onPress={() => switchMode('login')} />
                  <SegmentButton label="Sign up" active={mode === 'signup'} onPress={() => switchMode('signup')} />
                </ThemedView>
              </View>

              {isOffline && (
                <ThemedView type="errorContainer" style={styles.offlineBanner}>
                  <ThemedText type="bodyMd" themeColor="onErrorContainer">
                    You&apos;re offline. Check your connection and try again.
                  </ThemedText>
                </ThemedView>
              )}

              <Pressable
                disabled={isBusy}
                style={({ pressed }) => [
                  styles.googleButton,
                  { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest },
                  pressed && styles.pressed,
                ]}>
                <View style={styles.googleMark}>
                  <ThemedText style={styles.googleMarkText}>G</ThemedText>
                </View>
                <ThemedText type="bodyLg" style={styles.emphasisText}>
                  Continue with Google
                </ThemedText>
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                <ThemedText type="bodySm" themeColor="textSecondary">
                  or continue with email
                </ThemedText>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              </View>

              <View style={styles.form}>
                {isSignup && (
                  <FormField
                    label="Full name"
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Jane Doe"
                    autoComplete="name"
                    editable={!isBusy}
                  />
                )}

                <FormField
                  label={isSignup ? 'Work email' : 'Email'}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@company.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isBusy}
                  error={hasExistsError}
                />
                {hasExistsError && (
                  <ThemedText type="bodySm" themeColor="danger" style={styles.fieldError}>
                    An account already exists with this email.{' '}
                    <ThemedText type="bodySm" themeColor="primary" onPress={() => switchMode('login')}>
                      Log in instead.
                    </ThemedText>
                  </ThemedText>
                )}

                <FormField
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  editable={!isBusy}
                  error={hasInvalidError}
                  rightAdornment={
                    <Pressable onPress={() => setShowPassword((prev) => !prev)} hitSlop={8}>
                      <ThemedText type="bodySm" themeColor="primary">
                        {showPassword ? 'Hide' : 'Show'}
                      </ThemedText>
                    </Pressable>
                  }
                />
                {hasInvalidError && (
                  <ThemedText type="bodySm" themeColor="danger" style={styles.fieldError}>
                    Incorrect email or password.
                  </ThemedText>
                )}

                {isSignup && strength && (
                  <ThemedText type="bodySm" themeColor={strength.color} style={styles.strengthHint}>
                    Password strength: {strength.label}
                  </ThemedText>
                )}

                {isSignup ? (
                  <Pressable
                    style={styles.checkboxRow}
                    onPress={() => setAgreed((prev) => !prev)}
                    disabled={isBusy}>
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
                ) : (
                  <Pressable style={styles.forgotPasswordRow} disabled={isBusy}>
                    <ThemedText type="bodySm" themeColor="primary">
                      Forgot password?
                    </ThemedText>
                  </Pressable>
                )}

                <Pressable
                  disabled={ctaDisabled}
                  style={[styles.ctaButton, { backgroundColor: ctaBackground }]}>
                  {previewState === 'loading' && (
                    <ActivityIndicator size="small" color={theme.onPrimary} style={styles.ctaSpinner} />
                  )}
                  {previewState === 'success' && (
                    <ThemedText style={[styles.ctaCheck, { color: theme.onPrimary }]}>✓</ThemedText>
                  )}
                  <ThemedText type="bodyLg" style={[styles.emphasisText, { color: ctaTextColor }]}>
                    {ctaLabel}
                  </ThemedText>
                </Pressable>
              </View>

              <View style={styles.switcherRow}>
                <ThemedText type="bodySm" themeColor="textSecondary">
                  {isSignup ? 'Already have an account?' : 'New to Tijarah AI?'}{' '}
                </ThemedText>
                <Pressable onPress={() => switchMode(isSignup ? 'login' : 'signup')}>
                  <ThemedText type="bodySm" themeColor="primary">
                    {isSignup ? 'Log in' : 'Sign up'}
                  </ThemedText>
                </Pressable>
              </View>

              {isSignup && (
                <View style={styles.trustStrip}>
                  <TrustItem label="Bank-level encryption" />
                  <TrustItem label="No store changes without approval" />
                  <TrustItem label="Cancel anytime" />
                </View>
              )}
            </View>
          </ScrollView>

          <PreviewSwitcher
            mode={mode}
            value={previewState}
            onChange={selectPreviewState}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.segmentButtonWrapper} onPress={onPress}>
      <ThemedView type={active ? 'surfaceContainerLowest' : undefined} style={styles.segmentButton}>
        <ThemedText type="labelMd" themeColor={active ? 'text' : 'textSecondary'}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words';
  autoComplete?: 'name' | 'email' | 'new-password' | 'current-password';
  editable?: boolean;
  error?: boolean;
  rightAdornment?: ReactNode;
};

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete,
  editable = true,
  error,
  rightAdornment,
}: FormFieldProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error ? theme.danger : isFocused ? theme.primary : theme.border;

  return (
    <View style={styles.fieldGroup}>
      <ThemedText type="bodyMd" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View
        style={[
          styles.inputRow,
          { borderColor, backgroundColor: theme.surfaceContainerLowest },
          isFocused && !error && { shadowColor: theme.primary },
          isFocused && !error && styles.inputFocusGlow,
        ]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[styles.input, { color: theme.text }]}
        />
        {rightAdornment}
      </View>
    </View>
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

function PreviewSwitcher({
  mode,
  value,
  onChange,
}: {
  mode: Mode;
  value: PreviewState;
  onChange: (state: PreviewState) => void;
}) {
  const theme = useTheme();
  const options = PREVIEW_STATES.filter((option) => !option.signupOnly || mode === 'signup');

  return (
    <ThemedView type="surfaceContainerLow" style={[styles.previewSwitcher, { borderTopColor: theme.border }]}>
      <ThemedText type="bodySm" themeColor="textSecondary" style={styles.previewLabel}>
        Preview state (design review only)
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewChips}>
        {options.map((option) => {
          const active = option.id === value;
          return (
            <Pressable
              key={option.id}
              onPress={() => onChange(option.id)}
              style={[
                styles.previewChip,
                { borderColor: theme.border, backgroundColor: theme.surfaceContainerLowest },
                active && { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}>
              <ThemedText type="bodySm" style={{ color: active ? theme.onPrimary : theme.textSecondary }}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
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
    paddingBottom: Spacing.six,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.four,
    gap: Spacing.four,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: Radius.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMarkText: {
    fontFamily: ManropeFamily[700],
    fontWeight: '700',
    fontSize: 14,
  },
  headerBlock: {
    gap: Spacing.two,
  },
  headline: {
    textAlign: 'left',
  },
  emphasisText: {
    fontFamily: ManropeFamily[600],
    fontWeight: '600',
  },
  segmentedControl: {
    alignSelf: 'stretch',
  },
  segmentedTrack: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.half,
  },
  segmentButtonWrapper: {
    flex: 1,
  },
  segmentButton: {
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: Radius.DEFAULT,
  },
  offlineBanner: {
    borderRadius: Radius.DEFAULT,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.DEFAULT,
    paddingVertical: Spacing.three,
  },
  googleMark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#DADCE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleMarkText: {
    color: '#4285F4',
    fontSize: 11,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  form: {
    gap: Spacing.three,
  },
  fieldGroup: {
    gap: Spacing.one,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.DEFAULT,
    paddingHorizontal: Spacing.three,
  },
  inputFocusGlow: {
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.three,
    fontFamily: ManropeFamily[400],
    fontSize: 16,
  },
  fieldError: {
    marginTop: -Spacing.one,
  },
  strengthHint: {
    marginTop: -Spacing.one,
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
  forgotPasswordRow: {
    alignSelf: 'flex-end',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.DEFAULT,
    paddingVertical: Spacing.three,
  },
  ctaSpinner: {
    marginRight: Spacing.one,
  },
  ctaCheck: {
    fontWeight: '700',
  },
  switcherRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
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
  previewSwitcher: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    gap: Spacing.one,
  },
  previewLabel: {},
  previewChips: {
    gap: Spacing.two,
  },
  previewChip: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
});
