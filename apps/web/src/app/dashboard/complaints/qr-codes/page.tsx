"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, QrCode, Plus, Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { machinesApi, complaintsApi } from "@/lib/api";

interface QrCodeItem {
  id: string;
  code: string;
  machineId: string;
  machineName?: string;
  url: string;
  createdAt: string;
}

export default function ComplaintsQrCodesPage() {
  const t = useTranslations("complaints");
  const [selectedMachineId, setSelectedMachineId] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: machines } = useQuery({
    queryKey: ["machines-list"],
    queryFn: () => machinesApi.getAll().then((res) => res.data?.data || []),
  });

  const { data: qrCodes, isLoading } = useQuery({
    queryKey: ["complaint-qr-codes", selectedMachineId],
    queryFn: () =>
      selectedMachineId
        ? complaintsApi
            .getQrCode(selectedMachineId)
            .then((res) => (Array.isArray(res.data) ? res.data : [res.data]))
        : Promise.resolve([]),
    enabled: !!selectedMachineId,
  });

  const generateMutation = useMutation({
    mutationFn: (machineId: string) =>
      complaintsApi.create({ machineId, type: "qr-generate" }),
    onSuccess: () => {
      toast.success(t("toastQrGenerated"));
      queryClient.invalidateQueries({ queryKey: ["complaint-qr-codes"] });
    },
    onError: () => toast.error(t("toastQrGenerateError")),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("toastCopied"));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/complaints">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t("qrCodes")}</h1>
          <p className="text-muted-foreground">{t("qrCodesSubtitle")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              {t("qrManagement")}
            </span>
            <Button
              onClick={() => {
                if (selectedMachineId)
                  generateMutation.mutate(selectedMachineId);
                else toast.error(t("selectMachine"));
              }}
              disabled={generateMutation.isPending || !selectedMachineId}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {t("generate")}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-sm">
            <Select
              value={selectedMachineId}
              onValueChange={setSelectedMachineId}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectMachinePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {((machines as Array<{ id: string; name: string }>) || []).map(
                  (m: { id: string; name: string }) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !selectedMachineId ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">{t("selectMachine")}</p>
              <p className="text-muted-foreground">{t("qrCodesForMachine")}</p>
            </div>
          ) : (qrCodes as QrCodeItem[] | undefined)?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colCode")}</TableHead>
                  <TableHead>{t("colUrl")}</TableHead>
                  <TableHead>{t("colCreatedAt")}</TableHead>
                  <TableHead>{t("colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(qrCodes as QrCodeItem[]).map((qr) => (
                  <TableRow key={qr.id || qr.code}>
                    <TableCell className="font-mono text-sm">
                      {qr.code}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {qr.url}
                    </TableCell>
                    <TableCell className="text-sm">
                      {qr.createdAt
                        ? new Date(qr.createdAt).toLocaleDateString("ru-RU")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(qr.url || qr.code)}
                          title={t("copyTooltip")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {qr.url && (
                          <Button variant="ghost" size="icon" asChild>
                            <a
                              href={qr.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={t("openTooltip")}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">{t("qrNotFound")}</p>
              <p className="text-muted-foreground">{t("qrGenerateHint")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
