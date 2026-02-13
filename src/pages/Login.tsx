import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import FormControl from '@mui/joy/FormControl';
import Input from '@mui/joy/Input';
import Stack from '@mui/joy/Stack';
import Checkbox from '@mui/joy/Checkbox';

function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        await register(username, email, password);
      } else {
        await login(username, password);
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `
          linear-gradient(90deg, #3a3a3a 0px, transparent 1px),
          linear-gradient(180deg, #3a3a3a 0px, transparent 1px),
          linear-gradient(180deg, #2d2d2d 0%, #1a1a1a 100%)
        `,
        backgroundSize: '60px 60px, 60px 60px, 100% 100%',
        backgroundPosition: '0 0, 0 0, 0 0',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 59px,
              rgba(0, 0, 0, 0.3) 59px,
              rgba(0, 0, 0, 0.3) 60px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 59px,
              rgba(0, 0, 0, 0.3) 59px,
              rgba(0, 0, 0, 0.3) 60px
            ),
            repeating-linear-gradient(
              0deg,
              rgba(80, 70, 60, 0.1) 0px,
              rgba(60, 50, 40, 0.1) 30px,
              rgba(80, 70, 60, 0.1) 60px
            )
          `,
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.4) 100%)',
          pointerEvents: 'none',
        },
      }}
    >
      {/* Left Torch */}
      <Box
        sx={{
          position: 'absolute',
          left: { xs: '8%', md: '15%' },
          top: '25%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Flame */}
        <Box
          sx={{
            fontSize: '8rem',
            filter: 'drop-shadow(0 0 40px #ff6600)',
            animation: 'flicker 2s infinite',
            '@keyframes flicker': {
              '0%, 100%': { 
                opacity: 0.9, 
                transform: 'scale(1) translateY(0px)',
                filter: 'drop-shadow(0 0 40px #ff6600) drop-shadow(0 0 80px #ff4400)',
              },
              '50%': { 
                opacity: 1, 
                transform: 'scale(1.1) translateY(-3px)',
                filter: 'drop-shadow(0 0 60px #ff6600) drop-shadow(0 0 120px #ff4400)',
              },
            },
          }}
        >
          🔥
        </Box>
        {/* Torch Handle */}
        <Box
          sx={{
            width: '28px',
            height: '240px',
            background: 'linear-gradient(90deg, #3d2817 0%, #5a3d2a 50%, #3d2817 100%)',
            border: '2px solid #2d1f12',
            borderRadius: '6px',
            boxShadow: 'inset 0 0 5px rgba(0, 0, 0, 0.5), 2px 2px 4px rgba(0, 0, 0, 0.6)',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '-16px',
              left: '-14px',
              width: '56px',
              height: '38px',
              background: 'linear-gradient(145deg, #4a3520 0%, #3a2510 100%)',
              border: '2px solid #2d1f12',
              borderRadius: '50% 50% 0 0',
              boxShadow: 'inset 0 -2px 4px rgba(0, 0, 0, 0.4)',
            },
          }}
        />
      </Box>

      {/* Right Torch */}
      <Box
        sx={{
          position: 'absolute',
          right: { xs: '8%', md: '15%' },
          top: '25%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Flame */}
        <Box
          sx={{
            fontSize: '8rem',
            filter: 'drop-shadow(0 0 40px #ff6600)',
            animation: 'flicker 2s infinite 1s',
          }}
        >
          🔥
        </Box>
        {/* Torch Handle */}
        <Box
          sx={{
            width: '28px',
            height: '240px',
            background: 'linear-gradient(90deg, #3d2817 0%, #5a3d2a 50%, #3d2817 100%)',
            border: '2px solid #2d1f12',
            borderRadius: '6px',
            boxShadow: 'inset 0 0 5px rgba(0, 0, 0, 0.5), 2px 2px 4px rgba(0, 0, 0, 0.6)',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '-16px',
              left: '-14px',
              width: '56px',
              height: '38px',
              background: 'linear-gradient(145deg, #4a3520 0%, #3a2510 100%)',
              border: '2px solid #2d1f12',
              borderRadius: '50% 50% 0 0',
              boxShadow: 'inset 0 -2px 4px rgba(0, 0, 0, 0.4)',
            },
          }}
        />
      </Box>

      {/* Login Box */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '420px',
          mx: 2,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Stone border frame */}
        <Box
          sx={{
            background: 'linear-gradient(145deg, #4a4a4a 0%, #2a2a2a 100%)',
            border: '6px ridge #6b5644',
            borderRadius: '4px',
            boxShadow: `
              inset 0 0 20px rgba(0, 0, 0, 0.6),
              0 8px 32px rgba(0, 0, 0, 0.8),
              0 0 0 2px #3a3a3a,
              0 0 0 4px #5a5a5a
            `,
            p: 4,
          }}
        >
          {/* Title */}
          <Typography
            level="h3"
            sx={{
              textAlign: 'center',
              mb: 3,
              fontFamily: '"Runescape", "Courier New", monospace',
              color: '#ffcc00',
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), 0 0 10px rgba(255, 204, 0, 0.3)',
              fontSize: '1.8rem',
              fontWeight: 'bold',
              letterSpacing: '1px',
            }}
          >
            {isRegistering ? 'Create New Account' : 'Welcome to Bibzy\'s Bingo'}
          </Typography>

          {/* Subtitle */}
          <Typography
            level="body-sm"
            sx={{
              textAlign: 'center',
              mb: 3,
              color: '#d4a574',
              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
              fontFamily: '"Runescape", "Courier New", monospace',
            }}
          >
            {isRegistering ? 'Fill in your details below' : 'Enter your username & password'}
          </Typography>

          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              {error && (
                <Box
                  sx={{
                    background: 'linear-gradient(145deg, #8b0000 0%, #6b0000 100%)',
                    border: '2px solid #a00000',
                    borderRadius: '3px',
                    p: 1.5,
                    textAlign: 'center',
                  }}
                >
                  <Typography
                    level="body-sm"
                    sx={{
                      color: '#ffcccc',
                      textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                      fontFamily: '"Runescape", "Courier New", monospace',
                    }}
                  >
                    {error}
                  </Typography>
                </Box>
              )}

              {/* Username */}
              <FormControl required>
                <Typography
                  level="body-sm"
                  sx={{
                    mb: 0.5,
                    color: '#d4a574',
                    fontFamily: '"Runescape", "Courier New", monospace',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                    fontWeight: 'bold',
                  }}
                >
                  Username:
                </Typography>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  sx={{
                    background: 'linear-gradient(145deg, #1a1a1a 0%, #0a0a0a 100%)',
                    border: '2px inset #4a4a4a',
                    color: '#ffffff',
                    fontFamily: '"Courier New", monospace',
                    '&:focus-within': {
                      border: '2px inset #6a6a6a',
                    },
                    '& input': {
                      color: '#ffffff',
                    },
                  }}
                />
              </FormControl>

              {/* Email for registration */}
              {isRegistering && (
                <FormControl required>
                  <Typography
                    level="body-sm"
                    sx={{
                      mb: 0.5,
                      color: '#d4a574',
                      fontFamily: '"Runescape", "Courier New", monospace',
                      textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                      fontWeight: 'bold',
                    }}
                  >
                    Email:
                  </Typography>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    sx={{
                      background: 'linear-gradient(145deg, #1a1a1a 0%, #0a0a0a 100%)',
                      border: '2px inset #4a4a4a',
                      color: '#ffffff',
                      fontFamily: '"Courier New", monospace',
                      '&:focus-within': {
                        border: '2px inset #6a6a6a',
                      },
                      '& input': {
                        color: '#ffffff',
                      },
                    }}
                  />
                </FormControl>
              )}

              {/* Password */}
              <FormControl required>
                <Typography
                  level="body-sm"
                  sx={{
                    mb: 0.5,
                    color: '#d4a574',
                    fontFamily: '"Runescape", "Courier New", monospace',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                    fontWeight: 'bold',
                  }}
                >
                  Password:
                </Typography>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  sx={{
                    background: 'linear-gradient(145deg, #1a1a1a 0%, #0a0a0a 100%)',
                    border: '2px inset #4a4a4a',
                    color: '#ffffff',
                    fontFamily: '"Courier New", monospace',
                    '&:focus-within': {
                      border: '2px inset #6a6a6a',
                    },
                    '& input': {
                      color: '#ffffff',
                    },
                  }}
                />
              </FormControl>

              {/* Remember me checkbox - only for login */}
              {!isRegistering && (
                <Checkbox
                  label="Remember username"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  sx={{
                    color: '#d4a574',
                    '& .MuiCheckbox-label': {
                      fontFamily: '"Runescape", "Courier New", monospace',
                      textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                    },
                  }}
                />
              )}

              {/* Login/Register Button */}
              <Button
                type="submit"
                fullWidth
                loading={loading}
                disabled={loading}
                sx={{
                  mt: 1,
                  py: 1.5,
                  background: 'linear-gradient(145deg, #6b4423 0%, #4a2f18 100%)',
                  border: '3px outset #8b5a3c',
                  color: '#ffcc00',
                  fontFamily: '"Runescape", "Courier New", monospace',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                  letterSpacing: '1px',
                  '&:hover': {
                    background: 'linear-gradient(145deg, #7b5433 0%, #5a3f28 100%)',
                    border: '3px outset #9b6a4c',
                  },
                  '&:active': {
                    border: '3px inset #6b4423',
                  },
                }}
              >
                {isRegistering ? 'Create Account' : 'Login'}
              </Button>

              {/* Toggle between login/register */}
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography
                  level="body-sm"
                  sx={{
                    color: '#d4a574',
                    fontFamily: '"Runescape", "Courier New", monospace',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                  }}
                >
                  {isRegistering ? 'Already have an account?' : "Don't have an account?"}
                </Typography>
                <Button
                  variant="plain"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError('');
                  }}
                  disabled={loading}
                  sx={{
                    mt: 0.5,
                    color: '#ffcc00',
                    fontFamily: '"Runescape", "Courier New", monospace',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
                    textDecoration: 'underline',
                    '&:hover': {
                      color: '#ffdd44',
                      background: 'transparent',
                    },
                  }}
                >
                  {isRegistering ? 'Click here to login' : 'Click here to register'}
                </Button>
              </Box>
            </Stack>
          </form>
        </Box>
      </Box>
    </Box>
  );
}

export default Login;
