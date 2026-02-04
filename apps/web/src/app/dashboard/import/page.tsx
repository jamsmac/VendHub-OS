'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  FileSpreadsheet,
  Search,
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  FileUp,
  Loader2,
  ClipboardList,
  Columns,
  ShieldCheck,
  Play,
  X,
  RefreshCw,
  History,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { importApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';

// --- Types ---

interface ImportSession {
  id: string;
  session_number?: string;
  domain: ImportDomain;
  status: ImportStatus;
  file_name: string;
  file_size?: number;
  total_rows: number;
  processed_rows: number;
  errors_count: number;
  warnings_count: number;
  inserts_count?: number;
  updates_count?: number;
  classification_confidence?: number;
  detected_domain?: ImportDomain;
  column_mappings?: ColumnMapping[];
  validation_errors?: ValidationError[];
  validation_warnings?: ValidationWarning[];
  reject_reason?: string;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
}

interface ColumnMapping {
  source_column: string;
  target_column: string;
  auto_detected: boolean;
  confidence?: number;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

interface ValidationWarning {
  row: number;
  field: string;
  message: string;
  value?: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  table_name: string;
  row_id?: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  created_at: string;
}

interface SessionsResponse {
  data: ImportSession[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

type ImportDomain =
  | 'PRODUCTS'
  | 'MACHINES'
  | 'USERS'
  | 'EMPLOYEES'
  | 'TRANSACTIONS'
  | 'SALES'
  | 'INVENTORY'
  | 'CUSTOMERS'
  | 'PRICES'
  | 'CATEGORIES'
  | 'LOCATIONS'
  | 'CONTRACTORS';

type ImportStatus =
  | 'CREATED'
  | 'UPLOADING'
  | 'UPLOADED'
  | 'CLASSIFYING'
  | 'CLASSIFIED'
  | 'MAPPING'
  | 'MAPPED'
  | 'VALIDATING'
  | 'VALIDATED'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'COMPLETED_WITH_ERRORS'
  | 'FAILED';

// --- Config Maps ---

const statusConfig: Record<ImportStatus, { label: string; color: string; bgColor: string }> = {
  CREATED: { label: 'Создана', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  UPLOADING: { label: 'Загрузка', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  UPLOADED: { label: 'Загружена', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  CLASSIFYING: { label: 'Классификация', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  CLASSIFIED: { label: 'Классифицирована', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  MAPPING: { label: 'Маппинг', color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  MAPPED: { label: 'Маппинг завершён', color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  VALIDATING: { label: 'Валидация', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  VALIDATED: { label: 'Проверена', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  AWAITING_APPROVAL: { label: 'Ожидает одобрения', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  APPROVED: { label: 'Одобрена', color: 'text-green-700', bgColor: 'bg-green-100' },
  REJECTED: { label: 'Отклонена', color: 'text-red-700', bgColor: 'bg-red-100' },
  EXECUTING: { label: 'Выполняется', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  COMPLETED: { label: 'Завершена', color: 'text-green-700', bgColor: 'bg-green-100' },
  COMPLETED_WITH_ERRORS: { label: 'Завершена с ошибками', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  FAILED: { label: 'Ошибка', color: 'text-red-700', bgColor: 'bg-red-100' },
};

const domainConfig: Record<ImportDomain, { label: string; color: string; bgColor: string }> = {
  PRODUCTS: { label: 'Продукты', color: 'text-green-700', bgColor: 'bg-green-100' },
  MACHINES: { label: 'Автоматы', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  USERS: { label: 'Пользователи', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  EMPLOYEES: { label: 'Сотрудники', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  TRANSACTIONS: { label: 'Транзакции', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  SALES: { label: 'Продажи', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  INVENTORY: { label: 'Инвентарь', color: 'text-teal-700', bgColor: 'bg-teal-100' },
  CUSTOMERS: { label: 'Клиенты', color: 'text-pink-700', bgColor: 'bg-pink-100' },
  PRICES: { label: 'Цены', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  CATEGORIES: { label: 'Категории', color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  LOCATIONS: { label: 'Локации', color: 'text-sky-700', bgColor: 'bg-sky-100' },
  CONTRACTORS: { label: 'Контрагенты', color: 'text-slate-700', bgColor: 'bg-slate-100' },
};

const domainOptions = [
  { value: 'ALL', label: 'Все домены' },
  ...Object.entries(domainConfig).map(([key, cfg]) => ({
    value: key,
    label: cfg.label,
  })),
];

const statusFilterOptions = [
  { value: 'ALL', label: 'Все статусы' },
  ...Object.entries(statusConfig).map(([key, cfg]) => ({
    value: key,
    label: cfg.label,
  })),
];

const ACCEPTED_FORMATS = '.csv,.xls,.xlsx,.json';
const PAGE_SIZE = 20;

// --- Wizard Steps ---

type WizardStep = 'upload' | 'classification' | 'mapping' | 'validation' | 'approve';

const wizardSteps: { id: WizardStep; label: string; icon: React.ElementType }[] = [
  { id: 'upload', label: 'Загрузка', icon: FileUp },
  { id: 'classification', label: 'Классификация', icon: ClipboardList },
  { id: 'mapping', label: 'Маппинг колонок', icon: Columns },
  { id: 'validation', label: 'Валидация', icon: ShieldCheck },
  { id: 'approve', label: 'Одобрение', icon: Play },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImportPage() {
  // --- List state ---
  const [domainFilter, setDomainFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  // --- Wizard state ---
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [wizardSessionId, setWizardSessionId] = useState<string | null>(null);
  const [domainOverride, setDomainOverride] = useState<string>('');
  const [columnOverrides, setColumnOverrides] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Detail state ---
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState('info');

  // --- Reject state ---
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const queryClient = useQueryClient();

  // --- Queries ---

  const queryParams = {
    domain: domainFilter !== 'ALL' ? domainFilter : undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    page,
    limit: PAGE_SIZE,
  };

  const { data: sessionsResponse, isLoading } = useQuery({
    queryKey: ['import-sessions', queryParams],
    queryFn: () =>
      importApi.getSessions(queryParams).then((res) => res.data as SessionsResponse),
  });

  const { data: wizardSession, refetch: refetchWizardSession } = useQuery({
    queryKey: ['import-session', wizardSessionId],
    queryFn: () =>
      importApi.getSession(wizardSessionId!).then((res) => res.data as ImportSession),
    enabled: !!wizardSessionId,
  });

  const { data: detailSession, refetch: refetchDetailSession } = useQuery({
    queryKey: ['import-session-detail', selectedSessionId],
    queryFn: () =>
      importApi.getSession(selectedSessionId!).then((res) => res.data as ImportSession),
    enabled: !!selectedSessionId && detailOpen,
  });

  const { data: auditLog } = useQuery({
    queryKey: ['import-audit-log', selectedSessionId],
    queryFn: () =>
      importApi.getAuditLog(selectedSessionId!).then((res) => res.data as AuditLogEntry[]),
    enabled: !!selectedSessionId && detailOpen && detailTab === 'audit',
  });

  const sessions = sessionsResponse?.data || [];
  const meta = sessionsResponse?.meta || { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 };

  // --- Mutations ---

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return importApi.createSession(formData);
    },
    onSuccess: (res) => {
      const session = res.data as ImportSession;
      setWizardSessionId(session.id);
      toast.success('Файл загружен успешно');
      setWizardStep('classification');
    },
    onError: () => {
      toast.error('Ошибка при загрузке файла');
    },
  });

  const classifyMutation = useMutation({
    mutationFn: (id: string) => importApi.classifySession(id),
    onSuccess: () => {
      toast.success('Классификация завершена');
      refetchWizardSession();
      setWizardStep('mapping');
    },
    onError: () => {
      toast.error('Ошибка классификации');
    },
  });

  const validateMutation = useMutation({
    mutationFn: (id: string) => importApi.validateSession(id),
    onSuccess: () => {
      toast.success('Валидация завершена');
      refetchWizardSession();
      setWizardStep('validation');
    },
    onError: () => {
      toast.error('Ошибка валидации');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => importApi.approveSession(id),
    onSuccess: () => {
      toast.success('Импорт одобрен и запущен');
      queryClient.invalidateQueries({ queryKey: ['import-sessions'] });
      resetWizard();
    },
    onError: () => {
      toast.error('Ошибка при одобрении импорта');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      importApi.rejectSession(id, { reason }),
    onSuccess: () => {
      toast.success('Импорт отклонён');
      queryClient.invalidateQueries({ queryKey: ['import-sessions'] });
      setRejectOpen(false);
      setRejectReason('');
      resetWizard();
    },
    onError: () => {
      toast.error('Ошибка при отклонении');
    },
  });

  // --- Handlers ---

  const resetWizard = () => {
    setWizardOpen(false);
    setWizardStep('upload');
    setUploadedFile(null);
    setWizardSessionId(null);
    setDomainOverride('');
    setColumnOverrides({});
  };

  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleUpload = () => {
    if (uploadedFile) {
      uploadMutation.mutate(uploadedFile);
    }
  };

  const handleClassify = () => {
    if (wizardSessionId) {
      classifyMutation.mutate(wizardSessionId);
    }
  };

  const handleValidate = () => {
    if (wizardSessionId) {
      validateMutation.mutate(wizardSessionId);
    }
  };

  const handleApprove = () => {
    if (wizardSessionId) {
      approveMutation.mutate(wizardSessionId);
    }
  };

  const handleReject = () => {
    if (wizardSessionId && rejectReason) {
      rejectMutation.mutate({ id: wizardSessionId, reason: rejectReason });
    }
  };

  const handleViewSession = (session: ImportSession) => {
    setSelectedSessionId(session.id);
    setDetailTab('info');
    setDetailOpen(true);
  };

  const getStepIndex = (step: WizardStep) => wizardSteps.findIndex((s) => s.id === step);

  // --- Render Wizard Step Content ---

  const renderWizardStepContent = () => {
    switch (wizardStep) {
      case 'upload':
        return (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FORMATS}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-1">
                Перетащите файл сюда или нажмите для выбора
              </p>
              <p className="text-sm text-muted-foreground">
                Поддерживаемые форматы: CSV, XLS, XLSX, JSON
              </p>
            </div>

            {/* Selected file info */}
            {uploadedFile && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium">{uploadedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(uploadedFile.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadedFile(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleUpload}
                disabled={!uploadedFile || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  <>
                    Загрузить
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'classification':
        return (
          <div className="space-y-4">
            {wizardSession ? (
              <>
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Файл</p>
                        <p className="font-medium">{wizardSession.file_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Строк в файле</p>
                        <p className="font-medium">{wizardSession.total_rows}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Определённый домен</p>
                        <div className="flex items-center gap-2 mt-1">
                          {wizardSession.detected_domain ? (
                            <>
                              <Badge
                                className={`${domainConfig[wizardSession.detected_domain]?.bgColor} ${domainConfig[wizardSession.detected_domain]?.color} border-0`}
                              >
                                {domainConfig[wizardSession.detected_domain]?.label || wizardSession.detected_domain}
                              </Badge>
                              {wizardSession.classification_confidence != null && (
                                <span className="text-sm text-muted-foreground">
                                  ({(wizardSession.classification_confidence * 100).toFixed(0)}%)
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">Не определён</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Переопределить домен</p>
                        <Select value={domainOverride} onValueChange={setDomainOverride}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Авто" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AUTO">Авто</SelectItem>
                            {Object.entries(domainConfig).map(([key, cfg]) => (
                              <SelectItem key={key} value={key}>
                                {cfg.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setWizardStep('upload')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Назад
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleClassify}
                      disabled={classifyMutation.isPending}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${classifyMutation.isPending ? 'animate-spin' : ''}`} />
                      Переклассифицировать
                    </Button>
                    <Button
                      onClick={() => {
                        if (wizardSession.detected_domain || domainOverride) {
                          setWizardStep('mapping');
                        } else {
                          handleClassify();
                        }
                      }}
                      disabled={classifyMutation.isPending}
                    >
                      Далее
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Загрузка данных сессии...</p>
              </div>
            )}
          </div>
        );

      case 'mapping':
        return (
          <div className="space-y-4">
            {wizardSession?.column_mappings && wizardSession.column_mappings.length > 0 ? (
              <>
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Колонка в файле</TableHead>
                          <TableHead>Определённое поле</TableHead>
                          <TableHead>Переопределить</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wizardSession.column_mappings.map((mapping, idx) => (
                          <TableRow
                            key={idx}
                            className={mapping.auto_detected ? '' : 'bg-amber-50'}
                          >
                            <TableCell className="font-mono text-sm">
                              {mapping.source_column}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{mapping.target_column || '-'}</span>
                                {mapping.auto_detected ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                                )}
                                {mapping.confidence != null && (
                                  <span className="text-xs text-muted-foreground">
                                    ({(mapping.confidence * 100).toFixed(0)}%)
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Оставить как есть"
                                value={columnOverrides[mapping.source_column] || ''}
                                onChange={(e) =>
                                  setColumnOverrides((prev) => ({
                                    ...prev,
                                    [mapping.source_column]: e.target.value,
                                  }))
                                }
                                className="h-8 text-sm"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Автоопределён</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>Требует проверки</span>
                  </div>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Columns className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    Маппинг колонок будет доступен после классификации
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setWizardStep('classification')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
              <Button
                onClick={() => {
                  if (wizardSessionId) {
                    validateMutation.mutate(wizardSessionId);
                  }
                }}
                disabled={validateMutation.isPending}
              >
                {validateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Валидация...
                  </>
                ) : (
                  <>
                    Запустить валидацию
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'validation':
        return (
          <div className="space-y-4">
            {wizardSession ? (
              <>
                {/* Validation Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="border-red-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Ошибки</p>
                          <p className="text-xl font-bold text-red-600">
                            {wizardSession.errors_count}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-amber-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Предупреждения</p>
                          <p className="text-xl font-bold text-amber-600">
                            {wizardSession.warnings_count}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Проверено строк</p>
                          <p className="text-xl font-bold text-blue-600">
                            {wizardSession.total_rows}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Validation Errors Table */}
                {wizardSession.validation_errors && wizardSession.validation_errors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Ошибки валидации
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Строка</TableHead>
                            <TableHead>Поле</TableHead>
                            <TableHead>Сообщение</TableHead>
                            <TableHead>Значение</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {wizardSession.validation_errors.slice(0, 50).map((err, idx) => (
                            <TableRow key={idx} className="bg-red-50/50">
                              <TableCell className="font-mono text-sm">
                                #{err.row}
                              </TableCell>
                              <TableCell className="font-medium">{err.field}</TableCell>
                              <TableCell className="text-sm">{err.message}</TableCell>
                              <TableCell className="text-sm text-muted-foreground font-mono">
                                {err.value || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {wizardSession.validation_errors.length > 50 && (
                        <p className="text-sm text-muted-foreground p-4 text-center">
                          Показано 50 из {wizardSession.validation_errors.length} ошибок
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Validation Warnings Table */}
                {wizardSession.validation_warnings && wizardSession.validation_warnings.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Предупреждения
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Строка</TableHead>
                            <TableHead>Поле</TableHead>
                            <TableHead>Сообщение</TableHead>
                            <TableHead>Значение</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {wizardSession.validation_warnings.slice(0, 30).map((warn, idx) => (
                            <TableRow key={idx} className="bg-amber-50/50">
                              <TableCell className="font-mono text-sm">
                                #{warn.row}
                              </TableCell>
                              <TableCell className="font-medium">{warn.field}</TableCell>
                              <TableCell className="text-sm">{warn.message}</TableCell>
                              <TableCell className="text-sm text-muted-foreground font-mono">
                                {warn.value || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {wizardSession.validation_warnings.length > 30 && (
                        <p className="text-sm text-muted-foreground p-4 text-center">
                          Показано 30 из {wizardSession.validation_warnings.length} предупреждений
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {wizardSession.errors_count === 0 && wizardSession.warnings_count === 0 && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
                      <p className="font-medium text-green-700">Валидация пройдена успешно</p>
                      <p className="text-sm text-muted-foreground">
                        Ошибок и предупреждений не найдено
                      </p>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setWizardStep('mapping')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Назад
                  </Button>
                  <Button onClick={() => setWizardStep('approve')}>
                    Далее
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        );

      case 'approve':
        return (
          <div className="space-y-4">
            {wizardSession ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Сводка импорта</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Файл</p>
                        <p className="font-medium">{wizardSession.file_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Домен</p>
                        <Badge
                          className={`${domainConfig[wizardSession.domain]?.bgColor || 'bg-muted'} ${domainConfig[wizardSession.domain]?.color || 'text-muted-foreground'} border-0`}
                        >
                          {domainConfig[wizardSession.domain]?.label || wizardSession.domain}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Всего строк</p>
                        <p className="font-medium">{wizardSession.total_rows}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Статус</p>
                        <Badge
                          className={`${statusConfig[wizardSession.status]?.bgColor} ${statusConfig[wizardSession.status]?.color} border-0`}
                        >
                          {statusConfig[wizardSession.status]?.label || wizardSession.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Вставок (INSERT)</p>
                        <p className="text-lg font-bold text-green-600">
                          {wizardSession.inserts_count ?? '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Обновлений (UPDATE)</p>
                        <p className="text-lg font-bold text-blue-600">
                          {wizardSession.updates_count ?? '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Ошибки</p>
                        <p className={`font-medium ${wizardSession.errors_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {wizardSession.errors_count}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Предупреждения</p>
                        <p className={`font-medium ${wizardSession.warnings_count > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                          {wizardSession.warnings_count}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {wizardSession.errors_count > 0 && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <p className="text-sm text-red-700">
                      Обнаружены ошибки. Рекомендуется исправить файл и загрузить повторно.
                    </p>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setWizardStep('validation')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Назад
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => setRejectOpen(true)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Отклонить
                    </Button>
                    <Button
                      onClick={handleApprove}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Выполняется...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Утвердить и выполнить
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Импорт данных</h1>
          <p className="text-muted-foreground">
            Загрузка и обработка данных из внешних файлов
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Новый импорт
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Select
          value={domainFilter}
          onValueChange={(value) => {
            setDomainFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Домен" />
          </SelectTrigger>
          <SelectContent>
            {domainOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            {statusFilterOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sessions Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Сессии импорта не найдены</p>
            <p className="text-muted-foreground mb-4">
              Начните с загрузки файла для импорта
            </p>
            <Button onClick={() => setWizardOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Новый импорт
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job #</TableHead>
                  <TableHead>Домен</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Файл</TableHead>
                  <TableHead>Строки</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => {
                  const stCfg = statusConfig[session.status] || statusConfig.CREATED;
                  const domCfg = domainConfig[session.domain] || { label: session.domain, color: 'text-muted-foreground', bgColor: 'bg-muted' };

                  return (
                    <TableRow
                      key={session.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewSession(session)}
                    >
                      <TableCell className="font-mono text-sm">
                        {session.session_number || session.id.substring(0, 8)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${domCfg.bgColor} ${domCfg.color} border-0 text-xs`}>
                          {domCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${stCfg.bgColor} ${stCfg.color} border-0`}>
                          {stCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {session.file_name}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="font-medium">{session.processed_rows}</span>
                        <span className="text-muted-foreground"> / {session.total_rows}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDateTime(session.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewSession(session);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Просмотр
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <p className="text-sm text-muted-foreground">
              Показано {(meta.page - 1) * meta.limit + 1}
              {' '}-{' '}
              {Math.min(meta.page * meta.limit, meta.total)} из {meta.total}{' '}
              сессий
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Назад
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {meta.page} / {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Вперед
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Import Wizard Dialog */}
      <Dialog
        open={wizardOpen}
        onOpenChange={(open) => {
          if (!open) resetWizard();
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Мастер импорта данных</DialogTitle>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-1 mb-4">
            {wizardSteps.map((step, idx) => {
              const currentIdx = getStepIndex(wizardStep);
              const isActive = idx === currentIdx;
              const isCompleted = idx < currentIdx;
              const StepIcon = step.icon;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors w-full ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                          ? 'bg-green-100 text-green-700'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <StepIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{step.label}</span>
                  </div>
                  {idx < wizardSteps.length - 1 && (
                    <ArrowRight className="h-4 w-4 mx-1 text-muted-foreground shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          {renderWizardStepContent()}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Отклонить импорт</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Причина отклонения
              </label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Укажите причину отклонения..."
                className="min-h-[100px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectOpen(false)}>
                Отмена
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectReason || rejectMutation.isPending}
              >
                {rejectMutation.isPending ? 'Обработка...' : 'Отклонить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Session Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Детали сессии импорта</DialogTitle>
          </DialogHeader>
          {detailSession && (
            <Tabs value={detailTab} onValueChange={setDetailTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="info">Информация</TabsTrigger>
                <TabsTrigger value="validation">Валидация</TabsTrigger>
                <TabsTrigger value="audit">Аудит</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">ID сессии</p>
                    <p className="font-mono text-sm">{detailSession.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Статус</p>
                    <Badge
                      className={`mt-1 ${statusConfig[detailSession.status]?.bgColor} ${statusConfig[detailSession.status]?.color} border-0`}
                    >
                      {statusConfig[detailSession.status]?.label || detailSession.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Домен</p>
                    <Badge
                      className={`mt-1 ${domainConfig[detailSession.domain]?.bgColor || 'bg-muted'} ${domainConfig[detailSession.domain]?.color || 'text-muted-foreground'} border-0`}
                    >
                      {domainConfig[detailSession.domain]?.label || detailSession.domain}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Файл</p>
                    <p className="font-medium">{detailSession.file_name}</p>
                    {detailSession.file_size && (
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(detailSession.file_size)}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Строки</p>
                    <p className="font-medium">
                      {detailSession.processed_rows} / {detailSession.total_rows}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ошибки / Предупреждения</p>
                    <p className="font-medium">
                      <span className={detailSession.errors_count > 0 ? 'text-red-600' : ''}>
                        {detailSession.errors_count}
                      </span>
                      {' / '}
                      <span className={detailSession.warnings_count > 0 ? 'text-amber-600' : ''}>
                        {detailSession.warnings_count}
                      </span>
                    </p>
                  </div>
                  {detailSession.inserts_count != null && (
                    <div>
                      <p className="text-sm text-muted-foreground">Вставки (INSERT)</p>
                      <p className="font-medium text-green-600">{detailSession.inserts_count}</p>
                    </div>
                  )}
                  {detailSession.updates_count != null && (
                    <div>
                      <p className="text-sm text-muted-foreground">Обновления (UPDATE)</p>
                      <p className="font-medium text-blue-600">{detailSession.updates_count}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Создана</p>
                    <p className="text-sm">{formatDateTime(detailSession.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Обновлена</p>
                    <p className="text-sm">{formatDateTime(detailSession.updated_at)}</p>
                  </div>
                  {detailSession.created_by_name && (
                    <div>
                      <p className="text-sm text-muted-foreground">Создал</p>
                      <p className="font-medium">{detailSession.created_by_name}</p>
                    </div>
                  )}
                </div>

                {detailSession.reject_reason && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm font-medium text-red-700 mb-1">Причина отклонения:</p>
                    <p className="text-sm text-red-600">{detailSession.reject_reason}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="validation" className="space-y-4">
                {detailSession.validation_errors && detailSession.validation_errors.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Ошибки ({detailSession.validation_errors.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Строка</TableHead>
                            <TableHead>Поле</TableHead>
                            <TableHead>Сообщение</TableHead>
                            <TableHead>Значение</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailSession.validation_errors.map((err, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-sm">#{err.row}</TableCell>
                              <TableCell className="font-medium">{err.field}</TableCell>
                              <TableCell className="text-sm">{err.message}</TableCell>
                              <TableCell className="text-sm text-muted-foreground font-mono">
                                {err.value || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
                      <p className="font-medium text-green-700">Ошибок валидации нет</p>
                    </CardContent>
                  </Card>
                )}

                {detailSession.validation_warnings && detailSession.validation_warnings.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Предупреждения ({detailSession.validation_warnings.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Строка</TableHead>
                            <TableHead>Поле</TableHead>
                            <TableHead>Сообщение</TableHead>
                            <TableHead>Значение</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailSession.validation_warnings.map((warn, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-sm">#{warn.row}</TableCell>
                              <TableCell className="font-medium">{warn.field}</TableCell>
                              <TableCell className="text-sm">{warn.message}</TableCell>
                              <TableCell className="text-sm text-muted-foreground font-mono">
                                {warn.value || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="audit" className="space-y-4">
                {auditLog && auditLog.length > 0 ? (
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Действие</TableHead>
                            <TableHead>Таблица</TableHead>
                            <TableHead>ID строки</TableHead>
                            <TableHead>Дата</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {auditLog.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {entry.action}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {entry.table_name}
                              </TableCell>
                              <TableCell className="font-mono text-sm text-muted-foreground">
                                {entry.row_id ? entry.row_id.substring(0, 8) + '...' : '-'}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm">
                                {formatDateTime(entry.created_at)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <History className="h-10 w-10 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">Записи аудита отсутствуют</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
