import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import { Theme } from '@astryxdesign/core/theme';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import './app.css';
import { theme } from './theme.js';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Theme theme={theme}>
      <App />
    </Theme>
  </StrictMode>,
);
