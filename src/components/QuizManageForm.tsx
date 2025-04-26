"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation"; // Use App Router's navigation
import {
  QuizWritable,
  QuestionWritable,
  AnswerOptionWritable,
} from "@/types/quiz"; // Define these types
import { fetchApi } from "@/lib/api"; // Your API helper
import { useSession } from "next-auth/react";

interface QuizManageFormProps {
  quiz?: QuizWritable; // Pass existing quiz data for editing
  isEditMode: boolean;
}

// Define initial states matching Writable schemas
const initialAnswerOption: Omit<AnswerOptionWritable, "id"> = {
  text: "",
  is_correct: false,
};
const initialQuestion: Omit<QuestionWritable, "id"> = {
  question_type: "SINGLE_MCQ",
  text: "",
  points: 1,
  correct_answer_bool: null,
  answer_options: [{ ...initialAnswerOption }],
};
const initialQuiz: Omit<QuizWritable, "id"> = {
  title: "",
  timing_minutes: 10,
  available_from: null,
  available_to: null,
  questions: [{ ...initialQuestion }],
};

export default function QuizManageForm({
  quiz: existingQuiz,
  isEditMode,
}: QuizManageFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [quizData, setQuizData] =
    useState<Omit<QuizWritable, "id">>(initialQuiz);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-populate form if in edit mode
  useEffect(() => {
    if (isEditMode && existingQuiz) {
      // Format dates for datetime-local input if they exist
      const formattedQuiz = {
        ...existingQuiz,
        available_from: existingQuiz.available_from
          ? new Date(existingQuiz.available_from).toISOString().slice(0, 16)
          : null,
        available_to: existingQuiz.available_to
          ? new Date(existingQuiz.available_to).toISOString().slice(0, 16)
          : null,
        // Ensure questions/answers have necessary fields for the form state
        questions:
          existingQuiz.questions?.map((q) => ({
            ...q,
            answer_options: q.answer_options?.map((a) => ({ ...a })) || [],
          })) || [],
      };
      setQuizData(formattedQuiz);
    }
  }, [isEditMode, existingQuiz]);

  const handleQuizChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const parsedValue = type === "number" ? parseInt(value, 10) || 0 : value;
    setQuizData((prev) => ({ ...prev, [name]: parsedValue }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Convert datetime-local string to ISO string or null
    const isoValue = value ? new Date(value).toISOString() : null;
    setQuizData((prev) => ({ ...prev, [name]: isoValue }));
  };

  const handleQuestionChange = (
    index: number,
    field: keyof QuestionWritable,
    value: any,
  ) => {
    const newQuestions = [...quizData.questions];
    // Type assertion needed as field can be various keys
    (newQuestions[index] as any)[field] = value;

    // Reset incompatible fields based on type
    if (field === "question_type") {
      if (value === "TRUE_FALSE") {
        newQuestions[index].answer_options = []; // Clear options for T/F
        newQuestions[index].correct_answer_bool =
          newQuestions[index].correct_answer_bool ?? false; // Default to false
      } else {
        // MCQ types
        newQuestions[index].correct_answer_bool = null; // Clear bool answer
        if (newQuestions[index].answer_options.length === 0) {
          newQuestions[index].answer_options = [{ ...initialAnswerOption }]; // Add default option if needed
        }
      }
    }

    setQuizData((prev) => ({ ...prev, questions: newQuestions }));
  };

  const addQuestion = () => {
    setQuizData((prev) => ({
      ...prev,
      questions: [...prev.questions, { ...initialQuestion }],
    }));
  };

  const removeQuestion = (index: number) => {
    if (quizData.questions.length <= 1) {
      alert("A quiz must have at least one question.");
      return;
    }
    setQuizData((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  const handleAnswerOptionChange = (
    qIndex: number,
    aIndex: number,
    field: keyof AnswerOptionWritable,
    value: any,
  ) => {
    const newQuestions = [...quizData.questions];
    const newOptions = [...newQuestions[qIndex].answer_options];
    // Type assertion needed
    (newOptions[aIndex] as any)[field] = value;

    // Ensure only one correct answer for SINGLE_MCQ
    if (
      field === "is_correct" &&
      value === true &&
      newQuestions[qIndex].question_type === "SINGLE_MCQ"
    ) {
      newOptions.forEach((opt, i) => {
        if (i !== aIndex) opt.is_correct = false;
      });
    }

    newQuestions[qIndex].answer_options = newOptions;
    setQuizData((prev) => ({ ...prev, questions: newQuestions }));
  };

  const addAnswerOption = (qIndex: number) => {
    const newQuestions = [...quizData.questions];
    newQuestions[qIndex].answer_options.push({ ...initialAnswerOption });
    setQuizData((prev) => ({ ...prev, questions: newQuestions }));
  };

  const removeAnswerOption = (qIndex: number, aIndex: number) => {
    const newQuestions = [...quizData.questions];
    if (
      newQuestions[qIndex].answer_options.length <= 1 &&
      newQuestions[qIndex].question_type !== "TRUE_FALSE"
    ) {
      alert("MCQ questions must have at least one answer option.");
      return;
    }
    newQuestions[qIndex].answer_options = newQuestions[
      qIndex
    ].answer_options.filter((_, i) => i !== aIndex);
    setQuizData((prev) => ({ ...prev, questions: newQuestions }));
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

    // Basic Frontend Validation (add more as needed)
    if (!quizData.title.trim()) {
      setError("Quiz title is required.");
      setLoading(false);
      return;
    }
    if (quizData.timing_minutes <= 0) {
      setError("Timing must be a positive number of minutes.");
      setLoading(false);
      return;
    }
    // Add validation for questions/answers (e.g., non-empty text, correct answer selection)

    // Prepare payload conforming to QuizWritable
    const payload: QuizWritable = {
      ...(isEditMode && existingQuiz?.id && { id: existingQuiz.id }), // Include ID only for edits
      ...quizData,
      // Ensure correct structure for questions and options
      questions: quizData.questions.map((q) => ({
        ...(isEditMode && q.id && { id: q.id }), // Include question ID for edits
        question_type: q.question_type,
        text: q.text,
        points: q.points,
        // Conditionally include correct_answer_bool or answer_options
        ...(q.question_type === "TRUE_FALSE"
          ? { correct_answer_bool: q.correct_answer_bool }
          : { correct_answer_bool: null }), // Explicitly null for non-T/F
        ...(q.question_type !== "TRUE_FALSE"
          ? {
              answer_options: q.answer_options.map((a) => ({
                ...(isEditMode && a.id && { id: a.id }), // Include option ID for edits
                text: a.text,
                is_correct: a.is_correct,
              })),
            }
          : { answer_options: [] }), // Empty array for T/F
      })),
    };

    try {
      let response;
      if (isEditMode && existingQuiz?.id) {
        console.log("Submitting PUT request:", payload);
        response = await fetchApi(`/quizzes/${existingQuiz.id}/`, {
          method: "PUT",
          accessToken: session.accessToken,
          data: payload,
        });
        console.log("Update successful:", response);
        router.push(`/quizzes/${existingQuiz.id}`); // Redirect to detail page
      } else {
        console.log("Submitting POST request:", payload);
        response = await fetchApi("/quizzes/", {
          method: "POST",
          accessToken: session.accessToken,
          data: payload,
        });
        console.log("Creation successful:", response);
        // Assuming response contains the new quiz ID
        const newQuizId = (response as any)?.id;
        router.push(newQuizId ? `/quizzes/${newQuizId}` : "/quizzes"); // Redirect
      }
      router.refresh(); // Refresh server data if needed
    } catch (err: any) {
      console.error("API Error:", err);
      setError(
        err.message || `Failed to ${isEditMode ? "update" : "create"} quiz.`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 p-6 bg-white rounded shadow-lg"
    >
      <h2 className="text-2xl font-semibold mb-4">
        {isEditMode ? "Edit Quiz" : "Create New Quiz"}
      </h2>
      {error && <p className="text-red-500 bg-red-100 p-3 rounded">{error}</p>}

      {/* Quiz Details */}
      <div>
        <label htmlFor="title" className="form-label">
          Quiz Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={quizData.title}
          onChange={handleQuizChange}
          className="form-input"
          required
        />
      </div>
      <div>
        <label htmlFor="timing_minutes" className="form-label">
          Timing (minutes)
        </label>
        <input
          type="number"
          id="timing_minutes"
          name="timing_minutes"
          value={quizData.timing_minutes}
          onChange={handleQuizChange}
          className="form-input"
          min="1"
          required
        />
      </div>
      <div>
        <label htmlFor="available_from" className="form-label">
          Available From (Optional)
        </label>
        <input
          type="datetime-local"
          id="available_from"
          name="available_from"
          value={quizData.available_from?.toString().slice(0, 16) || ""} // Format for input
          onChange={handleDateChange}
          className="form-input"
        />
      </div>
      <div>
        <label htmlFor="available_to" className="form-label">
          Available To (Optional)
        </label>
        <input
          type="datetime-local"
          id="available_to"
          name="available_to"
          value={quizData.available_to?.toString().slice(0, 16) || ""} // Format for input
          onChange={handleDateChange}
          className="form-input"
        />
      </div>

      {/* Questions Section */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-xl font-medium">Questions</h3>
        {quizData.questions.map((question, qIndex) => (
          <div
            key={qIndex}
            className="border p-4 rounded bg-gray-50 space-y-3 relative"
          >
            {quizData.questions.length > 1 && (
              <button
                type="button"
                onClick={() => removeQuestion(qIndex)}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700 font-bold text-xl"
                title="Remove Question"
              >
                &times;
              </button>
            )}
            <p className="font-semibold">Question {qIndex + 1}</p>
            {/* Question Fields */}
            <div>
              <label htmlFor={`q-${qIndex}-text`} className="form-label">
                Question Text
              </label>
              <input
                type="text"
                id={`q-${qIndex}-text`}
                value={question.text}
                onChange={(e) =>
                  handleQuestionChange(qIndex, "text", e.target.value)
                }
                className="form-input"
                required
              />
            </div>
            <div className="flex space-x-4 items-end">
              <div className="flex-1">
                <label htmlFor={`q-${qIndex}-type`} className="form-label">
                  Type
                </label>
                <select
                  id={`q-${qIndex}-type`}
                  value={question.question_type}
                  onChange={(e) =>
                    handleQuestionChange(
                      qIndex,
                      "question_type",
                      e.target.value,
                    )
                  }
                  className="form-input"
                >
                  <option value="SINGLE_MCQ">Single Choice MCQ</option>
                  <option value="MULTI_MCQ">Multiple Choice MCQ</option>
                  <option value="TRUE_FALSE">True/False</option>
                </select>
              </div>
              <div className="flex-1">
                <label htmlFor={`q-${qIndex}-points`} className="form-label">
                  Points
                </label>
                <input
                  type="number"
                  id={`q-${qIndex}-points`}
                  value={question.points}
                  onChange={(e) =>
                    handleQuestionChange(
                      qIndex,
                      "points",
                      parseInt(e.target.value, 10) || 0,
                    )
                  }
                  className="form-input"
                  min="0"
                  required
                />
              </div>
            </div>

            {/* Conditional Fields based on Type */}
            {question.question_type === "TRUE_FALSE" ? (
              <div>
                <label className="form-label">Correct Answer</label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name={`q-${qIndex}-bool`}
                      checked={question.correct_answer_bool === true}
                      onChange={() =>
                        handleQuestionChange(
                          qIndex,
                          "correct_answer_bool",
                          true,
                        )
                      }
                      className="form-radio mr-1"
                    />{" "}
                    True
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name={`q-${qIndex}-bool`}
                      checked={question.correct_answer_bool === false}
                      onChange={() =>
                        handleQuestionChange(
                          qIndex,
                          "correct_answer_bool",
                          false,
                        )
                      }
                      className="form-radio mr-1"
                    />{" "}
                    False
                  </label>
                </div>
              </div>
            ) : (
              // Answer Options for MCQ
              <div className="space-y-2 border-t pt-3 mt-3">
                <h4 className="text-md font-medium">Answer Options</h4>
                {question.answer_options.map((option, aIndex) => (
                  <div
                    key={aIndex}
                    className="flex items-center space-x-2 bg-white p-2 rounded border"
                  >
                    <input
                      type={
                        question.question_type === "SINGLE_MCQ"
                          ? "radio"
                          : "checkbox"
                      }
                      name={`q-${qIndex}-correct`} // Use radio name for single choice grouping
                      checked={option.is_correct}
                      onChange={(e) =>
                        handleAnswerOptionChange(
                          qIndex,
                          aIndex,
                          "is_correct",
                          e.target.checked,
                        )
                      }
                      className={
                        question.question_type === "SINGLE_MCQ"
                          ? "form-radio"
                          : "form-checkbox"
                      }
                    />
                    <input
                      type="text"
                      placeholder={`Option ${aIndex + 1} Text`}
                      value={option.text}
                      onChange={(e) =>
                        handleAnswerOptionChange(
                          qIndex,
                          aIndex,
                          "text",
                          e.target.value,
                        )
                      }
                      className="form-input flex-grow"
                      required
                    />
                    {question.answer_options.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAnswerOption(qIndex, aIndex)}
                        className="text-red-500 hover:text-red-700 text-xs"
                        title="Remove Option"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addAnswerOption(qIndex)}
                  className="btn btn-secondary btn-sm mt-2 text-xs"
                >
                  Add Answer Option
                </button>
              </div>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addQuestion}
          className="btn btn-secondary mt-4"
        >
          Add Another Question
        </button>
      </div>

      {/* Submit Button */}
      <div className="border-t pt-4 text-right">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Saving..." : isEditMode ? "Update Quiz" : "Create Quiz"}
        </button>
      </div>
    </form>
  );
}

// --- Add corresponding type definitions ---
// You should create a types directory, e.g., src/types/quiz.ts

/* Example: src/types/quiz.ts */
export interface User {
  id: number;
  username: string;
  email: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  is_marked: boolean;
}

export interface AnswerOption {
  id: number;
  text: string;
  is_correct: boolean; // May be hidden
}

export interface QuestionReadOnly {
  id: number;
  question_type: "SINGLE_MCQ" | "MULTI_MCQ" | "TRUE_FALSE";
  text: string;
  points: number;
  answer_options: AnswerOption[];
}

export interface QuizReadOnly {
  id: number;
  title: string;
  teacher: User;
  timing_minutes: number;
  available_from: string | null; // ISO date string or null
  available_to: string | null; // ISO date string or null
  is_available_for_submission: boolean;
  has_availability_window: boolean;
  questions: QuestionReadOnly[];
}

// Writable Types (match form state and API payload)
export interface AnswerOptionWritable {
  id?: number; // Optional for updates
  text: string;
  is_correct: boolean;
}

export interface QuestionWritable {
  id?: number; // Optional for updates
  question_type: "SINGLE_MCQ" | "MULTI_MCQ" | "TRUE_FALSE";
  text: string;
  points: number;
  correct_answer_bool?: boolean | null; // For True/False
  answer_options: AnswerOptionWritable[]; // For MCQ
}

export interface QuizWritable {
  id?: number; // Optional for updates
  title: string;
  timing_minutes: number;
  available_from?: string | null; // ISO date string or null
  available_to?: string | null; // ISO date string or null
  questions: QuestionWritable[];
}

// Submission & Result Types
export interface ParticipantAnswerSubmit {
  question_id: number;
  selected_option_ids?: number[] | null;
  selected_answer_bool?: boolean | null;
}

export interface QuizSubmission {
  quiz_id: number;
  answers: ParticipantAnswerSubmit[];
}

export interface ParticipantAnswerResult {
  id: number;
  question: QuestionReadOnly; // Contains full question details including options
  selected_options: AnswerOption[]; // Options selected by participant
  selected_answer_bool: boolean | null;
  is_correct: boolean | null;
  correct_answer_bool: boolean | null; // Conditionally shown
  correct_options: AnswerOption[]; // Conditionally shown
}

export interface QuizAttemptResult {
  id: number;
  user: User;
  quiz: QuizReadOnly;
  score: number;
  submission_time: string; // ISO date string
  participant_answers: ParticipantAnswerResult[];
  rank: number | null;
  best_score_for_quiz: number | null;
}
