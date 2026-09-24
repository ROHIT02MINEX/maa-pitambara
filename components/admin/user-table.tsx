"use client";
import { T } from "@/components/translated-text";


import * as React from "react";
import { useRouter } from "next/navigation";
import { Occupation, Role } from "@prisma/client";
import { KeyRound, MoreHorizontal, Pencil, ShieldOff, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";

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
      <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground"><T>{" No users match these filters. "}</T></p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><T>{"User"}</T></TableHead>
            <TableHead><T>{"Phone"}</T></TableHead>
            <TableHead><T>{"Occupation"}</T></TableHead>
            <TableHead><T>{"Role"}</T></TableHead>
            <TableHead><T>{"Tests"}</T></TableHead>
            <TableHead><T>{"Status"}</T></TableHead>
            <TableHead><T>{"Joined"}</T></TableHead>
            <TableHead className="text-right"><T>{"Actions"}</T></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback><T>{initials(user.name)}</T></AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium"><T>{user.name ?? "Unnamed"}</T></p>
                    <p className="truncate text-xs text-muted-foreground"><T>{user.email}</T></p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap"><T>{user.phone ?? "-"}</T></TableCell>
              <TableCell>
                <Badge variant="secondary"><T>{occupationLabel(user.occupation)}</T></Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.role === "ADMIN" ? "warning" : "outline"}>
                  <T>{user.role === "ADMIN" ? "Admin" : "Learner"}</T>
                </Badge>
              </TableCell>
              <TableCell className="tabular-nums"><T>{user.testsTaken}</T></TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Badge variant={user.disabled ? "destructive" : "success"}>
                    <T>{user.disabled ? "Disabled" : "Active"}</T>
                  </Badge>
                  {!user.emailVerified ? <Badge variant="warning"><T>{"Unverified"}</T></Badge> : null}
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                <T>{formatDate(user.createdAt)}</T>
                <br />
                <T>{user.lastLoginAt ? `last seen ${formatDate(user.lastLoginAt)}` : "never signed in"}</T>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1"><Button type="button" size="sm" variant="ghost" className="text-destructive" disabled={user.id === currentAdminId} onClick={() => setDeleting(user)}><Trash2 className="h-4 w-4" /><T>Delete</T></Button><DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${user.email}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => openEdit(user)}>
                      <Pencil /><T>{" Edit details "}</T></DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => sendReset(user)}>
                      <KeyRound /><T>{" Send password reset "}</T></DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled={user.id === currentAdminId}
                      onSelect={() => toggleDisabled(user)}
                    >
                      {user.disabled ? <ShieldCheck /> : <ShieldOff />}
                      <T>{user.disabled ? "Enable account" : "Disable account"}</T>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={user.id === currentAdminId}
                      className="text-destructive focus:text-destructive"
                      onSelect={() => setDeleting(user)}
                    >
                      <Trash2 /><T>{" Delete user "}</T></DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu></div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle><T>{"Edit user"}</T></DialogTitle>
            <DialogDescription><T>{editing?.email}</T></DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name"><T>{"Full name"}</T></Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone"><T>{"Mobile number"}</T></Label>
              <Input
                id="edit-phone"
                value={form.phone}
                onChange={(event) => setForm((f) => ({ ...f, phone: event.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-occupation"><T>{"Occupation"}</T></Label>
                <Select
                  value={form.occupation}
                  onValueChange={(value) => setForm((f) => ({ ...f, occupation: value }))}
                >
                  <SelectTrigger id="edit-occupation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_OCCUPATION}><T>{"Not set"}</T></SelectItem>
                    {OCCUPATIONS.map((occupation) => (
                      <SelectItem key={occupation} value={occupation}>
                        <T>{OCCUPATION_LABELS[occupation]}</T>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role"><T>{"Role"}</T></Label>
                <Select
                  value={form.role}
                  onValueChange={(value) => setForm((f) => ({ ...f, role: value as Role }))}
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Role.USER}><T>{"Learner"}</T></SelectItem>
                    <SelectItem value={Role.ADMIN}><T>{"Administrator"}</T></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}><T>{" Cancel "}</T></Button>
            <Button onClick={saveEdit} loading={busy}><T>{" Save changes "}</T></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle><T>{"Delete this user?"}</T></AlertDialogTitle>
            <AlertDialogDescription>
              <T>{deleting?.email}</T><T>{" will be permanently removed, along with their test attempts, bookmarks and activity history. This cannot be undone. Consider disabling the account instead. "}</T></AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel><T>{"Cancel"}</T></AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              <T>{busy ? "Deleting…" : "Delete permanently"}</T>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
