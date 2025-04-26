import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import QuizManageForm from "@/components/QuizManageForm"; // Client Component
import { User } from "@/types/quiz";

export default async function NewQuizPage() {
  const session = await getServerSession(authOptions);
  const customSession = session as (typeof session & { user?: User }) | null;
  const user = customSession?.user;

  // Protect route: Only Teachers or Admins can create quizzes
  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    console.log("Unauthorized access attempt to /quizzes/new");
    redirect("/login?error=Unauthorized"); // Or redirect to an unauthorized page
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Create a New Quiz</h1>
      {/* Render the client component form */}
      <QuizManageForm isEditMode={false} />
    </div>
  );
}
