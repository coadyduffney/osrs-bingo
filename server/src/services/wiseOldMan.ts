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

interface WOMGroup {
  id: number;
  name: string;
  clanChat?: string;
  description?: string;
  homeworld?: number;
  verified: boolean;
  score: number;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
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
   * Create a group for tracking event participants
   * Groups allow batch updates of all members
   */
  async createGroup(name: string, members: string[]): Promise<WOMGroup | null> {
    try {
      // WOM has a 30 character limit for group names
      const truncatedName = name.length > 30 ? name.substring(0, 30) : name;
      
      const response = await axiosInstance.post('/groups', {
        name: truncatedName,
        clanChat: undefined,
        description: `OSRS Bingo Event: ${name}`,
        members: members.map(username => ({ username, role: 'member' }))
      });
      
      // WOM API returns the group wrapped in a 'group' property
      return response.data.group || response.data;
    } catch (error: any) {
      console.error('Failed to create group:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Update all members of a group (batch update)
   * This is the optimal way to update multiple players at once
   */
  async updateGroup(groupId: number): Promise<{ message: string; count: number } | null> {
    try {
      const response = await axiosInstance.post(`/groups/${groupId}/update-all`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to update group:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Delete a group after event ends
   */
  async deleteGroup(groupId: number, verificationCode: string): Promise<boolean> {
    try {
      await axiosInstance.delete(`/groups/${groupId}`, {
        data: { verificationCode }
      });
      return true;
    } catch (error: any) {
      console.error('Failed to delete group:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Get group details including verification code
   */
  async getGroup(groupId: number): Promise<WOMGroup | null> {
    try {
      const response = await axiosInstance.get(`/groups/${groupId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to get group:', error.response?.data || error.message);
      return null;
    }
  }

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
   * Batch update multiple players using group or individual updates
   * If groupId is provided, uses the efficient group update endpoint
   */
  async batchUpdatePlayers(usernames: string[], groupId?: number): Promise<void> {
    // If we have a group ID, use the efficient batch update
    if (groupId) {
      console.log(`🔄 Updating all ${usernames.length} players via group ${groupId}...`);
      const result = await this.updateGroup(groupId);
      if (result) {
        console.log(`✅ Updated ${result.count} players in a single request`);
      } else {
        console.warn('Group update failed, falling back to individual updates');
        await this._updatePlayersIndividually(usernames);
      }
      return;
    }

    // Fallback to individual updates
    await this._updatePlayersIndividually(usernames);
  }

  /**
   * Update players individually with rate limiting (fallback method)
   */
  private async _updatePlayersIndividually(usernames: string[]): Promise<void> {
    const DELAY_MS = 3000; // 3 seconds between requests to be safe
    
    for (let i = 0; i < usernames.length; i++) {
      const username = usernames[i];
      try {
        await this.updatePlayer(username);
        console.log(`✅ Updated ${username} (${i + 1}/${usernames.length})`);
      } catch (error: any) {
        console.error(`❌ Failed to update ${username}:`, error.message);
      }
      
      // Wait before next request
      if (i < usernames.length - 1) {
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
