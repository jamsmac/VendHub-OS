"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Copy,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Send,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { invitesApi } from "@/lib/api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";

const ROLES = [
  { value: "admin", label: "Administrator" },
  { value: "manager", label: "Manager" },
  { value: "operator", label: "Operator" },
  { value: "warehouse", label: "Warehouse" },
  { value: "accountant", label: "Accountant" },
  { value: "viewer", label: "Viewer" },
];

interface Invite {
  id: string;
  code: string;
  role: string;
  status: string;
  expiresAt: string;
  maxUses: number;
  currentUses: number;
  description?: string;
  createdAt: string;
}

export default function InvitesPage() {
  const t = useTranslations("team");
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("operator");
  const [expiresInHours, setExpiresInHours] = useState("24");
  const [description, setDescription] = useState("");

  const { data: invites, isLoading } = useQuery({
    queryKey: ["invites"],
    queryFn: async () => {
      const res = await invitesApi.getAll({ includeExpired: "true" });
      const payload = res.data?.data ?? res.data;
      return (payload as Invite[]) || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await invitesApi.create({
        role,
        expiresInHours: Number(expiresInHours),
        description: description || undefined,
      });
      return res.data?.data ?? res.data;
    },
    onSuccess: (data: { code: string }) => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
      toast.success(`Invite created: ${data.code}`);
      setOpen(false);
      setDescription("");
    },
    onError: () => toast.error("Failed to create invite"),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => invitesApi.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
      toast.success("Invite revoked");
    },
    onError: () => toast.error("Failed to revoke invite"),
  });

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/auth/register?code=${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied!");
  };

  const copyTelegramLink = (code: string) => {
    const botUsername = "VendHubBot"; // TODO: make configurable
    const url = `https://t.me/${botUsername}?start=invite_${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Telegram invite link copied!");
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Clock className="h-4 w-4 text-green-500" />;
      case "used":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "expired":
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
      case "revoked":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const statusVariant = (
    status: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "active":
        return "default";
      case "used":
        return "secondary";
      case "revoked":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-espresso-dark">
            {t("invites", { defaultValue: "Invitations" })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("invitesDescription", {
              defaultValue: "Invite team members to join your organization",
            })}
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("createInvite", { defaultValue: "Create Invite" })}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Invite</DialogTitle>
              <DialogDescription>
                Choose a role and expiration for the invite link.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Expires in (hours)</Label>
                <Select
                  value={expiresInHours}
                  onValueChange={setExpiresInHours}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="72">3 days</SelectItem>
                    <SelectItem value="168">7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. For new operator Bakhodir"
                />
              </div>

              <Button
                className="w-full"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <span className="flex items-center gap-2">Creating...</span>
                ) : (
                  "Create Invite"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Invites list */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Loading invites...
            </CardContent>
          </Card>
        ) : !invites?.length ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No invites yet. Create one to invite team members.
            </CardContent>
          </Card>
        ) : (
          invites.map((invite) => (
            <Card key={invite.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {statusIcon(invite.status)}
                    <CardTitle className="text-base font-mono">
                      {invite.code}
                    </CardTitle>
                    <Badge variant={statusVariant(invite.status)}>
                      {invite.status}
                    </Badge>
                    <Badge variant="outline">{invite.role}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {invite.status === "active" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyLink(invite.code)}
                          title="Copy invite link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyTelegramLink(invite.code)}
                          title="Copy Telegram link"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => revokeMutation.mutate(invite.id)}
                          title="Revoke invite"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {invite.description && (
                  <CardDescription>{invite.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>
                    Uses: {invite.currentUses}/{invite.maxUses}
                  </span>
                  <span>Expires: {formatDateTime(invite.expiresAt)}</span>
                  <span>Created: {formatDateTime(invite.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
