"use client"; // This directive makes it a Client Component

import { SessionProvider } from "next-auth/react";
import React from "react";

interface Props {
  children: React.ReactNode;
}

export default function SessionProviderWrapper({ children }: Props) {
  // The SessionProvider needs to be run in a client component.
  // This wrapper component allows us to use it in our server-rendered layout.
  return <SessionProvider>{children}</SessionProvider>;
}
