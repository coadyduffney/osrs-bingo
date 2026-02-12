import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { teamsApi, eventsApi, authApi, Team, Event, User } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Button from '@mui/joy/Button';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Input from '@mui/joy/Input';
import Textarea from '@mui/joy/Textarea';
import Avatar from '@mui/joy/Avatar';
import Chip from '@mui/joy/Chip';
import Sheet from '@mui/joy/Sheet';
import Stack from '@mui/joy/Stack';
import IconButton from '@mui/joy/IconButton';
import CircularProgress from '@mui/joy/CircularProgress';
import Alert from '@mui/joy/Alert';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import Menu from '@mui/joy/Menu';
import MenuItem from '@mui/joy/MenuItem';
import Dropdown from '@mui/joy/Dropdown';
import MenuButton from '@mui/joy/MenuButton';
import ListItemDecorator from '@mui/joy/ListItemDecorator';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupIcon from '@mui/icons-material/Group';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

export default function TeamDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [team, setTeam] = useState<Team | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<User | null>(null);
  const [memberToTransfer, setMemberToTransfer] = useState<User | null>(null);
  const [transferringCaptain, setTransferringCaptain] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRemoveMemberConfirm, setShowRemoveMemberConfirm] = useState(false);
  const [showTransferCaptainConfirm, setShowTransferCaptainConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchTeamDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch team
        const teamResponse = await teamsApi.getById(id);
        if (teamResponse.success && teamResponse.data) {
          setTeam(teamResponse.data);

          // Fetch event
          const eventResponse = await eventsApi.getById(
            teamResponse.data.eventId,
          );
          if (eventResponse.success && eventResponse.data) {
            setEvent(eventResponse.data);
          }

          // Fetch members
          if (teamResponse.data.memberIds.length > 0) {
            const membersResponse = await authApi.getUsersByIds(
              teamResponse.data.memberIds,
            );
            if (membersResponse.success && membersResponse.data) {
              setMembers(membersResponse.data);
            }
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load team details',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTeamDetails();
  }, [id]);

  const handleEditToggle = () => {
    if (team) {
      setEditForm({ name: team.name, description: team.description || '' });
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({ name: '', description: '' });
  };

  const handleSaveEdit = async () => {
    if (!team || !id) return;

    try {
      setSaving(true);
      const response = await teamsApi.update(id, {
        name: editForm.name,
        description: editForm.description || undefined,
      });

      if (response.success && response.data) {
        setTeam(response.data);
        setIsEditing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update team');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!team || !id) return;
    setShowRemoveMemberConfirm(false);
    setMemberToRemove(null);

    try {
      setRemovingMemberId(userId);
      const response = await teamsApi.removeMember(id, userId);

      if (response.success && response.data) {
        // If current user left the team, redirect
        if (userId === currentUser?.id) {
          navigate('/my-teams');
          return;
        }

        // Update team and members
        setTeam(response.data);
        setMembers((prevMembers) => prevMembers.filter((m) => m.id !== userId));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleDeleteTeam = async () => {
    if (!team || !id) return;
    setShowDeleteConfirm(false);

    try {
      setDeleting(true);
      await teamsApi.delete(id);
      // Redirect to event page after successful deletion
      navigate(`/event/${team.eventId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete team');
      setDeleting(false);
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

  const handleTransferCaptain = async () => {
    if (!team || !id || !memberToTransfer) return;
    setShowTransferCaptainConfirm(false);

    try {
      setTransferringCaptain(true);
      const response = await teamsApi.transferCaptain(id, memberToTransfer.id);
      if (response.success && response.data) {
        setTeam(response.data);
      }
      setMemberToTransfer(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to transfer captain role',
      );
    } finally {
      setTransferringCaptain(false);
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
        <CircularProgress />
      </Box>
    );
  }

  if (error || !team || !event) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography level="h2">Team Not Found</Typography>
        <Typography sx={{ mt: 1, mb: 2 }}>
          {error || 'The team you are looking for does not exist.'}
        </Typography>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </Box>
    );
  }

  const isCaptain = currentUser?.id === team.captainId;
  const isMember = currentUser && team.memberIds.includes(currentUser.id);

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      {/* Back Button */}
      <Button
        variant="outlined"
        color="neutral"
        startDecorator={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 3 }}
      >
        Back
      </Button>

      {/* Error Alert */}
      {error && (
        <Alert
          color="danger"
          variant="soft"
          sx={{ mb: 3 }}
          endDecorator={
            <Button size="sm" variant="plain" onClick={() => setError(null)}>
              Dismiss
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Team Header Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {isEditing ? (
            <Stack spacing={2}>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                placeholder="Team Name"
                size="lg"
              />
              <Textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                placeholder="Team Description (optional)"
                minRows={3}
              />
              <Stack direction="row" spacing={1}>
                <Button
                  startDecorator={<SaveIcon />}
                  onClick={handleSaveEdit}
                  disabled={saving || !editForm.name.trim()}
                  loading={saving}
                >
                  Save
                </Button>
                <Button
                  variant="outlined"
                  color="neutral"
                  startDecorator={<CloseIcon />}
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </Stack>
            </Stack>
          ) : (
            <>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  mb: 1,
                }}
              >
                <Typography level="h1" component="h1">
                  {team.name}
                  {isCaptain && (
                    <Chip size="sm" color="warning" sx={{ ml: 1 }}>
                      👑 Captain
                    </Chip>
                  )}
                </Typography>
                {isCaptain && (
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      variant="soft"
                      color="primary"
                      onClick={handleEditToggle}
                    >
                      <EditIcon />
                    </IconButton>
                    <Button
                      color="danger"
                      variant="outlined"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                      loading={deleting}
                      startDecorator={<DeleteIcon />}
                    >
                      Delete Team
                    </Button>
                  </Stack>
                )}
              </Box>
              {team.description && (
                <Typography
                  level="body-md"
                  sx={{ mb: 1, color: 'text.secondary' }}
                >
                  {team.description}
                </Typography>
              )}
              <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                Event:{' '}
                <Link
                  to={`/event/${event.id}`}
                  style={{ color: 'inherit', textDecoration: 'underline' }}
                >
                  {event.name}
                </Link>
              </Typography>

              {/* Team Join Code - Captain Only */}
              {isCaptain && (
                <Alert variant="soft" color="success" sx={{ mt: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography level="body-sm" fontWeight="bold">
                      Team Join Code:
                    </Typography>
                    <Chip
                      color="success"
                      variant="solid"
                      size="lg"
                      onClick={() => handleCopyCode(team.joinCode)}
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
                      {team.joinCode}
                    </Chip>
                    <Typography
                      level="body-sm"
                      sx={{ color: 'text.secondary' }}
                    >
                      {copiedCode ? 'Copied!' : 'Click to copy'}
                    </Typography>
                  </Stack>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 2,
          mb: 3,
        }}
      >
        <Card variant="soft" color="success">
          <CardContent sx={{ alignItems: 'center', textAlign: 'center' }}>
            <EmojiEventsIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography level="body-xs" sx={{ textTransform: 'uppercase' }}>
              Score
            </Typography>
            <Typography level="h2">{team.score}</Typography>
          </CardContent>
        </Card>

        <Card variant="soft" color="primary">
          <CardContent sx={{ alignItems: 'center', textAlign: 'center' }}>
            <GroupIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography level="body-xs" sx={{ textTransform: 'uppercase' }}>
              Members
            </Typography>
            <Typography level="h2">{team.memberIds.length}</Typography>
          </CardContent>
        </Card>

        <Card variant="soft" color="warning">
          <CardContent sx={{ alignItems: 'center', textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography level="body-xs" sx={{ textTransform: 'uppercase' }}>
              Completed
            </Typography>
            <Typography level="h2">{team.completedTaskIds.length}</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Members Section */}
      <Sheet variant="outlined" sx={{ p: 3, borderRadius: 'md' }}>
        <Typography level="h3" sx={{ mb: 2 }}>
          Team Members
        </Typography>

        {members.length === 0 ? (
          <Typography
            level="body-md"
            sx={{ textAlign: 'center', py: 4, color: 'text.tertiary' }}
          >
            No members yet.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {members.map((member) => {
              const isMemberCaptain = member.id === team.captainId;
              const isCurrentUser = member.id === currentUser?.id;
              const canLeave = isCurrentUser && !isMemberCaptain;

              return (
                <Card
                  key={member.id}
                  variant={isCurrentUser ? 'soft' : 'outlined'}
                  color={isCurrentUser ? 'primary' : 'neutral'}
                >
                  <CardContent
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      py: 1.5,
                      gap: 1.5,
                    }}
                  >
                    <Avatar
                      src={member.avatarUrl}
                      alt={member.displayName || member.username}
                      color={isMemberCaptain ? 'warning' : 'primary'}
                      size="md"
                    >
                      {!member.avatarUrl &&
                        (member.displayName || member.username)
                          .charAt(0)
                          .toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        level="title-md"
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        {member.displayName || member.username}
                        {isMemberCaptain && <span>👑</span>}
                        {isCurrentUser && (
                          <Chip size="sm" variant="soft" color="primary">
                            You
                          </Chip>
                        )}
                      </Typography>
                      <Typography
                        level="body-sm"
                        sx={{ color: 'text.tertiary' }}
                      >
                        {member.username}
                      </Typography>
                    </Box>

                    {isCaptain && !isMemberCaptain ? (
                      <Dropdown>
                        <MenuButton
                          slots={{ root: IconButton }}
                          slotProps={{
                            root: { variant: 'plain', color: 'neutral' },
                          }}
                        >
                          <MoreVertIcon />
                        </MenuButton>
                        <Menu placement="bottom-end">
                          <MenuItem
                            color="primary"
                            onClick={() => {
                              setMemberToTransfer(member);
                              setShowTransferCaptainConfirm(true);
                            }}
                          >
                            <ListItemDecorator>
                              <SwapHorizIcon />
                            </ListItemDecorator>
                            Transfer Captain Role
                          </MenuItem>
                          <MenuItem
                            color="danger"
                            onClick={() => {
                              setMemberToRemove(member);
                              setShowRemoveMemberConfirm(true);
                            }}
                          >
                            <ListItemDecorator>
                              <DeleteIcon />
                            </ListItemDecorator>
                            Remove from Team
                          </MenuItem>
                        </Menu>
                      </Dropdown>
                    ) : (
                      canLeave && (
                        <Button
                          variant="soft"
                          color="danger"
                          size="sm"
                          startDecorator={<DeleteIcon />}
                          onClick={() => {
                            setMemberToRemove(member);
                            setShowRemoveMemberConfirm(true);
                          }}
                          loading={removingMemberId === member.id}
                        >
                          {canLeave ? 'Leave' : 'Remove'}
                        </Button>
                      )
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Sheet>

      {/* Non-member message */}
      {!isMember && currentUser && (
        <Card
          variant="soft"
          color="neutral"
          sx={{ mt: 3, textAlign: 'center' }}
        >
          <CardContent>
            <Typography level="body-md" sx={{ mb: 2 }}>
              You are not a member of this team.
            </Typography>
            <Link to={`/event/${event.id}`}>
              <Button>View Event</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Delete Team Confirmation Modal */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
      >
        <ModalDialog variant="outlined" role="alertdialog">
          <Typography level="h4" component="h2">
            Confirm Deletion
          </Typography>
          <Typography level="body-md" sx={{ mt: 1 }}>
            Are you sure you want to delete <strong>"{team?.name}"</strong>?
          </Typography>
          <Typography level="body-sm" sx={{ mt: 1, color: 'text.secondary' }}>
            This will permanently delete the team and remove all members. This
            action cannot be undone.
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
              onClick={handleDeleteTeam}
              loading={deleting}
            >
              Delete Team
            </Button>
          </Stack>
        </ModalDialog>
      </Modal>

      {/* Remove Member Confirmation Modal */}
      <Modal
        open={showRemoveMemberConfirm}
        onClose={() => {
          setShowRemoveMemberConfirm(false);
          setMemberToRemove(null);
        }}
      >
        <ModalDialog variant="outlined" role="alertdialog">
          <Typography level="h4" component="h2">
            {memberToRemove?.id === currentUser?.id
              ? 'Leave Team?'
              : 'Remove Member?'}
          </Typography>
          <Typography level="body-md" sx={{ mt: 1 }}>
            {memberToRemove?.id === currentUser?.id
              ? 'Are you sure you want to leave this team?'
              : `Are you sure you want to remove ${memberToRemove?.username || 'this member'} from the team?`}
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
                setShowRemoveMemberConfirm(false);
                setMemberToRemove(null);
              }}
            >
              Cancel
            </Button>
            <Button
              color="danger"
              onClick={() =>
                memberToRemove && handleRemoveMember(memberToRemove.id)
              }
              loading={removingMemberId === memberToRemove?.id}
            >
              {memberToRemove?.id === currentUser?.id
                ? 'Leave Team'
                : 'Remove Member'}
            </Button>
          </Stack>
        </ModalDialog>
      </Modal>

      {/* Transfer Captain Confirmation Modal */}
      <Modal
        open={showTransferCaptainConfirm}
        onClose={() => {
          setShowTransferCaptainConfirm(false);
          setMemberToTransfer(null);
        }}
      >
        <ModalDialog variant="outlined" role="alertdialog">
          <Typography level="h4" component="h2">
            Transfer Captain Role?
          </Typography>
          <Typography level="body-md" sx={{ mt: 1 }}>
            Are you sure you want to transfer the captain role to{' '}
            <strong>{memberToTransfer?.username}</strong>?
          </Typography>
          <Typography level="body-sm" sx={{ mt: 1, color: 'text.secondary' }}>
            You will no longer be the team captain and will not be able to edit
            team settings or manage members. This action cannot be undone by you.
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
                setShowTransferCaptainConfirm(false);
                setMemberToTransfer(null);
              }}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              onClick={handleTransferCaptain}
              loading={transferringCaptain}
              startDecorator={<SwapHorizIcon />}
            >
              Transfer Captain
            </Button>
          </Stack>
        </ModalDialog>
      </Modal>
    </Box>
  );
}
