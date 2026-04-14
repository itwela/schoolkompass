// hooks/useThemeColor.ts
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const { theme } = useTheme();
  const colorFromProps = props[theme];
  if (colorFromProps) return colorFromProps;
  return Colors[theme][colorName];
}
