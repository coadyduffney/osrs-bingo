import { Task, Team } from '../services/api';

export interface BingoResult {
  hasBingo: boolean;
  winningTeam?: Team;
  bingoType?: 'row' | 'column' | 'diagonal';
  bingoIndex?: number; // Row/column index (0-based)
}

/**
 * Detect if a team has achieved bingo on the board
 * @param tasks - All tasks on the board
 * @param team - The team to check
 * @param boardSize - Size of the board (5, 7, 9, or 10)
 * @returns BingoResult with detection info
 */
export function detectBingo(
  tasks: Task[],
  team: Team,
  boardSize: number
): BingoResult {
  // Create a 2D array representing the board
  const board: boolean[][] = Array(boardSize)
    .fill(null)
    .map(() => Array(boardSize).fill(false));

  // Mark completed tasks for this team
  tasks.forEach((task) => {
    if (task.completedByTeamIds.includes(team.id)) {
      const row = Math.floor(task.position / boardSize);
      const col = task.position % boardSize;
      board[row][col] = true;
    }
  });

  // Check rows
  for (let row = 0; row < boardSize; row++) {
    if (board[row].every((cell) => cell)) {
      return {
        hasBingo: true,
        winningTeam: team,
        bingoType: 'row',
        bingoIndex: row,
      };
    }
  }

  // Check columns
  for (let col = 0; col < boardSize; col++) {
    if (board.every((row) => row[col])) {
      return {
        hasBingo: true,
        winningTeam: team,
        bingoType: 'column',
        bingoIndex: col,
      };
    }
  }

  // Check main diagonal (top-left to bottom-right)
  let mainDiagonalComplete = true;
  for (let i = 0; i < boardSize; i++) {
    if (!board[i][i]) {
      mainDiagonalComplete = false;
      break;
    }
  }
  if (mainDiagonalComplete) {
    return {
      hasBingo: true,
      winningTeam: team,
      bingoType: 'diagonal',
      bingoIndex: 0,
    };
  }

  // Check anti-diagonal (top-right to bottom-left)
  let antiDiagonalComplete = true;
  for (let i = 0; i < boardSize; i++) {
    if (!board[i][boardSize - 1 - i]) {
      antiDiagonalComplete = false;
      break;
    }
  }
  if (antiDiagonalComplete) {
    return {
      hasBingo: true,
      winningTeam: team,
      bingoType: 'diagonal',
      bingoIndex: 1,
    };
  }

  return { hasBingo: false };
}

/**
 * Check all teams for bingo and return the first winner
 * @param tasks - All tasks on the board
 * @param teams - All teams in the event
 * @param boardSize - Size of the board
 * @returns BingoResult for the first winning team, or no bingo
 */
export function checkAllTeamsForBingo(
  tasks: Task[],
  teams: Team[],
  boardSize: number
): BingoResult {
  for (const team of teams) {
    const result = detectBingo(tasks, team, boardSize);
    if (result.hasBingo) {
      return result;
    }
  }
  return { hasBingo: false };
}

/**
 * Get leaderboard data for all teams
 * @param tasks - All tasks on the board
 * @param teams - All teams in the event
 * @returns Sorted array of teams with completion stats
 */
export function getLeaderboard(
  tasks: Task[],
  teams: Team[]
): Array<{
  team: Team;
  tasksCompleted: number;
  totalPoints: number;
  completionPercentage: number;
}> {
  const totalTasks = tasks.length;

  const leaderboardData = teams.map((team) => {
    const completedTasks = tasks.filter((task) =>
      task.completedByTeamIds.includes(team.id)
    );
    const tasksCompleted = completedTasks.length;
    const totalPoints = completedTasks.reduce(
      (sum, task) => sum + task.points,
      0
    );
    const completionPercentage = totalTasks > 0
      ? Math.round((tasksCompleted / totalTasks) * 100)
      : 0;

    return {
      team,
      tasksCompleted,
      totalPoints,
      completionPercentage,
    };
  });

  // Sort by total points (descending), then by tasks completed
  return leaderboardData.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    return b.tasksCompleted - a.tasksCompleted;
  });
}
