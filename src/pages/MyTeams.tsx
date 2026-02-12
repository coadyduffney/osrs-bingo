import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { teamsApi, Team } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Stack from '@mui/joy/Stack';
import Chip from '@mui/joy/Chip';
import CircularProgress from '@mui/joy/CircularProgress';
import Alert from '@mui/joy/Alert';
import Avatar from '@mui/joy/Avatar';
import AvatarGroup from '@mui/joy/AvatarGroup';

function MyTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchMyTeams = async () => {
      try {
        setLoading(true);
        const response = await teamsApi.getMyTeams();
        
        if (response.success) {
          setTeams(response.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load teams');
      } finally {
        setLoading(false);
      }
    };

    fetchMyTeams();
  }, [user]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      <Typography level="h1" sx={{ mb: 3 }}>
        My Teams
      </Typography>

      {error && (
        <Alert color="danger" variant="soft" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {teams.length === 0 ? (
        <Card variant="outlined">
          <CardContent>
            <Typography level="body-md" sx={{ textAlign: 'center', py: 4, color: 'text.tertiary' }}>
              You haven't joined any teams yet. Browse events and join a team to get started!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {teams.map((team) => {
            const isCaptain = team.captainId === user?.id;
            
            return (
              <Card
                key={team.id}
                variant="outlined"
                component={RouterLink}
                to={`/team/${team.id}`}
                sx={{
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.500',
                    transform: 'translateY(-2px)',
                    boxShadow: 'md'
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography level="h4">
                        {team.name}
                      </Typography>
                      {isCaptain && (
                        <Chip size="sm" color="warning" variant="soft">
                          👑 Captain
                        </Chip>
                      )}
                    </Box>
                    <Chip color="success" size="sm" variant="soft">
                      Score: {team.score}
                    </Chip>
                  </Box>
                  
                  {team.description && (
                    <Typography level="body-sm" sx={{ mb: 1, color: 'text.secondary' }}>
                      {team.description}
                    </Typography>
                  )}
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Stack direction="row" spacing={2}>
                      <Chip size="sm" variant="outlined" startDecorator="👥">
                        {team.memberIds.length} {team.memberIds.length === 1 ? 'member' : 'members'}
                      </Chip>
                      <Chip size="sm" variant="outlined" startDecorator="✅">
                        {team.completedTaskIds.length} completed
                      </Chip>
                    </Stack>
                    
                    <AvatarGroup size="sm">
                      {team.memberIds.slice(0, 3).map((_, idx) => (
                        <Avatar key={idx} />
                      ))}
                      {team.memberIds.length > 3 && (
                        <Avatar>+{team.memberIds.length - 3}</Avatar>
                      )}
                    </AvatarGroup>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}

export default MyTeams;
