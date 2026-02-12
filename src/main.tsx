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
      palette: {},
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
