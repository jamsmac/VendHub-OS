"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Coffee, Loader2, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { invitesApi } from "@/lib/api";
import { setTokens } from "@/lib/api";
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

export default function RegisterWithInvitePage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("code") || "";

  const [isValidating, setIsValidating] = useState(false);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteRole, setInviteRole] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registerSchema = useMemo(
    () =>
      z.object({
        inviteCode: z.string().min(12, "Invalid invite code"),
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        email: z.string().email("Valid email required"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    [],
  );

  type RegisterForm = z.infer<typeof registerSchema>;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { inviteCode },
  });

  // Validate invite code on load
  useEffect(() => {
    if (!inviteCode || inviteCode.length < 12) return;

    setIsValidating(true);
    invitesApi
      .validate(inviteCode)
      .then((res) => {
        const data = res.data?.data ?? res.data;
        setInviteValid(true);
        setInviteRole(data.role);
        setValue("inviteCode", inviteCode);
      })
      .catch(() => {
        setInviteValid(false);
      })
      .finally(() => setIsValidating(false));
  }, [inviteCode, setValue]);

  const onSubmit = async (data: RegisterForm) => {
    setIsSubmitting(true);
    try {
      const response = await invitesApi.registerWithInvite({
        inviteCode: data.inviteCode,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      });

      const payload = response.data?.data ?? response.data;

      // Store tokens and set auth state
      setTokens(payload.accessToken);
      useAuthStore.setState({
        user: payload.user,
        isAuthenticated: true,
      });

      toast.success("Registration successful!");
      router.push("/dashboard");
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string; data?: { message?: string } } };
      };
      const message =
        err.response?.data?.data?.message ||
        err.response?.data?.message ||
        "Registration failed";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-coffee-50 to-coffee-100 dark:from-coffee-900 dark:to-coffee-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4">
            <Coffee className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">
            {t("registerTitle", { defaultValue: "Join VendHub" })}
          </CardTitle>
          <CardDescription>
            {t("registerSubtitle", {
              defaultValue: "Register with your invite code",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Invite validation status */}
          {inviteCode && (
            <div className="mb-4 rounded-lg border p-3">
              {isValidating ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Validating invite...</span>
                </div>
              ) : inviteValid === true ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Valid invite — role: <strong>{inviteRole}</strong>
                  </span>
                </div>
              ) : inviteValid === false ? (
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">
                    Invalid or expired invite code
                  </span>
                </div>
              ) : null}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Invite code (pre-filled from URL, but editable) */}
            {!inviteCode && (
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite Code</Label>
                <Input
                  id="inviteCode"
                  placeholder="Enter your invite code"
                  {...register("inviteCode")}
                />
                {errors.inviteCode && (
                  <p className="text-sm text-destructive">
                    {errors.inviteCode.message}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  {t("firstName", { defaultValue: "First Name" })}
                </Label>
                <Input id="firstName" {...register("firstName")} />
                {errors.firstName && (
                  <p className="text-sm text-destructive">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  {t("lastName", { defaultValue: "Last Name" })}
                </Label>
                <Input id="lastName" {...register("lastName")} />
                {errors.lastName && (
                  <p className="text-sm text-destructive">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
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
              <Input
                id="password"
                type="password"
                placeholder="Min 8 characters"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || inviteValid === false}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                t("register", { defaultValue: "Create Account" })
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/auth" className="text-sm text-primary hover:underline">
              {t("alreadyHaveAccount", {
                defaultValue: "Already have an account? Sign in",
              })}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
