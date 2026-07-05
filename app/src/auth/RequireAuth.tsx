import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "./useSession";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: session, isLoading } = useSession();

  if (isLoading) return null;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
