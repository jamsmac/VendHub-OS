"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Coffee, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AuthPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(t("validEmail")),
        password: z.string().min(8, t("minPassword")),
        twoFactorCode: z.string().optional(),
      }),
    [t],
  );

  type LoginForm = z.infer<typeof loginSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const result = await login(data.email, data.password, data.twoFactorCode);

      if ("requiresTwoFactor" in result && result.requiresTwoFactor) {
        setRequires2FA(true);
        toast.info(t("twoFactorPrompt"));
        return;
      }

      toast.success(t("welcome"));
      router.push("/dashboard");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("loginError");
      toast.error(message || t("loginError"));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-coffee-50 to-coffee-100 dark:from-coffee-900 dark:to-coffee-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4">
            <Coffee className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">{t("loginTitle")}</CardTitle>
          <CardDescription>{t("loginSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@vendhub.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("password")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Link
                href="/auth/reset-password"
                className="text-sm text-primary hover:underline"
              >
                {t("forgotPassword")}
              </Link>
            </div>

            {requires2FA && (
              <div className="space-y-2">
                <Label htmlFor="twoFactorCode">{t("twoFactorCode")}</Label>
                <Input
                  id="twoFactorCode"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  {...register("twoFactorCode")}
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("loggingIn")}
                </>
              ) : (
                t("login")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
