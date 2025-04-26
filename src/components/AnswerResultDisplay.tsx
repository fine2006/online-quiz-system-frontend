import { ParticipantAnswerResult, AnswerOption } from "@/types/quiz";

interface AnswerResultDisplayProps {
  answerResult: ParticipantAnswerResult;
}

// Helper to check if an option is correct or selected
const isSelected = (optionId: number, selectedOptions: AnswerOption[]) =>
  selectedOptions.some((opt) => opt.id === optionId);

const isCorrectOption = (optionId: number, correctOptions: AnswerOption[]) =>
  correctOptions.some((opt) => opt.id === optionId);

export default function AnswerResultDisplay({
  answerResult,
}: AnswerResultDisplayProps) {
  const question = answerResult.question;
  const selectedOptions = answerResult.selected_options || [];
  const correctOptions = answerResult.correct_options || []; // May be empty/null depending on backend logic/permissions
  const selectedBool = answerResult.selected_answer_bool;
  const correctBool = answerResult.correct_answer_bool; // May be null
  const wasCorrect = answerResult.is_correct;

  return (
    <div
      className={`border p-4 rounded mb-4 ${wasCorrect === true ? "border-green-300 bg-green-50" : wasCorrect === false ? "border-red-300 bg-red-50" : "border-gray-300 bg-gray-50"}`}
    >
      <p className="font-semibold">
        {question.text} ({question.points} points)
      </p>
      <div className="mt-3 space-y-2">
        {question.question_type === "TRUE_FALSE" && (
          <>
            <p>
              Your Answer:{" "}
              <span
                className={`font-medium ${selectedBool === correctBool ? "text-green-700" : "text-red-700"}`}
              >
                {selectedBool === true
                  ? "True"
                  : selectedBool === false
                    ? "False"
                    : "Not Answered"}
              </span>
            </p>
            {correctBool !== null && ( // Only show correct answer if provided
              <p className="text-sm text-green-800">
                Correct Answer: {correctBool ? "True" : "False"}
              </p>
            )}
          </>
        )}

        {(question.question_type === "SINGLE_MCQ" ||
          question.question_type === "MULTI_MCQ") &&
          question.answer_options.map((option) => {
            const userSelected = isSelected(option.id, selectedOptions);
            const actuallyCorrect = isCorrectOption(option.id, correctOptions); // Use correct_options from result

            let styles = "flex items-center p-2 rounded border text-sm ";
            if (userSelected && actuallyCorrect) {
              styles += "bg-green-100 border-green-300 text-green-800"; // Correctly selected
            } else if (userSelected && !actuallyCorrect) {
              styles += "bg-red-100 border-red-300 text-red-800"; // Incorrectly selected
            } else if (!userSelected && actuallyCorrect) {
              styles += "bg-yellow-100 border-yellow-300 text-yellow-800"; // Missed correct answer
            } else {
              styles += "bg-white border-gray-200 text-gray-700"; // Not selected, not correct
            }

            return (
              <div key={option.id} className={styles}>
                <span className="mr-2">
                  {userSelected ? "☑" : "☐"} {/* Indicate selection */}
                </span>
                <span className="flex-grow">{option.text}</span>
                {correctOptions.length > 0 && actuallyCorrect && (
                  <span className="ml-2 text-green-600 font-bold text-xs">
                    (Correct)
                  </span>
                )}
                {userSelected &&
                  !actuallyCorrect &&
                  correctOptions.length > 0 && (
                    <span className="ml-2 text-red-600 font-bold text-xs">
                      (Incorrect Selection)
                    </span>
                  )}
              </div>
            );
          })}
      </div>
      {/* Overall Correctness Indicator */}
      <div className="mt-3 text-sm font-medium">
        {wasCorrect === true && (
          <span className="text-green-600">✔ Correct</span>
        )}
        {wasCorrect === false && (
          <span className="text-red-600">✘ Incorrect</span>
        )}
        {wasCorrect === null && (
          <span className="text-gray-500">? Not Graded / Skipped</span>
        )}
      </div>
    </div>
  );
}
