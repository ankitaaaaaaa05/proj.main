import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FloppyDisk } from "@phosphor-icons/react";

export default function TaskDialog({ open, onOpenChange, task, onSave }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title || "");
        setDescription(task.description || "");
        setStatus(task.status || "todo");
        setPriority(task.priority || "medium");
        setDueDate(task.due_date || "");
      } else {
        setTitle("");
        setDescription("");
        setStatus("todo");
        setPriority("medium");
        setDueDate("");
      }
    }
  }, [task, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        due_date: dueDate || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-sm sm:max-w-lg">
        <DialogHeader>
          <DialogTitle
            className="text-xl font-bold tracking-tight"
            style={{ fontFamily: "Chivo" }}
          >
            {task ? "Edit Task" : "New Task"}
          </DialogTitle>
          <DialogDescription>
            {task
              ? "Update the task details below."
              : "Fill in the details to create a new task."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="task-form">
          <div>
            <label className="text-xs font-medium uppercase tracking-[0.1em] text-zinc-500 mb-1.5 block">
              Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              required
              maxLength={200}
              className="rounded-sm"
              data-testid="task-title-input"
            />
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-[0.1em] text-zinc-500 mb-1.5 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="flex w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              data-testid="task-description-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-[0.1em] text-zinc-500 mb-1.5 block">
                Status
              </label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="rounded-sm" data-testid="task-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-sm">
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-[0.1em] text-zinc-500 mb-1.5 block">
                Priority
              </label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="rounded-sm" data-testid="task-priority-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-sm">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-[0.1em] text-zinc-500 mb-1.5 block">
              Due Date
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-sm"
              data-testid="task-due-date-input"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-sm"
              onClick={() => onOpenChange(false)}
              data-testid="task-cancel-button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !title.trim()}
              className="rounded-sm gap-2"
              data-testid="task-save-button"
            >
              <FloppyDisk size={16} weight="bold" />
              {saving ? "Saving..." : task ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
