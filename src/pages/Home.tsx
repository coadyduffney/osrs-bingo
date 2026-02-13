import { useState, useEffect, useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { eventsApi, Event } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Stack from '@mui/joy/Stack';
import Chip from '@mui/joy/Chip';
import CircularProgress from '@mui/joy/CircularProgress';
import Alert from '@mui/joy/Alert';
import FormControl from '@mui/joy/FormControl';
import Input from '@mui/joy/Input';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';

function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await eventsApi.getAll();
        if (response.success) {
          // Only show active events on the home page (filter out drafts)
          const activeEvents = response.data.filter(
            (event) => event.status === 'active',
          );
          setEvents(activeEvents);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'draft':
        return 'neutral';
      case 'completed':
        return 'primary';
      case 'cancelled':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  // Filter and sort events (memoized)
  const filteredAndSortedEvents = useMemo(() => events
    .filter((event) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          event.name.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      // Sort logic
      switch (sortBy) {
        case 'newest':
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case 'oldest':
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    }), [events, searchQuery, sortBy]);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography level="h1" sx={{ mb: 3 }}>
        Welcome to Bibzy's Bingo
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography level="h3" sx={{ mb: 1 }}>
            {isAuthenticated
              ? 'Create and Manage Clan Bingo Events'
              : 'Join Clan Bingo Events'}
          </Typography>
          <Typography level="body-md" sx={{ mb: 2 }}>
            {isAuthenticated
              ? 'Organize competitive bingo-style events for your Old School RuneScape clan. Create custom task lists, invite teams, and track progress in real-time.'
              : 'Browse active bingo events below and login to join a team! Compete with others in fun OSRS challenges.'}
          </Typography>
          {isAuthenticated ? (
            <Button component={RouterLink} to="/create" size="lg">
              Create New Event
            </Button>
          ) : (
            <Stack direction="row" spacing={2}>
              <Button component={RouterLink} to="/login" size="lg">
                Login to Join
              </Button>
              <Button
                component={RouterLink}
                to="/login"
                size="lg"
                variant="outlined"
              >
                Register
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Typography level="h3">
              {events.filter((e) => e.status === 'active').length > 0
                ? 'Active Events'
                : 'Recent Events'}
            </Typography>
            <Chip
              size="sm"
              variant="soft"
              color="neutral"
              startDecorator={<FilterListIcon />}
            >
              {filteredAndSortedEvents.length} event
              {filteredAndSortedEvents.length !== 1 ? 's' : ''}
            </Chip>
          </Box>

          {/* Search and Sort Controls */}
          <Stack spacing={2} sx={{ mb: 3 }}>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
              <FormControl sx={{ flex: 1, minWidth: 200 }}>
                <Input
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  startDecorator={<SearchIcon />}
                  endDecorator={
                    searchQuery && (
                      <Button
                        size="sm"
                        variant="plain"
                        color="neutral"
                        onClick={() => setSearchQuery('')}
                      >
                        Clear
                      </Button>
                    )
                  }
                />
              </FormControl>
              <FormControl sx={{ minWidth: 150 }}>
                <Select
                  value={sortBy}
                  onChange={(_, value) =>
                    setSortBy(value as 'newest' | 'oldest' | 'name')
                  }
                  startDecorator={<FilterListIcon />}
                >
                  <Option value="newest">Newest First</Option>
                  <Option value="oldest">Oldest First</Option>
                  <Option value="name">Name (A-Z)</Option>
                </Select>
              </FormControl>
            </Stack>
          </Stack>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert color="danger" variant="soft">
              {error}
            </Alert>
          )}

          {!loading && events.length === 0 && (
            <Typography
              level="body-md"
              sx={{ textAlign: 'center', py: 4, color: 'text.tertiary' }}
            >
              No events yet.{' '}
              {isAuthenticated ? 'Create the first one!' : 'Check back later!'}
            </Typography>
          )}

          {!loading &&
            filteredAndSortedEvents.length === 0 &&
            events.length > 0 && (
              <Typography
                level="body-md"
                sx={{ textAlign: 'center', py: 4, color: 'text.tertiary' }}
              >
                No events match your search. Try a different query.
              </Typography>
            )}

          {!loading && filteredAndSortedEvents.length > 0 && (
            <Stack spacing={2}>
              {filteredAndSortedEvents.map((event) => (
                <Card
                  key={event.id}
                  variant="outlined"
                  sx={{
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: 'primary.500',
                      transform: 'translateY(-2px)',
                      boxShadow: 'md',
                    },
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        mb: 1,
                      }}
                    >
                      <Typography level="h4" component="h3">
                        {event.name}
                      </Typography>
                      <Chip
                        color={getStatusColor(event.status)}
                        size="sm"
                        variant="soft"
                      >
                        {event.status}
                      </Chip>
                    </Box>
                    <Typography
                      level="body-sm"
                      sx={{ mb: 1, color: 'text.secondary' }}
                    >
                      {event.description || 'No description'}
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{ mt: 1.5, mb: 2 }}>
                      <Chip size="sm" variant="outlined">
                        📊 {event.boardSize}x{event.boardSize}
                      </Chip>
                      <Chip size="sm" variant="outlined">
                        📅 {new Date(event.createdAt).toLocaleDateString()}
                      </Chip>
                    </Stack>
                    <Button
                      component={RouterLink}
                      to={`/event/${event.id}`}
                      size="sm"
                      fullWidth
                      variant={event.status === 'active' ? 'solid' : 'outlined'}
                    >
                      View Event
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default Home;
