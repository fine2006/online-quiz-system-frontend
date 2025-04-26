"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

export default function AuthStatus() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="text-gray-500">Loading...</div>;
  }

  if (session?.user) {
    // Access custom fields from the session object
    const backendUser = session.user as any; // Type assertion might be needed depending on Session interface setup
    const role = backendUser?.role || "N/A";
    const isMarked = backendUser?.is_marked ? " (Marked)" : "";

    return (
      <div className="flex items-center space-x-4">
        <span className="text-sm">
          {session.user.email} ({role}
          {isMarked})
        </span>
        {/* Links based on role */}
        {(role === "TEACHER" || role === "ADMIN") && (
          <Link
            href="/quizzes/new"
            className="text-blue-600 hover:underline text-sm"
          >
            New Quiz
          </Link>
        )}
        <Link href="/quizzes" className="text-blue-600 hover:underline text-sm">
          Quizzes
        </Link>
        <Link
          href="/attempts"
          className="text-blue-600 hover:underline text-sm"
        >
          My Attempts
        </Link>
        <button onClick={() => signOut()} className="btn btn-secondary text-sm">
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => signIn("google")} className="btn btn-primary">
      Sign in with Google
    </button>
  );
}
