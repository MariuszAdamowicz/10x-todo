import type { User } from "astro:middleware";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface UserNavProps {
  user: User;
}

const UserAvatar = ({ user }: UserNavProps) => (
  <div className="size-full rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
    {user.email?.[0]?.toUpperCase() ?? "U"}
  </div>
);

export default function UserNav({ user }: UserNavProps) {
  const handleLogout = async () => {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });
    if (!response.ok) {
      // Handle error (optionally show toast)
    } else {
      window.location.href = "/login";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full" data-test-id="user-menu-trigger">
          <UserAvatar user={user} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.email}</p>
            <p className="text-xs leading-none text-muted-foreground">Logged In</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} data-test-id="logout-btn">
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
