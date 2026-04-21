import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UserPlus,
  DotsThreeVertical,
  ShieldCheck,
  User,
  Trash,
  Users,
} from "@phosphor-icons/react";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      toast.success(`Role updated to ${newRole}`);
      fetchUsers();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user "${u.name}" (${u.email})? This will also delete their tasks.`))
      return;
    try {
      await api.delete(`/admin/users/${u._id}`);
      toast.success("User deleted");
      fetchUsers();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/auth/register-admin", { name, email, password });
      toast.success("Admin created");
      setDialogOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      fetchUsers();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white" data-testid="admin-page">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-3xl sm:text-4xl font-black tracking-tighter text-zinc-900"
              style={{ fontFamily: "Chivo" }}
              data-testid="admin-title"
            >
              User Management
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Manage users and their roles across the system.
            </p>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className="rounded-sm gap-2"
            data-testid="create-admin-button"
          >
            <UserPlus size={16} weight="bold" /> New Admin
          </Button>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20" data-testid="users-loading">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent animate-spin rounded-full" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-zinc-200 rounded-sm bg-zinc-50">
            <Users size={48} className="text-zinc-300 mb-4" weight="bold" />
            <p className="text-lg font-semibold text-zinc-700" style={{ fontFamily: "Chivo" }}>
              No users found
            </p>
          </div>
        ) : (
          <div className="border border-zinc-200 rounded-sm overflow-hidden" data-testid="users-table">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                  <TableHead className="text-xs font-medium uppercase tracking-[0.1em] text-zinc-500">
                    Name
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-[0.1em] text-zinc-500">
                    Email
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-[0.1em] text-zinc-500">
                    Role
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-[0.1em] text-zinc-500">
                    Joined
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-[0.1em] text-zinc-500 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u._id} className="hover:bg-zinc-50" data-testid={`user-row-${u._id}`}>
                    <TableCell className="font-medium text-zinc-900">{u.name}</TableCell>
                    <TableCell className="text-zinc-600">{u.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={u.role === "admin" ? "default" : "secondary"}
                        className="rounded-sm text-[10px] uppercase tracking-wider"
                      >
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-500 text-sm">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-sm"
                            data-testid={`user-actions-${u._id}`}
                          >
                            <DotsThreeVertical size={18} weight="bold" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-sm w-44">
                          {u.role === "user" ? (
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(u._id, "admin")}
                              className="gap-2"
                              data-testid={`promote-user-${u._id}`}
                            >
                              <ShieldCheck size={14} /> Promote to Admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(u._id, "user")}
                              className="gap-2"
                              data-testid={`demote-user-${u._id}`}
                            >
                              <User size={14} /> Demote to User
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(u)}
                            className="gap-2 text-red-600 focus:text-red-600"
                            data-testid={`delete-user-${u._id}`}
                          >
                            <Trash size={14} /> Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Create Admin Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle
              className="text-xl font-bold tracking-tight"
              style={{ fontFamily: "Chivo" }}
            >
              Create Admin
            </DialogTitle>
            <DialogDescription>
              Create a new administrator account with full system access.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAdmin} className="space-y-4" data-testid="create-admin-form">
            <div>
              <label className="text-xs font-medium uppercase tracking-[0.1em] text-zinc-500 mb-1.5 block">
                Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Admin Name"
                required
                className="rounded-sm"
                data-testid="admin-name-input"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-[0.1em] text-zinc-500 mb-1.5 block">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="rounded-sm"
                data-testid="admin-email-input"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-[0.1em] text-zinc-500 mb-1.5 block">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
                minLength={6}
                className="rounded-sm"
                data-testid="admin-password-input"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-sm"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="rounded-sm gap-2"
                data-testid="admin-submit-button"
              >
                <UserPlus size={16} weight="bold" />
                {submitting ? "Creating..." : "Create Admin"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
