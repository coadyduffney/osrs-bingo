import { useState, useMemo, memo, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  Sheet,
  Chip,
  Avatar,
} from '@mui/joy';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { Team, User, tasksApi } from '../services/api';

interface LeaderboardProps {
  teams: Team[];
  members: Map<string, User[]>; // teamId -> array of users
}

interface TeamEntry {
  teamId: string;
  teamName: string;
  teamColor?: string;
  score: number;
  tasksCompleted: number;
  memberCount: number;
}

interface IndividualEntry {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  teamId: string;
  teamName: string;
  individualScore: number;
  tasksCompleted: number;
  isCaptain: boolean;
}

interface TaskCompletion {
  taskId: string;
  completedBy: string;
  points: number;
}

const Leaderboard = memo(function Leaderboard({ teams, members }: LeaderboardProps) {
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);

  // Fetch all task completions for the event
  useEffect(() => {
    const fetchCompletions = async () => {
      try {
        // Get all teams' tasks
        const allCompletions: TaskCompletion[] = [];
        
        for (const team of teams) {
          for (const taskId of team.completedTaskIds) {
            const response = await tasksApi.getCompletions(taskId);
            if (response.success) {
              allCompletions.push(...response.data.map((c: any) => ({
                taskId,
                completedBy: c.completedBy,
                points: c.points,
              })));
            }
          }
        }
        
        setCompletions(allCompletions);
      } catch (err) {
        console.error('Error fetching completions for leaderboard:', err);
      }
    };
    
    if (teams.length > 0) {
      fetchCompletions();
    }
  }, [teams]);

  // Calculate individual score (sum of points from tasks they completed)
  const getIndividualScore = (userId: string): number => {
    return completions
      .filter(c => c.completedBy === userId)
      .reduce((sum, c) => sum + c.points, 0);
  };

  // Calculate individual tasks completed count
  const getIndividualTasksCount = (userId: string): number => {
    return new Set(completions.filter(c => c.completedBy === userId).map(c => c.taskId)).size;
  };

  // Build team leaderboard data
  const teamLeaderboard = useMemo(() => {
    const teamEntries: TeamEntry[] = teams.map(team => ({
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      score: team.score,
      tasksCompleted: team.completedTaskIds.length,
      memberCount: members.get(team.id)?.length || 0,
    }));

    // Sort by score (highest first), then by tasks completed
    return teamEntries.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.tasksCompleted - a.tasksCompleted;
    });
  }, [teams, members]);

  // Build individual leaderboard data
  const individualLeaderboard = useMemo(() => {
    const entries: IndividualEntry[] = [];

    teams.forEach((team) => {
      const teamMembers = members.get(team.id) || [];
      teamMembers.forEach((member) => {
        const individualScore = getIndividualScore(member.id);
        const tasksCompleted = getIndividualTasksCount(member.id);
        entries.push({
          userId: member.id,
          username: member.username,
          displayName: member.displayName,
          avatarUrl: member.avatarUrl,
          teamId: team.id,
          teamName: team.name,
          individualScore,
          tasksCompleted,
          isCaptain: member.id === team.captainId,
        });
      });
    });

    // Sort by individual score (highest first), then by tasks completed, then by name
    return entries.sort((a, b) => {
      if (b.individualScore !== a.individualScore) {
        return b.individualScore - a.individualScore;
      }
      if (b.tasksCompleted !== a.tasksCompleted) {
        return b.tasksCompleted - a.tasksCompleted;
      }
      return (a.displayName || a.username).localeCompare(
        b.displayName || b.username
      );
    });
  }, [teams, members, completions]);

  return (
    <Box>
      {/* Team Leaderboard Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <EmojiEventsIcon sx={{ color: 'warning.500' }} />
          <Typography level="h3">Team Leaderboard</Typography>
          <Chip size="sm" variant="soft" color="neutral">
            {teamLeaderboard.length} teams
          </Chip>
        </Box>

        <Sheet
          variant="outlined"
          sx={{
            borderRadius: 'sm',
            overflow: 'auto',
          }}
        >
          <Table
            stripe="odd"
            hoverRow
            sx={{
              '& thead th': {
                position: 'sticky',
                top: 0,
                bgcolor: 'background.surface',
                zIndex: 1,
              },
            }}
          >
            <thead>
              <tr>
                <th style={{ width: 60, textAlign: 'center' }}>Rank</th>
                <th>Team</th>
                <th style={{ width: 120, textAlign: 'center' }}>Score</th>
                <th style={{ width: 120, textAlign: 'center' }}>Tasks</th>
                <th style={{ width: 120, textAlign: 'center' }}>Members</th>
              </tr>
            </thead>
            <tbody>
              {teamLeaderboard.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                    <Typography level="body-md" sx={{ color: 'text.tertiary' }}>
                      No teams yet.
                    </Typography>
                  </td>
                </tr>
              ) : (
                teamLeaderboard.map((team, index) => {
                  const isTopThree = index < 3;
                  const rank = index + 1;
                  let medal = '';
                  let medalColor = '';

                  if (rank === 1) {
                    medal = '🥇';
                    medalColor = '#FFD700';
                  } else if (rank === 2) {
                    medal = '🥈';
                    medalColor = '#C0C0C0';
                  } else if (rank === 3) {
                    medal = '🥉';
                    medalColor = '#CD7F32';
                  }

                  return (
                    <tr key={team.teamId}>
                      {/* Rank */}
                      <td style={{ textAlign: 'center' }}>
                        <Typography
                          level="title-md"
                          sx={{
                            color: isTopThree ? medalColor : 'text.primary',
                            fontWeight: isTopThree ? 'bold' : 'normal',
                          }}
                        >
                          {medal || rank}
                        </Typography>
                      </td>

                      {/* Team Name */}
                      <td>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: team.teamColor || '#666',
                            }}
                          />
                          <Typography level="title-md">{team.teamName}</Typography>
                        </Box>
                      </td>

                      {/* Score */}
                      <td style={{ textAlign: 'center' }}>
                        <Typography
                          level="title-md"
                          sx={{
                            color: isTopThree ? 'success.500' : 'text.primary',
                            fontWeight: isTopThree ? 'bold' : 'normal',
                          }}
                        >
                          {team.score}
                        </Typography>
                      </td>

                      {/* Tasks */}
                      <td style={{ textAlign: 'center' }}>
                        <Chip size="sm" variant="soft" color="neutral">
                          {team.tasksCompleted}
                        </Chip>
                      </td>

                      {/* Members */}
                      <td style={{ textAlign: 'center' }}>
                        <Typography level="body-sm">
                          {team.memberCount}
                        </Typography>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Sheet>
      </Box>

      {/* Individual Leaderboard Section */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <EmojiEventsIcon sx={{ color: 'primary.500' }} />
          <Typography level="h3">Individual Leaderboard</Typography>
          <Chip size="sm" variant="soft" color="neutral">
            {individualLeaderboard.length} players
          </Chip>
        </Box>

        <Sheet
          variant="outlined"
          sx={{
            borderRadius: 'sm',
            overflow: 'auto',
            maxHeight: '600px',
          }}
        >
          <Table
            stripe="odd"
            hoverRow
            sx={{
              '& thead th': {
                position: 'sticky',
                top: 0,
                bgcolor: 'background.surface',
                zIndex: 1,
              },
            }}
          >
            <thead>
              <tr>
                <th style={{ width: 60, textAlign: 'center' }}>Rank</th>
                <th>Player</th>
                <th>Team</th>
                <th style={{ width: 120, textAlign: 'center' }}>Score</th>
                <th style={{ width: 120, textAlign: 'center' }}>Tasks</th>
              </tr>
            </thead>
            <tbody>
              {individualLeaderboard.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                    <Typography level="body-md" sx={{ color: 'text.tertiary' }}>
                      No players yet. Join a team to appear on the leaderboard!
                    </Typography>
                  </td>
                </tr>
              ) : (
                individualLeaderboard.map((entry, index) => {
                  const isTopThree = index < 3;
                  const rank = index + 1;
                  let medal = '';
                  let medalColor = '';

                  if (rank === 1) {
                    medal = '🥇';
                    medalColor = '#FFD700';
                  } else if (rank === 2) {
                    medal = '🥈';
                    medalColor = '#C0C0C0';
                  } else if (rank === 3) {
                    medal = '🥉';
                    medalColor = '#CD7F32';
                  }

                  return (
                    <tr key={entry.userId}>
                      {/* Rank */}
                      <td style={{ textAlign: 'center' }}>
                        <Typography
                          level="title-md"
                          sx={{
                            color: isTopThree ? medalColor : 'text.primary',
                            fontWeight: isTopThree ? 'bold' : 'normal',
                          }}
                        >
                          {medal || rank}
                        </Typography>
                      </td>

                      {/* Player */}
                      <td>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            src={entry.avatarUrl}
                            alt={entry.displayName || entry.username}
                            size="sm"
                          >
                            {!entry.avatarUrl &&
                              (entry.displayName || entry.username)
                                .charAt(0)
                                .toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography level="title-sm">
                              {entry.displayName || entry.username}
                              {entry.isCaptain && (
                                <span style={{ marginLeft: '4px' }}>👑</span>
                              )}
                            </Typography>
                            {entry.displayName && (
                              <Typography
                                level="body-xs"
                                sx={{ color: 'text.tertiary' }}
                              >
                                @{entry.username}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </td>

                      {/* Team */}
                      <td>
                        <Chip size="sm" variant="soft" color="primary">
                          {entry.teamName}
                        </Chip>
                      </td>

                      {/* Individual Score */}
                      <td style={{ textAlign: 'center' }}>
                        <Typography
                          level="title-md"
                          sx={{
                            color: isTopThree ? 'success.500' : 'text.primary',
                            fontWeight: isTopThree ? 'bold' : 'normal',
                          }}
                        >
                          {entry.individualScore}
                        </Typography>
                      </td>

                      {/* Tasks Completed */}
                      <td style={{ textAlign: 'center' }}>
                        <Chip size="sm" variant="soft" color="neutral">
                          {entry.tasksCompleted}
                        </Chip>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Sheet>
      </Box>
    </Box>
  );
});

export default Leaderboard;
