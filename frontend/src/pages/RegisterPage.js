import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { UserPlus } from "@phosphor-icons/react";

export default function RegisterPage() {
  const { user, loading, register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await register(name, email, password);
      toast.success("Account created!");
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex" data-testid="register-page">
      <div className="hidden lg:flex lg:w-1/2 relative bg-zinc-900">
        <img
          src="https://images.unsplash.com/photo-1656340194408-750a488b6a80?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzB8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwZ2VvbWV0cmljJTIwYXJjaGl0ZWN0dXJlJTIwYWJzdHJhY3R8ZW58MHx8fHwxNzc2MzU2NTU2fDA&ixlib=rb-4.1.0&q=85"
          alt="Abstract architecture"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="relative z-10 flex flex-col justify-end p-12">
          <h1
            className="text-5xl font-black tracking-tighter text-white"
            style={{ fontFamily: "Chivo" }}
          >
            TASKFLOW
          </h1>
          <p className="text-lg text-zinc-300 mt-2">
            Scalable task management with role-based access control.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <h1
              className="text-4xl font-black tracking-tighter text-zinc-900"
              style={{ fontFamily: "Chivo" }}
            >
              TASKFLOW
            </h1>
          </div>

          <h2
            className="text-2xl font-bold tracking-tight text-zinc-900 mb-1"
            style={{ fontFamily: "Chivo" }}
          >
            Create account
          </h2>
          <p className="text-sm text-zinc-500 mb-8">
            Register to start managing your tasks.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
            {error && (
              <div
                className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-sm"
                data-testid="register-error"
              >
                {error}
              </div>
            )}
            <div>
              <label className="text-xs font-medium uppercase tracking-[0.1em] text-zinc-500 mb-1.5 block">
                Full Name
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                className="rounded-sm"
                data-testid="register-name-input"
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
                placeholder="you@example.com"
                required
                className="rounded-sm"
                data-testid="register-email-input"
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
                className="rounded-sm"
                data-testid="register-password-input"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full rounded-sm gap-2"
              data-testid="register-submit-button"
            >
              <UserPlus size={16} weight="bold" />
              {submitting ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="text-sm text-zinc-500 mt-6 text-center">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-700 font-medium"
              data-testid="login-link"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
