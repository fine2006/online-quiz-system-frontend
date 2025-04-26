import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper"; // Client component wrapper
import AuthStatus from "@/components/AuthStatus"; // Client component

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Online Quiz System",
  description: "Take and manage online quizzes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* SessionProvider needs to be in a Client Component */}
        <SessionProviderWrapper>
          <header className="bg-white shadow-md p-4">
            <nav className="container mx-auto flex justify-between items-center">
              <h1 className="text-xl font-bold text-blue-700">Quiz App</h1>
              {/* AuthStatus is a client component using useSession */}
              <AuthStatus />
            </nav>
          </header>
          <main className="container mx-auto p-4 mt-4">{children}</main>
          <footer className="text-center text-gray-500 mt-8 p-4 border-t">
            &copy; {new Date().getFullYear()} Quiz System
          </footer>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
