import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";

// Define custom token type if needed for role access
interface CustomJWT extends JWT {
  user?: {
    role?: "ADMIN" | "TEACHER" | "STUDENT";
    // other user props
  };
}

// Extend the NextAuthRequest type
interface NextAuthRequest extends NextRequest {
  nextauth: {
    token: CustomJWT | null;
  };
}

// Export the middleware configured with next-auth
export default withAuth(
  // `withAuth` augments your `Request` with the user's token.
  function middleware(req: NextAuthRequest) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // console.log("Middleware token:", token); // Debugging
    // console.log("Middleware pathname:", pathname); // Debugging

    const userRole = token?.user?.role;

    // --- Role-Based Access Control ---

    // Admin-only routes (example)
    // if (pathname.startsWith('/admin') && userRole !== 'ADMIN') {
    //     return NextResponse.redirect(new URL('/unauthorized', req.url));
    // }

    // Teacher/Admin routes
    if (
      pathname.startsWith("/quizzes/new") ||
      pathname.match(/^\/quizzes\/\d+\/edit$/)
    ) {
      if (userRole !== "TEACHER" && userRole !== "ADMIN") {
        console.log(
          `Middleware: Denying access to ${pathname} for role ${userRole}`,
        );
        return NextResponse.redirect(
          new URL("/unauthorized?reason=role", req.url),
        ); // Redirect to an 'unauthorized' page
      }
    }

    // Routes requiring any authenticated user (already handled by withAuth default)
    // if (pathname.startsWith('/attempts') && !token) {
    // Handled by default redirect to login
    // }

    // Allow the request to proceed if none of the above conditions are met
    return NextResponse.next();
  },
  {
    callbacks: {
      // Authorized callback: Decides if the user is authorized to access based on the token
      // Return true to allow access, false to redirect to login page
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // List of paths that require authentication
        const protectedPaths = [
          "/attempts",
          "/quizzes/new",
          "/quizzes/[id]/edit",
        ]; // Add base paths or patterns

        // Check if the current path starts with any of the protected paths
        const requiresAuth = protectedPaths.some((path) => {
          if (path.includes("[id]")) {
            // Basic regex for paths with IDs (like /quizzes/[id]/edit)
            const regex = new RegExp(`^${path.replace(/\[id\]/g, "\\d+")}`);
            return regex.test(pathname);
          }
          return pathname.startsWith(path);
        });

        // If the path requires authentication, a token must exist
        if (requiresAuth) {
          return !!token; // !! converts token (or null) to boolean
        }

        // Allow access to public paths even without a token
        return true;
      },
    },
    // Redirect to custom login page if unauthorized
    pages: {
      signIn: "/login",
      // error: '/auth/error', // Optional error page
    },
  },
);

// Matcher: Specify which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login page itself
     */
    "/((?!api|_next/static|_next/image|favicon.ico|login|unauthorized).*)",
    // Explicitly include specific protected routes if needed, but the above negative lookahead is often better
    // '/attempts/:path*',
    // '/quizzes/new',
    // '/quizzes/:id/edit',
  ],
};

// Add a simple /unauthorized page: src/app/unauthorized/page.tsx
