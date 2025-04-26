import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { fetchApi } from "@/lib/api";
import { QuizReadOnly, User } from "@/types/quiz"; // Use your defined types
import QuizCard from "@/components/QuizCard";
import Link from "next/link";
import QuizDeleteButton from "./QuizDeleteButton"; // Client component for delete action

// Helper function to fetch quizzes (can be reused)
async function getQuizzes(accessToken: string | null): Promise<QuizReadOnly[]> {
  if (!accessToken) return []; // Handle case where user isn't logged in or token is missing
  try {
    const quizzes = await fetchApi<QuizReadOnly[]>("/quizzes/", {
      method: "GET",
      accessToken: accessToken,
    });
    return quizzes;
  } catch (error) {
    console.error("Failed to fetch quizzes:", error);
    // Handle error appropriately, maybe return empty array or throw
    return [];
  }
}

export default async function QuizzesPage() {
  const session = await getServerSession(authOptions);
  // Type assertion for custom session properties
  const customSession = session as
    | (typeof session & { accessToken?: string; user?: User })
    | null;
  const user = customSession?.user;
  const quizzes = await getQuizzes(customSession?.accessToken ?? null);

  // Determine if the user can add/manage quizzes
  const canManageQuizzes = user?.role === "ADMIN" || user?.role === "TEACHER";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Available Quizzes</h1>
        {canManageQuizzes && (
          <Link href="/quizzes/new" className="btn btn-primary">
            Add New Quiz
          </Link>
        )}
      </div>

      {quizzes.length === 0 && !customSession?.accessToken && (
        <p>
          Please{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            log in
          </Link>{" "}
          to view quizzes.
        </p>
      )}
      {quizzes.length === 0 && customSession?.accessToken && (
        <p>No quizzes available at the moment.</p>
      )}

      <div className="space-y-4">
        {quizzes.map((quiz) => {
          // Determine if the current user owns this quiz or is an Admin
          const isAdmin = user?.role === "ADMIN";
          const isOwner = user?.id === quiz.teacher.id;
          const showAdminControls = canManageQuizzes && (isAdmin || isOwner);

          return (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              showAdminControls={showAdminControls}
              // Pass down delete functionality via a client component button if needed
              // onDelete={(quizId) => handleDeleteQuiz(quizId)} // Direct delete is hard in Server Component
            >
              {/* Example using a separate client component for delete button */}
              {showAdminControls && (
                <QuizDeleteButton quizId={quiz.id} quizTitle={quiz.title} />
              )}
            </QuizCard>
          );
        })}
      </div>
    </div>
  );
}
