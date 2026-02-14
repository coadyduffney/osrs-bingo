import { useState, useEffect } from 'react';
import { trackingApi } from '../services/api';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Stack from '@mui/joy/Stack';
import CircularProgress from '@mui/joy/CircularProgress';
import Alert from '@mui/joy/Alert';
import Accordion from '@mui/joy/Accordion';
import AccordionDetails from '@mui/joy/AccordionDetails';
import AccordionSummary from '@mui/joy/AccordionSummary';
import AccordionGroup from '@mui/joy/AccordionGroup';
import LinearProgress from '@mui/joy/LinearProgress';
import Chip from '@mui/joy/Chip';
import Button from '@mui/joy/Button';
import RefreshIcon from '@mui/icons-material/Refresh';

interface XPProgressProps {
  eventId: string;
  teams: Array<{ id: string; name: string; color?: string }>;
}

interface SkillGains {
  baseXP: number;
  currentXP: number;
  gain: number;
}

interface MemberGains {
  userId: string;
  rsn: string;
  gains: { [skill: string]: SkillGains };
}

interface TeamProgress {
  teamId: string;
  members: MemberGains[];
  totalGains: { [skill: string]: number };
}

const SKILL_NAMES = [
  'attack', 'strength', 'defence', 'ranged', 'prayer', 'magic',
  'runecraft', 'construction', 'hitpoints', 'agility', 'herblore', 'thieving',
  'crafting', 'fletching', 'slayer', 'hunter', 'mining', 'smithing',
  'fishing', 'cooking', 'firemaking', 'woodcutting', 'farming'
];

function formatXP(xp: number): string {
  if (xp >= 1000000) {
    return `${(xp / 1000000).toFixed(2)}M`;
  } else if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K`;
  }
  return xp.toString();
}

function XPProgress({ eventId, teams }: XPProgressProps) {
  const [progress, setProgress] = useState<TeamProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState('');

  const fetchProgress = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching XP progress for event:', eventId);
      const response = await trackingApi.getProgress(eventId);
      console.log('XP progress response:', response);
      if (response.success) {
        setProgress(response.data.teams);
        console.log('Progress teams:', response.data.teams);
      }
    } catch (err) {
      console.error('Error fetching XP progress:', err);
      setError(err instanceof Error ? err.message : 'Failed to load XP progress');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      console.log('Refreshing snapshots for event:', eventId);
      await trackingApi.refreshSnapshots(eventId);
      console.log('Snapshots refreshed, fetching new progress...');
      await fetchProgress();
      // Auto-check tasks after refresh
      console.log('Checking XP tasks...');
      await handleCheckTasks();
    } catch (err) {
      console.error('Error during refresh:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh snapshots');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCheckTasks = async () => {
    try {
      setChecking(true);
      setCheckMessage('');
      const response = await trackingApi.checkXPTasks(eventId);
      if (response.success) {
        setCheckMessage(response.data.message);
        if (response.data.completedTasks.length > 0) {
          setTimeout(() => setCheckMessage(''), 5000);
        }
      }
    } catch (err) {
      console.error('Failed to check XP tasks:', err);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [eventId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert color="danger" variant="soft">
        {error}
      </Alert>
    );
  }

  if (progress.length === 0) {
    return (
      <Alert color="neutral" variant="soft">
        No XP data available yet. Make sure tracking has been started and players have set their RSNs.
      </Alert>
    );
  }

  // Get team info
  const getTeamInfo = (teamId: string) => {
    return teams.find(t => t.id === teamId) || { name: 'Unknown Team', color: undefined };
  };

  // Get top skills by gain for a team
  const getTopSkills = (teamData: TeamProgress, limit: number = 5) => {
    return Object.entries(teamData.totalGains)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .filter(([, gain]) => gain > 0);
  };

  return (
    <Box>
      {checkMessage && (
        <Alert color="success" variant="soft" sx={{ mb: 2 }}>
          {checkMessage}
        </Alert>
      )}
      
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography level="h3">XP Progress</Typography>
        <Button
          size="sm"
          variant="outlined"
          startDecorator={<RefreshIcon />}
          onClick={handleRefresh}
          loading={refreshing || checking}
        >
          Refresh & Check Tasks
        </Button>
      </Stack>

      <AccordionGroup>
        {progress.map((teamData) => {
          const teamInfo = getTeamInfo(teamData.teamId);
          const topSkills = getTopSkills(teamData);
          const totalXPGained = Object.values(teamData.totalGains).reduce((sum, gain) => sum + gain, 0);

          return (
            <Accordion key={teamData.teamId}>
              <AccordionSummary>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: teamInfo.color || '#666',
                    }}
                  />
                  <Typography level="title-md">{teamInfo.name}</Typography>
                  <Chip color="primary" size="sm">
                    {formatXP(totalXPGained)} Total XP
                  </Chip>
                  {topSkills.length > 0 && (
                    <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                      Top: {topSkills.map(([skill]) => skill.charAt(0).toUpperCase() + skill.slice(1)).join(', ')}
                    </Typography>
                  )}
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={3}>
                  {/* Team Member Details */}
                  {teamData.members.map((member) => {
                    const memberTotal = Object.values(member.gains).reduce((sum, g) => sum + g.gain, 0);
                    const topMemberSkills = Object.entries(member.gains)
                      .sort(([, a], [, b]) => b.gain - a.gain)
                      .slice(0, 3)
                      .filter(([, g]) => g.gain > 0);

                    return (
                      <Card key={member.userId} variant="outlined">
                        <CardContent>
                          <Stack spacing={2}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography level="title-sm">{member.rsn}</Typography>
                              <Chip size="sm" variant="soft" color="success">
                                {formatXP(memberTotal)} XP
                              </Chip>
                            </Stack>

                            {topMemberSkills.length > 0 && (
                              <Stack spacing={1}>
                                {topMemberSkills.map(([skill, gains]) => (
                                  <Box key={skill}>
                                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                      <Typography level="body-sm">
                                        {skill.charAt(0).toUpperCase() + skill.slice(1)}
                                      </Typography>
                                      <Typography level="body-sm" sx={{ color: 'success.500' }}>
                                        +{formatXP(gains.gain)}
                                      </Typography>
                                    </Stack>
                                    <LinearProgress
                                      determinate
                                      value={Math.min((gains.gain / 1000000) * 100, 100)}
                                      color="success"
                                      size="sm"
                                    />
                                  </Box>
                                ))}
                              </Stack>
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* All Skills Breakdown */}
                  <Card variant="soft">
                    <CardContent>
                      <Typography level="title-sm" sx={{ mb: 2 }}>
                        All Skills - Team Total
                      </Typography>
                      <Stack spacing={1}>
                        {SKILL_NAMES.filter(skill => teamData.totalGains[skill] > 0).map((skill) => (
                          <Stack key={skill} direction="row" justifyContent="space-between">
                            <Typography level="body-sm">
                              {skill.charAt(0).toUpperCase() + skill.slice(1)}
                            </Typography>
                            <Typography level="body-sm" sx={{ color: 'success.500', fontWeight: 'bold' }}>
                              +{formatXP(teamData.totalGains[skill])}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Stack>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </AccordionGroup>
    </Box>
  );
}

export default XPProgress;
