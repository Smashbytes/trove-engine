import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Crown, MailPlus, MoreVertical, ShieldCheck, Trash2, UserCog, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { PermissionGate } from "@/components/trove/PermissionGate";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import {
  PERMISSION_DEPARTMENTS,
  permissionsForRole,
  ROLE_META,
  TEAM_ROLES,
  type PermissionKey,
} from "@/lib/permissions";
import {
  useInviteTeamMember,
  useRemoveTeamMember,
  useRevokeInvite,
  useTeamInvites,
  useTeamMembers,
  useUpdateTeamMember,
  type TeamRosterRow,
} from "@/lib/queries";
import type { TeamRole } from "@/lib/database.types";

export const Route = createFileRoute("/team")({
  head: () => ({ meta: [{ title: "Team · Trove Engine" }] }),
  component: TeamPage,
});

function TeamPage() {
  return (
    <AppShell>
      <PermissionGate perm="team.manage">
        <TeamManager />
      </PermissionGate>
    </AppShell>
  );
}

function TeamManager() {
  const { profile } = useAuth();
  const membersQuery = useTeamMembers();
  const invitesQuery = useTeamInvites();
  const removeMember = useRemoveTeamMember();
  const revokeInvite = useRevokeInvite();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<TeamRosterRow | null>(null);

  const members = membersQuery.data ?? [];
  const invites = invitesQuery.data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Delegate the door"
        title="Team & roles"
        subtitle="Add staff with scoped access — managers, finance, scanners. Invite by email; they sign in with their own account."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <MailPlus className="mr-1.5 h-4 w-4" />
            Invite member
          </Button>
        }
      />

      <div className="space-y-3">
        {/* Owner row */}
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-card">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/15 text-primary">
              {initials(profile?.full_name ?? "Owner")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{profile?.full_name ?? "You"}</p>
            <p className="truncate text-xs text-muted-foreground">Spot owner</p>
          </div>
          <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/15">
            <Crown className="h-3 w-3" /> Owner
          </Badge>
        </div>

        {/* Members */}
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            onEdit={() => setEditing(member)}
            onRemove={async () => {
              if (!confirm(`Remove ${member.full_name ?? "this member"} from the team?`)) return;
              try {
                await removeMember.mutateAsync(member.id);
                toast.success("Member removed.");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Could not remove member.");
              }
            }}
          />
        ))}

        {/* Pending invites */}
        {invites.map((invite) => (
          <div
            key={invite.id}
            className="flex items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-card/60 p-4"
          >
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-muted text-muted-foreground">
                {initials(invite.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{invite.email}</p>
              <p className="truncate text-xs text-muted-foreground">
                Invited · {ROLE_META[invite.role].label}
                {invite.department ? ` · ${invite.department}` : ""}
              </p>
            </div>
            <Badge variant="outline">Pending</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  await revokeInvite.mutateAsync(invite.id);
                  toast.success("Invite revoked.");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not revoke invite.");
                }
              }}
            >
              Revoke
            </Button>
          </div>
        ))}

        {members.length === 0 && invites.length === 0 && (
          <div className="rounded-2xl border border-border/60 bg-card p-12 text-center shadow-card">
            <Users className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 font-display text-lg font-semibold">No team members yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Invite staff to help run your spot.
            </p>
          </div>
        )}
      </div>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      {editing && <EditMemberDialog member={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function MemberRow({
  member,
  onEdit,
  onRemove,
}: {
  member: TeamRosterRow;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-card">
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-muted">{initials(member.full_name ?? "?")}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{member.full_name ?? "Team member"}</p>
        <p className="truncate text-xs text-muted-foreground">
          {ROLE_META[member.role].label}
          {member.department ? ` · ${member.department}` : ""}
          {" · "}
          {member.permissions.length} permissions
        </p>
      </div>
      {member.status === "suspended" && <Badge variant="destructive">Suspended</Badge>}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <UserCog className="mr-2 h-4 w-4" /> Edit role & permissions
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRemove} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invite dialog
// ---------------------------------------------------------------------------

function InviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const invite = useInviteTeamMember();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("scanner");
  const [department, setDepartment] = useState("");
  const [permissions, setPermissions] = useState<PermissionKey[]>(permissionsForRole("scanner"));

  const reset = () => {
    setEmail("");
    setRole("scanner");
    setDepartment("");
    setPermissions(permissionsForRole("scanner"));
  };

  const submit = async () => {
    if (!email.trim()) {
      toast.error("Enter an email address.");
      return;
    }
    try {
      await invite.mutateAsync({ email, role, permissions, department });
      toast.success(`Invite sent to ${email.trim()}.`);
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send invite.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
          <DialogDescription>
            They'll get an email to join this spot and sign in with their own account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-dept">Department (optional)</Label>
            <Input
              id="invite-dept"
              placeholder="e.g. Front desk, Marketing"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>

          <RolePermissionEditor
            role={role}
            permissions={permissions}
            onRoleChange={(r) => {
              setRole(r);
              setPermissions(permissionsForRole(r));
            }}
            onPermissionsChange={setPermissions}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={invite.isPending}>
            {invite.isPending ? "Sending…" : "Send invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Edit member dialog
// ---------------------------------------------------------------------------

function EditMemberDialog({ member, onClose }: { member: TeamRosterRow; onClose: () => void }) {
  const update = useUpdateTeamMember();
  const [role, setRole] = useState<TeamRole>(member.role);
  const [department, setDepartment] = useState(member.department ?? "");
  const [permissions, setPermissions] = useState<PermissionKey[]>(
    member.permissions as PermissionKey[],
  );
  const [suspended, setSuspended] = useState(member.status === "suspended");

  const submit = async () => {
    try {
      await update.mutateAsync({
        id: member.id,
        role,
        permissions,
        department: department.trim() || null,
        status: suspended ? "suspended" : "active",
      });
      toast.success("Member updated.");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update member.");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{member.full_name ?? "Team member"}</DialogTitle>
          <DialogDescription>Adjust this member's role, permissions and access.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-dept">Department</Label>
            <Input
              id="edit-dept"
              placeholder="e.g. Front desk"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>

          <RolePermissionEditor
            role={role}
            permissions={permissions}
            onRoleChange={(r) => {
              setRole(r);
              setPermissions(permissionsForRole(r));
            }}
            onPermissionsChange={setPermissions}
          />

          <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
            <div>
              <p className="text-sm font-medium">Suspend access</p>
              <p className="text-xs text-muted-foreground">
                Keeps the member but blocks all workspace access.
              </p>
            </div>
            <Switch checked={suspended} onCheckedChange={setSuspended} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Shared role + permission editor
// ---------------------------------------------------------------------------

function RolePermissionEditor({
  role,
  permissions,
  onRoleChange,
  onPermissionsChange,
}: {
  role: TeamRole;
  permissions: PermissionKey[];
  onRoleChange: (role: TeamRole) => void;
  onPermissionsChange: (permissions: PermissionKey[]) => void;
}) {
  const granted = useMemo(() => new Set(permissions), [permissions]);

  const toggle = (key: PermissionKey, on: boolean) => {
    const next = new Set(granted);
    if (on) next.add(key);
    else next.delete(key);
    onPermissionsChange([...next]);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Role preset</Label>
        <div className="grid grid-cols-2 gap-2">
          {TEAM_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRoleChange(r)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                role === r ? "border-primary bg-primary/10" : "border-border/60 hover:border-border"
              }`}
            >
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                {ROLE_META[r].label}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{ROLE_META[r].blurb}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label>Permissions</Label>
        {PERMISSION_DEPARTMENTS.map((dept) => (
          <div key={dept.id} className="rounded-xl border border-border/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {dept.label}
            </p>
            <div className="mt-2 space-y-2.5">
              {dept.permissions.map((perm) => (
                <div key={perm.key} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{perm.label}</p>
                    <p className="text-xs text-muted-foreground">{perm.description}</p>
                  </div>
                  <Switch
                    checked={granted.has(perm.key)}
                    onCheckedChange={(on) => toggle(perm.key, on)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function initials(text: string) {
  return text
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((token) => token[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
