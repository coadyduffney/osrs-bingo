import axios from 'axios';

const WOM_API_BASE = 'https://api.wiseoldman.net/v2';
const WOM_USER_AGENT = 'OSRS-Bingo-App'; // Recommended by WOM to identify your app

interface WOMPlayer {
  id: number;
  username: string;
  displayName: string;
  type: string;
  build: string;
  country: string | null;
  status: string;
  patron: boolean;
  exp: number;
  ehp: number;
  ehb: number;
  ttm: number;
  tt200m: number;
  registeredAt: string;
  updatedAt: string;
  lastChangedAt: string;
  lastImportedAt: string | null;
}

interface WOMSnapshot {
  createdAt: string;
  importedAt: string | null;
  data: {
    skills: {
      [key: string]: {
        metric: string;
        experience: number;
        rank: number;
        level: number;
        ehp: number;
      };
    };
    bosses: {
      [key: string]: {
        metric: string;
        kills: number;
        rank: number;
        ehb: number;
      };
    };
    activities: {
      [key: string]: {
        metric: string;
        score: number;
        rank: number;
      };
    };
    computed: {
      [key: string]: {
        metric: string;
        value: number;
        rank: number;
      };
    };
  };
}

interface PlayerSnapshot {
  rsn: string;
  playerId: number;
  snapshotTime: string;
  skills: { 
    [skillName: string]: {
      experience: number;
      level: number;
    }
  };
}

const axiosInstance = axios.create({
  baseURL: WOM_API_BASE,
  headers: {
    'User-Agent': WOM_USER_AGENT,
  },
  timeout: 10000,
});

export class WiseOldManService {
  /**
   * Search for a player by username
   */
  async searchPlayer(username: string): Promise<WOMPlayer | null> {
    try {
      const response = await axiosInstance.get(`/players/${username}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(`Failed to search player: ${error.message}`);
    }
  }

  /**
   * Update a player's data (triggers WOM to fetch from hiscores)
   */
  async updatePlayer(username: string): Promise<WOMPlayer> {
    try {
      const response = await axiosInstance.post(`/players/${username}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to update player: ${error.message}`);
    }
  }

  /**
   * Get the latest snapshot for a player
   */
  async getLatestSnapshot(username: string): Promise<PlayerSnapshot | null> {
    try {
      // Get player data which includes latest stats
      // NOTE: Player should be updated via updatePlayer() or batchUpdatePlayers() before calling this
      const player = await this.searchPlayer(username);
      if (!player) {
        return null;
      }

      // Get snapshots to get detailed skill data
      const response = await axiosInstance.get(`/players/${username}/snapshots`, {
        params: { limit: 1 }
      });

      if (!response.data || response.data.length === 0) {
        return null;
      }

      const snapshot: WOMSnapshot = response.data[0];
      
      // Extract skill experience and level values
      const skills: { [key: string]: { experience: number; level: number } } = {};
      for (const [skillName, skillData] of Object.entries(snapshot.data.skills)) {
        skills[skillName.toLowerCase()] = {
          experience: skillData.experience,
          level: skillData.level,
        };
      }

      return {
        rsn: player.displayName,
        playerId: player.id,
        snapshotTime: snapshot.createdAt,
        skills,
      };
    } catch (error: any) {
      console.error(`Error getting snapshot for ${username}:`, error.message);
      return null;
    }
  }

  /**
   * Get XP gains for a player between two timestamps
   */
  async getGainsBetween(
    username: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ [skillName: string]: number } | null> {
    try {
      const response = await axiosInstance.get(`/players/${username}/gained`, {
        params: {
          period: 'custom',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });

      if (!response.data || !response.data.data) {
        return null;
      }

      const gains: { [key: string]: number } = {};
      for (const [skillName, skillData] of Object.entries(response.data.data.skills)) {
        const data = skillData as any;
        gains[skillName.toLowerCase()] = data.experience?.gained || 0;
      }

      return gains;
    } catch (error: any) {
      console.error(`Error getting gains for ${username}:`, error.message);
      return null;
    }
  }

  /**
   * Batch update multiple players (rate-limited)
   */
  async batchUpdatePlayers(usernames: string[]): Promise<void> {
    const DELAY_MS = 1000; // 1 second between requests to respect rate limits
    
    for (const username of usernames) {
      try {
        await this.updatePlayer(username);
        console.log(`✅ Updated ${username}`);
      } catch (error: any) {
        console.error(`❌ Failed to update ${username}:`, error.message);
      }
      
      // Wait before next request
      if (usernames.indexOf(username) < usernames.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }
  }

  /**
   * Calculate total team XP gain for a specific skill
   */
  calculateTeamSkillGain(
    baselineSnapshots: Map<string, PlayerSnapshot>,
    currentSnapshots: Map<string, PlayerSnapshot>,
    skillName: string
  ): number {
    let totalGain = 0;

    for (const [rsn, currentSnapshot] of currentSnapshots.entries()) {
      const baseline = baselineSnapshots.get(rsn);
      if (!baseline) continue;

      const currentXP = currentSnapshot.skills[skillName.toLowerCase()]?.experience || 0;
      const baselineXP = baseline.skills[skillName.toLowerCase()]?.experience || 0;
      const gain = currentXP - baselineXP;

      if (gain > 0) {
        totalGain += gain;
      }
    }

    return totalGain;
  }
}

export const womService = new WiseOldManService();
