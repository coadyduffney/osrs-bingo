import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CssVarsProvider, extendTheme } from '@mui/joy/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import { SocketProvider } from './contexts/SocketContext.tsx';

const theme = extendTheme({
  colorSchemes: {
    dark: {
      palette: {
        primary: {
          solidBg: '#3a5a7a',
          solidHoverBg: '#4a6a8a',
          solidActiveBg: '#2a4a6a',
          outlinedBorder: '#3a5a7a',
          outlinedColor: '#5a8ab8',
          outlinedHoverBg: 'rgba(58, 90, 122, 0.12)',
          softColor: '#7aa8d8',
          softBg: 'rgba(58, 90, 122, 0.16)',
          softHoverBg: 'rgba(58, 90, 122, 0.24)',
          plainColor: '#7aa8d8',
          plainHoverBg: 'rgba(58, 90, 122, 0.12)',
        },
      },
    },
  },
});

// Set dark mode immediately before React renders
if (typeof window !== 'undefined') {
  localStorage.setItem('joy-mode', 'dark');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CssVarsProvider
      theme={theme}
      defaultMode="dark"
      modeStorageKey="joy-mode"
      disableTransitionOnChange
    >
      <CssBaseline />
      <SocketProvider>
        <App />
      </SocketProvider>
    </CssVarsProvider>
  </StrictMode>,
);
