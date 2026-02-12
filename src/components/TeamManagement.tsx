import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { teamsApi, Team } from '../services/api';
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
import Chip from '@mui/joy/Chip';
import Sheet from '@mui/joy/Sheet';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

interface TeamManagementProps {
  eventId: string;
  eventStatus: 'draft' | 'active' | 'completed' | 'cancelled';
  isEventCreator: boolean;
  teams: Team[];
  onTeamCreated: (team: Team) => void;
  onTeamJoined: (team: Team) => void;
}

function TeamManagement({
  eventId,
  eventStatus,
  isEventCreator,
  teams,
  onTeamCreated,
  onTeamJoined,
}: TeamManagementProps) {
  const { user } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinWithCode, setShowJoinWithCode] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const userTeam = teams.find(
    (team) => user && team.memberIds.includes(user.id),
  );

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    setError('');
    setCreating(true);

    try {
      const response = await teamsApi.create({
        eventId,
        name: teamName,
      });

      if (response.success) {
        onTeamCreated(response.data);
        setTeamName('');
        setShowCreateForm(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setError('');
    setJoining(true);

    try {
      const response = await teamsApi.joinWithCode(joinCode.toUpperCase());

      if (response.success) {
        onTeamJoined(response.data);
        setJoinCode('');
        setShowJoinWithCode(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid join code');
    } finally {
      setJoining(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Failed to copy team code:', err);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography level="h3">Teams ({teams.length})</Typography>
        {/* Only show create/join buttons if event is active OR user is event creator */}
        {!showCreateForm &&
          !showJoinWithCode &&
          !userTeam &&
          (eventStatus === 'active' || isEventCreator) && (
            <Stack direction="row" spacing={1}>
              <Button
                onClick={() => setShowJoinWithCode(true)}
                size="sm"
                variant="outlined"
              >
                Join with Code
              </Button>
              <Button onClick={() => setShowCreateForm(true)} size="sm">
                + Create Team
              </Button>
            </Stack>
          )}
      </Box>

      {/* Show draft warning for non-creators */}
      {eventStatus === 'draft' && !isEventCreator && !userTeam && (
        <Alert variant="soft" color="warning" sx={{ mb: 2 }}>
          <Typography level="body-sm">
            This event is still in draft mode. Teams will be available once the
            event creator publishes it.
          </Typography>
        </Alert>
      )}

      {/* Show draft info for creators */}
      {eventStatus === 'draft' && isEventCreator && (
        <Alert variant="soft" color="primary" sx={{ mb: 2 }}>
          <Typography level="body-sm">
            <strong>Draft Mode:</strong> You can create and manage teams, but
            other users won't be able to join until you publish the event.
          </Typography>
        </Alert>
      )}

      {userTeam && (
        <Alert color="primary" variant="soft" sx={{ mb: 2 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Stack spacing={0.5}>
              <Typography>
                ✅ You are in team: <strong>{userTeam.name}</strong>
              </Typography>
              {userTeam.captainId === user?.id && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography level="body-sm">Team Join Code:</Typography>
                  <Chip
                    color="success"
                    variant="solid"
                    size="sm"
                    onClick={() => handleCopyCode(userTeam.joinCode)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'scale(1.05)',
                        transition: 'transform 0.2s',
                      },
                    }}
                    endDecorator={
                      copiedCode ? <CheckIcon /> : <ContentCopyIcon />
                    }
                  >
                    {userTeam.joinCode}
                  </Chip>
                  <Typography level="body-xs" sx={{ color: 'text.secondary' }}>
                    {copiedCode ? 'Copied!' : 'Click to copy'}
                  </Typography>
                </Stack>
              )}
            </Stack>
            <Button
              component={RouterLink}
              to={`/team/${userTeam.id}`}
              size="sm"
              variant="outlined"
            >
              View Team
            </Button>
          </Box>
        </Alert>
      )}

      {!userTeam &&
        teams.length > 0 &&
        !showCreateForm &&
        !showJoinWithCode && (
          <Alert variant="soft" color="primary" sx={{ mb: 2 }}>
            <Box>
              <Typography level="title-sm" sx={{ mb: 0.5 }}>
                👋 You're not in a team yet!
              </Typography>
              <Typography level="body-sm">
                Create your own team, or ask a team captain for their join code
                and use "Join with Code" button above.
              </Typography>
            </Box>
          </Alert>
        )}

      {error && (
        <Alert color="danger" variant="soft" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {showCreateForm && (
        <Sheet variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 'md' }}>
          <form onSubmit={handleCreateTeam}>
            <Stack spacing={2}>
              <Typography level="title-md">Create New Team</Typography>
              <FormControl required>
                <FormLabel>Team Name</FormLabel>
                <Input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter team name"
                  disabled={creating}
                />
              </FormControl>
              <Stack direction="row" spacing={1}>
                <Button
                  type="submit"
                  loading={creating}
                  disabled={!teamName.trim()}
                >
                  Create
                </Button>
                <Button
                  variant="outlined"
                  color="neutral"
                  onClick={() => {
                    setShowCreateForm(false);
                    setTeamName('');
                    setError('');
                  }}
                  disabled={creating}
                >
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </form>
        </Sheet>
      )}

      {showJoinWithCode && (
        <Sheet
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 'sm',
            mb: 2,
          }}
        >
          <form onSubmit={handleJoinWithCode}>
            <Stack spacing={2}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography level="title-lg">Join Team with Code</Typography>
                <Button
                  onClick={() => {
                    setShowJoinWithCode(false);
                    setJoinCode('');
                    setError('');
                  }}
                  size="sm"
                  variant="plain"
                >
                  Cancel
                </Button>
              </Box>
              <FormControl required>
                <FormLabel>Team Join Code</FormLabel>
                <Input
                  value={joinCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().slice(0, 6);
                    setJoinCode(val);
                  }}
                  placeholder="Enter 6-character code"
                  slotProps={{
                    input: {
                      style: {
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        fontSize: '1.1em',
                      },
                    },
                  }}
                />
              </FormControl>
              {error && (
                <Alert color="danger" variant="soft" size="sm">
                  {error}
                </Alert>
              )}
              <Button
                type="submit"
                loading={joining}
                disabled={joinCode.length !== 6}
              >
                Join Team
              </Button>
            </Stack>
          </form>
        </Sheet>
      )}

      {teams.length === 0 ? (
        <Card variant="outlined">
          <CardContent>
            <Typography
              level="body-md"
              sx={{ textAlign: 'center', py: 2, color: 'text.tertiary' }}
            >
              No teams yet. Create the first team!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={1.5}>
          {teams.map((team) => {
            const isUserInTeam = user && team.memberIds.includes(user.id);
            const isCaptain = team.captainId === user?.id;

            return (
              <Card
                key={team.id}
                variant={isUserInTeam ? 'soft' : 'outlined'}
                color={isUserInTeam ? 'primary' : 'neutral'}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                    }}
                  >
                    <Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 0.5,
                        }}
                      >
                        <Typography level="title-lg">{team.name}</Typography>
                        {isCaptain && (
                          <Chip size="sm" color="warning" variant="soft">
                            👑 Captain
                          </Chip>
                        )}
                        {isUserInTeam && !isCaptain && (
                          <Chip size="sm" color="primary" variant="soft">
                            Your Team
                          </Chip>
                        )}
                      </Box>
                      {team.description && (
                        <Typography
                          level="body-sm"
                          sx={{ mb: 1, color: 'text.secondary' }}
                        >
                          {team.description}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                        <Chip size="sm" variant="outlined" startDecorator="🏆">
                          Score: {team.score}
                        </Chip>
                        <Chip size="sm" variant="outlined" startDecorator="👥">
                          {team.memberIds.length}{' '}
                          {team.memberIds.length === 1 ? 'member' : 'members'}
                        </Chip>
                        <Chip size="sm" variant="outlined" startDecorator="✅">
                          {team.completedTaskIds.length} completed
                        </Chip>
                      </Stack>
                    </Box>

                    <Box
                      sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
                    >
                      {isUserInTeam ? (
                        <Button
                          component={RouterLink}
                          to={`/team/${team.id}`}
                          size="sm"
                          variant="outlined"
                        >
                          View Details
                        </Button>
                      ) : (
                        <Chip size="sm" variant="soft" color="neutral">
                          🔒 Code Required
                        </Chip>
                      )}
                    </Box>
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

export default TeamManagement;
