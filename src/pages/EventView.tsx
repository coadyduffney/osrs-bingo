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
import XPProgress from '../components/XPProgress';
import {
  eventsApi,
  teamsApi,
  tasksApi,
  authApi,
  trackingApi,
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
import Checkbox from '@mui/joy/Checkbox';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import ImageIcon from '@mui/icons-material/Image';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import ModalClose from '@mui/joy/ModalClose';
import Snackbar from '@mui/joy/Snackbar';

const OSRS_SKILLS = [
  'attack', 'strength', 'defence', 'ranged', 'prayer', 'magic',
  'runecraft', 'construction', 'hitpoints', 'agility', 'herblore', 'thieving',
  'crafting', 'fletching', 'slayer', 'hunter', 'mining', 'smithing',
  'fishing', 'cooking', 'firemaking', 'woodcutting', 'farming', 'sailing'
];

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
    isXPTask: false,
    xpSkill: '',
    xpAmount: 0,
  });
  const [taskFormError, setTaskFormError] = useState('');
  
  // Memoize form change handlers to prevent recreating on every render
  const handleTaskFormChange = useCallback((field: string, value: any) => {
    setTaskForm(prev => ({ ...prev, [field]: value }));
    if (field === 'title') setTaskFormError('');
  }, []);
  
  // Memoize modal close handler
  const handleCloseTaskModal = useCallback(() => {
    setShowAddTaskModal(false);
    setIsEditingTask(false);
    setTaskToEdit(null);
    setTaskFormError('');
    setTaskForm({
      title: '',
      description: '',
      points: 1,
      isXPTask: false,
      xpSkill: '',
      xpAmount: 0,
    });
  }, []);
  
  // Memoize complete task modal close handler
  const handleCloseCompleteModal = useCallback(() => {
    setShowCompleteTaskModal(false);
    setSelectedTask(null);
    setTaskCompletions([]);
    setVerificationImage(null);
    setVerificationNote('');
    setUploadProgress(undefined);
  }, []);
  
  // Memoize verification note change handler
  const handleVerificationNoteChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setVerificationNote(e.target.value);
  }, []);
  
  // Memoize image upload handlers
  const handleVerificationImageSelect = useCallback((file: File) => {
    setVerificationImage(file);
  }, []);
  
  const handleVerificationImageRemove = useCallback(() => {
    setVerificationImage(null);
    setUploadProgress(undefined);
  }, []);
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
  const [startingTracking, setStartingTracking] = useState(false);
  const [endingTracking, setEndingTracking] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    cronExpression: '',
  });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [nextRunTime, setNextRunTime] = useState<string | null>(null);

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
          if (eventResponse.data.refreshSchedule) {
            const nextResponse = await eventsApi.getNextScheduleTime(id);
            if (nextResponse.success && nextResponse.data.nextRunTime) {
              setNextRunTime(nextResponse.data.nextRunTime);
            }
          }
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
  }, [id, refreshTrigger]);

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
    const handleTaskCompleted = (data: {
      task: Task;
      teamId: string;
    }) => {
      console.log('Task completed (real-time):', data);

      // Update tasks list
      setTasks((prev) =>
        prev.map((t) => (t.id === data.task.id ? data.task : t)),
      );

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

    // Client-side validation
    setTaskFormError('');
    if (taskForm.title.trim().length < 3) {
      setTaskFormError('Task title must be at least 3 characters');
      return;
    }
    if (taskForm.title.length > 100) {
      setTaskFormError('Task title must be 100 characters or less');
      return;
    }

    try {
      setSubmitting(true);

      if (isEditingTask && taskToEdit) {
        // Update existing task
        const updateData: any = {
          title: taskForm.title,
          description: taskForm.description,
          points: taskForm.points,
          isXPTask: taskForm.isXPTask,
        };
        
        if (taskForm.isXPTask && taskForm.xpSkill && taskForm.xpAmount > 0) {
          updateData.xpRequirement = {
            skill: taskForm.xpSkill,
            amount: taskForm.xpAmount,
          };
        } else {
          // Clear XP requirement if no longer an XP task
          updateData.xpRequirement = null;
        }
        
        const response = await tasksApi.update(taskToEdit.id, updateData);

        if (response.success) {
          // Update tasks list
          setTasks((prev) =>
            prev.map((t) => (t.id === taskToEdit.id ? response.data : t)),
          );
          setShowAddTaskModal(false);
          setTaskForm({ title: '', description: '', points: 1, isXPTask: false, xpSkill: '', xpAmount: 0 });
          setSelectedPosition(null);
          setIsEditingTask(false);
          setTaskToEdit(null);
          setTaskFormError('');
          setSnackbar({
            open: true,
            message: 'Task updated successfully',
            color: 'success',
          });
        }
      } else {
        // Create new task
        const createData: any = {
          eventId: id,
          title: taskForm.title,
          description: taskForm.description,
          points: taskForm.points,
          position: selectedPosition,
          isXPTask: taskForm.isXPTask,
        };
        
        if (taskForm.isXPTask && taskForm.xpSkill && taskForm.xpAmount > 0) {
          createData.xpRequirement = {
            skill: taskForm.xpSkill,
            amount: taskForm.xpAmount,
          };
        }
        
        const response = await tasksApi.create(createData);

        if (response.success) {
          // Update tasks list
          setTasks([
            ...tasks.filter((t) => t.position !== selectedPosition),
            response.data,
          ]);
          setShowAddTaskModal(false);
          setTaskForm({ title: '', description: '', points: 1, isXPTask: false, xpSkill: '', xpAmount: 0 });
          setSelectedPosition(null);
          setTaskFormError('');
          setSnackbar({
            open: true,
            message: 'Task created successfully',
            color: 'success',
          });
        }
      }
    } catch (err: any) {
      console.error('Failed to save task:', err);
      const errorMessage = err?.response?.data?.error || err?.message || 'Failed to save task';
      setTaskFormError(errorMessage);
      setSnackbar({
        open: true,
        message: errorMessage,
        color: 'danger',
      });
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

  const handleStartTracking = async () => {
    if (!id) return;

    try {
      setStartingTracking(true);
      console.log('Starting tracking for event:', id);
      const response = await trackingApi.startTracking(id);
      console.log('Start tracking response:', response);
      if (response.success) {
        setSnackbar({
          open: true,
          message: `Tracking started for ${response.data.playersTracked} players`,
          color: 'success',
        });
        // Update local event state immediately
        if (event) {
          setEvent({ ...event, trackingEnabled: true });
          console.log('Event state updated with trackingEnabled: true');
        }
        // Also refresh from server after a short delay
        setTimeout(() => {
          setRefreshTrigger(prev => prev + 1);
        }, 500);
      }
    } catch (err) {
      console.error('Error starting tracking:', err);
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to start tracking',
        color: 'danger',
      });
    } finally {
      setStartingTracking(false);
    }
  };

  const handleEndTracking = async () => {
    if (!id) return;

    try {
      setEndingTracking(true);
      const response = await trackingApi.endTracking(id);
      if (response.success) {
        setSnackbar({
          open: true,
          message: 'Tracking ended successfully',
          color: 'success',
        });
        // Update local event state immediately
        if (event) {
          setEvent({ ...event, trackingEnabled: false });
        }
        // Also refresh from server after a short delay
        setTimeout(() => {
          setRefreshTrigger(prev => prev + 1);
        }, 500);
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to end tracking',
        color: 'danger',
      });
    } finally {
      setEndingTracking(false);
    }
  };

  const isEventCreator = user?.id === event?.creatorId;

  const handleSaveSchedule = async () => {
    if (!id || !event) return;

    try {
      setSavingSchedule(true);
      const cronValue = scheduleForm.cronExpression.trim() || null;
      const response = await eventsApi.setSchedule(id, cronValue);
      if (response.success) {
        setEvent({ ...event, refreshSchedule: cronValue });
        if (cronValue) {
          const nextResponse = await eventsApi.getNextScheduleTime(id);
          if (nextResponse.success && nextResponse.data.nextRunTime) {
            setNextRunTime(nextResponse.data.nextRunTime);
          }
        } else {
          setNextRunTime(null);
        }
        setSnackbar({
          open: true,
          message: cronValue 
            ? `Schedule updated: XP will refresh ${getCronDescription(cronValue)}`
            : 'Schedule disabled',
          color: 'success',
        });
        setShowScheduleModal(false);
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to save schedule',
        color: 'danger',
      });
    } finally {
      setSavingSchedule(false);
    }
  };

  useEffect(() => {
    if (showScheduleModal && event?.refreshSchedule !== undefined) {
      setScheduleForm({ cronExpression: event.refreshSchedule || '' });
    }
  }, [showScheduleModal, event?.refreshSchedule]);

  const openScheduleModal = () => {
    setShowScheduleModal(true);
  };

  const getCronDescription = (cron: string): string => {
    const parts = cron.split(' ');
    if (parts[0] === '*/30') return 'every 30 minutes';
    if (parts[0] === '*/15') return 'every 15 minutes';
    if (parts[0] === '*/5') return 'every 5 minutes';
    if (parts[0] === '0' && parts[1] === '*') return 'every hour';
    if (parts[1] === '0' && parts[2] === '*') return 'daily at midnight';
    if (parts[1] === '0,12' && parts[2] === '*') return 'twice daily (midnight & noon)';
    return cron;
  };

  const handleTaskClick = async (position: number, task?: Task) => {
    if (task) {
      setSelectedTask(task);
      setShowCompleteTaskModal(true);

      // Defer loading completions until after modal is visible
      setTimeout(async () => {
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
      }, 0);
    } else if (isEventCreator) {
      // Event creator can add a task to empty position
      setSelectedPosition(position);
      setTaskForm({
        title: '',
        description: '',
        points: 1,
        isXPTask: false,
        xpSkill: '',
        xpAmount: 0,
      });
      setIsEditingTask(false);
      setTaskToEdit(null);
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

        // Update teams score locally instead of refetching
        setTeams(prevTeams => prevTeams.map(t => {
          if (t.id === userTeam.id) {
            return {
              ...t,
              score: t.score + selectedTask.points,
              completedTaskIds: [...t.completedTaskIds, selectedTask.id]
            };
          }
          return t;
        }));

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

      {/* Starting Tracking Alert */}
      {startingTracking && (
        <Alert color="primary" variant="soft" sx={{ mb: 3 }}>
          <Typography level="body-sm">
            🔄 Updating player data from WiseOldMan, please wait... This may take a few minutes.
          </Typography>
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
                  {event.status === 'active' && !event.trackingEnabled && (
                    <Button
                      color="primary"
                      variant="solid"
                      size="sm"
                      onClick={handleStartTracking}
                      loading={startingTracking}
                    >
                      Start XP Tracking
                    </Button>
                  )}
                  {event.status === 'active' && event.trackingEnabled && (
                    <>
                      <Button
                        color="warning"
                        variant="solid"
                        size="sm"
                        onClick={handleEndTracking}
                        loading={endingTracking}
                      >
                        End XP Tracking
                      </Button>
                      <Button
                        color="neutral"
                        variant="outlined"
                        size="sm"
                        onClick={openScheduleModal}
                      >
                        {event.refreshSchedule ? '⏰ Schedule On' : '⏰ Set Schedule'}
                      </Button>
                    </>
                  )}
                  {event.status === 'active' && !event.trackingEnabled && event.refreshSchedule && (
                    <Button
                      color="neutral"
                      variant="outlined"
                      size="sm"
                      onClick={openScheduleModal}
                    >
                      ⏰ Schedule On
                    </Button>
                  )}
                  {event.refreshSchedule && (
                    <Chip 
                      variant="outlined" 
                      startDecorator="⏰"
                      sx={{ fontWeight: 600 }}
                    >
                      {nextRunTime 
                        ? `Next: ${new Date(nextRunTime).toLocaleTimeString()}`
                        : `Every ${getCronDescription(event.refreshSchedule)}`
                      }
                    </Chip>
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
        </CardContent>
      </Card>

      {/* Tabs for Board and Teams */}
      <Tabs defaultValue={0} sx={{ bgcolor: 'transparent' }}>
        <TabList>
          <Tab>Bingo Board</Tab>
          <Tab>Teams</Tab>
          <Tab>Leaderboard</Tab>
          <Tab>XP Progress</Tab>
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

        {/* XP Progress Tab */}
        <TabPanel value={3} sx={{ p: 0, pt: 2 }}>
          <Card>
            <CardContent>
              <XPProgress eventId={event.id} teams={teams} isEventCreator={isEventCreator} />
            </CardContent>
          </Card>
        </TabPanel>
      </Tabs>

      {/* Add/Edit Task Modal */}
      <Modal
        open={showAddTaskModal}
        onClose={handleCloseTaskModal}
      >
        <ModalDialog sx={{ minWidth: 500, maxWidth: 600 }}>
          <ModalClose />
          <Typography level="h4" sx={{ mb: 2 }}>
            {isEditingTask ? 'Edit Task' : 'Add Task'}
            {!isEditingTask &&
              selectedPosition !== null &&
              ` - Position ${selectedPosition + 1}`}
          </Typography>
          <form onSubmit={handleSubmitTask}>
            <Stack spacing={2}>
              <FormControl required error={!!taskFormError}>
                <FormLabel>Task Title</FormLabel>
                <Input
                  value={taskForm.title}
                  onChange={(e) => handleTaskFormChange('title', e.target.value)}
                  placeholder="e.g., Get 99 Fishing"
                  size="lg"
                />
                {taskFormError ? (
                  <Typography level="body-sm" color="danger" sx={{ mt: 0.5 }}>
                    {taskFormError}
                  </Typography>
                ) : (
                  <Typography level="body-sm" sx={{ mt: 0.5, opacity: 0.7 }}>
                    Min 3 characters, max 100
                  </Typography>
                )}
              </FormControl>
              <FormControl>
                <FormLabel>Description (optional)</FormLabel>
                <Textarea
                  value={taskForm.description}
                  onChange={(e) => handleTaskFormChange('description', e.target.value)}
                  placeholder="Additional details about this task..."
                  minRows={3}
                />
              </FormControl>
              <FormControl required>
                <FormLabel>Points</FormLabel>
                <Input
                  type="number"
                  value={taskForm.points}
                  onChange={(e) => handleTaskFormChange('points', parseInt(e.target.value) || 1)}
                  slotProps={{ input: { min: 1, max: 100 } }}
                />
              </FormControl>
              
              {/* XP Task Fields */}
              <FormControl>
                <Checkbox
                  checked={taskForm.isXPTask}
                  onChange={(e) => handleTaskFormChange('isXPTask', e.target.checked)}
                  label="This is an XP-based task"
                />
                <Typography level="body-sm" sx={{ mt: 0.5, opacity: 0.7 }}>
                  Auto-complete when team gains required XP
                </Typography>
              </FormControl>
              
              {taskForm.isXPTask && (
                <>
                  <FormControl required>
                    <FormLabel>Skill</FormLabel>
                    <Select
                      value={taskForm.xpSkill}
                      onChange={(_, value) => handleTaskFormChange('xpSkill', value || '')}
                      placeholder="Select a skill"
                      slotProps={{
                        listbox: {
                          sx: { maxHeight: '300px' }
                        }
                      }}
                    >
                      {OSRS_SKILLS.map((skill) => (
                        <Option key={skill} value={skill}>
                          {skill.charAt(0).toUpperCase() + skill.slice(1)}
                        </Option>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <FormControl required>
                    <FormLabel>XP Required</FormLabel>
                    <Input
                      type="number"
                      value={taskForm.xpAmount}
                      onChange={(e) => handleTaskFormChange('xpAmount', parseInt(e.target.value) || 0)}
                      placeholder="e.g., 5000000 for 5M XP"
                      slotProps={{ input: { min: 0, step: 100000 } }}
                    />
                    <Typography level="body-sm" sx={{ mt: 0.5, opacity: 0.7 }}>
                      Total XP gain required by team
                    </Typography>
                  </FormControl>
                </>
              )}
              
              <Stack
                direction="row"
                spacing={2}
                sx={{ justifyContent: 'flex-end' }}
              >
                <Button
                  variant="outlined"
                  color="neutral"
                  onClick={handleCloseTaskModal}
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

      {/* Schedule Configuration Modal */}
      <Modal
        open={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
      >
        <ModalDialog>
          <Typography level="h4" component="h2">
            XP Refresh Schedule
          </Typography>
          <Typography level="body-md" sx={{ mt: 1, mb: 2 }}>
            Configure automatic XP refresh for players. The schedule uses cron syntax.
          </Typography>
          <FormControl>
            <FormLabel>Cron Expression</FormLabel>
            <Input
              value={scheduleForm.cronExpression}
              onChange={(e) => setScheduleForm({ cronExpression: e.target.value })}
              placeholder="e.g., 0 * * * *"
            />
            <Typography level="body-xs" sx={{ mt: 1, color: 'text.secondary' }}>
              Leave empty to disable automatic refresh
            </Typography>
          </FormControl>
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography level="body-sm" sx={{ mb: 1 }}>Quick presets:</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button size="sm" variant="outlined" onClick={() => setScheduleForm({ cronExpression: '*/30 * * * *' })}>
                Every 30 min
              </Button>
              <Button size="sm" variant="outlined" onClick={() => setScheduleForm({ cronExpression: '0 * * * *' })}>
                Hourly
              </Button>
              <Button size="sm" variant="outlined" onClick={() => setScheduleForm({ cronExpression: '0 0 * * *' })}>
                Daily
              </Button>
              <Button size="sm" variant="outlined" onClick={() => setScheduleForm({ cronExpression: '0 0,12 * * *' })}>
                Twice daily
              </Button>
            </Stack>
          </Box>
          <Stack
            direction="row"
            spacing={1}
            justifyContent="flex-end"
          >
            <Button
              variant="plain"
              color="neutral"
              onClick={() => setShowScheduleModal(false)}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              onClick={handleSaveSchedule}
              loading={savingSchedule}
            >
              Save Schedule
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
        onClose={handleCloseCompleteModal}
      >
        <ModalDialog variant="outlined" sx={{ minWidth: 400, maxWidth: 600 }}>
          <ModalClose />
          <Typography level="h4" component="h2">
            Complete Task
          </Typography>
          {selectedTask && (() => {
            const isTaskCompletedByUserTeam = userTeam && selectedTask.completedByTeamIds.includes(userTeam.id);
            const canComplete = userTeam && !isTaskCompletedByUserTeam;
            
            return (
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
                              isXPTask: !!selectedTask.xpRequirement,
                              xpSkill: selectedTask.xpRequirement?.skill || '',
                              xpAmount: selectedTask.xpRequirement?.amount || 0,
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
                {isTaskCompletedByUserTeam && (
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
                {userTeam && !isTaskCompletedByUserTeam &&
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
                {canComplete && (
                    <Box>
                      <Typography level="title-sm" sx={{ mb: 1 }}>
                        Verification (Optional)
                      </Typography>
                      <ImageUpload
                        onFileSelect={handleVerificationImageSelect}
                        onRemove={handleVerificationImageRemove}
                        uploadProgress={uploadProgress}
                        disabled={completing}
                      />
                      <FormControl sx={{ mt: 2 }}>
                        <FormLabel>Note (Optional)</FormLabel>
                        <Textarea
                          placeholder="Add any notes about completing this task..."
                          value={verificationNote}
                          onChange={handleVerificationNoteChange}
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
                    onClick={handleCloseCompleteModal}
                  >
                    Cancel
                  </Button>
                  <Button
                    color="success"
                    onClick={handleCompleteTask}
                    loading={completing}
                    disabled={!canComplete}
                  >
                    {isTaskCompletedByUserTeam
                      ? 'Already Completed'
                      : 'Mark Complete'}
                  </Button>
                </Stack>
              </Stack>
            </Box>
            );
          })()}
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
