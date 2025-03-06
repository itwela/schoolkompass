const tintColorLight = '#0a7ea480'; // Teal
const tintColorDark = '#3bc1db80'; // Softer teal for dark mode with 50% opacity
const opaqueGreyLight = 'rgba(0, 0, 0, 0.05)'; // Light grey for subtle contrast
const opaqueGreyDark = 'rgba(255, 255, 255, 0.10)'; // Soft white for dark mode contrast

const highlightedColorLight = '#F4A261'; // Warm, orange-tan (Pairs well with teal)
const highlightedColorDark = '#E76F5180'; // Deep coral (Looks great in dark mode)

export const Colors = {
  light: {
    text: '#1B3A4B', // Deep navy for better contrast with white
    background: '#F8F9FA', // Soft white for less strain
    tint: tintColorLight,
    icon: '#6B7280', // Neutral grey
    tabIconDefault: '#94A3B8', // Subtle blue-grey
    tabIconSelected: tintColorLight,
    audioControlTextInactive: '#6B7280',
    audioControlTextActive: '#1B3A4B',
    teal: tintColorLight,
    fadedGrey: opaqueGreyLight,
    highlight: highlightedColorLight
  },
  dark: {
    text: '#EDEDED', // Softer white for readability
    background: '#121417', // Deep charcoal, not pure black
    tint: tintColorDark,
    icon: '#A1A1AA', // Softer grey
    tabIconDefault: '#767676', // Medium grey
    tabIconSelected: tintColorDark,
    audioControlTextInactive: '#A1A1AA',
    audioControlTextActive: '#ffffff',
    teal: tintColorDark,
    fadedGrey: opaqueGreyDark,
    highlight: highlightedColorDark,
  },
};