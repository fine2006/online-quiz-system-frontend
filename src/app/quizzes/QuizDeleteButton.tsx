"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { useState } from "react";

interface QuizDeleteButtonProps {
  quizId: number;
  quizTitle: string;
}

export default function QuizDeleteButton({
  quizId,
  quizTitle,
}: QuizDeleteButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete the quiz "${quizTitle}"?`)) {
      return;
    }

    if (!session?.accessToken) {
      setError("Authentication required.");
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await fetchApi(`/quizzes/${quizId}/`, {
        method: "DELETE",
        accessToken: session.accessToken,
      });
      // Refresh the page data after successful deletion
      router.refresh();
      // Optionally, show a success message before refresh or redirect
    } catch (err: any) {
      console.error("Failed to delete quiz:", err);
      setError(err.message || "Could not delete the quiz.");
      setIsDeleting(false); // Keep button visible to show error
    }
    // No need to set isDeleting to false if router.refresh() works as expected
  };

  return (
    <div className="mt-2">
      <button
        onClick={handleDelete}
        className="btn btn-danger text-sm"
        disabled={isDeleting}
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
