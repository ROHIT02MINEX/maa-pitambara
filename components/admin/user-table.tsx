"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Occupation, Role } from "@prisma/client";
import { KeyRound, MoreHorizontal, Pencil, ShieldOff, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteUserAction,
  resetUserPasswordAction,
  setUserDisabledAction,
  updateUserAction,
} from "@/actions/admin/users";
import { runAction } from "@/lib/run-action";
import { OCCUPATIONS, OCCUPATION_LABELS, occupationLabel } from "@/lib/constants";
import { formatDate, initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminUserRow } from "@/types";

const NO_OCCUPATION = "__none__";

export function UserTable({ users, currentAdminId }: { users: AdminUserRow[]; currentAdminId: string }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<AdminUserRow | null>(null);
  const [deleting, setDeleting] = React.useState<AdminUserRow | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Controlled fields of the edit dialog.
  const [form, setForm] = React.useState({
    name: "",
    phone: "",
    occupation: NO_OCCUPATION as string,
    role: Role.USER as Role,
  });

  function openEdit(user: AdminUserRow) {
    setForm({
      name: user.name ?? "",
      phone: user.phone ?? "",
      occupation: user.occupation ?? NO_OCCUPATION,
      role: user.role,
    });
    setEditing(user);
  }

  async function saveEdit() {
    if (!editing) return;
    setBusy(true);
    const result = await runAction(() =>
      updateUserAction({
        id: editing.id,
        name: form.name,
        phone: form.phone,
        occupation: form.occupation === NO_OCCUPATION ? null : (form.occupation as Occupation),
        role: form.role,
      }),
    );
    setBusy(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? "User updated.");
    setEditing(null);
    router.refresh();
  }

  async function toggleDisabled(user: AdminUserRow) {
    setBusy(true);
    const result = await runAction(() => setUserDisabledAction(user.id, !user.disabled));
    setBusy(false);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(result.message ?? "Updated.");
      router.refresh();
    }
  }

  async function sendReset(user: AdminUserRow) {
    setBusy(true);
    const result = await runAction(() => resetUserPasswordAction(user.id));
    setBusy(false);
    if (!result.ok) toast.error(result.error);
    else toast.success(result.message ?? "Reset link sent.");
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const result = await runAction(() => deleteUserAction(deleting.id));
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message ?? "User deleted.");
    setDeleting(null);
    router.refresh();
  }

  if (users.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No users match these filters.
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Occupation</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Tests</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{user.name ?? "Unnamed"}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap">{user.phone ?? "—"}</TableCell>
              <TableCell>
                <Badge variant="secondary">{occupationLabel(user.occupation)}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.role === "ADMIN" ? "warning" : "outline"}>
                  {user.role === "ADMIN" ? "Admin" : "Learner"}
                </Badge>
              </TableCell>
              <TableCell className="tabular-nums">{user.testsTaken}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Badge variant={user.disabled ? "destructive" : "success"}>
                    {user.disabled ? "Disabled" : "Active"}
                  </Badge>
                  {!user.emailVerified ? <Badge variant="warning">Unverified</Badge> : null}
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {formatDate(user.createdAt)}
                <br />
                {user.lastLoginAt ? `last seen ${formatDate(user.lastLoginAt)}` : "never signed in"}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${user.email}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => openEdit(user)}>
                      <Pencil /> Edit details
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => sendReset(user)}>
                      <KeyRound /> Send password reset
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={user.id === currentAdminId}
                      onSelect={() => toggleDisabled(user)}
                    >
                      {user.disabled ? <ShieldCheck /> : <ShieldOff />}
                      {user.disabled ? "Enable account" : "Disable account"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={user.id === currentAdminId}
                      className="text-destructive focus:text-destructive"
                      onSelect={() => setDeleting(user)}
                    >
                      <Trash2 /> Delete user
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>{editing?.email}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full name</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Mobile number</Label>
              <Input
                id="edit-phone"
                value={form.phone}
                onChange={(event) => setForm((f) => ({ ...f, phone: event.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-occupation">Occupation</Label>
                <Select
                  value={form.occupation}
                  onValueChange={(value) => setForm((f) => ({ ...f, occupation: value }))}
                >
                  <SelectTrigger id="edit-occupation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_OCCUPATION}>Not set</SelectItem>
                    {OCCUPATIONS.map((occupation) => (
                      <SelectItem key={occupation} value={occupation}>
                        {OCCUPATION_LABELS[occupation]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(value) => setForm((f) => ({ ...f, role: value as Role }))}
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Role.USER}>Learner</SelectItem>
                    <SelectItem value={Role.ADMIN}>Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} loading={busy}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.email} will be permanently removed, along with their test attempts,
              bookmarks and activity history. This cannot be undone — consider disabling the account
              instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {busy ? "Deleting…" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
