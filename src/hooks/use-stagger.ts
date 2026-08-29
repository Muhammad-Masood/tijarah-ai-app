import { FadeInDown, useReducedMotion } from 'react-native-reanimated';

/**
 * Shared staggered fade/slide-in entrance used across the `(auth)` screens
 * (welcome, login, signup) — skipped in place when the OS reduce-motion
 * setting is on. Extracted from `welcome.tsx`'s original local
 * implementation so login/signup can reuse the same entrance feel.
 */
export function useStagger() {
  const reduceMotion = useReducedMotion();
  return (delay: number) =>
    reduceMotion ? undefined : FadeInDown.delay(delay).duration(420).springify().damping(16);
}

export type Stagger = ReturnType<typeof useStagger>;
