import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link as RouterLink,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useState } from 'react';
import './App.css';
import Home from './pages/Home';
import CreateEvent from './pages/CreateEvent';
import EventView from './pages/EventView';
import Login from './pages/Login';
import MyEvents from './pages/MyEvents';
import MyTeams from './pages/MyTeams';
import TeamDetails from './pages/TeamDetails';
import UserProfile from './pages/UserProfile';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import Sheet from '@mui/joy/Sheet';
import Stack from '@mui/joy/Stack';
import Link from '@mui/joy/Link';
import IconButton from '@mui/joy/IconButton';
import Drawer from '@mui/joy/Drawer';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemButton from '@mui/joy/ListItemButton';
import Divider from '@mui/joy/Divider';
import Avatar from '@mui/joy/Avatar';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import gnomeIcon from './assets/images/dank-gnome-112.png';

function AppContent() {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <Box className="App">
      <Sheet
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: 'none',
          borderBottom: '2px solid',
          borderColor: 'primary.500',
          bgcolor: 'background.surface',
        }}
      >
        <Link
          component={RouterLink}
          to="/"
          underline="none"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'inherit',
            '&:hover': {
              opacity: 0.8,
            },
          }}
        >
          <img
            src={gnomeIcon}
            alt="Dank Gnome"
            style={{
              width: '32px',
              height: '32px',
              imageRendering: 'pixelated',
            }}
          />
          <Typography level="h3" component="h1">
            Bibzy's Bingo
          </Typography>
        </Link>

        {/* Desktop Navigation */}
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{ display: { xs: 'none', md: 'flex' } }}
        >
          <Link
            component={RouterLink}
            to="/"
            underline="none"
            textColor={isActive('/') ? 'primary.500' : 'text.primary'}
            sx={{
              pb: 0.5,
              borderBottom: '2px solid',
              borderColor: isActive('/') ? 'primary.500' : 'transparent',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'primary.300',
                textColor: 'primary.400',
              },
            }}
          >
            Home
          </Link>
          {isAuthenticated && (
            <>
              <Link
                component={RouterLink}
                to="/my-events"
                underline="none"
                textColor={
                  isActive('/my-events') ? 'primary.500' : 'text.primary'
                }
                sx={{
                  pb: 0.5,
                  borderBottom: '2px solid',
                  borderColor: isActive('/my-events')
                    ? 'primary.500'
                    : 'transparent',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.300',
                    textColor: 'primary.400',
                  },
                }}
              >
                My Events
              </Link>
              <Link
                component={RouterLink}
                to="/my-teams"
                underline="none"
                textColor={
                  isActive('/my-teams') ? 'primary.500' : 'text.primary'
                }
                sx={{
                  pb: 0.5,
                  borderBottom: '2px solid',
                  borderColor: isActive('/my-teams')
                    ? 'primary.500'
                    : 'transparent',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.300',
                    textColor: 'primary.400',
                  },
                }}
              >
                My Teams
              </Link>
              <Link
                component={RouterLink}
                to="/create"
                underline="none"
                textColor={isActive('/create') ? 'primary.500' : 'text.primary'}
                sx={{
                  pb: 0.5,
                  borderBottom: '2px solid',
                  borderColor: isActive('/create')
                    ? 'primary.500'
                    : 'transparent',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.300',
                    textColor: 'primary.400',
                  },
                }}
              >
                Create Event
              </Link>
            </>
          )}
          {isAuthenticated ? (
            <>
              <Link
                component={RouterLink}
                to="/profile"
                underline="none"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  pb: 0.5,
                  borderBottom: '2px solid',
                  borderColor: isActive('/profile')
                    ? 'primary.500'
                    : 'transparent',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.300',
                    '& .MuiTypography-root': {
                      color: 'primary.400',
                    },
                  },
                }}
              >
                {user?.avatarUrl ? (
                  <Avatar
                    src={user.avatarUrl}
                    alt={user.displayName || user.username}
                    size="sm"
                  />
                ) : (
                  <Avatar size="sm">
                    <PersonIcon />
                  </Avatar>
                )}
                <Typography
                  level="body-md"
                  textColor={
                    isActive('/profile') ? 'primary.500' : 'text.primary'
                  }
                >
                  Profile
                </Typography>
              </Link>
              <Button
                onClick={handleLogout}
                variant="outlined"
                color="neutral"
                size="sm"
              >
                Logout
              </Button>
            </>
          ) : (
            <Link component={RouterLink} to="/login" underline="none">
              <Button variant="solid" color="primary" size="sm">
                Login
              </Button>
            </Link>
          )}
        </Stack>

        {/* Mobile Menu Button */}
        <IconButton
          onClick={() => setMobileMenuOpen(true)}
          sx={{ display: { xs: 'flex', md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
      </Sheet>

      {/* Mobile Drawer Menu */}
      <Drawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        anchor="right"
      >
        <Box sx={{ width: 250, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <IconButton onClick={() => setMobileMenuOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <List>
            <ListItem>
              <ListItemButton
                component={RouterLink}
                to="/"
                onClick={handleNavClick}
                selected={isActive('/')}
              >
                Home
              </ListItemButton>
            </ListItem>

            {isAuthenticated && (
              <>
                <ListItem>
                  <ListItemButton
                    component={RouterLink}
                    to="/my-events"
                    onClick={handleNavClick}
                    selected={isActive('/my-events')}
                  >
                    My Events
                  </ListItemButton>
                </ListItem>
                <ListItem>
                  <ListItemButton
                    component={RouterLink}
                    to="/my-teams"
                    onClick={handleNavClick}
                    selected={isActive('/my-teams')}
                  >
                    My Teams
                  </ListItemButton>
                </ListItem>
                <ListItem>
                  <ListItemButton
                    component={RouterLink}
                    to="/profile"
                    onClick={handleNavClick}
                    selected={isActive('/profile')}
                  >
                    My Profile
                  </ListItemButton>
                </ListItem>
                <ListItem>
                  <ListItemButton
                    component={RouterLink}
                    to="/create"
                    onClick={handleNavClick}
                    selected={isActive('/create')}
                  >
                    Create Event
                  </ListItemButton>
                </ListItem>
              </>
            )}

            <Divider sx={{ my: 2 }} />

            {isAuthenticated ? (
              <>
                <ListItem>
                  <Typography
                    level="body-sm"
                    sx={{ color: 'text.secondary', px: 2 }}
                  >
                    Welcome, {user?.username}!
                  </Typography>
                </ListItem>
                <ListItem>
                  <Button
                    onClick={handleLogout}
                    variant="outlined"
                    color="neutral"
                    fullWidth
                  >
                    Logout
                  </Button>
                </ListItem>
              </>
            ) : (
              <ListItem>
                <Button
                  component={RouterLink}
                  to="/login"
                  onClick={handleNavClick}
                  variant="solid"
                  color="primary"
                  fullWidth
                >
                  Login
                </Button>
              </ListItem>
            )}
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateEvent />} />
          <Route path="/event/:id" element={<EventView />} />
          <Route path="/team/:id" element={<TeamDetails />} />
          <Route path="/login" element={<Login />} />
          <Route path="/my-events" element={<MyEvents />} />
          <Route path="/my-teams" element={<MyTeams />} />
          <Route path="/profile" element={<UserProfile />} />
        </Routes>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
