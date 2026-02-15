import fetch from 'node-fetch';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const DISCORD_NOTIFICATION_USER_IDS = process.env.DISCORD_NOTIFICATION_USER_IDS?.split(',').map(id => id.trim()) || [];

interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
  footer?: { text: string };
}

export async function sendDiscordNotification(
  title: string,
  message: string,
  type: 'error' | 'warning' | 'info' | 'success' = 'info'
): Promise<boolean> {
  if (!DISCORD_WEBHOOK_URL) {
    console.log('Discord webhook not configured, skipping notification');
    return false;
  }

  const colors = {
    error: 16711680,
    warning: 16776960,
    info: 3447003,
    success: 3066993,
  };

  const mentions = DISCORD_NOTIFICATION_USER_IDS.length > 0
    ? DISCORD_NOTIFICATION_USER_IDS.map(id => `<@${id}>`).join(' ')
    : '';

  const payload: DiscordMessage = {
    content: mentions || undefined,
    username: 'OSRS Bingo Bot',
    avatar_url: 'https://oldschool.runescape.wiki/images/0/02/Bingo_helmet.png',
    embeds: [
      {
        title,
        description: message,
        color: colors[type],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'OSRS Bingo Auto-Refresh',
        },
      },
    ],
  };

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log('Discord notification sent successfully');
      return true;
    } else {
      console.error('Failed to send Discord notification:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Error sending Discord notification:', error);
    return false;
  }
}

export async function notifyRefreshError(
  eventId: string,
  error: string,
  playersFailed: string[] = []
): Promise<boolean> {
  const message = [
    `**Event ID:** ${eventId}`,
    `**Error:** ${error}`,
    playersFailed.length > 0 ? `**Failed Players:** ${playersFailed.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  return sendDiscordNotification(
    '⚠️ XP Auto-Refresh Error',
    message,
    'error'
  );
}
