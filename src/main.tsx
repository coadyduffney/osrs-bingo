import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CssVarsProvider, extendTheme } from '@mui/joy/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import { SocketProvider } from './contexts/SocketContext.tsx';

const theme = extendTheme({
  fontFamily: {
    body: '"Runescape", "Courier New", monospace',
    display: '"Runescape", "Courier New", monospace',
  },
  components: {
    JoyCard: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(145deg, #4a4a4a 0%, #2a2a2a 100%)',
          border: '4px ridge #6b5644',
          borderRadius: '4px',
          boxShadow: `
            inset 0 0 20px rgba(0, 0, 0, 0.6),
            0 4px 16px rgba(0, 0, 0, 0.8),
            0 0 0 2px #3a3a3a
          `,
        },
      },
    },
    JoySheet: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(145deg, #3a3a3a 0%, #2a2a2a 100%)',
          border: '3px ridge #5b4a3c',
          boxShadow: `
            inset 0 0 10px rgba(0, 0, 0, 0.5),
            0 2px 8px rgba(0, 0, 0, 0.6)
          `,
        },
      },
    },
    JoyButton: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(145deg, #6b4423 0%, #4a2f18 100%)',
          border: '3px outset #8b5a3c',
          color: '#ffcc00',
          fontFamily: '"Runescape", "Courier New", monospace',
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
          letterSpacing: '0.5px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
          '&:hover': {
            background: 'linear-gradient(145deg, #7b5433 0%, #5a3f28 100%)',
            border: '3px outset #9b6a4c',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.5)',
          },
          '&:active': {
            border: '3px inset #6b4423',
            transform: 'translateY(0)',
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.6)',
          },
        },
      },
    },
    JoyInput: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(145deg, #1a1a1a 0%, #0a0a0a 100%)',
          border: '2px inset #4a4a4a',
          color: '#ffffff',
          fontFamily: '"Courier New", monospace',
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5)',
          '&:focus-within': {
            border: '2px inset #6a6a6a',
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5), 0 0 8px rgba(107, 68, 35, 0.4)',
          },
          '& input': {
            color: '#ffffff',
          },
        },
      },
    },
    JoyTextarea: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(145deg, #1a1a1a 0%, #0a0a0a 100%)',
          border: '2px inset #4a4a4a',
          color: '#ffffff',
          fontFamily: '"Courier New", monospace',
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5)',
          '&:focus-within': {
            border: '2px inset #6a6a6a',
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5), 0 0 8px rgba(107, 68, 35, 0.4)',
          },
          '& textarea': {
            color: '#ffffff',
          },
        },
      },
    },
    JoyChip: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(145deg, #5a4a3a 0%, #3a2a1a 100%)',
          border: '2px outset #7a5a4a',
          color: '#ffcc00',
          fontFamily: '"Runescape", "Courier New", monospace',
          textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
        },
      },
    },
  },
  colorSchemes: {
    dark: {
      palette: {
        background: {
          body: '#1a1a1a',
          surface: '#2a2a2a',
          level1: '#3a3a3a',
          level2: '#4a4a4a',
          level3: '#5a5a5a',
        },
        primary: {
          50: '#fff4cc',
          100: '#ffe699',
          200: '#ffd966',
          300: '#ffcc33',
          400: '#ffcc00',
          500: '#d4a574',
          600: '#b8935f',
          700: '#9c804a',
          800: '#806e35',
          900: '#645b20',
          solidBg: '#6b4423',
          solidHoverBg: '#7b5433',
          solidActiveBg: '#5a3f28',
          outlinedBorder: '#8b5a3c',
          outlinedColor: '#d4a574',
          outlinedHoverBg: 'rgba(107, 68, 35, 0.08)',
          softColor: '#d4a574',
          softBg: 'rgba(107, 68, 35, 0.16)',
          softHoverBg: 'rgba(107, 68, 35, 0.24)',
          plainColor: '#d4a574',
          plainHoverBg: 'rgba(107, 68, 35, 0.08)',
        },
        text: {
          primary: '#d4a574',
          secondary: '#a08060',
          tertiary: '#806e50',
        },
        divider: '#5b4a3c',
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
