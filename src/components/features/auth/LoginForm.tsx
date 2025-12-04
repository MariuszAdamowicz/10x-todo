import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoginSchema } from "@/lib/schemas/auth.schemas";
import { useState } from "react";

type LoginFormInputs = z.infer<typeof LoginSchema>;

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginFormInputs) => {
    setError(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      window.location.href = "/projects";
    } else {
      const errorData = await response.json();
      setError(errorData.error || "An unexpected error occurred.");
    }
  };

  return (
    <Card className="border-none bg-transparent shadow-none text-white">
      <CardHeader className="text-center p-0 mb-6">
        <CardTitle className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 text-transparent bg-clip-text">
          Welcome Back
        </CardTitle>
        <CardDescription className="text-blue-100/90">Enter your credentials to access your account.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4 p-0">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm rounded-lg p-3 text-center">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              className="bg-white/5 border-white/20 focus:bg-white/10 focus:ring-offset-blue-500"
              {...register("email")}
            />
            {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              className="bg-white/5 border-white/20 focus:bg-white/10 focus:ring-offset-blue-500"
              {...register("password")}
            />
            {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 p-0 mt-6">
          <Button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Logging In..." : "Log In"}
          </Button>
          <div className="text-sm text-center">
            <span>Don&apos;t have an account? </span>
            <a href="/register" className="font-semibold text-blue-300 hover:text-blue-200">
              Register
            </a>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
