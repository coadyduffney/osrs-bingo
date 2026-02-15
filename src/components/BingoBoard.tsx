import { Task, Team } from '../services/api';
import { memo, useMemo } from 'react';
import Box from '@mui/joy/Box';
import Card from '@mui/joy/Card';
import Typography from '@mui/joy/Typography';
import Chip from '@mui/joy/Chip';
import Tooltip from '@mui/joy/Tooltip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import LinearProgress from '@mui/joy/LinearProgress';

interface BingoBoardProps {
  size: number;
  tasks?: Task[];
  teams?: Team[];
  onCellClick?: (position: number, task?: Task) => void;
  userTeamId?: string;
  xpProgress?: {
    teamId: string;
    members: Array<{
      userId: string;
      rsn: string;
      gains: { [skill: string]: { baseXP: number; currentXP: number; gain: number } };
    }>;
    totalGains: { [skill: string]: number };
  }[] | null;
}

const BingoBoard = memo(function BingoBoard({
  size,
  tasks = [],
  teams = [],
  onCellClick,
  userTeamId,
  xpProgress = null,
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
  const cells = useMemo(() => Array.from({ length: size * size }, (_, i) => {
    const task = taskMap.get(i);

    // Personal team completion status
    const yourTeamCompleted =
      task && userTeamId && task.completedByTeamIds
        ? task.completedByTeamIds.includes(userTeamId)
        : false;

    // Get other teams who completed this task (excluding user's team)
    const otherTeamIds = task && task.completedByTeamIds
      ? task.completedByTeamIds.filter((id) => id !== userTeamId)
      : [];
    
    // Get names of other teams who completed
    const otherTeamNames = otherTeamIds
      .map((id) => teamMap.get(id))
      .filter(Boolean);

    // Calculate XP progress for XP tasks
    let xpProgressPercent = 0;
    let xpGained = 0;
    let xpRequired = 0;
    if (task?.xpRequirement && xpProgress && userTeamId) {
      const teamProgress = xpProgress.find(t => t.teamId === userTeamId);
      if (teamProgress) {
        const skill = task.xpRequirement.skill.toLowerCase();
        xpRequired = task.xpRequirement.amount;
        xpGained = teamProgress.totalGains[skill] || 0;
        xpProgressPercent = Math.min(100, Math.round((xpGained / xpRequired) * 100));
      }
    }

    return {
      position: i,
      id: task?.id || `empty-${i}`,
      title: task?.title || '',
      description: task?.description || '',
      points: task?.points || 0,
      completed: yourTeamCompleted,
      otherTeamsCount: otherTeamIds.length,
      otherTeamNames,
      totalCompletions: task?.completedByTeamIds?.length || 0,
      task: task,
      xpProgressPercent,
      xpGained,
      xpRequired,
    };
  }), [size, taskMap, teamMap, userTeamId, xpProgress]);

  const handleCellClick = useMemo(() => {
    return (cell: (typeof cells)[0]) => {
      if (onCellClick) {
        onCellClick(cell.position, cell.task);
      }
    };
  }, [onCellClick]);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        gridTemplateRows: `repeat(${size}, 1fr)`,
        gap: 1,
        width: '100%',
        maxWidth: size >= 10 ? '1000px' : '800px',
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
              aspectRatio: '1 / 1',
              width: '100%',
              height: 0,
              paddingBottom: '100%',
              position: 'relative',
              cursor: onCellClick ? 'pointer' : 'default',
              transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
              overflow: 'hidden',
              willChange: onCellClick ? 'transform' : 'auto',
              '&:hover': onCellClick
                ? {
                    transform: 'scale(1.05)',
                    boxShadow: 'md',
                    zIndex: 10,
                  }
                : {},
            }}
            onClick={() => handleCellClick(cell)}
          >
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                p: 0.5,
              }}
            >
            {cell.completed && (
              <CheckCircleIcon
                sx={{
                  position: 'absolute',
                  top: 2,
                  left: 2,
                  color: 'success.500',
                  fontSize: size >= 10 ? '0.9rem' : '1.2rem',
                }}
              />
            )}
            {cell.points > 0 && (
              <Chip
                size="sm"
                color="primary"
                sx={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  fontSize: size >= 10 ? '0.55rem' : '0.7rem',
                  minHeight: size >= 10 ? '16px' : '20px',
                  padding: '0 4px',
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
                  bottom: 2,
                  right: 2,
                  fontSize: size >= 10 ? '0.5rem' : '0.65rem',
                  minHeight: size >= 10 ? '14px' : '18px',
                  fontWeight: 600,
                  padding: '0 4px',
                }}
              >
                {cell.otherTeamsCount} ✓
              </Chip>
            )}
            {/* XP Progress bar for XP tasks */}
            {cell.xpProgressPercent > 0 && !cell.completed && (
              <Box sx={{ position: 'absolute', bottom: 2, left: 2, right: 2 }}>
                <LinearProgress
                  determinate
                  value={cell.xpProgressPercent}
                  size="sm"
                  color={cell.xpProgressPercent >= 100 ? 'success' : 'primary'}
                  sx={{
                    height: size >= 10 ? '4px' : '6px',
                    borderRadius: 1,
                  }}
                />
                <Typography
                  level="body-xs"
                  sx={{
                    fontSize: size >= 10 ? '0.4rem' : '0.5rem',
                    textAlign: 'center',
                    mt: 0.25,
                    color: 'text.secondary',
                  }}
                >
                  {cell.xpGained.toLocaleString()} / {cell.xpRequired.toLocaleString()} XP
                </Typography>
              </Box>
            )}
            {cell.title ? (
              <Typography
                level="body-sm"
                textAlign="center"
                sx={{
                  fontSize: size >= 10 ? '0.55rem' : { xs: '0.7rem', sm: '0.85rem' },
                  lineHeight: size >= 10 ? 1.2 : 1.4,
                  wordWrap: 'break-word',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: size >= 10 ? 2 : 3,
                  WebkitBoxOrient: 'vertical',
                  maxWidth: '100%',
                  px: 0.5,
                }}
              >
                {cell.title}
              </Typography>
            ) : (
              <AddIcon
                sx={{
                  fontSize: size >= 10 ? '1.5rem' : { xs: '2rem', sm: '2.5rem' },
                  color: 'text.tertiary',
                  opacity: 0.3,
                }}
              />
            )}
            </Box>
          </Card>
        </Tooltip>
      ))}
    </Box>
  );
});

export default BingoBoard;
