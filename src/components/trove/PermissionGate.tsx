import { Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { type PermissionKey, permissionLabel } from "@/lib/permissions";

/**
 * Gates a page's content behind a permission. The sidebar nav already hides
 * items a member can't use; this also blocks direct-URL access. Render INSIDE
 * AppShell so the chrome (sidebar, switcher) stays available.
 */
export function PermissionGate({
  perm,
  children,
}: {
  perm: PermissionKey;
  children: React.ReactNode;
}) {
  const { can } = useAuth();
  if (can(perm)) return <>{children}</>;

  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-border/60 bg-card p-10 text-center shadow-card">
      <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
      <h3 className="mt-3 font-display text-lg font-semibold">No access</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        You don't have the <span className="font-medium">{permissionLabel(perm)}</span> permission
        for this workspace. Ask the spot owner to grant it from the Team page.
      </p>
    </div>
  );
}
