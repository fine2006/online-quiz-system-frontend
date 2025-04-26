"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation"; // Use App Router's navigation
import { useEffect } from "react";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/quizzes"; // Default redirect after login

  useEffect(() => {
    // If user is already authenticated, redirect them away from login page
    if (status === "authenticated") {
      router.push(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  // Show loading state or the login button
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <p>Loading...</p>
      </div>
    );
  }

  // Only show login button if not authenticated
  if (status === "unauthenticated") {
    return (
      <div className="max-w-md mx-auto mt-10 p-8 border rounded shadow-lg bg-white text-center">
        <h1 className="text-2xl font-semibold mb-6">Login</h1>
        <p className="mb-6 text-gray-600">
          Sign in using your Google Account to continue.
        </p>
        <button
          onClick={() => signIn("google", { callbackUrl })} // Pass callbackUrl
          className="btn btn-primary w-full flex items-center justify-center space-x-2"
        >
          {/* Basic Google Icon Placeholder */}
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.19,4.73C14.03,4.73 15.69,5.36 16.95,6.57L19.05,4.47C17.22,2.77 14.81,1.73 12.19,1.73C6.92,1.73 2.73,6.09 2.73,12C2.73,17.91 6.92,22.27 12.19,22.27C17.6,22.27 21.96,18.36 21.96,12.33C21.96,11.97 21.66,11.1 21.35,11.1Z" />
          </svg>
          <span>Sign in with Google</span>
        </button>
        {/* Display potential errors passed via URL query params by NextAuth */}
        {searchParams.get("error") && (
          <p className="mt-4 text-red-500 bg-red-100 p-3 rounded">
            Login failed: {searchParams.get("error")}
          </p>
        )}
      </div>
    );
  }

  // Fallback or handle other statuses if necessary
  return null; // Or some placeholder if needed during authenticated state before redirect
}
