"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  QuizReadOnly,
  QuestionReadOnly,
  QuizSubmission,
  ParticipantAnswerSubmit,
} from "@/types/quiz";
import { useSession } from "next-auth/react";
import { fetchApi } from "@/lib/api";

interface QuizAttemptFormProps {
  quiz: QuizReadOnly;
}

interface AnswersState {
  [questionId: number]: {
    selectedOptionIds?: number[];
    selectedAnswerBool?: boolean;
  };
}

export default function QuizAttemptForm({ quiz }: QuizAttemptFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [answers, setAnswers] = useState<AnswersState>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Add timer state if needed

  const handleAnswerChange = (
    questionId: number,
    questionType: QuestionReadOnly["question_type"],
    value: number | boolean, // Option ID or boolean value
    isMultiChoice: boolean = false,
  ) => {
    setAnswers((prev) => {
      const currentQuestionAnswers = prev[questionId] || {};
      let newSelectedOptionIds = currentQuestionAnswers.selectedOptionIds
        ? [...currentQuestionAnswers.selectedOptionIds]
        : [];
      let newSelectedBool = currentQuestionAnswers.selectedAnswerBool;

      if (questionType === "TRUE_FALSE") {
        newSelectedBool = value as boolean;
        newSelectedOptionIds = []; // Clear option IDs for T/F
      } else {
        // MCQ types
        const optionId = value as number;
        newSelectedBool = undefined; // Clear boolean answer for MCQ

        if (isMultiChoice) {
          const index = newSelectedOptionIds.indexOf(optionId);
          if (index > -1) {
            newSelectedOptionIds.splice(index, 1); // Deselect if already selected
          } else {
            newSelectedOptionIds.push(optionId); // Select
          }
        } else {
          // Single choice - replace array with single selection
          newSelectedOptionIds = [optionId];
        }
      }

      return {
        ...prev,
        [questionId]: {
          selectedOptionIds: newSelectedOptionIds,
          selectedAnswerBool: newSelectedBool,
        },
      };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!session?.accessToken) {
      setError("Authentication error. Please log in again.");
      setLoading(false);
      return;
    }

    // Prepare submission data
    const submissionAnswers: ParticipantAnswerSubmit[] = Object.entries(
      answers,
    ).map(([qId, ans]) => ({
      question_id: parseInt(qId, 10),
      selected_option_ids:
        ans.selectedOptionIds && ans.selectedOptionIds.length > 0
          ? ans.selectedOptionIds
          : null, // Send null if empty
      selected_answer_bool:
        ans.selectedAnswerBool !== undefined ? ans.selectedAnswerBool : null, // Send null if not answered
    }));

    // Ensure all questions have an entry, even if unanswered
    quiz.questions.forEach((q) => {
      if (!answers[q.id]) {
        submissionAnswers.push({
          question_id: q.id,
          selected_option_ids: null,
          selected_answer_bool: null,
        });
      }
    });

    const payload: QuizSubmission = {
      quiz_id: quiz.id,
      answers: submissionAnswers,
    };

    console.log("Submitting quiz attempt:", payload);

    try {
      const result = await fetchApi(`/quizzes/${quiz.id}/submit/`, {
        method: "POST",
        accessToken: session.accessToken,
        data: payload,
      });
      console.log("Submission successful:", result);
      // Assuming result contains the attempt ID
      const attemptId = (result as any)?.id;
      if (attemptId) {
        router.push(`/attempts/${attemptId}`); // Redirect to results page
      } else {
        console.warn(
          "Attempt ID not found in submission response, redirecting to attempts list.",
        );
        router.push("/attempts");
      }
      router.refresh(); // Refresh any server data if needed
    } catch (err: any) {
      console.error("API Error submitting quiz:", err);
      setError(err.message || "Failed to submit quiz attempt.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 bg-white p-6 rounded shadow"
    >
      <h2 className="text-2xl font-bold">Attempting: {quiz.title}</h2>
      {/* Add Timer Display Here */}
      <p className="text-sm text-gray-600">
        {quiz.timing_minutes} minutes allowed.
      </p>

      {error && <p className="text-red-500 bg-red-100 p-3 rounded">{error}</p>}

      {quiz.questions.map((question, index) => (
        <div key={question.id} className="border-t pt-6 mt-6">
          <p className="font-semibold mb-2">
            Question {index + 1} ({question.points} points)
          </p>
          <p className="mb-4">{question.text}</p>

          {question.question_type === "TRUE_FALSE" && (
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  className="form-radio mr-2"
                  onChange={() =>
                    handleAnswerChange(
                      question.id,
                      question.question_type,
                      true,
                    )
                  }
                  checked={answers[question.id]?.selectedAnswerBool === true}
                />{" "}
                True
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  className="form-radio mr-2"
                  onChange={() =>
                    handleAnswerChange(
                      question.id,
                      question.question_type,
                      false,
                    )
                  }
                  checked={answers[question.id]?.selectedAnswerBool === false}
                />{" "}
                False
              </label>
            </div>
          )}

          {(question.question_type === "SINGLE_MCQ" ||
            question.question_type === "MULTI_MCQ") && (
            <div className="space-y-2">
              {question.answer_options.map((option) => (
                <label
                  key={option.id}
                  className="flex items-center cursor-pointer"
                >
                  <input
                    type={
                      question.question_type === "SINGLE_MCQ"
                        ? "radio"
                        : "checkbox"
                    }
                    name={`q-${question.id}`} // Radio buttons need same name
                    className={
                      question.question_type === "SINGLE_MCQ"
                        ? "form-radio mr-2"
                        : "form-checkbox mr-2"
                    }
                    onChange={() =>
                      handleAnswerChange(
                        question.id,
                        question.question_type,
                        option.id,
                        question.question_type === "MULTI_MCQ",
                      )
                    }
                    // Check if option ID is in the selected array for this question
                    checked={answers[question.id]?.selectedOptionIds?.includes(
                      option.id,
                    )}
                  />{" "}
                  {option.text}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="pt-6 border-t">
        <button
          type="submit"
          className="btn btn-primary w-full md:w-auto"
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit Quiz"}
        </button>
      </div>
    </form>
  );
}
