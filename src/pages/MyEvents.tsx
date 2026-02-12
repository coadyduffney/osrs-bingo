import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { eventsApi, Event } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Stack from '@mui/joy/Stack';
import Chip from '@mui/joy/Chip';
import CircularProgress from '@mui/joy/CircularProgress';
import Alert from '@mui/joy/Alert';
import Divider from '@mui/joy/Divider';
import FormControl from '@mui/joy/FormControl';
import Input from '@mui/joy/Input';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import Button from '@mui/joy/Button';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';

function MyEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchMyEvents = async () => {
      try {
        setLoading(true);
        const response = await eventsApi.getMyEvents();

        if (response.success) {
          setEvents(response.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchMyEvents();
  }, [user]);

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

  // Filter and sort events
  const filteredAndSortedEvents = events
    .filter((event) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !event.name.toLowerCase().includes(query) &&
          !event.description?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      // Status filter
      if (statusFilter !== 'all' && event.status !== statusFilter) {
        return false;
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
    });

  const activeEvents = filteredAndSortedEvents.filter(
    (e) => e.status === 'active' || e.status === 'draft',
  );
  const pastEvents = filteredAndSortedEvents.filter(
    (e) => e.status === 'completed' || e.status === 'cancelled',
  );

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      <Typography level="h1" sx={{ mb: 1 }}>
        My Events
      </Typography>

      <Typography level="body-md" sx={{ mb: 3, color: 'text.secondary' }}>
        Events you have created and manage. Draft events are only visible to you
        - publish them to make them available on the home page. To participate
        in events, join a team on the event page.
      </Typography>

      {error && (
        <Alert color="danger" variant="soft" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Search and Filter Controls */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1,
              }}
            >
              <Typography level="title-lg">Filter Events</Typography>
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
                  value={statusFilter}
                  onChange={(_, value) => setStatusFilter(value as string)}
                  startDecorator={<FilterListIcon />}
                >
                  <Option value="all">All Status</Option>
                  <Option value="active">Active</Option>
                  <Option value="draft">Draft</Option>
                  <Option value="completed">Completed</Option>
                  <Option value="cancelled">Cancelled</Option>
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 150 }}>
                <Select
                  value={sortBy}
                  onChange={(_, value) =>
                    setSortBy(value as 'newest' | 'oldest' | 'name')
                  }
                >
                  <Option value="newest">Newest First</Option>
                  <Option value="oldest">Oldest First</Option>
                  <Option value="name">Name (A-Z)</Option>
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* No results message */}
      {!loading &&
        events.length > 0 &&
        filteredAndSortedEvents.length === 0 && (
          <Alert color="neutral" variant="soft" sx={{ mb: 3 }}>
            No events match your filters. Try adjusting your search or filters.
          </Alert>
        )}

      {/* Active/Draft Events */}
      <Box sx={{ mb: 4 }}>
        <Typography level="h3" sx={{ mb: 2 }}>
          Active & Draft Events ({activeEvents.length})
        </Typography>
        {activeEvents.length === 0 &&
        filteredAndSortedEvents.length === 0 &&
        events.length === 0 ? (
          <Card variant="outlined">
            <CardContent>
              <Typography
                level="body-md"
                sx={{ textAlign: 'center', py: 2, color: 'text.tertiary' }}
              >
                No active events. Create a new event to get started!
              </Typography>
            </CardContent>
          </Card>
        ) : activeEvents.length === 0 ? (
          <Card variant="outlined">
            <CardContent>
              <Typography
                level="body-md"
                sx={{ textAlign: 'center', py: 2, color: 'text.tertiary' }}
              >
                No active events match your filters.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={2}>
            {activeEvents.map((event) => (
              <Card
                key={event.id}
                variant="outlined"
                component={RouterLink}
                to={`/event/${event.id}`}
                sx={{
                  textDecoration: 'none',
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
                    <Typography level="h4">{event.name}</Typography>
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
                  <Stack direction="row" spacing={2}>
                    <Chip size="sm" variant="outlined">
                      📊 {event.boardSize}x{event.boardSize}
                    </Chip>
                    <Chip size="sm" variant="outlined">
                      📅 {new Date(event.createdAt).toLocaleDateString()}
                    </Chip>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <>
          <Divider sx={{ my: 4 }} />
          <Box>
            <Typography level="h3" sx={{ mb: 2 }}>
              Past Events ({pastEvents.length})
            </Typography>
            <Stack spacing={2}>
              {pastEvents.map((event) => (
                <Card
                  key={event.id}
                  variant="outlined"
                  component={RouterLink}
                  to={`/event/${event.id}`}
                  sx={{
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    opacity: 0.8,
                    '&:hover': {
                      opacity: 1,
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
                      <Typography level="h4">{event.name}</Typography>
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
                    <Stack direction="row" spacing={2}>
                      <Chip size="sm" variant="outlined">
                        📊 {event.boardSize}x{event.boardSize}
                      </Chip>
                      <Chip size="sm" variant="outlined">
                        📅 {new Date(event.createdAt).toLocaleDateString()}
                      </Chip>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        </>
      )}
    </Box>
  );
}

export default MyEvents;
