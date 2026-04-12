"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { api } from "@/lib/api";

/**
 * Must match EmployeeRole enum in backend entity
 * @see apps/api/src/modules/employees/entities/employee.entity.ts
 */
const EMPLOYEE_ROLES = [
  "operator",
  "technician",
  "warehouse",
  "driver",
  "manager",
  "accountant",
  "supervisor",
] as const;

const ROLE_KEYS: Record<string, string> = {
  operator: "roleOperator",
  technician: "roleTechnician",
  warehouse: "roleWarehouse",
  driver: "roleDriver",
  manager: "roleManager",
  accountant: "roleAccountant",
  supervisor: "roleSupervisor",
};

/**
 * Zod schema aligned with CreateEmployeeDto
 * Required: firstName, lastName, employeeRole, hireDate
 * Optional: phone, email, inn (mapped to notes or skipped)
 */
const employeeSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  employeeRole: z.enum(EMPLOYEE_ROLES),
  hireDate: z.string().min(1, "Hire date is required"),
  phone: z
    .string()
    .regex(/^\+998\d{9}$/, "Format: +998XXXXXXXXX")
    .or(z.literal("")),
  email: z.string().email("Invalid email format").or(z.literal("")),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

export default function NewEmployeePage() {
  const t = useTranslations("employees");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      employeeRole: "operator",
      hireDate: new Date().toISOString().split("T")[0],
      phone: "",
      email: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: EmployeeFormValues) => {
      const payload = {
        ...data,
        phone: data.phone || undefined,
        email: data.email || undefined,
      };
      return api.post("/employees", payload);
    },
    onSuccess: () => {
      toast.success(t("employeeCreated"));
      router.push("/dashboard/employees");
    },
    onError: () => toast.error(t("employeeCreateError")),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/employees">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{t("newEmployee")}</h1>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("personalInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("firstName")} *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("lastName")} *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="employeeRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("position")} *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EMPLOYEE_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {ROLE_KEYS[role] ? t(ROLE_KEYS[role]) : role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hireDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("hireDate")} *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("phone")}</FormLabel>
                      <FormControl>
                        <Input placeholder="+998901234567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("email")}</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end gap-3 mt-6">
            <Link href="/dashboard/employees">
              <Button variant="outline">{tCommon("cancel")}</Button>
            </Link>
            <Button type="submit" disabled={mutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {mutation.isPending ? tCommon("saving") : tCommon("save")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
