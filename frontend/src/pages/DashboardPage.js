import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import TaskDialog from "@/components/TaskDialog";
import api from "@/lib/api";
import { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  DotsThreeVertical,
  PencilSimple,
  Trash,
  CheckCircle,
  Circle,
  ArrowClockwise,
  Funnel,
  ListChecks,
  ClipboardText,
  HourglassMedium,
} from "@phosphor-icons/react";

const STATUS_LABELS = { todo: "To Do", in_progress: "In Progress", done: "Done" };
const STATUS_STYLES = {
  todo: "bg-zinc-100 text-zinc-700 border-zinc-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  done: "bg-green-50 text-green-700 border-green-200",
};
const PRIORITY_STYLES = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};
const NEXT_STATUS = { todo: "in_progress", in_progress: "done", done: "todo" };

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="border border-zinc-200 p-6 rounded-sm bg-white transition-all duration-150 hover:bg-zinc-50">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium uppercase tracking-[0.1em] text-zinc-500">{label}</p>
        <Icon size={18} className="text-zinc-400" weight="bold" />
      </div>
      <p
        className="text-3xl font-black tracking-tighter text-zinc-900"
        style={{ fontFamily: "Chivo" }}
      >
        {value}
      </p>
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, onStatusChange, isAdmin }) {
  return (
    <div
      className="border border-zinc-200 rounded-sm bg-white p-5 transition-all duration-150 hover:bg-zinc-50 group"
      data-testid={`task-card-${task.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4
            className="text-base font-semibold tracking-tight text-zinc-900 truncate"
            style={{ fontFamily: "Chivo" }}
          >
            {task.title}
          </h4>
          {task.description && (
            <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
              data-testid={`task-actions-${task.id}`}
            >
              <DotsThreeVertical size={18} weight="bold" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-sm w-44">
            <DropdownMenuItem
              onClick={() => onStatusChange(task)}
              className="gap-2"
              data-testid={`task-cycle-status-${task.id}`}
            >
              <ArrowClockwise size={14} /> Cycle Status
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onEdit(task)}
              className="gap-2"
              data-testid={`task-edit-${task.id}`}
            >
              <PencilSimple size={14} /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(task)}
              className="gap-2 text-red-600 focus:text-red-600"
              data-testid={`task-delete-${task.id}`}
            >
              <Trash size={14} /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-4">
        <span
          className={`text-[11px] font-medium px-2 py-0.5 border rounded-sm uppercase tracking-wider ${STATUS_STYLES[task.status]}`}
        >
          {STATUS_LABELS[task.status]}
        </span>
        <span
          className={`text-[11px] font-medium px-2 py-0.5 border rounded-sm uppercase tracking-wider ${PRIORITY_STYLES[task.priority]}`}
        >
          {task.priority}
        </span>
        {task.due_date && (
          <span className="text-[11px] text-zinc-500 ml-auto">
            Due {new Date(task.due_date).toLocaleDateString()}
          </span>
        )}
      </div>

      {isAdmin && task.user_name && (
        <p className="text-xs text-zinc-400 mt-3 border-t border-zinc-100 pt-2">
          {task.user_name} &middot; {task.user_email}
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, todo: 0, in_progress: 0, done: 0 });
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (priorityFilter !== "all") params.priority = priorityFilter;

      const [tasksRes, statsRes] = await Promise.all([
        api.get("/tasks", { params }),
        api.get("/stats"),
      ]);
      setTasks(tasksRes.data);
      setStats(statsRes.data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveTask = async (taskData) => {
    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}`, taskData);
        toast.success("Task updated");
      } else {
        await api.post("/tasks", taskData);
        toast.success("Task created");
      }
      setDialogOpen(false);
      setEditingTask(null);
      fetchData();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const handleDelete = async (task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await api.delete(`/tasks/${task.id}`);
      toast.success("Task deleted");
      fetchData();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const handleStatusChange = async (task) => {
    try {
      await api.put(`/tasks/${task.id}`, { status: NEXT_STATUS[task.status] });
      toast.success(`Status changed to ${STATUS_LABELS[NEXT_STATUS[task.status]]}`);
      fetchData();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const openCreate = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  const openEdit = (task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-white" data-testid="dashboard-page">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-3xl sm:text-4xl font-black tracking-tighter text-zinc-900"
              style={{ fontFamily: "Chivo" }}
              data-testid="dashboard-title"
            >
              Dashboard
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {user?.role === "admin" ? "All tasks across the system" : "Your personal task board"}
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="rounded-sm gap-2"
            data-testid="create-task-button"
          >
            <Plus size={16} weight="bold" /> New Task
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total" value={stats.total} icon={ClipboardText} />
          <StatCard label="To Do" value={stats.todo} icon={Circle} />
          <StatCard label="In Progress" value={stats.in_progress} icon={HourglassMedium} />
          <StatCard label="Done" value={stats.done} icon={CheckCircle} />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Funnel size={16} weight="bold" />
            <span className="text-xs font-medium uppercase tracking-[0.1em]">Filters</span>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger
              className="w-[140px] rounded-sm h-8 text-sm"
              data-testid="filter-status"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-sm">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger
              className="w-[140px] rounded-sm h-8 text-sm"
              data-testid="filter-priority"
            >
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="rounded-sm">
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tasks Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20" data-testid="tasks-loading">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent animate-spin rounded-full" />
          </div>
        ) : tasks.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 border border-zinc-200 rounded-sm bg-zinc-50"
            data-testid="empty-tasks"
          >
            <ListChecks size={48} className="text-zinc-300 mb-4" weight="bold" />
            <p className="text-lg font-semibold text-zinc-700" style={{ fontFamily: "Chivo" }}>
              No tasks found
            </p>
            <p className="text-sm text-zinc-500 mt-1 mb-4">
              {statusFilter !== "all" || priorityFilter !== "all"
                ? "Try adjusting your filters"
                : "Create your first task to get started"}
            </p>
            {statusFilter === "all" && priorityFilter === "all" && (
              <Button onClick={openCreate} className="rounded-sm gap-2" data-testid="empty-create-task">
                <Plus size={16} weight="bold" /> Create Task
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="tasks-grid">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={openEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                isAdmin={user?.role === "admin"}
              />
            ))}
          </div>
        )}
      </main>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
        onSave={handleSaveTask}
      />
    </div>
  );
}
