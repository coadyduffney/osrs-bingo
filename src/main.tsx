import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CssVarsProvider, extendTheme } from '@mui/joy/styles';
import CssBaseline from '@mui/joy/CssBaseline';
import { SocketProvider } from './contexts/SocketContext.tsx';

// OSRS Wiki Dark Mode Inspired Theme
const theme = extendTheme({
  colorSchemes: {
    dark: {
      palette: {
        // Wiki's signature blue-grey primary
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
        // Success with OSRS green tones
        success: {
          solidBg: '#4a7a3a',
          solidHoverBg: '#5a8a4a',
          softColor: '#6aa85a',
          softBg: 'rgba(74, 122, 58, 0.16)',
        },
        // Warning with OSRS orange/yellow
        warning: {
          solidBg: '#9a7a3a',
          solidHoverBg: '#aa8a4a',
          softColor: '#c8a86a',
          softBg: 'rgba(154, 122, 58, 0.16)',
        },
        // Danger with muted red
        danger: {
          solidBg: '#8a3a3a',
          solidHoverBg: '#9a4a4a',
          softColor: '#b85a5a',
          softBg: 'rgba(138, 58, 58, 0.16)',
        },
        // Wiki's dark blue-grey backgrounds
        background: {
          body: '#1a1a1f',
          surface: '#25252b',
          level1: '#2d2d35',
          level2: '#35353d',
          level3: '#3d3d45',
          popup: '#2d2d35',
        },
        // Neutral greys with blue tint - brightened for better visibility
        neutral: {
          50: '#1a1a1f',
          100: '#25252b',
          200: '#2d2d35',
          300: '#3d3d45',
          400: '#4d4d55',
          500: '#7d7d85',
          600: '#9d9da5',
          700: '#bdbdc5',
          800: '#d5d5dd',
          900: '#e5e5ea',
          plainColor: '#c8c8d0',
          plainHoverBg: 'rgba(109, 109, 117, 0.12)',
          outlinedBorder: '#4d4d55',
          outlinedColor: '#bdbdc5',
        },
        // Text colors similar to Wiki - brightened for better readability
        text: {
          primary: '#e5e5ea',
          secondary: '#c8c8d0',
          tertiary: '#adadb5',
        },
        divider: '#3d3d45',
      },
    },
    light: {
      palette: {
        primary: {
          solidBg: '#3a5a7a',
          solidHoverBg: '#2a4a6a',
          solidActiveBg: '#1a3a5a',
          outlinedBorder: '#3a5a7a',
          outlinedColor: '#3a5a7a',
          outlinedHoverBg: 'rgba(58, 90, 122, 0.08)',
          softColor: '#2a4a6a',
          softBg: 'rgba(58, 90, 122, 0.12)',
          softHoverBg: 'rgba(58, 90, 122, 0.16)',
          plainColor: '#3a5a7a',
          plainHoverBg: 'rgba(58, 90, 122, 0.08)',
        },
        background: {
          surface: '#fafafa',
          level1: '#f5f5f7',
          level2: '#ededef',
        },
      },
    },
  },
  fontFamily: {
    body: '"Roboto", "Segoe UI", sans-serif',
    display: '"Roboto", "Segoe UI", sans-serif',
  },
  typography: {
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
  },
  components: {
    JoyButton: {
      styleOverrides: {
        root: {
          borderRadius: '4px',
          fontWeight: 500,
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
          '&.Mui-disabled': {
            opacity: 0.4,
            color: '#6d6d75 !important',
            backgroundColor: '#2d2d35 !important',
            borderColor: '#3d3d45 !important',
            cursor: 'not-allowed',
            pointerEvents: 'auto',
          },
        },
      },
    },
    JoyCard: {
      styleOverrides: {
        root: {
          borderRadius: '4px',
          border: '1px solid var(--joy-palette-divider)',
        },
      },
    },
    JoyChip: {
      styleOverrides: {
        root: {
          borderRadius: '4px',
        },
      },
    },
    JoyInput: {
      styleOverrides: {
        root: {
          '--Input-placeholderOpacity': 0.7,
          borderRadius: '4px',
        },
        input: {
          '&::placeholder': {
            color: '#c8c8d0',
            opacity: 0.8,
          },
        },
      },
    },
    JoyBadge: {
      styleOverrides: {
        root: {
          '--Badge-ringColor': 'transparent',
        },
        badge: {
          fontWeight: 600,
          fontSize: '0.75rem',
        },
      },
    },
    JoyFormLabel: {
      styleOverrides: {
        root: {
          color: '#c8c8d0',
          fontWeight: 500,
        },
      },
    },
    JoySelect: {
      styleOverrides: {
        root: {
          borderRadius: '4px',
        },
        button: {
          '&::placeholder': {
            color: '#c8c8d0',
            opacity: 0.8,
          },
        },
        listbox: {
          backgroundColor: 'var(--joy-palette-background-level1)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
          border: '1px solid var(--joy-palette-divider)',
          borderRadius: '4px',
        },
      },
    },
    JoyList: {
      styleOverrides: {
        root: {
          backgroundColor: 'var(--joy-palette-background-level1)',
          borderRadius: '4px',
        },
      },
    },
    JoyMenu: {
      styleOverrides: {
        root: {
          '--List-padding': '4px',
          '--ListItem-minHeight': '36px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
          backgroundColor: 'var(--joy-palette-background-level1)',
          border: '1px solid var(--joy-palette-divider)',
          borderRadius: '4px',
        },
      },
    },
    JoyMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: '4px',
          margin: '2px 4px',
          transition: 'all 0.15s ease',
          '&:hover': {
            backgroundColor: '#4a6a8a !important',
            color: '#ffffff !important',
          },
          '&.Mui-selected': {
            backgroundColor: 'var(--joy-palette-primary-softBg)',
            color: 'var(--joy-palette-primary-softColor)',
            '&:hover': {
              backgroundColor: '#4a6a8a !important',
              color: '#ffffff !important',
            },
          },
        },
      },
    },
    JoyOption: {
      styleOverrides: {
        root: {
          borderRadius: '4px',
          margin: '2px 4px',
          transition: 'all 0.15s ease',
          '&:hover': {
            backgroundColor: '#4a6a8a !important',
            color: '#ffffff !important',
          },
          '&.Mui-selected': {
            backgroundColor: 'var(--joy-palette-primary-softBg)',
            color: 'var(--joy-palette-primary-softColor)',
            fontWeight: 600,
            '&:hover': {
              backgroundColor: '#4a6a8a !important',
              color: '#ffffff !important',
            },
          },
        },
      },
    },
    JoyTabs: {
      styleOverrides: {
        root: {
          borderRadius: '4px',
          backgroundColor: 'transparent',
        },
      },
    },
    JoyTab: {
      styleOverrides: {
        root: {
          borderRadius: '4px',
          fontWeight: 500,
          color: '#e5e5ea !important',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(58, 90, 122, 0.12)',
            color: '#e5e5ea !important',
          },
          '&.Mui-selected': {
            backgroundColor: 'var(--joy-palette-primary-softBg)',
            color: 'var(--joy-palette-primary-softColor) !important',
            fontWeight: 600,
            '&:hover': {
              backgroundColor: 'var(--joy-palette-primary-softHoverBg)',
              color: '#e5e5ea !important',
            },
          },
        },
      },
    },
    JoyTabList: {
      styleOverrides: {
        root: {
          borderRadius: '4px',
          backgroundColor: 'var(--joy-palette-background-level1)',
          padding: '4px',
          gap: '4px',
        },
      },
    },
    JoyModal: {
      styleOverrides: {
        backdrop: {
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
        },
      },
    },
    JoyModalDialog: {
      styleOverrides: {
        root: {
          borderRadius: '4px',
          boxShadow: '0 12px 48px rgba(0, 0, 0, 0.8)',
          border: '1px solid var(--joy-palette-divider)',
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
