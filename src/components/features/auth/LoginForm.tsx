
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginForm() {
  return (
    <Card className="border-none bg-transparent shadow-none text-white">
      <CardHeader className="text-center p-0 mb-6">
        <CardTitle className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 text-transparent bg-clip-text">
          Welcome Back
        </CardTitle>
        <CardDescription className="text-blue-100/90">
          Enter your credentials to access your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-0">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            className="bg-white/5 border-white/20 focus:bg-white/10 focus:ring-offset-blue-500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            className="bg-white/5 border-white/20 focus:bg-white/10 focus:ring-offset-blue-500"
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 p-0 mt-6">
        <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold">
          Log In
        </Button>
        <div className="text-sm text-center">
          <span>Don't have an account? </span>
          <a href="/register" className="font-semibold text-blue-300 hover:text-blue-200">
            Register
          </a>
        </div>
      </CardFooter>
    </Card>
  );
}
