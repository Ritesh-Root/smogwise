import { Theme } from '@astryxdesign/core/theme';
import { render } from '@testing-library/react';
import { theme } from '../theme.js';

/** Render with the design system's theme, as the real app does. */
export const renderWithTheme = (ui) => render(<Theme theme={theme}>{ui}</Theme>);
