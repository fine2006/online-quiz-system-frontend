import Link from "next/link";
import { QuizReadOnly } from "@/types/quiz"; // Assuming you define types based on schema

interface QuizCardProps {
  quiz: QuizReadOnly;
  showAdminControls?: boolean; // To show edit/delete
  onDelete?: (quizId: number) => void; // Callback for delete action
}

export default function QuizCard({
  quiz,
  showAdminControls = false,
  onDelete,
}: QuizCardProps) {
  const availability = quiz.has_availability_window
    ? `Available: ${new Date(quiz.available_from!).toLocaleString()} - ${new Date(quiz.available_to!).toLocaleString()}`
    : "Always available (within timing)";
  const canSubmit = quiz.is_available_for_submission
    ? "Open for Submission"
    : "Not Currently Open";

  const handleDelete = () => {
    if (
      onDelete &&
      confirm(`Are you sure you want to delete the quiz "${quiz.title}"?`)
    ) {
      onDelete(quiz.id);
    }
  };

  return (
    <div className="border p-4 rounded-lg shadow bg-white mb-4 flex justify-between items-start">
      <div>
        <h3 className="text-lg font-semibold mb-1">{quiz.title}</h3>
        <p className="text-sm text-gray-600">
          Teacher: {quiz.teacher.username}
        </p>
        <p className="text-sm text-gray-600">
          Timing: {quiz.timing_minutes} minutes
        </p>
        <p className="text-sm text-gray-500">{availability}</p>
        <p
          className={`text-sm font-medium ${quiz.is_available_for_submission ? "text-green-600" : "text-red-600"}`}
        >
          {canSubmit}
        </p>
      </div>
      <div className="flex flex-col items-end space-y-2">
        <Link href={`/quizzes/${quiz.id}`} className="btn btn-primary text-sm">
          View / Attempt
        </Link>
        {showAdminControls && (
          <>
            <Link
              href={`/quizzes/${quiz.id}/edit`}
              className="btn btn-warning text-sm"
            >
              Edit
            </Link>
            <button onClick={handleDelete} className="btn btn-danger text-sm">
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
