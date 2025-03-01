import 'next-auth';

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      name?: string | null;
      image?: string | null;
      role: 'SUPPORT' | 'MEMBER';
      username: string;
      discordId: string;
      discordUsername: string;
    };
  }

  interface Profile {
    id: string;
    username?: string;
    avatar?: string;
    discriminator?: string;
  }

  interface User {
    id: string;
    name?: string;
  }
}

declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    id: string;
    role: 'SUPPORT' | 'MEMBER';
    username: string;
    discordId: string;
    discordUsername: string;
    discordAvatar?: string;
    accessToken?: string;
  }
} 