import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { fetchApi } from "@/lib/api";
import { QuizAttemptResult, User } from "@/types/quiz";
import AnswerResultDisplay from "@/components/AnswerResultDisplay"; // Client or Server component
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

async function getAttemptDetail(
  id: string,
  accessToken: string | null,
): Promise<QuizAttemptResult | null> {
  if (!accessToken) return null;
  try {
    const attempt = await fetchApi<QuizAttemptResult>(`/attempts/${id}/`, {
      method: "GET",
      accessToken: accessToken,
    });
    return attempt;
  } catch (error: any) {
    console.error(`Failed to fetch attempt ${id}:`, error);
    if (
      error.message?.includes("404") ||
      error.message?.includes("Not found")
    ) {
      notFound();
    }
    if (
      error.message?.includes("403") ||
      error.message?.includes("Forbidden")
    ) {
      console.warn(`Permission denied fetching attempt ${id}.`);
      // Don't use notFound, just return null to indicate permission issue
      return null;
    }
    return null; // Other errors
  }
}

export default async function AttemptDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const customSession = session as
    | (typeof session & { accessToken?: string; user?: User })
    | null;

  // Protect route - must be logged in
  if (!customSession?.accessToken || !customSession?.user) {
    redirect(`/login?callbackUrl=/attempts/${params.id}`);
  }

  const attempt = await getAttemptDetail(params.id, customSession.accessToken);

  // Handle fetch failure or permission denied
  if (!attempt) {
    // If fetch returned null due to permission error from API (403)
    return (
      <div className="text-center p-6 bg-red-100 border border-red-300 rounded">
        <p>You do not have permission to view this attempt result.</p>
        <Link
          href="/attempts"
          className="text-blue-600 hover:underline mt-2 inline-block"
        >
          Back to Attempts
        </Link>
      </div>
    );
    // Note: notFound() should have been triggered if it was a 404 during fetch
  }

  // Optional: Add another layer of authorization check here if needed,
  // although the API should have already enforced it.
  const user = customSession.user;
  const isOwner = user.id === attempt.user.id;
  const isQuizTeacher = user.id === attempt.quiz.teacher.id; // Assumes teacher info is in quiz object
  const isAdmin = user.role === "ADMIN";

  if (!isOwner && !isQuizTeacher && !isAdmin) {
    console.warn(
      `User ${user.id} attempted to access attempt ${attempt.id} without permission (UI check).`,
    );
    return (
      <div className="text-center p-6 bg-red-100 border border-red-300 rounded">
        <p>You do not have permission to view this attempt result.</p>
        <Link
          href="/attempts"
          className="text-blue-600 hover:underline mt-2 inline-block"
        >
          Back to Attempts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Quiz Attempt Results</h1>

      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-3">Summary</h2>
        <p>
          <strong>Quiz:</strong> {attempt.quiz.title}
        </p>
        <p>
          <strong>Student:</strong> {attempt.user.username} (
          {attempt.user.email})
        </p>
        <p>
          <strong>Submitted:</strong>{" "}
          {new Date(attempt.submission_time).toLocaleString()}
        </p>
        <p className="text-2xl font-bold mt-2">
          Score:{" "}
          <span
            className={attempt.score >= 0 ? "text-green-700" : "text-red-700"}
          >
            {attempt.score.toFixed(2)}
          </span>
        </p>
        {attempt.rank !== null && (
          <p>
            <strong>Rank:</strong> {attempt.rank}
          </p>
        )}
        {attempt.best_score_for_quiz !== null && (
          <p>
            <strong>Your Best Score on this Quiz:</strong>{" "}
            {attempt.best_score_for_quiz.toFixed(2)}
          </p>
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4 border-t pt-4">
          Detailed Answers
        </h2>
        {attempt.participant_answers.length > 0 ? (
          <div className="space-y-4">
            {attempt.participant_answers.map((answerResult, index) => (
              <div key={answerResult.id}>
                <p className="text-lg font-medium mb-2">
                  Question {index + 1}:
                </p>
                <AnswerResultDisplay answerResult={answerResult} />
              </div>
            ))}
          </div>
        ) : (
          <p>No detailed answers available for this attempt.</p>
        )}
      </div>
      <div className="mt-6 text-center">
        <Link href="/attempts" className="btn btn-secondary">
          Back to All Attempts
        </Link>
      </div>
    </div>
  );
}
