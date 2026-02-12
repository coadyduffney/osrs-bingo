import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import Stack from '@mui/joy/Stack';
import Alert from '@mui/joy/Alert';
import Link from '@mui/joy/Link';

function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <Box sx={{ maxWidth: 450, mx: 'auto', p: 3, pt: 6 }}>
      <Typography level="h2" component="h1" sx={{ mb: 3, textAlign: 'center' }}>
        {isRegistering ? 'Create Account' : 'Welcome Back'}
      </Typography>
      
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {error && (
                <Alert color="danger" variant="soft">
                  {error}
                </Alert>
              )}

              <FormControl required>
                <FormLabel>Username</FormLabel>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  disabled={loading}
                />
              </FormControl>

              {isRegistering && (
                <FormControl required>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email"
                    disabled={loading}
                  />
                </FormControl>
              )}

              <FormControl required>
                <FormLabel>Password</FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  disabled={loading}
                />
              </FormControl>

              <Button
                type="submit"
                fullWidth
                loading={loading}
                size="lg"
              >
                {isRegistering ? 'Register' : 'Login'}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography level="body-sm">
                  {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <Link
                    component="button"
                    type="button"
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      setError('');
                    }}
                    disabled={loading}
                  >
                    {isRegistering ? 'Login' : 'Register'}
                  </Link>
                </Typography>
              </Box>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Login;
