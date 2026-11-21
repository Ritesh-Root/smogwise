// Neutral theme only. The theme package's fonts.css pulls Google Fonts at runtime, which the strict
// CSP blocks and which would add a third-party request, so the system font stack is used instead.
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import '@astryxdesign/theme-neutral/theme.css';

export const theme = neutralTheme;
