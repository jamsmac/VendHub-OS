"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Trophy,
  Star,
  BarChart3,
  Calculator,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Users,
  TrendingUp,
  Medal,
} from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { operatorRatingsApi } from "@/lib/api";

// ---- Types ----------------------------------------------------------------

interface OperatorRating {
  id: string;
  user_id: string;
  operator?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
  };
  period_start: string;
  period_end: string;
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  tasks_completed: number;
  tasks_total?: number;
  created_at: string;
}

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  operator?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  tasks_completed: number;
}

interface Summary {
  total_operators: number;
  avg_score: number;
  top_grade: string;
  period_start: string;
  period_end: string;
}

// ---- Grade helpers --------------------------------------------------------

const gradeColors: Record<string, string> = {
  A: "bg-green-500/10 text-green-500 border-green-500/20",
  B: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  C: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  D: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  F: "bg-red-500/10 text-red-500 border-red-500/20",
};

const rankMedal = (rank: number) => {
  if (rank === 1) return "text-yellow-400";
  if (rank === 2) return "text-slate-400";
  if (rank === 3) return "text-amber-600";
  return "text-muted-foreground";
};

function GradeBadge({ grade }: { grade: string }) {
  return (
    <Badge className={gradeColors[grade] ?? "bg-muted text-muted-foreground"}>
      {grade}
    </Badge>
  );
}

function OperatorName({
  operator,
  userId,
}: {
  operator?: { first_name: string; last_name: string };
  userId: string;
}) {
  if (operator) {
    return (
      <span className="font-medium">
        {operator.first_name} {operator.last_name}
      </span>
    );
  }
  return <span className="text-muted-foreground text-sm">{userId}</span>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ---- Main page component -------------------------------------------------

export default function OperatorRatingsPage() {
  const t = useTranslations("operatorRatings");
  const queryClient = useQueryClient();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="leaderboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leaderboard" className="gap-2">
            <Trophy className="w-4 h-4" />
            {t("tabs.leaderboard")}
          </TabsTrigger>
          <TabsTrigger value="ratings" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            {t("tabs.ratings")}
          </TabsTrigger>
          <TabsTrigger value="calculate" className="gap-2">
            <Calculator className="w-4 h-4" />
            {t("tabs.calculate")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard">
          <LeaderboardTab t={t} queryClient={queryClient} />
        </TabsContent>

        <TabsContent value="ratings">
          <AllRatingsTab t={t} queryClient={queryClient} />
        </TabsContent>

        <TabsContent value="calculate">
          <CalculateTab t={t} queryClient={queryClient} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---- Leaderboard Tab ------------------------------------------------------

function LeaderboardTab({
  t,
  queryClient,
}: {
  t: ReturnType<typeof useTranslations<"operatorRatings">>;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [top, setTop] = useState("10");

  const params = useMemo(() => {
    const p: Record<string, string> = { top };
    if (periodStart) p.period_start = periodStart;
    if (periodEnd) p.period_end = periodEnd;
    return p;
  }, [periodStart, periodEnd, top]);

  const {
    data: leaderboard,
    isLoading,
    isError,
  } = useQuery<LeaderboardEntry[]>({
    queryKey: ["operator-ratings-leaderboard", params],
    queryFn: async () => {
      const res = await operatorRatingsApi.getLeaderboard(params);
      return res.data;
    },
  });

  const { data: summary } = useQuery<Summary>({
    queryKey: ["operator-ratings-summary", params],
    queryFn: async () => {
      const res = await operatorRatingsApi.getSummary(params);
      return res.data;
    },
  });

  return (
    <div className="space-y-4">
      {/* Period filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            {t("periodFilter.from")}
          </label>
          <Input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            {t("periodFilter.to")}
          </label>
          <Input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            {t("periodFilter.top")}
          </label>
          <Select value={top} onValueChange={setTop}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["5", "10", "20", "50"].map((n) => (
                <SelectItem key={n} value={n}>
                  {t("periodFilter.topN", { n })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card rounded-xl p-4 border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.total_operators}</p>
                <p className="text-sm text-muted-foreground">
                  {t("summary.totalOperators")}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {summary.avg_score?.toFixed(1) ?? "—"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("summary.avgScore")}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {summary.top_grade ? (
                    <GradeBadge grade={summary.top_grade} />
                  ) : (
                    "—"
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("summary.topGrade")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard table */}
      {isError ? (
        <div className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium">{t("loadError")}</p>
          <Button
            className="mt-4"
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: ["operator-ratings-leaderboard"],
              })
            }
          >
            {t("retry")}
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">{t("columns.rank")}</TableHead>
                <TableHead>{t("columns.operator")}</TableHead>
                <TableHead className="text-right">
                  {t("columns.score")}
                </TableHead>
                <TableHead>{t("columns.grade")}</TableHead>
                <TableHead className="text-right">
                  {t("columns.tasksCompleted")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : leaderboard?.length ? (
                leaderboard.map((entry) => (
                  <TableRow key={entry.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Medal className={`w-4 h-4 ${rankMedal(entry.rank)}`} />
                        <span className="font-semibold">{entry.rank}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <OperatorName
                        operator={entry.operator}
                        userId={entry.user_id}
                      />
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {entry.score?.toFixed(1) ?? "—"}
                    </TableCell>
                    <TableCell>
                      <GradeBadge grade={entry.grade} />
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.tasks_completed}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">{t("notFound")}</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ---- All Ratings Tab -------------------------------------------------------

function AllRatingsTab({
  t,
  queryClient,
}: {
  t: ReturnType<typeof useTranslations<"operatorRatings">>;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [userId, setUserId] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [page, setPage] = useState(1);

  const params = useMemo(() => {
    const p: Record<string, string | number> = { page, limit: 20 };
    if (userId.trim()) p.user_id = userId.trim();
    if (gradeFilter !== "all") p.grade = gradeFilter;
    if (periodStart) p.period_start = periodStart;
    if (periodEnd) p.period_end = periodEnd;
    if (minScore) p.min_score = minScore;
    if (maxScore) p.max_score = maxScore;
    return p;
  }, [userId, gradeFilter, periodStart, periodEnd, minScore, maxScore, page]);

  const {
    data: ratingsData,
    isLoading,
    isError,
  } = useQuery<OperatorRating[] | { data: OperatorRating[]; total: number }>({
    queryKey: ["operator-ratings", params],
    queryFn: async () => {
      const res = await operatorRatingsApi.getAll(params);
      return res.data;
    },
  });

  const ratings: OperatorRating[] = Array.isArray(ratingsData)
    ? ratingsData
    : ((ratingsData as { data: OperatorRating[] })?.data ?? []);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => operatorRatingsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operator-ratings"] });
      toast.success(t("messages.deleted"));
    },
    onError: () => {
      toast.error(t("messages.deleteFailed"));
    },
  });

  const recalculateMutation = useMutation({
    mutationFn: (id: string) => operatorRatingsApi.recalculate(id, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operator-ratings"] });
      toast.success(t("messages.recalculated"));
    },
    onError: () => {
      toast.error(t("messages.recalculateFailed"));
    },
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder={t("searchPlaceholder")}
          value={userId}
          onChange={(e) => {
            setUserId(e.target.value);
            setPage(1);
          }}
          className="w-52"
        />
        <Select
          value={gradeFilter}
          onValueChange={(v) => {
            setGradeFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder={t("filters.allGrades")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.allGrades")}</SelectItem>
            {(["A", "B", "C", "D", "F"] as const).map((g) => (
              <SelectItem key={g} value={g}>
                {t(`grades.${g}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={periodStart}
          onChange={(e) => {
            setPeriodStart(e.target.value);
            setPage(1);
          }}
          className="w-44"
          title={t("periodFilter.from")}
        />
        <Input
          type="date"
          value={periodEnd}
          onChange={(e) => {
            setPeriodEnd(e.target.value);
            setPage(1);
          }}
          className="w-44"
          title={t("periodFilter.to")}
        />
        <Input
          type="number"
          placeholder={t("filters.minScore")}
          value={minScore}
          onChange={(e) => {
            setMinScore(e.target.value);
            setPage(1);
          }}
          className="w-28"
        />
        <Input
          type="number"
          placeholder={t("filters.maxScore")}
          value={maxScore}
          onChange={(e) => {
            setMaxScore(e.target.value);
            setPage(1);
          }}
          className="w-28"
        />
      </div>

      {/* Table */}
      {isError ? (
        <div className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium">{t("loadError")}</p>
          <Button
            className="mt-4"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["operator-ratings"] })
            }
          >
            {t("retry")}
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.operator")}</TableHead>
                <TableHead>{t("columns.period")}</TableHead>
                <TableHead className="text-right">
                  {t("columns.score")}
                </TableHead>
                <TableHead>{t("columns.grade")}</TableHead>
                <TableHead className="text-right">
                  {t("columns.tasksCompleted")}
                </TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-10 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : ratings.length > 0 ? (
                ratings.map((rating) => (
                  <TableRow key={rating.id}>
                    <TableCell>
                      <OperatorName
                        operator={rating.operator}
                        userId={rating.user_id}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(rating.period_start)} —{" "}
                      {formatDate(rating.period_end)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {rating.score?.toFixed(1) ?? "—"}
                    </TableCell>
                    <TableCell>
                      <GradeBadge grade={rating.grade} />
                    </TableCell>
                    <TableCell className="text-right">
                      {rating.tasks_completed}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("actions.label")}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              recalculateMutation.mutate(rating.id)
                            }
                            disabled={recalculateMutation.isPending}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {t("actions.recalculate")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(rating.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t("actions.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">{t("notFound")}</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {ratings.length > 0 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t("pagination.prev")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("pagination.page", { page })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={ratings.length < 20}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("pagination.next")}
          </Button>
        </div>
      )}
    </div>
  );
}

// ---- Calculate Tab --------------------------------------------------------

function CalculateTab({
  t,
  queryClient,
}: {
  t: ReturnType<typeof useTranslations<"operatorRatings">>;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [userId, setUserId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const calculateMutation = useMutation({
    mutationFn: () =>
      operatorRatingsApi.calculate({
        user_id: userId || undefined,
        period_start: periodStart || undefined,
        period_end: periodEnd || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operator-ratings"] });
      queryClient.invalidateQueries({
        queryKey: ["operator-ratings-leaderboard"],
      });
      queryClient.invalidateQueries({ queryKey: ["operator-ratings-summary"] });
      toast.success(t("messages.calculated"));
      setUserId("");
      setPeriodStart("");
      setPeriodEnd("");
    },
    onError: () => {
      toast.error(t("messages.calculateFailed"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    calculateMutation.mutate();
  };

  return (
    <div className="max-w-lg">
      <div className="bg-card rounded-xl border p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{t("calculateForm.title")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("calculateForm.description")}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">
              {t("form.userId")}
              <span className="text-muted-foreground font-normal ml-1">
                ({t("form.optional")})
              </span>
            </label>
            <Input
              placeholder={t("form.userIdPlaceholder")}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">
                {t("form.periodStart")}
              </label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                {t("form.periodEnd")}
              </label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={calculateMutation.isPending}
              className="w-full"
            >
              {calculateMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {t("calculateForm.calculating")}
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4 mr-2" />
                  {t("calculateForm.submit")}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Grade reference card */}
      <div className="bg-card rounded-xl border p-5 mt-4 space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t("gradeReference.title")}
        </h4>
        <div className="space-y-2">
          {(["A", "B", "C", "D", "F"] as const).map((grade) => (
            <div key={grade} className="flex items-center gap-3">
              <GradeBadge grade={grade} />
              <span className="text-sm">{t(`grades.${grade}`)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
