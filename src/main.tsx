import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CssVarsProvider, extendTheme } from '@mui/joy/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import { SocketProvider } from './contexts/SocketContext.tsx';

const theme = extendTheme({
  fontFamily: {
    body: '"Roboto", "Segoe UI", sans-serif',
    display: '"Roboto", "Segoe UI", sans-serif',
  },
  colorSchemes: {
    dark: {
      palette: {
        primary: {
          50: '#e8ecef',
          100: '#c5d0d7',
          200: '#9fb1bd',
          300: '#7892a3',
          400: '#5b7a8f',
          500: '#3d5a6b',
          600: '#375263',
          700: '#2f4655',
          800: '#273a48',
          900: '#1a282f',
          solidBg: '#3d5a6b',
          solidHoverBg: '#4a6a7d',
          solidActiveBg: '#2f4655',
          outlinedBorder: '#3d5a6b',
          outlinedColor: '#5a7a8d',
          outlinedHoverBg: 'rgba(61, 90, 107, 0.08)',
          softColor: '#6a8a9d',
          softBg: 'rgba(61, 90, 107, 0.16)',
          softHoverBg: 'rgba(61, 90, 107, 0.24)',
          plainColor: '#5a7a8d',
          plainHoverBg: 'rgba(61, 90, 107, 0.08)',
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
