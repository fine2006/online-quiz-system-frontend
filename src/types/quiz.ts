// src/types/quiz.ts

/**
 * Represents a user in the system.
 * Based on definitions.User schema.
 */
export interface User {
  id: number;
  username: string;
  email: string; // Should be in email format
  role: "ADMIN" | "TEACHER" | "STUDENT"; // Enum constraint
  is_marked: boolean;
}

/**
 * Represents a single answer option for a multiple-choice question.
 * Based on definitions.AnswerOption schema.
 */
export interface AnswerOption {
  id: number;
  text: string;
  /** Indicates if this is a correct option. Note: May be hidden in read-only serializers depending on context. */
  is_correct: boolean;
}

/**
 * Represents a question in read-only mode (e.g., when viewing or attempting a quiz).
 * Based on definitions.QuestionReadOnly schema.
 */
export interface QuestionReadOnly {
  id: number;
  question_type: "SINGLE_MCQ" | "MULTI_MCQ" | "TRUE_FALSE"; // Enum constraint
  text: string;
  points: number;
  /** List of answer options for MCQ types. Note: 'is_correct' field may be hidden. */
  answer_options: AnswerOption[];
}

/**
 * Represents a writable answer option, used when creating or updating questions.
 * Based on definitions.AnswerOptionWritable schema.
 */
export interface AnswerOptionWritable {
  /** Required for updates, omit for creates */
  id?: number | null; // Optional and nullable
  text: string;
  is_correct: boolean;
}

/**
 * Represents a writable question, used when creating or updating quizzes.
 * Based on definitions.QuestionWritable schema.
 */
export interface QuestionWritable {
  /** Required for updates, omit for creates */
  id?: number | null; // Optional and nullable
  question_type: "SINGLE_MCQ" | "MULTI_MCQ" | "TRUE_FALSE"; // Enum constraint
  text: string;
  points: number;
  /** For True/False questions */
  correct_answer_bool?: boolean | null; // Optional and nullable
  /** List of answer options for MCQ types. */
  answer_options?: AnswerOptionWritable[]; // Optional array for MCQ types
}

/**
 * Represents a quiz in read-only mode (e.g., when listing or viewing details).
 * Based on definitions.QuizReadOnly schema.
 */
export interface QuizReadOnly {
  id: number;
  title: string;
  teacher: User; // Reference to User interface
  timing_minutes: number;
  /** ISO date-time string or null */
  available_from: string | null;
  /** ISO date-time string or null */
  available_to: string | null;
  /** Computed property indicating if submission is currently allowed. */
  is_available_for_submission: boolean;
  /** Computed property indicating if both available_from and available_to are set. */
  has_availability_window: boolean;
  questions: QuestionReadOnly[]; // Array of read-only questions
}

/**
 * Represents a writable quiz, used when creating or updating quizzes.
 * Based on definitions.QuizWritable schema.
 */
export interface QuizWritable {
  /** Required for updates, omit for creates */
  id?: number | null; // Optional and nullable
  title: string;
  timing_minutes: number;
  /** ISO date-time string or null */
  available_from?: string | null; // Optional and nullable
  /** ISO date-time string or null */
  available_to?: string | null; // Optional and nullable
  /** Array of writable questions */
  questions?: QuestionWritable[]; // Should contain at least one question for creation
}

/**
 * Represents the structure for submitting an answer to a single question during a quiz attempt.
 * Based on definitions.ParticipantAnswerSubmit schema.
 */
export interface ParticipantAnswerSubmit {
  question_id: number;
  /** List of IDs for selected AnswerOption(s) (for MCQ types). Nullable. */
  selected_option_ids?: number[] | null;
  /** Boolean answer for True/False questions (True or False). Nullable. */
  selected_answer_bool?: boolean | null;
}

/**
 * Represents the complete submission payload for a quiz attempt.
 * Based on definitions.QuizSubmission schema.
 */
export interface QuizSubmission {
  quiz_id: number;
  answers: ParticipantAnswerSubmit[]; // Array of answers submitted
}

/**
 * Represents the result details for a participant's answer to a single question within an attempt.
 * Based on definitions.ParticipantAnswerResult schema.
 */
export interface ParticipantAnswerResult {
  id: number;
  question: QuestionReadOnly; // Includes full question details
  /** Selected options by the participant (for MCQ types). */
  selected_options: AnswerOption[];
  /** Selected boolean answer by the participant (for T/F types). */
  selected_answer_bool: boolean | null;
  /** Whether the participant's answer was correct. Nullable if not graded yet. */
  is_correct: boolean | null;
  /** The correct boolean answer (conditionally shown). */
  correct_answer_bool: boolean | null;
  /** The correct answer options (conditionally shown). */
  correct_options: AnswerOption[];
}

/**
 * Represents the complete result details for a single quiz attempt.
 * Based on definitions.QuizAttemptResult schema.
 */
export interface QuizAttemptResult {
  id: number;
  user: User; // The user who made the attempt
  quiz: QuizReadOnly; // The quiz that was attempted
  score: number;
  /** ISO date-time string of when the submission occurred */
  submission_time: string;
  /** Array containing results for each answer */
  participant_answers: ParticipantAnswerResult[];
  /** Rank among attempts for this quiz (computed). Nullable if not applicable/calculated. */
  rank: number | null;
  /** Best score achieved by this user on this quiz (computed). Nullable if no prior attempts. */
  best_score_for_quiz: number | null;
}

// You can also add types for API list responses if needed, although often
// using Array<Type> (e.g., QuizReadOnly[]) is sufficient.
// export type QuizListResponse = QuizReadOnly[];
// export type AttemptListResponse = QuizAttemptResult[];
