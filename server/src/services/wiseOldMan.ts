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
    ...(process.env.WOM_API_KEY ? { 'x-api-key': process.env.WOM_API_KEY } : {}),
  },
  timeout: 10000,
});

export class WiseOldManService {
  /**
   * Search for an existing group by name
   */
  async findGroupByName(name: string): Promise<WOMGroup | null> {
    try {
      const response = await axiosInstance.get('/groups', {
        params: { name }
      });
      const groups = response.data;
      if (Array.isArray(groups) && groups.length > 0) {
        // Find exact match
        const match = groups.find((g: any) => g.name === name);
        return match || null;
      }
      return null;
    } catch (error: any) {
      console.log('No existing group found');
      return null;
    }
  }

  /**
   * Create a group for tracking event participants
   * Groups allow batch updates of all members
   */
  async createGroup(name: string, members: string[]): Promise<WOMGroup | null> {
    // WOM has a 30 character limit for group names
    const truncatedName = name.length > 30 ? name.substring(0, 30) : name;
    
    try {
      const response = await axiosInstance.post('/groups', {
        name: truncatedName,
        clanChat: undefined,
        description: `OSRS Bingo Event: ${name}`,
        members: members.map(username => ({ username, role: 'member' }))
      });
      
      // WOM API returns the group wrapped in a 'group' property
      const group = response.data.group || response.data;
      console.log(`✅ Group created successfully: ID=${group.id}, Name=${group.name}`);
      return group;
    } catch (error: any) {
      const errorData = error.response?.data;
      
      // If group name already exists, try to find and reuse it
      if (errorData?.message?.includes('already taken')) {
        console.log('⚠️  Group name already exists, attempting to reuse existing group...');
        const existingGroup = await this.findGroupByName(truncatedName);
        if (existingGroup) {
          console.log(`✅ Reusing existing group: ID=${existingGroup.id}, Name=${existingGroup.name}`);
          return existingGroup;
        }
      }
      
      console.error('Failed to create group:', errorData || error.message);
      return null;
    }
  }

  /**
   * Get or create a group for an event
   * Checks if group exists first, creates new one if not
   */
  async getOrCreateGroup(name: string, members: string[]): Promise<WOMGroup | null> {
    // First, check if group already exists
    const existing = await this.findGroupByName(name.length > 30 ? name.substring(0, 30) : name);
    if (existing) {
      console.log(`✅ Found existing group: ID=${existing.id}, Name=${existing.name}`);
      return existing;
    }
    
    // Create new group if it doesn't exist
    return await this.createGroup(name, members);
  }

  /**
   * Update all members of a group (batch update)
   * This is the optimal way to update multiple players at once
   */
  async updateGroup(groupId: number): Promise<{ message: string; count: number } | null> {
    try {
      console.log(`📡 Calling WOM API: POST /groups/${groupId}/update-all`);
      const response = await axiosInstance.post(`/groups/${groupId}/update-all`);
      console.log(`✅ WOM Response:`, response.data);
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data || error.message;
      console.error(`❌ Failed to update group ${groupId}:`, errorMsg);
      if (error.response?.status === 429) {
        console.error('⚠️  Rate limited even with group update! This should not happen.');
      }
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
      console.log(`   Players: ${usernames.join(', ')}`);
      const result = await this.updateGroup(groupId);
      if (result) {
        console.log(`✅ Updated ${result.count} players in a single request`);
        return;
      } else {
        console.warn('⚠️  Group update failed, falling back to individual updates');
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
