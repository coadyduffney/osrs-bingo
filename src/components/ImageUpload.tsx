import { useState, useRef, useCallback, memo } from 'react';
import Box from '@mui/joy/Box';
import Button from '@mui/joy/Button';
import IconButton from '@mui/joy/IconButton';
import Typography from '@mui/joy/Typography';
import LinearProgress from '@mui/joy/LinearProgress';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import AspectRatio from '@mui/joy/AspectRatio';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import { validateImageFile, generatePreviewUrl } from '../utils/imageUpload';

interface ImageUploadProps {
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  uploadProgress?: number;
  previewUrl?: string;
  disabled?: boolean;
  maxSizeMB?: number;
}

const ImageUpload = memo(function ImageUpload({
  onFileSelect,
  onRemove,
  uploadProgress,
  previewUrl,
  disabled = false,
  maxSizeMB = 10,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    try {
      // Generate preview
      const preview = await generatePreviewUrl(file);
      setLocalPreview(preview);
      onFileSelect(file);
    } catch (err) {
      setError('Failed to load image preview');
      console.error('Preview error:', err);
    }
  }, [onFileSelect]);

  const handleRemove = useCallback(() => {
    setLocalPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onRemove();
  }, [onRemove]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  };

  const displayPreview = previewUrl || localPreview;
  const isUploading = uploadProgress !== undefined && uploadProgress < 100;

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {!displayPreview ? (
        <Card
          variant="outlined"
          sx={{
            borderStyle: 'dashed',
            borderWidth: 2,
            textAlign: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            '&:hover': {
              borderColor: disabled ? undefined : 'primary.500',
              bgcolor: disabled ? undefined : 'background.level1',
            },
          }}
          onClick={disabled ? undefined : handleClick}
        >
          <CardContent sx={{ py: 4 }}>
            <CloudUploadIcon sx={{ fontSize: 48, color: 'text.tertiary', mb: 2 }} />
            <Typography level="title-md" sx={{ mb: 0.5 }}>
              Click to upload verification image
            </Typography>
            <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
              JPG, PNG, GIF, or WebP (max {maxSizeMB}MB)
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card variant="outlined">
          <AspectRatio ratio="16/9" sx={{ minWidth: 200 }}>
            <img
              src={displayPreview}
              alt="Preview"
              style={{ objectFit: 'cover' }}
            />
          </AspectRatio>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ImageIcon color="primary" />
                <Typography level="body-sm">
                  {isUploading ? 'Uploading...' : 'Image ready'}
                </Typography>
              </Box>
              {!disabled && (
                <IconButton
                  size="sm"
                  variant="plain"
                  color="danger"
                  onClick={handleRemove}
                >
                  <CloseIcon />
                </IconButton>
              )}
            </Box>
            {isUploading && (
              <LinearProgress
                determinate
                value={uploadProgress}
                sx={{ mt: 1 }}
                size="sm"
              />
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <Typography level="body-sm" sx={{ color: 'danger.500', mt: 1 }}>
          {error}
        </Typography>
      )}

      {!displayPreview && !disabled && (
        <Button
          variant="outlined"
          startDecorator={<CloudUploadIcon />}
          onClick={handleClick}
          fullWidth
          sx={{ mt: 1 }}
        >
          Choose File
        </Button>
      )}
    </Box>
  );
});

export default ImageUpload;);

export default ImageUpload;
