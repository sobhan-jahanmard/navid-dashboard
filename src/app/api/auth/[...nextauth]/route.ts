import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import type { NextAuthOptions } from "next-auth";

// Import Discord helper for role checking
import { determineUserRole } from "@/lib/discordHelper";

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID as string,
      clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
      // Request guild information access
      authorization: {
        params: {
          scope: "identify guilds guilds.members.read",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("===== DISCORD SIGN IN CALLBACK =====");
      console.log("User:", JSON.stringify(user, null, 2));
      console.log("Account:", JSON.stringify(account, null, 2));
      console.log("Profile:", JSON.stringify(profile, null, 2));

      return true;
    },
    async jwt({ token, user, account, profile }) {
      // Initial sign-in
      if (user && account) {
        console.log("===== JWT CALLBACK =====");
        console.log(
          "User data in JWT callback:",
          JSON.stringify(user, null, 2)
        );

        token.id = user.id;
        token.username = user.name || "";

        // Store Discord-specific information
        if (account.provider === "discord" && profile && account.access_token) {
          console.log(
            "Discord-specific profile:",
            JSON.stringify(profile, null, 2)
          );
          token.discordId = profile.id;
          token.discordUsername = profile.username || "";
          token.discordAvatar = profile.avatar;
          token.accessToken = account.access_token;

          // Determine role based on Discord guild roles
          try {
            const userRole = await determineUserRole(
              account.access_token,
              profile.id
            );
            token.role = userRole === "SUPPORT" ? "SUPPORT" : "MEMBER";
            console.log(`User role determined: ${userRole}`);
          } catch (error) {
            console.error("Error determining user role:", error);
            token.role = "MEMBER"; // Default role
          }
        } else {
          token.role = "MEMBER"; // Default role for non-Discord users
        }
      }
      return token;
    },
    async session({ session, token }) {
      console.log("===== SESSION CALLBACK =====");
      console.log("Token in session callback:", JSON.stringify(token, null, 2));

      // Initialize user if it doesn't exist with the required properties
      if (token) {
        session.user = {
          id: token.id as string,
          name: token.username,
          image: token.discordAvatar
            ? `https://cdn.discordapp.com/avatars/${token.discordId}/${token.discordAvatar}.png`
            : null,
          role: token.role as "SUPPORT" | "MEMBER",
          username: token.username as string,
          discordId: token.discordId as string,
          discordUsername: token.discordUsername as string,
        };
      }

      console.log("Session after update:", JSON.stringify(session, null, 2));
      return session;
    },
    async redirect({ url, baseUrl }) {
      console.log("===== REDIRECT CALLBACK =====");
      console.log("Redirect URL:", url);
      console.log("Base URL:", baseUrl);

      // Simplify redirect logic to ensure it works correctly
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      } else if (url.startsWith(baseUrl)) {
        return url;
      }
      return baseUrl;
    },
  },
  debug: true, // Always enable debug mode to see more error information
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // 30 minutes
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
