/**
 * Helper functions for Discord API integration
 */

// Discord API endpoints
const DISCORD_API = 'https://discord.com/api/v10';
const GUILD_ID = '1219645545115680888';
const SUPPORT_ROLE_ID = '1318578831543504986';

/**
 * Get user's roles in the specified Discord guild
 */
export async function getUserGuildRoles(accessToken: string, userId: string): Promise<string[]> {
  try {
    // Fetch the guild member information
    const response = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/members/${userId}`, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      },
    });

    if (!response.ok) {
      console.error('Discord API error:', await response.text());
      return [];
    }

    const data = await response.json();
    return data.roles || [];
  } catch (error) {
    console.error('Error fetching Discord roles:', error);
    return [];
  }
}

/**
 * Check if user has support role
 */
export function hasUserSupportRole(roles: string[]): boolean {
  return roles.includes(SUPPORT_ROLE_ID);
}

/**
 * Determines user's application role based on Discord guild roles
 */
export async function determineUserRole(accessToken: string, userId: string): Promise<string> {
  try {
    const userRoles = await getUserGuildRoles(accessToken, userId);
    
    // Check if user has support role
    if (hasUserSupportRole(userRoles)) {
      return 'SUPPORT';
    }
    
    // Default role for authenticated Discord users
    return 'MEMBER';
  } catch (error) {
    console.error('Error determining user role:', error);
    return 'MEMBER'; // Default to member on error
  }
} 