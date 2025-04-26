import { NextAuthOptions, User as NextAuthUser, Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import axios from "axios"; // Using axios for backend API calls

// Define custom user and session types to include backend-specific fields
interface BackendUser {
  id: number;
  username: string;
  email: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  is_marked: boolean;
}

interface CustomSession extends Session {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  user?: BackendUser & NextAuthUser; // Merge backend user details with next-auth user
  error?: string; // To propagate token refresh errors
}

interface CustomJWT extends JWT {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  user?: BackendUser; // Store backend user details here
  error?: string;
}

const BACKEND_API_URL = process.env.BACKEND_API_URL;
const GOOGLE_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!BACKEND_API_URL || !GOOGLE_ID || !GOOGLE_SECRET) {
  throw new Error("Missing environment variables for API URL or Google OAuth");
}

// Helper function to refresh the access token
async function refreshAccessToken(token: CustomJWT): Promise<CustomJWT> {
  if (!token.refreshToken) {
    console.error("No refresh token available");
    return { ...token, error: "MissingRefreshTokenError" };
  }

  try {
    console.log("Attempting to refresh access token...");
    const response = await axios.post(
      `${BACKEND_API_URL}/auth/token/refresh/`,
      {
        refresh: token.refreshToken,
      },
    );

    const { access, refresh } = response.data;

    // Calculate expiry time (assuming backend returns access token lifetime, e.g., 5 mins)
    // You might need to adjust this based on your backend's token expiry configuration
    const newExpiry = Date.now() + 5 * 60 * 1000; // Example: 5 minutes

    console.log("Access token refreshed successfully.");

    return {
      ...token,
      accessToken: access,
      // Conditionally update refresh token if the backend provides a new one (dj-rest-auth rotating refresh tokens)
      refreshToken: refresh ?? token.refreshToken,
      accessTokenExpires: newExpiry,
      error: undefined, // Clear previous errors
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    // It's critical to revoke access if the refresh token fails
    return {
      ...token,
      error: "RefreshAccessTokenError",
      // Consider clearing tokens to force re-login
      accessToken: undefined,
      refreshToken: undefined,
      accessTokenExpires: 0,
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: GOOGLE_ID,
      clientSecret: GOOGLE_SECRET,
      // Important: Define the scope to get necessary info like email
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope:
            "openid email profile https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    /**
     * This JWT callback is executed first.
     * It handles the interaction with your backend's social login endpoint
     * and manages the lifecycle of the backend's JWTs (access and refresh tokens).
     */
    async jwt({ token, user, account, profile }): Promise<CustomJWT> {
      let customToken = token as CustomJWT;

      // Initial sign-in: 'account' and 'profile'/'user' are available.
      if (account && user) {
        console.log("Initial sign-in: Exchanging Google token with backend...");
        if (account.provider === "google") {
          try {
            // Send the authorization code (or id_token depending on backend) to your backend
            // dj-rest-auth typically uses an access_token or id_token from Google
            // Adjust the payload based on your backend's /api/auth/google/callback/ expectation
            const backendResponse = await axios.post(
              `${BACKEND_API_URL}/auth/google/callback/`, // Ensure this matches your dj-rest-auth URL
              {
                access_token: account.access_token, // Send Google's access token
                id_token: account.id_token, // Send Google's ID token
                // Add any other required fields your backend expects
              },
            );

            const {
              access_token,
              refresh_token,
              user: backendUser,
            } = backendResponse.data;

            // Calculate expiry (adjust based on backend config)
            const accessTokenExpires = Date.now() + 5 * 60 * 1000; // Example: 5 minutes

            console.log(
              "Backend login successful. Storing tokens and user info.",
            );
            customToken = {
              ...customToken,
              accessToken: access_token,
              refreshToken: refresh_token,
              accessTokenExpires: accessTokenExpires,
              user: backendUser as BackendUser, // Store full backend user object
              error: undefined,
            };
            return customToken; // Return the token with backend JWTs and user info
          } catch (error: any) {
            console.error(
              "Backend social login error:",
              error.response?.data || error.message,
            );
            // Handle specific errors if needed
            customToken.error = "BackendLoginFailed";
            // Clear potentially sensitive Google tokens if backend failed
            delete customToken.accessToken;
            delete customToken.refreshToken;
            delete customToken.accessTokenExpires;
            delete customToken.user;
            return customToken; // Return token with error
          }
        }
      }

      // Subsequent calls: Check if the access token is still valid.
      // customToken.accessTokenExpires should be set during sign-in or refresh
      if (
        customToken.accessTokenExpires &&
        Date.now() < customToken.accessTokenExpires
      ) {
        // Access token is valid
        // console.log("Access token is valid.");
        return customToken;
      }

      // Access token has expired, try to refresh it.
      console.log("Access token expired or not present. Attempting refresh.");
      if (customToken.refreshToken) {
        return refreshAccessToken(customToken);
      } else {
        // No refresh token available, cannot refresh
        console.error("Cannot refresh token: Refresh token missing.");
        customToken.error = "MissingRefreshTokenError";
        // Clear expired/invalid tokens
        delete customToken.accessToken;
        delete customToken.accessTokenExpires;
        delete customToken.user; // User info might be stale without a valid session
        return customToken;
      }
    },

    /**
     * This Session callback is executed after the JWT callback.
     * It makes the data stored in the JWT available to the client-side session object.
     */
    async session({
      session,
      token,
    }: {
      session: Session;
      token: JWT;
    }): Promise<Session> {
      const customSession = session as CustomSession;
      const customToken = token as CustomJWT;

      // Pass data from the JWT (managed above) to the session
      customSession.accessToken = customToken.accessToken;
      customSession.refreshToken = customToken.refreshToken; // Include refresh token if needed client-side (usually not)
      customSession.accessTokenExpires = customToken.accessTokenExpires;
      customSession.user = customToken.user; // Pass the backend user object
      customSession.error = customToken.error; // Pass any errors (like refresh failure)

      // console.log("Session callback - populated session:", customSession);
      return customSession; // Return the enhanced session
    },
  },
  pages: {
    signIn: "/login", // Redirect users to your custom login page
    // error: '/auth/error', // Optional: Custom error page
  },
  // Debugging can be helpful during development
  // debug: process.env.NODE_ENV === 'development',
};
