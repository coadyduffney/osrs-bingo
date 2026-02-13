import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import Textarea from '@mui/joy/Textarea';
import Stack from '@mui/joy/Stack';
import Alert from '@mui/joy/Alert';

function CreateEvent() {
  const [eventName, setEventName] = useState('');
  const [boardSize, setBoardSize] = useState('5');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setError('You must be logged in to create an event');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await eventsApi.create({
        name: eventName,
        description,
        boardSize
      });

      if (response.success) {
        navigate(`/event/${response.data.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, eventName, description, boardSize, navigate]);

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography level="h1" sx={{ mb: 3 }}>
        Create New Bingo Event
      </Typography>
      
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              {error && (
                <Alert color="danger" variant="soft">
                  {error}
                </Alert>
              )}

              <FormControl required>
                <FormLabel>Event Name</FormLabel>
                <Input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Summer Bingo 2026"
                  disabled={loading}
                  size="lg"
                />
              </FormControl>

              <FormControl required>
                <FormLabel>Board Size</FormLabel>
                <Select
                  value={boardSize}
                  onChange={(_, value) => setBoardSize(value as string)}
                  disabled={loading}
                  size="lg"
                >
                  <Option value="5">5x5 (25 tasks)</Option>
                  <Option value="7">7x7 (49 tasks)</Option>
                  <Option value="9">9x9 (81 tasks)</Option>
                  <Option value="10">10x10 (100 tasks)</Option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Event Description</FormLabel>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your bingo event..."
                  minRows={4}
                  disabled={loading}
                />
              </FormControl>

              <Button
                type="submit"
                size="lg"
                loading={loading}
                disabled={!eventName.trim()}
              >
                Create Event
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}

export default CreateEvent;
