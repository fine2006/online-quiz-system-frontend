import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { fetchApi } from "@/lib/api";
import { QuizAttemptResult, User } from "@/types/quiz";
import Link from "next/link";
import { redirect } from "next/navigation";

async function getAttempts(
  accessToken: string | null,
): Promise<QuizAttemptResult[]> {
  if (!accessToken) return [];
  try {
    const attempts = await fetchApi<QuizAttemptResult[]>("/attempts/", {
      method: "GET",
      accessToken: accessToken,
    });
    return attempts;
  } catch (error) {
    console.error("Failed to fetch attempts:", error);
    return [];
  }
}

export default async function AttemptsPage() {
  const session = await getServerSession(authOptions);
  const customSession = session as
    | (typeof session & { accessToken?: string; user?: User })
    | null;

  // Protect route
  if (!customSession?.accessToken || !customSession?.user) {
    redirect("/login?callbackUrl=/attempts");
  }

  const attempts = await getAttempts(customSession.accessToken);
  const userRole = customSession.user.role;
  const showUserDetails = userRole === "ADMIN" || userRole === "TEACHER";

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Quiz Attempts</h1>

      {attempts.length === 0 ? (
        <p>No attempts found.</p>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Quiz Title
                </th>
                {showUserDetails && (
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Student
                  </th>
                )}
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Score
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Submitted At
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attempts.map((attempt) => (
                <tr key={attempt.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {attempt.quiz.title}
                  </td>
                  {showUserDetails && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {attempt.user.username} ({attempt.user.email})
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {attempt.score.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(attempt.submission_time).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/attempts/${attempt.id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
