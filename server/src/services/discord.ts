import fetch from 'node-fetch';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const DISCORD_TASK_WEBHOOK_URL = process.env.DISCORD_TASK_WEBHOOK_URL;
const DISCORD_NOTIFICATION_USER_IDS = process.env.DISCORD_NOTIFICATION_USER_IDS?.split(',').map(id => id.trim()) || [];

console.log('Discord configuration loaded:');
console.log('  - Webhook URL configured:', !!DISCORD_WEBHOOK_URL);
console.log('  - Task Webhook URL configured:', !!DISCORD_TASK_WEBHOOK_URL);
console.log('  - Notification users:', DISCORD_NOTIFICATION_USER_IDS.length > 0 ? DISCORD_NOTIFICATION_USER_IDS : 'none');

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
  image?: { url: string };
  thumbnail?: { url: string };
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

export async function notifyRefreshRetry(
  eventId: string,
  initialFailedPlayers: string[],
  retryResults: { success: string[]; failed: string[] }
): Promise<boolean> {
  const allSucceeded = retryResults.failed.length === 0;
  const title = allSucceeded ? '✅ XP Auto-Refresh Retry Succeeded' : '⚠️ XP Auto-Refresh Retry Partial Failure';
  
  const message = [
    `**Event ID:** ${eventId}`,
    `**Initially Failed Players:** ${initialFailedPlayers.join(', ')}`,
    `**After Retry:**`,
    retryResults.success.length > 0 ? `  ✅ Successfully updated: ${retryResults.success.join(', ')}` : '',
    retryResults.failed.length > 0 ? `  ❌ Still failing: ${retryResults.failed.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  return sendDiscordNotification(title, message, allSucceeded ? 'success' : 'warning');
}

export async function notifyTaskCompleted(
  teamName: string,
  taskTitle: string,
  taskPoints: number,
  rsn?: string,
  verificationImageUrl?: string,
  verificationNote?: string
): Promise<boolean> {
  if (!DISCORD_TASK_WEBHOOK_URL) {
    return false;
  }

  const completionMessages = [
    `just knocked out a task! 🎉`,
    `just crushed a task! 💪`,
    `just completed a task! ⭐`,
    `just checked off a task! ✅`,
    `just nailed a task! 🎯`,
    `just ticked off a task! ✔️`,
    `just smashed a task! 🔥`,
    `just checked a task off the list! 📋`,
    `just accomplished a task! 🏆`,
    `just finished a task! 🎊`,
  ];

  const randomMessage = completionMessages[Math.floor(Math.random() * completionMessages.length)];

  const fields = [
    {
      name: '🎯 Task',
      value: `**${taskTitle}**`,
      inline: false,
    },
    {
      name: '⭐ Points',
      value: `**${taskPoints}**`,
      inline: true,
    },
  ];

  if (rsn) {
    fields.push({
      name: '👤 Player',
      value: rsn,
      inline: true,
    });
  }

  if (verificationNote) {
    fields.push({
      name: '📝 Note',
      value: verificationNote,
      inline: false,
    });
  }

  const embed: DiscordEmbed = {
    title: '✅ Task Completed!',
    description: `**${teamName}** ${randomMessage}`,
    color: 3066993,
    fields,
    timestamp: new Date().toISOString(),
    footer: {
      text: 'OSRS Bingo',
    },
  };

  if (verificationImageUrl) {
    embed.image = {
      url: verificationImageUrl,
    };
  }

  const payload: DiscordMessage = {
    username: 'OSRS Bingo Bot',
    avatar_url: 'https://oldschool.runescape.wiki/images/0/02/Bingo_helmet.png',
    embeds: [embed],
  };

  try {
    const response = await fetch(DISCORD_TASK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log(`Discord task notification sent: ${teamName} - ${taskTitle}`);
      return true;
    } else {
      console.error('Failed to send Discord task notification:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Error sending Discord task notification:', error);
    return false;
  }
}
