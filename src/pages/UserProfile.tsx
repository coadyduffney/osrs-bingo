import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import { uploadToImgBB } from '../utils/imgbbUpload';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Stack from '@mui/joy/Stack';
import Button from '@mui/joy/Button';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import CircularProgress from '@mui/joy/CircularProgress';
import Alert from '@mui/joy/Alert';
import Avatar from '@mui/joy/Avatar';
import IconButton from '@mui/joy/IconButton';
import Snackbar from '@mui/joy/Snackbar';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

function UserProfile() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | undefined>();

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
    }
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }

    setError('');
    setUploadingAvatar(true);
    setUploadProgress(0);

    try {
      const result = await uploadToImgBB(file, (progress) => {
        setUploadProgress(progress);
      });

      // Update profile with new avatar URL
      const response = await authApi.updateProfile({
        avatarUrl: result.url,
      });

      if (response.success) {
        setSuccess(true);
        // Force auth context refresh
        window.location.reload();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to upload avatar',
      );
    } finally {
      setUploadingAvatar(false);
      setUploadProgress(undefined);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const response = await authApi.updateProfile({
        displayName: displayName.trim() || undefined,
      });

      if (response.success) {
        setSuccess(true);
        setIsEditing(false);
        // Force auth context refresh
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setDisplayName(user?.displayName || '');
    setError('');
  };

  if (!user) {
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
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography level="h1" sx={{ mb: 3 }}>
        My Profile
      </Typography>

      {error && (
        <Alert color="danger" variant="soft" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Avatar Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography level="h4" sx={{ mb: 2 }}>
            Profile Picture
          </Typography>
          <Stack direction="row" spacing={3} alignItems="center">
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={user.avatarUrl}
                alt={user.displayName || user.username}
                sx={{ width: 120, height: 120 }}
              >
                {!user.avatarUrl &&
                  (user.displayName || user.username)
                    .charAt(0)
                    .toUpperCase()}
              </Avatar>
              {uploadingAvatar && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    borderRadius: '50%',
                  }}
                >
                  <CircularProgress
                    determinate
                    value={uploadProgress}
                    sx={{ color: 'white' }}
                  />
                </Box>
              )}
            </Box>
            <Box>
              <Typography level="body-md" sx={{ mb: 1 }}>
                Upload a profile picture
              </Typography>
              <Button
                component="label"
                startDecorator={<PhotoCameraIcon />}
                disabled={uploadingAvatar}
                size="sm"
              >
                Choose Image
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              </Button>
              <Typography level="body-xs" sx={{ mt: 1, color: 'text.tertiary' }}>
                JPG, PNG, or GIF. Max 5MB.
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography level="h4">Profile Information</Typography>
            {!isEditing && (
              <IconButton
                onClick={() => setIsEditing(true)}
                variant="soft"
                color="primary"
              >
                <EditIcon />
              </IconButton>
            )}
          </Box>

          <Stack spacing={2}>
            <FormControl>
              <FormLabel>Username</FormLabel>
              <Input value={user.username} disabled />
            </FormControl>

            <FormControl>
              <FormLabel>Email</FormLabel>
              <Input value={user.email} disabled />
            </FormControl>

            <FormControl>
              <FormLabel>Display Name</FormLabel>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter a display name"
                disabled={!isEditing}
              />
              <Typography level="body-xs" sx={{ mt: 0.5, color: 'text.tertiary' }}>
                This is how your name will appear to other users
              </Typography>
            </FormControl>

            {isEditing && (
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  color="neutral"
                  startDecorator={<CancelIcon />}
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  startDecorator={<SaveIcon />}
                  onClick={handleSaveProfile}
                  loading={loading}
                >
                  Save Changes
                </Button>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardContent>
          <Typography level="h4" sx={{ mb: 2 }}>
            Account Actions
          </Typography>
          <Button color="danger" variant="outlined" onClick={logout}>
            Logout
          </Button>
        </CardContent>
      </Card>

      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
        color="success"
        variant="soft"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        Profile updated successfully!
      </Snackbar>
    </Box>
  );
}

export default UserProfile;
