import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ListChecks, Users, SignOut, CaretDown, BookOpenText } from "@phosphor-icons/react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-zinc-200" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <Link
              to="/dashboard"
              className="font-black text-xl tracking-tighter text-zinc-900"
              style={{ fontFamily: "Chivo" }}
              data-testid="nav-brand"
            >
              TASKFLOW
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              <Link to="/dashboard" data-testid="nav-dashboard">
                <Button
                  variant={isActive("/dashboard") ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2 rounded-sm"
                >
                  <ListChecks size={16} weight="bold" /> Dashboard
                </Button>
              </Link>
              {user?.role === "admin" && (
                <Link to="/admin" data-testid="nav-admin">
                  <Button
                    variant={isActive("/admin") ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2 rounded-sm"
                  >
                    <Users size={16} weight="bold" /> Users
                  </Button>
                </Link>
              )}
              <a
                href={`${process.env.REACT_APP_BACKEND_URL}/api/docs`}
                target="_blank"
                rel="noreferrer"
                data-testid="nav-api-docs"
              >
                <Button variant="ghost" size="sm" className="gap-2 rounded-sm">
                  <BookOpenText size={16} weight="bold" /> API Docs
                </Button>
              </a>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 rounded-sm"
                data-testid="user-menu-trigger"
              >
                <span className="font-medium text-sm">{user?.name}</span>
                <Badge
                  variant={user?.role === "admin" ? "default" : "secondary"}
                  className="rounded-sm text-[10px] uppercase tracking-wider"
                >
                  {user?.role}
                </Badge>
                <CaretDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-sm w-52">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium text-zinc-900">{user?.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="sm:hidden px-1 pb-1">
                <DropdownMenuItem onClick={() => navigate("/dashboard")} data-testid="mobile-nav-dashboard" className="gap-2">
                  <ListChecks size={16} /> Dashboard
                </DropdownMenuItem>
                {user?.role === "admin" && (
                  <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="mobile-nav-admin" className="gap-2">
                    <Users size={16} /> Users
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
              </div>
              <DropdownMenuItem
                onClick={handleLogout}
                data-testid="logout-button"
                className="gap-2 text-red-600 focus:text-red-600"
              >
                <SignOut size={16} /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
