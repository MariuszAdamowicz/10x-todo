/* eslint-disable react-compiler/react-compiler */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RegisterSchema } from "@/lib/schemas/auth.schemas";

type RegisterFormInputs = z.infer<typeof RegisterSchema>;

export default function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(RegisterSchema),
  });

  const onSubmit = async (data: RegisterFormInputs) => {
    setServerError(null);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      window.location.href = "/projects";
    } else {
      const errorData = await response.json();
      setServerError(errorData.error || "An unexpected error occurred during registration.");
    }
  };

  return (
    <Card className="border-none bg-transparent shadow-none text-white">
      <CardHeader className="text-center p-0 mb-6">
        <CardTitle className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 text-transparent bg-clip-text">
          Create an Account
        </CardTitle>
        <CardDescription className="text-blue-100/90">Join us and start managing your projects.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4 p-0">
          {serverError && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-sm rounded-lg p-3 text-center">
              {serverError}
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
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              className="bg-white/5 border-white/20 focus:bg-white/10 focus:ring-offset-blue-500"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && <p className="text-red-400 text-sm mt-1">{errors.confirmPassword.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 p-0 mt-6">
          <Button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Registering..." : "Register"}
          </Button>
          <div className="text-sm text-center">
            <span>Already have an account? </span>
            <a href="/login" className="font-semibold text-blue-300 hover:text-blue-200">
              Log In
            </a>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
