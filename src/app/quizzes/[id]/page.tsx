import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { fetchApi } from "@/lib/api";
import { QuizReadOnly, User } from "@/types/quiz";
import QuizAttemptForm from "@/components/QuizAttemptForm"; // Client Component
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QuizDeleteButton from "../QuizDeleteButton"; // Re-use delete button

async function getQuizDetail(
  id: string,
  accessToken: string | null,
): Promise<QuizReadOnly | null> {
  if (!accessToken) {
    // Allow viewing quiz details even if not logged in, maybe?
    // Adjust based on backend permission (AllowAny for GET /quizzes/{id}/)
    console.warn(
      "Fetching quiz detail without access token (assuming public access).",
    );
    // If details require auth, return null or throw error
    // return null;
  }
  try {
    // If AllowAny, attempt fetch even without token, otherwise require token
    const quiz = await fetchApi<QuizReadOnly>(`/quizzes/${id}/`, {
      method: "GET",
      // Only pass token if available and potentially required by backend
      ...(accessToken && { accessToken: accessToken }),
    });
    return quiz;
  } catch (error: any) {
    console.error(`Failed to fetch quiz ${id}:`, error);
    if (
      error.message?.includes("404") ||
      error.message?.includes("Not found")
    ) {
      notFound(); // Trigger Next.js 404 page
    }
    // Handle other errors (e.g., permission denied if token was required but invalid/missing)
    if (
      error.message?.includes("Authentication credentials were not provided")
    ) {
      // Maybe redirect to login if auth is strictly required for viewing
      // redirect('/login?callbackUrl=/quizzes/' + id);
      console.error("Authentication required to view this quiz detail.");
      // Decide how to handle - show limited info, or force login?
      // For now, let it fail and potentially show an error message below.
      return null; // Indicate failure
    }
    // Rethrow for other unexpected errors
    // throw error; // Or return null to show a generic error message
    return null;
  }
}

export default async function QuizDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  // Type assertion for custom session properties
  const customSession = session as
    | (typeof session & { accessToken?: string; user?: User })
    | null;
  const user = customSession?.user;

  const quiz = await getQuizDetail(
    params.id,
    customSession?.accessToken ?? null,
  );

  if (!quiz) {
    // Handle case where quiz fetch failed or returned null
    // Check if it was an auth issue vs not found
    if (!customSession?.accessToken) {
      return (
        <div className="text-center p-6 bg-yellow-100 border border-yellow-300 rounded">
          <p>
            You might need to{" "}
            <Link
              href={`/login?callbackUrl=/quizzes/${params.id}`}
              className="font-bold text-blue-600 hover:underline"
            >
              log in
            </Link>{" "}
            to view the details or attempt this quiz.
          </p>
        </div>
      );
    }
    // If logged in but still no quiz, assume fetch failed or non-existent
    return (
      <div className="text-center p-6 bg-red-100 border border-red-300 rounded">
        Quiz details could not be loaded. It might not exist or there was an
        error.
      </div>
    );
    // Or use notFound() if appropriate based on getQuizDetail logic
  }

  // Determine user's ability to interact
  const isStudent = user?.role === "STUDENT";
  const isAdmin = user?.role === "ADMIN";
  const isTeacher = user?.role === "TEACHER";
  const isOwner = user?.id === quiz.teacher.id;
  const isMarked = user?.is_marked ?? false; // Default to false if user is null/undefined

  // Conditions for attempting the quiz
  const canAttempt = isStudent && !isMarked && quiz.is_available_for_submission;

  // Conditions for managing the quiz
  const canManage = (isTeacher && isOwner) || isAdmin;

  return (
    <div className="space-y-6">
      {/* Admin/Owner Controls */}
      {canManage && (
        <div className="bg-gray-100 p-3 rounded border border-gray-300 flex justify-end space-x-3">
          <Link
            href={`/quizzes/${quiz.id}/edit`}
            className="btn btn-warning btn-sm"
          >
            Edit Quiz
          </Link>
          {/* Use the client component for delete */}
          <QuizDeleteButton quizId={quiz.id} quizTitle={quiz.title} />
        </div>
      )}

      {/* Display Quiz Info / Attempt Form */}
      {canAttempt ? (
        // Show the attempt form (Client Component)
        <QuizAttemptForm quiz={quiz} />
      ) : (
        // Show quiz details (Read-only view)
        <div className="bg-white p-6 rounded shadow">
          <h1 className="text-3xl font-bold mb-4">{quiz.title}</h1>
          <p className="text-gray-700 mb-1">Teacher: {quiz.teacher.username}</p>
          <p className="text-gray-700 mb-1">
            Timing: {quiz.timing_minutes} minutes
          </p>
          <p className="text-gray-600 text-sm mb-4">
            {quiz.has_availability_window
              ? `Available: ${new Date(quiz.available_from!).toLocaleString()} - ${new Date(quiz.available_to!).toLocaleString()}`
              : "No specific availability window."}
          </p>

          {/* Why the user cannot attempt */}
          {!isStudent && user && (
            <p className="text-orange-600 bg-orange-100 p-3 rounded mb-4">
              Only students can attempt quizzes.
            </p>
          )}
          {isMarked && (
            <p className="text-red-600 bg-red-100 p-3 rounded mb-4">
              You are marked and cannot submit new attempts.
            </p>
          )}
          {!quiz.is_available_for_submission && isStudent && !isMarked && (
            <p className="text-yellow-600 bg-yellow-100 p-3 rounded mb-4">
              This quiz is not currently open for submission.
            </p>
          )}
          {!user && (
            <p className="text-blue-600 bg-blue-100 p-3 rounded mb-4">
              Please{" "}
              <Link
                href={`/login?callbackUrl=/quizzes/${params.id}`}
                className="font-bold hover:underline"
              >
                log in
              </Link>{" "}
              as a student to attempt this quiz.
            </p>
          )}

          <h2 className="text-xl font-semibold mt-6 mb-3 border-t pt-4">
            Questions Preview
          </h2>
          {quiz.questions.length > 0 ? (
            <ul className="list-decimal pl-5 space-y-3">
              {quiz.questions.map((q) => (
                <li key={q.id} className="text-gray-800">
                  {q.text} ({q.points} points)
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">
              No questions found in this quiz preview.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
