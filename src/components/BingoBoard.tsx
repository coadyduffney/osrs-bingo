import { Task, Team } from '../services/api';
import { memo, useMemo } from 'react';
import Box from '@mui/joy/Box';
import Card from '@mui/joy/Card';
import Typography from '@mui/joy/Typography';
import Chip from '@mui/joy/Chip';
import Tooltip from '@mui/joy/Tooltip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface BingoBoardProps {
  size: number;
  tasks?: Task[];
  teams?: Team[];
  onCellClick?: (position: number, task?: Task) => void;
  userTeamId?: string;
}

const BingoBoard = memo(function BingoBoard({
  size,
  tasks = [],
  teams = [],
  onCellClick,
  userTeamId,
}: BingoBoardProps) {
  // Create a map of position to task for quick lookup
  const taskMap = useMemo(
    () => new Map(tasks.map((task) => [task.position, task])),
    [tasks]
  );
  
  // Create a map of team IDs to team names for quick lookup
  const teamMap = useMemo(
    () => new Map(teams.map((team) => [team.id, team.name])),
    [teams]
  );

  // Generate cells for all positions
  const cells = Array.from({ length: size * size }, (_, i) => {
    const task = taskMap.get(i);

    // Personal team completion status
    const yourTeamCompleted =
      task && userTeamId ? task.completedByTeamIds.includes(userTeamId) : false;

    // Get other teams who completed this task (excluding user's team)
    const otherTeamIds = task
      ? task.completedByTeamIds.filter((id) => id !== userTeamId)
      : [];
    
    // Get names of other teams who completed
    const otherTeamNames = otherTeamIds
      .map((id) => teamMap.get(id))
      .filter(Boolean);

    return {
      position: i,
      id: task?.id || `empty-${i}`,
      title: task?.title || `Task ${i + 1}`,
      description: task?.description || '',
      points: task?.points || 0,
      completed: yourTeamCompleted,
      otherTeamsCount: otherTeamIds.length,
      otherTeamNames,
      totalCompletions: task?.completedByTeamIds.length || 0,
      task: task,
    };
  }), [size, taskMap, teamMap, userTeamId]);

  const handleCellClick = (cell: (typeof cells)[0]) => {
    if (onCellClick) {
      onCellClick(cell.position, cell.task);
    }
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        gridTemplateRows: `repeat(${size}, 1fr)`,
        gap: 1,
        width: '100%',
        maxWidth: '800px',
        margin: '0 auto',
        p: 2,
      }}
    >
      {cells.map((cell) => (
        <Tooltip
          key={cell.id}
          title={
            cell.otherTeamsCount > 0
              ? `Completed by: ${cell.otherTeamNames.join(', ')}`
              : ''
          }
          placement="top"
          arrow
        >
          <Card
            variant={cell.completed ? 'soft' : 'outlined'}
            color={cell.completed ? 'success' : 'neutral'}
            sx={{
              aspectRatio: '1',
              p: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative',
              cursor: onCellClick ? 'pointer' : 'default',
              transition: 'all 0.2s',
              '&:hover': onCellClick
                ? {
                    transform: 'scale(1.05)',
                    borderColor: 'primary.500',
                    boxShadow: 'md',
                  }
                : {},
            }}
            onClick={() => handleCellClick(cell)}
          >
            {cell.completed && (
              <CheckCircleIcon
                sx={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  color: 'success.500',
                  fontSize: '1.2rem',
                }}
              />
            )}
            {cell.points > 0 && (
              <Chip
                size="sm"
                color="primary"
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  fontSize: '0.7rem',
                  minHeight: '20px',
                }}
              >
                {cell.points}pts
              </Chip>
            )}
            {!cell.completed && cell.otherTeamsCount > 0 && (
              <Chip
                size="sm"
                color="warning"
                variant="soft"
                sx={{
                  position: 'absolute',
                  bottom: 4,
                  right: 4,
                  fontSize: '0.65rem',
                  minHeight: '18px',
                  fontWeight: 600,
                }}
              >
                {cell.otherTeamsCount} ✓
              </Chip>
            )}
            <Typography
              level="body-sm"
              textAlign="center"
              sx={{
                fontSize: { xs: '0.7rem', sm: '0.85rem' },
                wordWrap: 'break-word',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {cell.title}
            </Typography>
          </Card>
        </Tooltip>
      ))}
    </Box>
  );
});

export default BingoBoard;
