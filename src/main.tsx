import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CssVarsProvider, extendTheme } from '@mui/joy/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import { SocketProvider } from './contexts/SocketContext.tsx';

const theme = extendTheme({
  cssVarPrefix: 'joy',
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
  components: {
    JoyCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          border: '2px solid rgba(255, 255, 255, 0.08)',
          backgroundImage: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.02), transparent)',
        },
      },
    },
    JoySheet: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundImage: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.02), transparent)',
        },
      },
    },
    JoyButton: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          transition: 'all 0.15s ease',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
            transform: 'translateY(0)',
          },
        },
      },
    },
    JoyInput: {
      styleOverrides: {
        root: {
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
          border: '2px solid rgba(255, 255, 255, 0.08)',
          '&:focus-within': {
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2), 0 0 0 2px rgba(61, 90, 107, 0.3)',
          },
        },
      },
    },
    JoyTextarea: {
      styleOverrides: {
        root: {
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
          border: '2px solid rgba(255, 255, 255, 0.08)',
          '&:focus-within': {
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2), 0 0 0 2px rgba(61, 90, 107, 0.3)',
          },
        },
      },
    },
    JoyChip: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        },
      },
    },
  },
});

// Set dark mode immediately before React renders
if (typeof window !== 'undefined') {
  localStorage.setItem('joy-mode', 'dark');
  // Set color scheme attribute immediately to prevent flash
  document.documentElement.setAttribute('data-joy-color-scheme', 'dark');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CssVarsProvider
      theme={theme}
      defaultMode="dark"
      modeStorageKey="joy-mode"
      disableTransitionOnChange
      colorSchemeStorageKey="joy-color-scheme"
    >
      <CssBaseline enableColorScheme />
      <SocketProvider>
        <App />
      </SocketProvider>
    </CssVarsProvider>
  </StrictMode>,
);
