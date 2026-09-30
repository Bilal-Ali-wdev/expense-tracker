import { ensureDefaultUsers } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { LoginScreen } from "@/components/login-screen";
import { readSession } from "@/lib/session";

export default async function HomePage() {
  await ensureDefaultUsers();

  const session = await readSession();

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <DashboardShell
      user={{ username: session.username, displayName: session.displayName }}
    />
  );
}
