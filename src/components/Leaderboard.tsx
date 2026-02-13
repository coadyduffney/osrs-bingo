import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  Sheet,
  Select,
  Option,
  Chip,
  Avatar,
} from '@mui/joy';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FilterListIcon from '@mui/icons-material/FilterList';
import { Team, User } from '../services/api';

interface LeaderboardProps {
  teams: Team[];
  members: Map<string, User[]>; // teamId -> array of users
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  teamId: string;
  teamName: string;
  score: number;
  tasksCompleted: number;
  isCaptain: boolean;
}

export default function Leaderboard({ teams, members }: LeaderboardProps) {
  const [teamFilter, setTeamFilter] = useState<string>('all');

  // Build leaderboard data
  const leaderboardData = useMemo(() => {
    const entries: LeaderboardEntry[] = [];

    teams.forEach((team) => {
      const teamMembers = members.get(team.id) || [];
      teamMembers.forEach((member) => {
        entries.push({
          userId: member.id,
          username: member.username,
          displayName: member.displayName,
          avatarUrl: member.avatarUrl,
          teamId: team.id,
          teamName: team.name,
          score: team.score,
          tasksCompleted: team.completedTaskIds.length,
          isCaptain: member.id === team.captainId,
        });
      });
    });

    // Filter by team if selected
    let filtered = entries;
    if (teamFilter !== 'all') {
      filtered = entries.filter((entry) => entry.teamId === teamFilter);
    }

    // Sort by score (highest first), then by tasks completed, then by name
    return filtered.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (b.tasksCompleted !== a.tasksCompleted) {
        return b.tasksCompleted - a.tasksCompleted;
      }
      return (a.displayName || a.username).localeCompare(
        b.displayName || b.username
      );
    });
  }, [teams, members, teamFilter]);

  // Get unique team count for each player (useful for stats)
  const topThree = leaderboardData.slice(0, 3);

  return (
    <Box>
      {/* Header with filter */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmojiEventsIcon sx={{ color: 'warning.500' }} />
          <Typography level="h3">Leaderboard</Typography>
          <Chip size="sm" variant="soft" color="neutral">
            {leaderboardData.length} players
          </Chip>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterListIcon fontSize="small" />
          <Select
            value={teamFilter}
            onChange={(_, value) => setTeamFilter(value as string)}
            size="sm"
            sx={{ minWidth: 200 }}
          >
            <Option value="all">All Teams</Option>
            {teams.map((team) => (
              <Option key={team.id} value={team.id}>
                {team.name} ({members.get(team.id)?.length || 0} players)
              </Option>
            ))}
          </Select>
        </Box>
      </Box>

      {/* Leaderboard Table */}
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
              <th style={{ width: 120, textAlign: 'center' }}>
                Tasks
              </th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                  <Typography level="body-md" sx={{ color: 'text.tertiary' }}>
                    No players yet. Join a team to appear on the leaderboard!
                  </Typography>
                </td>
              </tr>
            ) : (
              leaderboardData.map((entry, index) => {
                const isTopThree = index < 3;
                const rank = index + 1;
                let medalColor = '';
                let medal = '';

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
                  <tr key={`${entry.teamId}-${entry.userId}`}>
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
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                      >
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

                    {/* Score */}
                    <td style={{ textAlign: 'center' }}>
                      <Typography
                        level="title-md"
                        sx={{
                          color: isTopThree ? 'success.500' : 'text.primary',
                          fontWeight: isTopThree ? 'bold' : 'normal',
                        }}
                      >
                        {entry.score}
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

      {/* Top 3 Podium (Optional visual element) */}
      {topThree.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography level="title-md" sx={{ mb: 1.5 }}>
            🏆 Top Performers
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            {topThree.map((entry, index) => {
              const rank = index + 1;
              let textColor = 'text.primary';
              let medal = '';

              if (rank === 1) {
                medal = '🥇';
                textColor = 'primary.plainColor';
              } else if (rank === 2) {
                medal = '🥈';
                textColor = 'primary.plainColor';
              } else if (rank === 3) {
                medal = '🥉';
                textColor = 'primary.plainColor';
              }

              return (
                <Sheet
                  key={`${entry.teamId}-${entry.userId}`}
                  variant="soft"
                  sx={{
                    p: 2,
                    borderRadius: 'md',
                    textAlign: 'center',
                    minWidth: 150,
                    bgcolor: 'neutral.800',
                  }}
                >
                  <Typography level="h4" sx={{ mb: 0.5 }}>
                    {medal}
                  </Typography>
                  <Avatar
                    src={entry.avatarUrl}
                    alt={entry.displayName || entry.username}
                    size="lg"
                    sx={{ mx: 'auto', mb: 1 }}
                  >
                    {!entry.avatarUrl &&
                      (entry.displayName || entry.username)
                        .charAt(0)
                        .toUpperCase()}
                  </Avatar>
                  <Typography level="title-sm" sx={{ color: textColor }}>
                    {entry.displayName || entry.username}
                  </Typography>
                  <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                    {entry.teamName}
                  </Typography>
                  <Typography
                    level="h4"
                    sx={{ mt: 1, color: textColor, fontWeight: 'bold' }}
                  >
                    {entry.score} pts
                  </Typography>
                  <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                    {entry.tasksCompleted} tasks
                  </Typography>
                </Sheet>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}
