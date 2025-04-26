import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // Example: Redirect logged-in users to quizzes
  if (session?.user) {
    redirect("/quizzes");
  }

  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold mb-6">
        Welcome to the Online Quiz System
      </h1>
      <p className="mb-8">Please log in to view and take quizzes.</p>
      <Link href="/login" className="btn btn-primary">
        Go to Login
      </Link>
    </div>
  );
}
