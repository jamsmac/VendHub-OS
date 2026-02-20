'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardCheck,
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  Star,
  Eye,
  Send,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const employeeTabs = [
  { href: '/dashboard/employees', label: 'Сотрудники' },
  { href: '/dashboard/employees/departments', label: 'Отделы' },
  { href: '/dashboard/employees/attendance', label: 'Посещаемость' },
  { href: '/dashboard/employees/leave', label: 'Отпуска' },
  { href: '/dashboard/employees/payroll', label: 'Зарплата' },
  { href: '/dashboard/employees/reviews', label: 'Оценки' },
];

interface Review {
  id: string;
  employee_id: string;
  employee?: { id: string; firstName: string; lastName: string };
  reviewer_id: string;
  reviewer?: { id: string; firstName: string; lastName: string };
  period_type: string;
  review_date: string;
  overall_rating?: number;
  ratings?: Record<string, number>;
  strengths?: string;
  improvements?: string;
  goals?: string;
  status: string;
  created_at: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

const periodTypeLabels: Record<string, string> = {
  MONTHLY: 'Ежемесячно',
  QUARTERLY: 'Ежеквартально',
  SEMI_ANNUAL: 'Полугодовой',
  ANNUAL: 'Ежегодный',
};

const periodTypeColors: Record<string, string> = {
  MONTHLY: 'bg-blue-500/10 text-blue-500',
  QUARTERLY: 'bg-green-500/10 text-green-500',
  SEMI_ANNUAL: 'bg-amber-500/10 text-amber-500',
  ANNUAL: 'bg-violet-500/10 text-violet-500',
};

const reviewStatusLabels: Record<string, string> = {
  SCHEDULED: 'Запланировано',
  IN_PROGRESS: 'В процессе',
  COMPLETED: 'Завершено',
  CANCELLED: 'Отменено',
};

const reviewStatusColors: Record<string, string> = {
  SCHEDULED: 'bg-muted text-muted-foreground',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-500',
  COMPLETED: 'bg-green-500/10 text-green-500',
  CANCELLED: 'bg-red-500/10 text-red-500',
};

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < rating
              ? 'fill-amber-400 text-amber-400'
              : 'fill-none text-muted-foreground/40'
          }`}
        />
      ))}
      <span className="ml-1 text-sm font-medium">{rating}/{max}</span>
    </div>
  );
}

function StarInput({
  value,
  onChange,
  max = 5,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i + 1)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i + 1)}
          className="p-0.5"
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              i < (hover || value)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-none text-muted-foreground/40 hover:text-amber-200'
            }`}
          />
        </button>
      ))}
      <span className="ml-2 text-sm text-muted-foreground">
        {value > 0 ? `${value} из ${max}` : 'Не оценено'}
      </span>
    </div>
  );
}

export default function ReviewsPage() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitReviewId, setSubmitReviewId] = useState<string | null>(null);
  const [detailReview, setDetailReview] = useState<Review | null>(null);

  const { data: reviews, isLoading } = useQuery<Review[]>({
    queryKey: ['reviews'],
    queryFn: async () => {
      const res = await api.get('/employees/reviews');
      return res.data;
    },
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const res = await api.get('/employees');
      return res.data;
    },
  });

  const allReviews = reviews || [];
  const now = new Date();
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);

  const stats = {
    total: allReviews.length,
    scheduled: allReviews.filter((r) => r.status === 'SCHEDULED').length,
    inProgress: allReviews.filter((r) => r.status === 'IN_PROGRESS').length,
    completedThisQuarter: allReviews.filter((r) => {
      if (r.status !== 'COMPLETED') return false;
      return new Date(r.review_date) >= quarterStart;
    }).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Сотрудники</h1>
          <p className="text-muted-foreground">
            Управление персоналом организации
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b">
        {employeeTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              pathname === tab.href
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Всего оценок</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Calendar className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.scheduled}</p>
              <p className="text-sm text-muted-foreground">Запланировано</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.inProgress}</p>
              <p className="text-sm text-muted-foreground">В процессе</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completedThisQuarter}</p>
              <p className="text-sm text-muted-foreground">Завершено в этом квартале</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-end">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Создать оценку
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Новая оценка сотрудника</DialogTitle>
            </DialogHeader>
            <CreateReviewForm
              employees={employees || []}
              onSuccess={() => {
                setIsCreateOpen(false);
                queryClient.invalidateQueries({ queryKey: ['reviews'] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Submit Review Dialog */}
      <Dialog open={!!submitReviewId} onOpenChange={(open) => !open && setSubmitReviewId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Заполнить оценку</DialogTitle>
          </DialogHeader>
          {submitReviewId && (
            <SubmitReviewForm
              reviewId={submitReviewId}
              onSuccess={() => {
                setSubmitReviewId(null);
                queryClient.invalidateQueries({ queryKey: ['reviews'] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailReview} onOpenChange={(open) => !open && setDetailReview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Детали оценки</DialogTitle>
          </DialogHeader>
          {detailReview && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {detailReview.employee?.firstName?.[0]}
                    {detailReview.employee?.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    {detailReview.employee?.firstName} {detailReview.employee?.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Оценщик: {detailReview.reviewer?.firstName} {detailReview.reviewer?.lastName}
                  </p>
                </div>
                <Badge className={`ml-auto ${reviewStatusColors[detailReview.status]}`}>
                  {reviewStatusLabels[detailReview.status]}
                </Badge>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Тип периода</span>
                  <Badge className={periodTypeColors[detailReview.period_type]}>
                    {periodTypeLabels[detailReview.period_type]}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Дата оценки</span>
                  <span>{new Date(detailReview.review_date).toLocaleDateString('ru-RU')}</span>
                </div>
                {detailReview.overall_rating !== undefined && detailReview.overall_rating !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Общая оценка</span>
                    <StarRating rating={detailReview.overall_rating} />
                  </div>
                )}
              </div>

              {detailReview.ratings && Object.keys(detailReview.ratings).length > 0 && (
                <div className="pt-2 border-t space-y-2">
                  <p className="font-medium text-sm">Оценки по категориям</p>
                  {Object.entries(detailReview.ratings).map(([category, rating]) => (
                    <div key={category} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{category}</span>
                      <StarRating rating={rating as number} />
                    </div>
                  ))}
                </div>
              )}

              {detailReview.strengths && (
                <div className="pt-2 border-t">
                  <p className="font-medium text-sm mb-1">Сильные стороны</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{detailReview.strengths}</p>
                </div>
              )}

              {detailReview.improvements && (
                <div className="pt-2 border-t">
                  <p className="font-medium text-sm mb-1">Области для улучшения</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{detailReview.improvements}</p>
                </div>
              )}

              {detailReview.goals && (
                <div className="pt-2 border-t">
                  <p className="font-medium text-sm mb-1">Цели</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{detailReview.goals}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Table */}
      <div className="bg-card rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Сотрудник</TableHead>
              <TableHead>Оценщик</TableHead>
              <TableHead>Тип периода</TableHead>
              <TableHead>Дата оценки</TableHead>
              <TableHead>Общая оценка</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-12 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : allReviews.length ? (
              allReviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">
                          {review.employee?.firstName?.[0]}
                          {review.employee?.lastName?.[0]}
                        </span>
                      </div>
                      <span className="font-medium">
                        {review.employee?.firstName} {review.employee?.lastName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {review.reviewer?.firstName} {review.reviewer?.lastName}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={periodTypeColors[review.period_type] || 'bg-muted text-muted-foreground'}>
                      {periodTypeLabels[review.period_type] || review.period_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(review.review_date).toLocaleDateString('ru-RU')}
                  </TableCell>
                  <TableCell>
                    {review.overall_rating !== undefined && review.overall_rating !== null ? (
                      <StarRating rating={review.overall_rating} />
                    ) : (
                      <span className="text-muted-foreground text-sm">Не оценено</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={reviewStatusColors[review.status] || 'bg-muted text-muted-foreground'}>
                      {reviewStatusLabels[review.status] || review.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDetailReview(review)}
                        title="Подробнее"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {(review.status === 'SCHEDULED' || review.status === 'IN_PROGRESS') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => setSubmitReviewId(review.id)}
                          title="Заполнить оценку"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Оценки не найдены</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CreateReviewForm({
  employees,
  onSuccess,
}: {
  employees: Employee[];
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    employee_id: '',
    reviewer_id: '',
    period_type: '',
    review_date: new Date().toISOString().split('T')[0],
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post('/employees/reviews', data);
    },
    onSuccess: () => {
      toast.success('Оценка создана');
      onSuccess();
    },
    onError: () => {
      toast.error('Не удалось создать оценку');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Сотрудник</label>
        <Select
          value={formData.employee_id}
          onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Выберите сотрудника" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Оценщик</label>
        <Select
          value={formData.reviewer_id}
          onValueChange={(value) => setFormData({ ...formData, reviewer_id: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Выберите оценщика" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Тип периода</label>
        <Select
          value={formData.period_type}
          onValueChange={(value) => setFormData({ ...formData, period_type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Выберите тип" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(periodTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium">Дата оценки</label>
        <Input
          type="date"
          value={formData.review_date}
          onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
          required
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="submit"
          disabled={
            mutation.isPending ||
            !formData.employee_id ||
            !formData.reviewer_id ||
            !formData.period_type
          }
        >
          {mutation.isPending ? 'Создание...' : 'Создать оценку'}
        </Button>
      </div>
    </form>
  );
}

function SubmitReviewForm({
  reviewId,
  onSuccess,
}: {
  reviewId: string;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    overall_rating: 0,
    ratings: {
      'Качество работы': 0,
      'Продуктивность': 0,
      'Коммуникация': 0,
      'Инициативность': 0,
      'Пунктуальность': 0,
    } as Record<string, number>,
    strengths: '',
    improvements: '',
    goals: '',
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post(`/employees/reviews/${reviewId}/submit`, data);
    },
    onSuccess: () => {
      toast.success('Оценка отправлена');
      onSuccess();
    },
    onError: () => {
      toast.error('Не удалось отправить оценку');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const updateCategoryRating = (category: string, value: number) => {
    setFormData((prev) => ({
      ...prev,
      ratings: { ...prev.ratings, [category]: value },
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Общая оценка</label>
        <StarInput
          value={formData.overall_rating}
          onChange={(v) => setFormData({ ...formData, overall_rating: v })}
        />
      </div>

      <div className="space-y-3 pt-2 border-t">
        <p className="text-sm font-medium">Оценки по категориям</p>
        {Object.entries(formData.ratings).map(([category, rating]) => (
          <div key={category}>
            <label className="text-sm text-muted-foreground mb-1 block">{category}</label>
            <StarInput
              value={rating}
              onChange={(v) => updateCategoryRating(category, v)}
            />
          </div>
        ))}
      </div>

      <div>
        <label className="text-sm font-medium">Сильные стороны</label>
        <Textarea
          value={formData.strengths}
          onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
          className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm min-h-[70px] resize-none"
          placeholder="Опишите сильные стороны сотрудника"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Области для улучшения</label>
        <Textarea
          value={formData.improvements}
          onChange={(e) => setFormData({ ...formData, improvements: e.target.value })}
          className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm min-h-[70px] resize-none"
          placeholder="Что можно улучшить"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Цели</label>
        <Textarea
          value={formData.goals}
          onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
          className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm min-h-[70px] resize-none"
          placeholder="Цели на следующий период"
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="submit"
          disabled={mutation.isPending || formData.overall_rating === 0}
        >
          {mutation.isPending ? 'Отправка...' : 'Отправить оценку'}
        </Button>
      </div>
    </form>
  );
}
