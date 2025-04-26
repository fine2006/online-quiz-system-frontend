import axios, { AxiosRequestConfig, AxiosError } from "axios";
import { getSession } from "next-auth/react"; // For client-side
import { getServerSession } from "next-auth/next"; // For server-side
import { authOptions } from "@/lib/auth"; // Adjust path

const API_BASE_URL = process.env.BACKEND_API_URL;

// Define a type for API errors
interface ApiErrorResponse {
  message: string;
  details?: any;
}

// Instance for backend calls (can configure base URL, etc.)
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Function to get the current access token (adapt based on context)
// This is a simplified example. In practice, getting the token cleanly
// into a shared helper can be tricky. Often, you fetch the token within
// the component/page/server action where you need to make the call.
async function getAccessToken(): Promise<string | null> {
  // Check if running on the server or client
  // Note: Directly calling getSession or getServerSession here might be
  // problematic depending on the context. It's often better to pass the
  // token directly to the fetchApi function from where it's called.
  // This function is more illustrative.
  try {
    // Attempt to get session (might need context in RSC)
    // This part needs careful handling depending on usage context (Client/Server Component)
    const session =
      typeof window === "undefined"
        ? await getServerSession(authOptions) // Needs authOptions passed correctly in RSCs/Route Handlers
        : await getSession(); // Works in Client Components

    // Type guard for custom session
    const customSession = session as
      | (typeof session & { accessToken?: string; error?: string })
      | null;

    if (customSession?.error === "RefreshAccessTokenError") {
      console.error("Cannot make API call: Refresh token failed.");
      // Optionally force logout here
      return null;
    }

    return customSession?.accessToken ?? null;
  } catch (e) {
    console.error("Error getting access token:", e);
    return null;
  }
}

// --- Preferred Approach: Pass Token Explicitly ---

interface FetchApiOptions extends AxiosRequestConfig {
  accessToken: string | null; // Require token to be passed explicitly
}

export async function fetchApi<T = any>(
  endpoint: string,
  options: FetchApiOptions,
): Promise<T> {
  const {
    accessToken,
    method = "GET",
    data,
    params,
    headers = {},
    ...rest
  } = options;

  if (!accessToken) {
    console.error(
      `WorkspaceApi (${method} ${endpoint}): No access token provided.`,
    );
    throw new Error("Authentication token is missing.");
  }

  try {
    const response = await apiClient({
      url: endpoint,
      method: method,
      headers: {
        ...headers,
        Authorization: `Bearer ${accessToken}`, // Add the auth header
      },
      data: data, // For POST, PUT, PATCH
      params: params, // For GET requests query parameters
      ...rest,
    });
    return response.data as T;
  } catch (error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    console.error(
      `API Error (${method} ${endpoint}):`,
      axiosError.response?.status,
      axiosError.response?.data || axiosError.message,
    );

    // You could add more specific error handling here (e.g., for 401, 403, 404)
    if (axiosError.response) {
      throw new Error(
        axiosError.response.data?.message ||
          `API request failed with status ${axiosError.response.status}`,
      );
    } else if (axiosError.request) {
      throw new Error("API request made but no response received.");
    } else {
      throw new Error(`API request setup error: ${axiosError.message}`);
    }
  }
}

// Export API base URL if needed elsewhere
export { API_BASE_URL };
