export const FontSize = {
  xs:  11,
  sm:  13,
  base:14,
  md:  15,
  lg:  16,
  xl:  20,
  xxl: 26,
}

export const FontWeight = {
  regular:   '400' as const,
  medium:    '500' as const,
  semibold:  '600' as const,
  bold:      '700' as const,
  extrabold: '800' as const,
}

export const LineHeight = {
  tight:   1.2,
  normal:  1.5,
  relaxed: 1.65,
}

// Font family names after loading with expo-font
export const FontFamily = {
  sans:         'PlusJakartaSans_400Regular',
  sansMedium:   'PlusJakartaSans_500Medium',
  sansSemibold: 'PlusJakartaSans_600SemiBold',
  sansBold:     'PlusJakartaSans_700Bold',
  sansExtrabold:'PlusJakartaSans_800ExtraBold',
  // Fallback before fonts load
  systemSans:   'System',
}
