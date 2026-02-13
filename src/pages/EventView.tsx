import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useParams,
  Link as RouterLink,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import BingoBoard from '../components/BingoBoard';
import TeamManagement from '../components/TeamManagement';
import ImageUpload from '../components/ImageUpload';
import Leaderboard from '../components/Leaderboard';
import FireworksEffect from '../components/FireworksEffect';
import {
  eventsApi,
  teamsApi,
  tasksApi,
  authApi,
  Event,
  Team,
  Task,
  TaskCompletion,
  User,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { uploadVerificationImageWithFallback } from '../utils/imageUpload';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Stack from '@mui/joy/Stack';
import Chip from '@mui/joy/Chip';
import Tooltip from '@mui/joy/Tooltip';
import CircularProgress from '@mui/joy/CircularProgress';
import Alert from '@mui/joy/Alert';
import Tabs from '@mui/joy/Tabs';
import TabList from '@mui/joy/TabList';
import Tab from '@mui/joy/Tab';
import TabPanel from '@mui/joy/TabPanel';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import Textarea from '@mui/joy/Textarea';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ImageIcon from '@mui/icons-material/Image';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import ModalClose from '@mui/joy/ModalClose';
import Snackbar from '@mui/joy/Snackbar';

function EventView() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { socket, isConnected, joinEvent, leaveEvent } = useSocket();
  const [event, setEvent] = useState<Event | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<Map<string, User[]>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [showDeleteTaskConfirm, setShowDeleteTaskConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);
  const [showWelcomeAlert, setShowWelcomeAlert] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showCompleteTaskModal, setShowCompleteTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [fireworksTrigger, setFireworksTrigger] = useState(0);
  const [taskCompletions, setTaskCompletions] = useState<TaskCompletion[]>([]);
  const [loadingCompletions, setLoadingCompletions] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [verificationImage, setVerificationImage] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | undefined>(
    undefined,
  );
  const [verificationNote, setVerificationNote] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [showVerificationImageModal, setShowVerificationImageModal] =
    useState(false);
  const [verificationImageToView, setVerificationImageToView] = useState<
    string | null
  >(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    points: 1,
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    color: 'success' | 'danger' | 'warning';
  }>({
    open: false,
    message: '',
    color: 'success',
  });
  const [submitting, setSubmitting] = useState(false);

  // Check if user arrived via join code
  useEffect(() => {
    const state = location.state as {
      joinedViaCode?: boolean;
      eventName?: string;
    } | null;
    if (state?.joinedViaCode) {
      setShowWelcomeAlert(true);
      // Clear the state so it doesn't show again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    const fetchEventData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const [eventResponse, teamsResponse, tasksResponse] = await Promise.all(
          [
            eventsApi.getById(id),
            teamsApi.getByEvent(id),
            tasksApi.getByEvent(id),
          ],
        );

        if (eventResponse.success) {
          setEvent(eventResponse.data);
        }
        if (teamsResponse.success) {
          setTeams(teamsResponse.data);
        }
        if (tasksResponse.success) {
          setTasks(tasksResponse.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [id]);

  // Fetch team members for leaderboard
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (teams.length === 0) {
        setTeamMembers(new Map());
        return;
      }

      try {
        // Collect all unique member IDs from all teams
        const allMemberIds = new Set<string>();
        teams.forEach((team) => {
          team.memberIds.forEach((memberId) => allMemberIds.add(memberId));
        });

        // Fetch all users in one batch
        const userIdsArray = Array.from(allMemberIds);
        if (userIdsArray.length === 0) {
          setTeamMembers(new Map());
          return;
        }

        const usersResponse = await authApi.getUsersByIds(userIdsArray);
        if (usersResponse.success) {
          const usersById = new Map(
            usersResponse.data.map((user) => [user.id, user]),
          );

          // Build Map<teamId, User[]>
          const membersMap = new Map<string, User[]>();
          teams.forEach((team) => {
            const members = team.memberIds
              .map((id) => usersById.get(id))
              .filter((user): user is User => user !== undefined);
            membersMap.set(team.id, members);
          });

          setTeamMembers(membersMap);
        }
      } catch (err) {
        console.error('Failed to fetch team members:', err);
      }
    };

    fetchTeamMembers();
  }, [teams]);

  // Socket.IO real-time updates
  useEffect(() => {
    if (!id || !socket) return;

    // Join the event room
    joinEvent(id);

    // Listen for task completions
    const handleTaskCompleted = async (data: {
      task: Task;
      teamId: string;
    }) => {
      console.log('Task completed (real-time):', data);

      // Update tasks list
      setTasks((prev) =>
        prev.map((t) => (t.id === data.task.id ? data.task : t)),
      );

      // Refresh teams to update scores
      try {
        const teamsResponse = await teamsApi.getByEvent(id);
        if (teamsResponse.success) {
          setTeams(teamsResponse.data);
        }
      } catch (err) {
        console.error('Failed to refresh teams:', err);
      }

      // Show notification
      const completingTeam = teams.find((t) => t.id === data.teamId);
      if (completingTeam) {
        setSnackbar({
          open: true,
          message: `${completingTeam.name} completed "${data.task.title}"!`,
          color: 'success',
        });
        // Trigger fireworks celebration!
        setFireworksTrigger(prev => prev + 1);
      }
    };

    socket.on('task-completed', handleTaskCompleted);

    // Cleanup
    return () => {
      socket.off('task-completed', handleTaskCompleted);
      leaveEvent(id);
    };
  }, [id, socket, joinEvent, leaveEvent, teams]);

  const handleTeamCreated = useCallback((newTeam: Team) => {
    setTeams(prev => [...prev, newTeam]);
  }, []);

  const handleTeamJoined = useCallback((updatedTeam: Team) => {
    setTeams(prev => prev.map((t) => (t.id === updatedTeam.id ? updatedTeam : t)));
  }, []);

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || selectedPosition === null) return;

    try {
      setSubmitting(true);

      if (isEditingTask && taskToEdit) {
        // Update existing task
        const response = await tasksApi.update(taskToEdit.id, {
          title: taskForm.title,
          description: taskForm.description,
          points: taskForm.points,
        });

        if (response.success) {
          // Update tasks list
          setTasks((prev) =>
            prev.map((t) => (t.id === taskToEdit.id ? response.data : t)),
          );
          setShowAddTaskModal(false);
          setTaskForm({ title: '', description: '', points: 1 });
          setSelectedPosition(null);
          setIsEditingTask(false);
          setTaskToEdit(null);
        }
      } else {
        // Create new task
        const response = await tasksApi.create({
          eventId: id,
          title: taskForm.title,
          description: taskForm.description,
          points: taskForm.points,
          position: selectedPosition,
        });

        if (response.success) {
          // Update tasks list
          setTasks([
            ...tasks.filter((t) => t.position !== selectedPosition),
            response.data,
          ]);
          setShowAddTaskModal(false);
          setTaskForm({ title: '', description: '', points: 1 });
          setSelectedPosition(null);
        }
      }
    } catch (err) {
      console.error('Failed to save task:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!id || !event) return;
    setShowDeleteConfirm(false);

    try {
      setDeleting(true);
      await eventsApi.delete(id);
      // Redirect to My Events page after successful deletion
      navigate('/my-events');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
      setDeleting(false);
    }
  };

  const handleCopyCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  }, []);

  const handlePublishEvent = async () => {
    if (!id || !event) return;

    try {
      setPublishing(true);
      const response = await eventsApi.publish(id);
      if (response.success) {
        setEvent(response.data);
        setError('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish event');
    } finally {
      setPublishing(false);
    }
  };

  const handleTaskClick = async (position: number, task?: Task) => {
    if (task) {
      setSelectedTask(task);
      setShowCompleteTaskModal(true);

      // Fetch task completions to show who completed it
      setLoadingCompletions(true);
      try {
        const response = await tasksApi.getCompletions(task.id);
        if (response.success) {
          setTaskCompletions(response.data);
        }
      } catch (err) {
        console.error('Failed to load task completions:', err);
        setTaskCompletions([]);
      } finally {
        setLoadingCompletions(false);
      }
    } else if (isEventCreator) {
      // Event creator can add a task to empty position
      setSelectedPosition(position);
      setShowAddTaskModal(true);
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedTask || !event) return;

    // Find user's team
    const userTeam = teams.find(
      (team) => user && team.memberIds.includes(user.id),
    );

    if (!userTeam) {
      setError('You must be in a team to complete tasks');
      setShowCompleteTaskModal(false);
      return;
    }

    // Check if team already completed this task
    if (selectedTask.completedByTeamIds.includes(userTeam.id)) {
      setError('Your team has already completed this task');
      setShowCompleteTaskModal(false);
      return;
    }

    try {
      setCompleting(true);

      // Upload verification image if provided
      let verificationData;
      if (verificationImage && user) {
        try {
          const { url, path, provider } =
            await uploadVerificationImageWithFallback(
              verificationImage,
              event.id,
              selectedTask.id,
              userTeam.id,
              user.id,
              (progress) => setUploadProgress(progress),
            );

          console.log(`Image uploaded successfully via ${provider}`);

          verificationData = {
            verificationImageUrl: url,
            verificationImagePath: path,
            verificationNote: verificationNote || undefined,
          };
        } catch (uploadError) {
          throw new Error(
            `Image upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`,
          );
        }
      }

      const response = await tasksApi.complete(
        selectedTask.id,
        userTeam.id,
        verificationData,
      );

      if (response.success) {
        // Update tasks list with the completed task
        const updatedTasks = tasks.map((t: Task) =>
          t.id === selectedTask.id ? response.data : t,
        );

        setTasks(updatedTasks);

        // Refresh teams to update scores
        const teamsResponse = await teamsApi.getByEvent(event!.id);
        if (teamsResponse.success) {
          const updatedTeams = teamsResponse.data;
          setTeams(updatedTeams);
        }

        // Reset form
        setShowCompleteTaskModal(false);
        setSelectedTask(null);
        setVerificationImage(null);
        setVerificationNote('');
        setUploadProgress(undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete task');
    } finally {
      setCompleting(false);
    }
  };

  const isEventCreator = user?.id === event?.creatorId;

  // Find user's team for this event (memoized to prevent recalculation)
  const userTeam = useMemo(
    () => teams.find((team) => user && team.memberIds.includes(user.id)),
    [teams, user]
  );

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
        <CircularProgress size="lg" />
      </Box>
    );
  }

  if (error || !event) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
        <Alert color="danger" variant="soft" sx={{ mb: 2 }}>
          {error || 'Event not found'}
        </Alert>
        <Button component={RouterLink} to="/">
          Back to Home
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: 3 }}>
      {/* Connection Status Indicator */}
      {!isConnected && (
        <Alert color="warning" variant="soft" sx={{ mb: 2 }}>
          <Typography level="body-sm">
            ⚠️ Disconnected from live updates. Reconnecting...
          </Typography>
        </Alert>
      )}

      {/* Welcome Alert for users who joined via code */}
      {showWelcomeAlert && isAuthenticated && (
        <Alert
          color="success"
          variant="soft"
          sx={{ mb: 3 }}
          endDecorator={
            <Button
              size="sm"
              variant="plain"
              onClick={() => setShowWelcomeAlert(false)}
            >
              Dismiss
            </Button>
          }
        >
          <Box>
            <Typography level="title-md" sx={{ mb: 0.5 }}>
              🎉 Welcome to {event?.name}!
            </Typography>
            <Typography level="body-sm">
              You've successfully found this event. To participate, create your
              own team or join an existing team below in the Teams tab.
            </Typography>
          </Box>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert
          color="danger"
          variant="soft"
          sx={{ mb: 3 }}
          endDecorator={
            <Button size="sm" variant="plain" onClick={() => setError('')}>
              Dismiss
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Event Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start',
              mb: 2,
            }}
          >
            <Box>
              <Typography level="h1" sx={{ mb: 1 }}>
                {event.name}
              </Typography>
              <Typography level="body-md" sx={{ color: 'text.secondary' }}>
                {event.description || 'No description provided'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="start">
              <Chip
                color={getStatusColor(event.status)}
                size="lg"
                variant="soft"
              >
                {event.status}
              </Chip>
              {isEventCreator && (
                <Stack direction="row" spacing={1}>
                  {event.status === 'draft' && (
                    <Button
                      color="success"
                      variant="solid"
                      size="sm"
                      onClick={handlePublishEvent}
                      loading={publishing}
                    >
                      Publish Event
                    </Button>
                  )}
                  <Button
                    color="danger"
                    variant="outlined"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    loading={deleting}
                  >
                    Delete Event
                  </Button>
                </Stack>
              )}
            </Stack>
          </Box>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Chip variant="outlined" startDecorator="📊">
              {event.boardSize}x{event.boardSize} Board
            </Chip>
            <Chip variant="outlined" startDecorator="👥">
              {teams.length} {teams.length === 1 ? 'Team' : 'Teams'}
            </Chip>
            <Chip variant="outlined" startDecorator="📋">
              {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'}
            </Chip>
          </Stack>

          {/* Draft Event Notice */}
          {isEventCreator && event.status === 'draft' && (
            <Alert variant="soft" color="warning" sx={{ mt: 2 }}>
              <Stack spacing={0.5}>
                <Typography level="title-sm">📝 Draft Event</Typography>
                <Typography level="body-sm">
                  This event is in draft mode and only visible to you. Click
                  "Publish Event" to make it available on the home page for
                  everyone to discover and join.
                </Typography>
              </Stack>
            </Alert>
          )}

          {/* Event Join Code */}
          {isEventCreator && (
            <Alert variant="soft" color="success" sx={{ mt: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography level="body-sm" fontWeight="bold">
                  Event Join Code:
                </Typography>
                <Chip
                  color="success"
                  variant="solid"
                  size="lg"
                  onClick={() => handleCopyCode(event.joinCode)}
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
                  {event.joinCode}
                </Chip>
                <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                  {copiedCode ? 'Copied!' : 'Click to copy'}
                </Typography>
              </Stack>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Board and Teams */}
      <Tabs defaultValue={0} sx={{ bgcolor: 'transparent' }}>
        <TabList>
          <Tab>Bingo Board</Tab>
          <Tab>Teams</Tab>
          <Tab>Leaderboard</Tab>
        </TabList>

        {/* Bingo Board Tab */}
        <TabPanel value={0} sx={{ p: 0, pt: 2 }}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography level="h3">
                  Bingo Board ({event.boardSize}x{event.boardSize})
                </Typography>
                {isEventCreator && (
                  <Alert variant="soft" color="primary" size="sm">
                    Click on any cell to add or edit a task
                  </Alert>
                )}
              </Box>
              <BingoBoard
                size={event.boardSize}
                tasks={tasks}
                teams={teams}
                onCellClick={handleTaskClick}
                userTeamId={userTeam?.id}
              />
            </CardContent>
          </Card>
        </TabPanel>

        {/* Teams Tab */}
        <TabPanel value={1} sx={{ p: 0, pt: 2 }}>
          <Card>
            <CardContent>
              {isAuthenticated ? (
                <TeamManagement
                  eventId={id!}
                  eventStatus={event.status}
                  isEventCreator={isEventCreator}
                  teams={teams}
                  onTeamCreated={handleTeamCreated}
                  onTeamJoined={handleTeamJoined}
                />
              ) : (
                <Box>
                  <Alert variant="soft" color="primary" sx={{ mb: 3 }}>
                    <Stack
                      direction="row"
                      spacing={2}
                      alignItems="center"
                      sx={{ width: '100%' }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography level="title-md" sx={{ mb: 0.5 }}>
                          Want to join this event?
                        </Typography>
                        <Typography level="body-sm">
                          Login or register to create or join a team and start
                          competing!
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button
                          component={RouterLink}
                          to="/login"
                          size="sm"
                          variant="solid"
                        >
                          Login
                        </Button>
                        <Button
                          component={RouterLink}
                          to="/login"
                          size="sm"
                          variant="outlined"
                        >
                          Register
                        </Button>
                      </Stack>
                    </Stack>
                  </Alert>

                  <Typography level="h3" sx={{ mb: 2 }}>
                    Teams ({teams.length})
                  </Typography>

                  {teams.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <Typography
                        level="body-lg"
                        sx={{ color: 'text.tertiary', mb: 2 }}
                      >
                        👥 No teams yet
                      </Typography>
                      <Typography
                        level="body-sm"
                        sx={{ color: 'text.tertiary' }}
                      >
                        Be the first to create a team by logging in!
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <Stack spacing={2} sx={{ mb: 3 }}>
                        {teams.map((team) => (
                          <Card key={team.id} variant="outlined">
                            <CardContent>
                              <Typography level="title-lg" sx={{ mb: 1 }}>
                                {team.name}
                              </Typography>
                              {team.description && (
                                <Typography
                                  level="body-sm"
                                  sx={{ mb: 1, color: 'text.secondary' }}
                                >
                                  {team.description}
                                </Typography>
                              )}
                              <Stack direction="row" spacing={2}>
                                <Chip
                                  size="sm"
                                  variant="outlined"
                                  startDecorator="🏆"
                                >
                                  Score: {team.score}
                                </Chip>
                                <Chip
                                  size="sm"
                                  variant="outlined"
                                  startDecorator="👥"
                                >
                                  {team.memberIds.length}{' '}
                                  {team.memberIds.length === 1
                                    ? 'member'
                                    : 'members'}
                                </Chip>
                                <Chip
                                  size="sm"
                                  variant="outlined"
                                  startDecorator="✅"
                                >
                                  {team.completedTaskIds.length} completed
                                </Chip>
                              </Stack>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    </>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* Leaderboard Tab */}
        <TabPanel value={2} sx={{ p: 0, pt: 2 }}>
          <Card>
            <CardContent>
              <Leaderboard teams={teams} members={teamMembers} />
            </CardContent>
          </Card>
        </TabPanel>
      </Tabs>

      {/* Add/Edit Task Modal */}
      <Modal
        open={showAddTaskModal}
        onClose={() => {
          setShowAddTaskModal(false);
          setIsEditingTask(false);
          setTaskToEdit(null);
        }}
      >
        <ModalDialog sx={{ minWidth: 500 }}>
          <ModalClose />
          <Typography level="h4" sx={{ mb: 2 }}>
            {isEditingTask ? 'Edit Task' : 'Add Task'}
            {!isEditingTask &&
              selectedPosition !== null &&
              ` - Position ${selectedPosition + 1}`}
          </Typography>
          <form onSubmit={handleSubmitTask}>
            <Stack spacing={2}>
              <FormControl required>
                <FormLabel>Task Title</FormLabel>
                <Input
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, title: e.target.value })
                  }
                  placeholder="e.g., Get 99 Fishing"
                  size="lg"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description (optional)</FormLabel>
                <Textarea
                  value={taskForm.description}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, description: e.target.value })
                  }
                  placeholder="Additional details about this task..."
                  minRows={3}
                />
              </FormControl>
              <FormControl required>
                <FormLabel>Points</FormLabel>
                <Input
                  type="number"
                  value={taskForm.points}
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      points: parseInt(e.target.value) || 1,
                    })
                  }
                  slotProps={{ input: { min: 1, max: 100 } }}
                />
              </FormControl>
              <Stack
                direction="row"
                spacing={2}
                sx={{ justifyContent: 'flex-end' }}
              >
                <Button
                  variant="outlined"
                  color="neutral"
                  onClick={() => {
                    setShowAddTaskModal(false);
                    setIsEditingTask(false);
                    setTaskToEdit(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={submitting}
                  disabled={!taskForm.title}
                >
                  {isEditingTask ? 'Update Task' : 'Add Task'}
                </Button>
              </Stack>
            </Stack>
          </form>
        </ModalDialog>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
      >
        <ModalDialog variant="outlined" role="alertdialog">
          <Typography level="h4" component="h2">
            Confirm Deletion
          </Typography>
          <Typography level="body-md" sx={{ mt: 1 }}>
            Are you sure you want to delete <strong>"{event?.name}"</strong>?
          </Typography>
          <Typography level="body-sm" sx={{ mt: 1, color: 'text.secondary' }}>
            This will permanently delete the event, all teams, and all tasks.
            This action cannot be undone.
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 3 }}
            justifyContent="flex-end"
          >
            <Button
              variant="plain"
              color="neutral"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              color="danger"
              onClick={handleDeleteEvent}
              loading={deleting}
            >
              Delete Event
            </Button>
          </Stack>
        </ModalDialog>
      </Modal>

      {/* Delete Task Confirmation Modal */}
      <Modal
        open={showDeleteTaskConfirm}
        onClose={() => {
          setShowDeleteTaskConfirm(false);
          setTaskToDelete(null);
        }}
      >
        <ModalDialog variant="outlined" role="alertdialog">
          <Typography level="h4" component="h2">
            Confirm Task Deletion
          </Typography>
          <Typography level="body-md" sx={{ mt: 1 }}>
            Are you sure you want to delete{' '}
            <strong>"{taskToDelete?.title}"</strong>?
          </Typography>
          <Typography level="body-sm" sx={{ mt: 1, color: 'text.secondary' }}>
            This will permanently delete the task and all completion records.
            This action cannot be undone.
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 3 }}
            justifyContent="flex-end"
          >
            <Button
              variant="plain"
              color="neutral"
              onClick={() => {
                setShowDeleteTaskConfirm(false);
                setTaskToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              color="danger"
              onClick={async () => {
                if (!taskToDelete) return;

                setDeletingTask(true);
                try {
                  await tasksApi.delete(taskToDelete.id);
                  setTasks((prev) =>
                    prev.filter((t) => t.id !== taskToDelete.id),
                  );
                  setShowDeleteTaskConfirm(false);
                  setTaskToDelete(null);
                  setSnackbar({
                    open: true,
                    message: 'Task deleted successfully',
                    color: 'success',
                  });
                } catch (error) {
                  console.error('Error deleting task:', error);
                  setSnackbar({
                    open: true,
                    message: 'Failed to delete task',
                    color: 'danger',
                  });
                } finally {
                  setDeletingTask(false);
                }
              }}
              loading={deletingTask}
            >
              Delete Task
            </Button>
          </Stack>
        </ModalDialog>
      </Modal>

      {/* Task Completion Modal */}
      <Modal
        open={showCompleteTaskModal}
        onClose={() => {
          setShowCompleteTaskModal(false);
          setSelectedTask(null);
          setTaskCompletions([]);
        }}
      >
        <ModalDialog variant="outlined" sx={{ minWidth: 400 }}>
          <ModalClose />
          <Typography level="h4" component="h2">
            Complete Task
          </Typography>
          {selectedTask && (
            <Box sx={{ mt: 2 }}>
              <Stack spacing={2}>
                <Box>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 1,
                    }}
                  >
                    <Typography level="title-lg">
                      {selectedTask.title}
                    </Typography>
                    {isEventCreator && (
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="sm"
                          variant="outlined"
                          color="neutral"
                          onClick={() => {
                            setTaskToEdit(selectedTask);
                            setIsEditingTask(true);
                            setTaskForm({
                              title: selectedTask.title,
                              description: selectedTask.description,
                              points: selectedTask.points,
                            });
                            setSelectedPosition(selectedTask.position);
                            setShowCompleteTaskModal(false);
                            setShowAddTaskModal(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outlined"
                          color="danger"
                          onClick={() => {
                            setTaskToDelete(selectedTask);
                            setShowCompleteTaskModal(false);
                            setShowDeleteTaskConfirm(true);
                          }}
                        >
                          Delete
                        </Button>
                      </Stack>
                    )}
                  </Box>
                  {selectedTask.description && (
                    <Typography
                      level="body-sm"
                      sx={{ color: 'text.secondary' }}
                    >
                      {selectedTask.description}
                    </Typography>
                  )}
                </Box>

                <Stack direction="row" spacing={2}>
                  <Chip color="primary" variant="soft" startDecorator="🏆">
                    {selectedTask.points}{' '}
                    {selectedTask.points === 1 ? 'point' : 'points'}
                  </Chip>
                  {selectedTask.completedByTeamIds.length > 0 && (
                    <Tooltip
                      title={
                        selectedTask.completedByTeamIds.length > 0
                          ? `Completed by: ${selectedTask.completedByTeamIds
                              .map(
                                (teamId) =>
                                  teams.find((t) => t.id === teamId)?.name,
                              )
                              .filter(Boolean)
                              .join(', ')}`
                          : ''
                      }
                      placement="top"
                      arrow
                    >
                      <Chip color="success" variant="soft" startDecorator="✅">
                        {selectedTask.completedByTeamIds.length}{' '}
                        {selectedTask.completedByTeamIds.length === 1
                          ? 'team'
                          : 'teams'}{' '}
                        completed
                      </Chip>
                    </Tooltip>
                  )}
                </Stack>

                {/* Show YOUR team's completion status prominently */}
                {userTeam &&
                  selectedTask.completedByTeamIds.includes(userTeam.id) && (
                    <Box>
                      <Alert variant="soft" color="success" size="sm">
                        <Typography level="body-sm" fontWeight="600">
                          ✓ Your team ({userTeam.name}) has already completed
                          this task!
                        </Typography>
                      </Alert>
                      {!loadingCompletions &&
                        (() => {
                          const completion = taskCompletions.find(
                            (c) => c.teamId === userTeam.id,
                          );
                          if (completion) {
                            return (
                              <Box>
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  sx={{ mt: 1 }}
                                >
                                  <Chip
                                    size="sm"
                                    variant="soft"
                                    color="success"
                                    startDecorator="👤"
                                  >
                                    {completion.completedByDisplayName ||
                                      completion.completedByUsername}
                                  </Chip>
                                  <Chip
                                    size="sm"
                                    variant="soft"
                                    color="neutral"
                                    startDecorator="📅"
                                  >
                                    {new Date(
                                      completion.completedAt,
                                    ).toLocaleDateString()}
                                  </Chip>
                                </Stack>
                                {completion.verificationImageUrl && (
                                  <Button
                                    size="sm"
                                    variant="soft"
                                    color="primary"
                                    startDecorator={<ImageIcon />}
                                    onClick={() => {
                                      setVerificationImageToView(
                                        completion.verificationImageUrl!,
                                      );
                                      setShowVerificationImageModal(true);
                                    }}
                                    sx={{ mt: 1 }}
                                  >
                                    View Verification Image
                                  </Button>
                                )}
                                {completion.verificationNote && (
                                  <Typography
                                    level="body-sm"
                                    sx={{ mt: 1, fontStyle: 'italic' }}
                                  >
                                    Note: {completion.verificationNote}
                                  </Typography>
                                )}
                              </Box>
                            );
                          }
                          return null;
                        })()}
                    </Box>
                  )}

                {/* Show other teams' progress if user's team hasn't completed */}
                {userTeam &&
                  !selectedTask.completedByTeamIds.includes(userTeam.id) &&
                  selectedTask.completedByTeamIds.length > 0 && (
                    <Alert variant="soft" color="warning" size="sm">
                      <Typography level="body-sm">
                        <strong>Completed by:</strong>{' '}
                        {selectedTask.completedByTeamIds
                          .map(
                            (teamId) =>
                              teams.find((t) => t.id === teamId)?.name,
                          )
                          .filter(Boolean)
                          .join(', ')}
                      </Typography>
                      <Typography level="body-sm" sx={{ mt: 0.5 }}>
                        Complete it to catch up!
                      </Typography>
                    </Alert>
                  )}

                {/* Verification Image Upload */}
                {userTeam &&
                  !selectedTask.completedByTeamIds.includes(userTeam.id) && (
                    <Box>
                      <Typography level="title-sm" sx={{ mb: 1 }}>
                        Verification (Optional)
                      </Typography>
                      <ImageUpload
                        onFileSelect={(file) => setVerificationImage(file)}
                        onRemove={() => {
                          setVerificationImage(null);
                          setUploadProgress(undefined);
                        }}
                        uploadProgress={uploadProgress}
                        disabled={completing}
                      />
                      <FormControl sx={{ mt: 2 }}>
                        <FormLabel>Note (Optional)</FormLabel>
                        <Textarea
                          placeholder="Add any notes about completing this task..."
                          value={verificationNote}
                          onChange={(e) => setVerificationNote(e.target.value)}
                          minRows={2}
                          disabled={completing}
                        />
                      </FormControl>
                    </Box>
                  )}

                <Stack
                  direction="row"
                  spacing={1}
                  justifyContent="flex-end"
                  sx={{ mt: 2 }}
                >
                  <Button
                    variant="outlined"
                    color="neutral"
                    onClick={() => {
                      setShowCompleteTaskModal(false);
                      setSelectedTask(null);
                      setTaskCompletions([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    color="success"
                    onClick={handleCompleteTask}
                    loading={completing}
                    disabled={
                      !userTeam ||
                      (userTeam &&
                        selectedTask.completedByTeamIds.includes(userTeam.id))
                    }
                  >
                    {userTeam &&
                    selectedTask.completedByTeamIds.includes(userTeam.id)
                      ? 'Already Completed'
                      : 'Mark Complete'}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}
        </ModalDialog>
      </Modal>

      {/* Verification Image Modal */}
      <Modal
        open={showVerificationImageModal}
        onClose={() => {
          setShowVerificationImageModal(false);
          setVerificationImageToView(null);
        }}
      >
        <ModalDialog variant="outlined" sx={{ maxWidth: 800, width: '90%' }}>
          <ModalClose />
          <Typography level="h4" component="h2">
            Verification Image
          </Typography>
          {verificationImageToView && (
            <Box
              sx={{
                mt: 2,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                maxHeight: '70vh',
                overflow: 'auto',
              }}
            >
              <img
                src={verificationImageToView}
                alt="Task verification"
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                }}
              />
            </Box>
          )}
          <Stack
            direction="row"
            spacing={1}
            justifyContent="flex-end"
            sx={{ mt: 2 }}
          >
            <Button
              variant="outlined"
              color="neutral"
              onClick={() => {
                setShowVerificationImageModal(false);
                setVerificationImageToView(null);
              }}
            >
              Close
            </Button>
            {verificationImageToView && (
              <Button
                color="primary"
                component="a"
                href={verificationImageToView}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in New Tab
              </Button>
            )}
          </Stack>
        </ModalDialog>
      </Modal>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        color={snackbar.color}
        variant="soft"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar.message}
      </Snackbar>

      {/* OSRS-style fireworks celebration */}
      <FireworksEffect 
        trigger={fireworksTrigger} 
      />
    </Box>
  );
}

export default EventView;
