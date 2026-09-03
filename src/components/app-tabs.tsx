import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Icon, Label, VectorIcon } from 'expo-router';

export default function AppTabs() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

  return (
    <NativeTabs
      tabBarRespectsIMEInsets={true}
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.primary } }}>
      <NativeTabs.Trigger name="index">
        <Label>Home</Label>
        <Icon src={require('@/assets/images/tabIcons/home.png')} selectedColor={colors.primary} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="insights">
        <Label>Insights</Label>
        <Icon
          sf="chart.line.uptrend.xyaxis"
          src={<VectorIcon family={MaterialCommunityIcons} name="chart-line" />}
          selectedColor={colors.primary}
        />
      </NativeTabs.Trigger>

      {/* Center nav item — visually raised/prominent per the Home dashboard
          spec, not a plain tab. The OS-rendered native tab bar doesn't
          support a physically floating item through this API, so the
          available distinction is a dedicated glyph + a constant (not just
          selected-state) brand tint — see app-tabs.web.tsx for the fully
          custom raised-button treatment web's tab bar allows. */}
      <NativeTabs.Trigger name="ask-tijarah">
        <Label>Ask Tijarah</Label>
        <Icon
          sf="sparkles"
          src={<VectorIcon family={MaterialCommunityIcons} name="creation" />}
          selectedColor={colors.primary}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="products">
        <Label>Products</Label>
        <Icon
          sf="bag"
          src={<VectorIcon family={MaterialCommunityIcons} name="package-variant-closed" />}
          selectedColor={colors.primary}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="more">
        <Label>More</Label>
        <Icon
          sf="ellipsis"
          src={<VectorIcon family={MaterialCommunityIcons} name="dots-horizontal" />}
          selectedColor={colors.primary}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}   