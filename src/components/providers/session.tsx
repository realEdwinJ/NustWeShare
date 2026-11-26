"use client";

import { createContext, useContext } from "react";

export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  avatarColor: string;
  avatarEmoji: string | null;
  preferences: Record<string, any>;
  uploadAnonymously?: boolean;
} | null;

const SessionCtx = createContext<SessionUser>(null);
export const useSession = () => useContext(SessionCtx);

export function SessionProvider({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return <SessionCtx.Provider value={user}>{children}</SessionCtx.Provider>;
}
