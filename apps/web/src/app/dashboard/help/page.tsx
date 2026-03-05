"use client";

import { useState, useMemo } from "react";
import {
  HelpCircle,
  MessageCircle,
  Search,
  ChevronRight,
  Phone,
  Mail,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  Target,
  TrendingUp,
  Zap,
  BookOpen,
  Users,
  BarChart3,
  Star,
  ArrowRight,
  Lightbulb,
  RefreshCw,
  X,
  Plus,
  MessageSquare,
  Paperclip,
  Eye,
  Calendar,
  GraduationCap,
  AlertTriangle,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Rocket,
  Route,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCmsArticles } from "@/lib/hooks/use-cms";

// ============= ENHANCED FAQ DATA (25 questions total) =============
const faqData = [
  {
    category: "Общие",
    icon: PlayCircle,
    color: "bg-blue-50 text-blue-600",
    questions: [
      {
        q: "Как добавить новый вендинговый аппарат?",
        a: "Перейдите в раздел «Автоматы» → нажмите «Добавить аппарат» → заполните серийный номер и данные о локации → сохраните. Аппарат появится в списке после синхронизации.",
        views: 342,
        relatedArticles: ["Полное руководство по планограммам"],
      },
      {
        q: "Как настроить уведомления?",
        a: "Откройте «Настройки» → «Уведомления» → выберите каналы (Email, Telegram, SMS) и типы событий, о которых хотите получать оповещения.",
        views: 256,
        relatedArticles: ["Быстрый старт для новых администраторов"],
      },
      {
        q: "Как пригласить сотрудника в систему?",
        a: "Перейдите в «Команда» → нажмите «Пригласить» → введите email и выберите роль. Сотрудник получит ссылку для регистрации.",
        views: 189,
        relatedArticles: [],
      },
      {
        q: "Какие роли доступны в системе?",
        a: "Владелец, Администратор, Менеджер, Оператор, Складовщик, Бухгалтер, Контент-менеджер, Наблюдатель. Каждая роль имеет свой набор разрешений (RBAC).",
        views: 145,
        relatedArticles: [],
      },
      {
        q: "Как импортировать существующие данные?",
        a: "Перейдите в «AI-Импорт» → загрузите файл (xlsx, csv, json) → AI автоматически определит тип данных и сопоставит поля → проверьте и подтвердите импорт.",
        views: 98,
        relatedArticles: [],
      },
    ],
  },
  {
    category: "Автоматы",
    icon: Target,
    color: "bg-amber-50 text-amber-600",
    questions: [
      {
        q: "Что означают статусы аппаратов?",
        a: "Зелёный (Онлайн) — аппарат работает нормально. Жёлтый (Внимание) — требуется внимание (низкие запасы, отклонение температуры). Красный (Офлайн) — нет связи или критическая ошибка.",
        views: 523,
        relatedArticles: [
          "Полное руководство по планограммам",
          "Обслуживание автоматов — техническое обслуживание",
        ],
      },
      {
        q: "Как настроить планограмму?",
        a: "Откройте карточку аппарата → вкладка «Планограмма» → перетащите товары в нужные ячейки → сохраните. Планограмма определяет, какие напитки доступны на конкретном аппарате.",
        views: 267,
        relatedArticles: ["Полное руководство по планограммам"],
      },
      {
        q: "Как отслеживать температуру?",
        a: "На карточке аппарата есть виджет температуры с историей. Для настройки алертов: «Настройки» → «Мониторинг» → задайте пороговые значения (норма 85-95°C).",
        views: 198,
        relatedArticles: [],
      },
      {
        q: "Как работает телеметрия?",
        a: "Автоматы отправляют данные каждые 30 сек: уровни ингредиентов, температура, количество стаканов, ошибки. При потере связи > 5 мин система создаёт алерт.",
        views: 312,
        relatedArticles: [],
      },
      {
        q: "Как посмотреть историю обслуживания?",
        a: "Карточка аппарата → вкладка «История» → все операции: заправки, ремонты, инкассации. Фильтр по дате и типу операции.",
        views: 156,
        relatedArticles: ["Обслуживание автоматов — техническое обслуживание"],
      },
      {
        q: "Как настроить расписание плановых ТО?",
        a: "Карточка аппарата → «Обслуживание» → создайте расписание (еженедельное/ежемесячное) → укажите тип работ (чистка, замена фильтров) → назначьте сотрудника. Уведомления об обслуживании отправляются за 24 часа.",
        views: 234,
        relatedArticles: [],
      },
    ],
  },
  {
    category: "Платежи",
    icon: TrendingUp,
    color: "bg-emerald-50 text-emerald-600",
    questions: [
      {
        q: "Как экспортировать отчёт?",
        a: "В разделе «Отчёты» выберите нужный отчёт → настройте параметры (период, группировка) → нажмите «Экспорт» → выберите формат (PDF, Excel, CSV).",
        views: 287,
        relatedArticles: [],
      },
      {
        q: "Как работает сверка платежей?",
        a: "Система автоматически сопоставляет транзакции из платёжных систем (Payme, Click, Uzum) с данными инкассации. Расхождения отмечаются для ручной проверки в разделе «Финансы» → «Сверка».",
        views: 176,
        relatedArticles: [],
      },
      {
        q: "Как настроить автоматические отчёты?",
        a: "В «Отчёты» → «Список отчётов» → выберите отчёт → «Расписание» → укажите периодичность (ежедневно/еженедельно/ежемесячно), получателей и формат.",
        views: 134,
        relatedArticles: [],
      },
      {
        q: "Как подключить фискализацию Multikassa?",
        a: "«Настройки» → «Интеграции» → «Multikassa» → введите API ключ → активируйте. Все чеки будут автоматически фискализироваться. Статус чеков в «Финансы» → «Фискализация».",
        views: 89,
        relatedArticles: [],
      },
    ],
  },
  {
    category: "Лояльность",
    icon: Star,
    color: "bg-purple-50 text-purple-600",
    questions: [
      {
        q: "Как работает бонусная система?",
        a: "Клиенты получают баллы за покупки (1 UZS = 1 балл с кэшбэком от уровня). 5 уровней: Bronze→Silver→Gold→Platinum→Diamond. Баллы можно тратить на напитки или переводить друзьям.",
        views: 445,
        relatedArticles: ["Лояльность 2.0 — как это работает"],
      },
      {
        q: "Как создать промо-акцию?",
        a: "«Акции» → «Добавить акцию» → заполните: название, описание, тип скидки (%), промокод, условия, период. Акция появится в мобильном приложении и на сайте.",
        views: 234,
        relatedArticles: [],
      },
      {
        q: "Как настроить квесты для клиентов?",
        a: "«Лояльность» → «Квесты» → «Создать квест» → выберите тип (ежедневный/еженедельный/специальный), условие выполнения и награду.",
        views: 178,
        relatedArticles: ["Лояльность 2.0 — как это работает"],
      },
      {
        q: "Как работают рефералы?",
        a: "Клиент делится реферальным кодом → друг совершает первую покупку на 5000+ UZS → оба получают по 10 000 бонусных баллов. Статистика рефералов в «Клиенты» → профиль.",
        views: 156,
        relatedArticles: [],
      },
    ],
  },
  {
    category: "Техподдержка",
    icon: Zap,
    color: "bg-orange-50 text-orange-600",
    questions: [
      {
        q: "Как подключить Payme/Click?",
        a: "«Настройки» → «Интеграции» → найдите нужную ПС → «Подключить» → введите API ключи из ЛК платёжной системы → пройдите тестовую транзакцию.",
        views: 356,
        relatedArticles: [],
      },
      {
        q: "Как настроить Telegram бота?",
        a: "«Настройки» → «Интеграции» → «Telegram Bot» → скопируйте токен бота → добавьте бота в чат → пройдите верификацию. 2 бота: @vendhub_bot (клиенты) и @vendhub_staff_bot (персонал).",
        views: 245,
        relatedArticles: [],
      },
      {
        q: "Поддерживается ли 1C?",
        a: "Да, есть готовая интеграция с 1C:Предприятие. Обмен данными: справочники, документы, остатки. Настройка: «Интеграции» → «1C» → загрузите конфигурацию обмена.",
        views: 167,
        relatedArticles: ["Интеграция с 1C — пошаговая инструкция"],
      },
      {
        q: "Есть ли API для разработчиков?",
        a: "Да, REST API v1 с JWT авторизацией. Документация: /api/v1/docs. Rate limit: 100 запросов/мин. Для получения токена: «Настройки» → «API» → «Создать токен».",
        views: 89,
        relatedArticles: ["API v1 — Обмен данными в реальном времени"],
      },
      {
        q: "Как работает offline режим мобильного приложения?",
        a: "Мобильное приложение кэширует меню и доступные операции. При отсутствии интернета клиент может просмотреть товары и создать заказ (сохранится в очередь). Синхронизация произойдёт автоматически при восстановлении соединения.",
        views: 167,
        relatedArticles: [],
      },
    ],
  },
];

// ============= KNOWLEDGE BASE CATEGORIES =============
const knowledgeBaseCategories = [
  {
    id: 1,
    name: "Начало работы",
    icon: PlayCircle,
    count: 5,
    color: "bg-blue-50 text-blue-600",
  },
  {
    id: 2,
    name: "Автоматы и оборудование",
    icon: Target,
    count: 8,
    color: "bg-amber-50 text-amber-600",
  },
  {
    id: 3,
    name: "Товары и рецепты",
    icon: Lightbulb,
    count: 6,
    color: "bg-green-50 text-green-600",
  },
  {
    id: 4,
    name: "Финансы и отчёты",
    icon: BarChart3,
    count: 7,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    id: 5,
    name: "Лояльность клиентов",
    icon: Star,
    count: 4,
    color: "bg-purple-50 text-purple-600",
  },
  {
    id: 6,
    name: "Администрирование",
    icon: Users,
    count: 5,
    color: "bg-pink-50 text-pink-600",
  },
];

// ============= VIDEO TUTORIALS =============
const videoTutorials = [
  {
    id: 1,
    title: "Подключение нового аппарата",
    duration: "8 мин",
    difficulty: "Новичок",
    views: 1234,
  },
  {
    id: 2,
    title: "Настройка планограммы и рецептур",
    duration: "12 мин",
    difficulty: "Средний",
    views: 856,
  },
  {
    id: 3,
    title: "Работа с отчётами и аналитикой",
    duration: "15 мин",
    difficulty: "Средний",
    views: 672,
  },
  {
    id: 4,
    title: "Управление командой и правами доступа",
    duration: "10 мин",
    difficulty: "Средний",
    views: 543,
  },
  {
    id: 5,
    title: "Настройка интеграций и API",
    duration: "18 мин",
    difficulty: "Продвинутый",
    views: 421,
  },
  {
    id: 6,
    title: "Лояльность 2.0 и маркетинг",
    duration: "14 мин",
    difficulty: "Средний",
    views: 789,
  },
];

// ============= LEARNING PATHS =============
const learningPaths = [
  {
    id: 1,
    name: "Новичок",
    progress: 0,
    completed: 0,
    total: 5,
    description: "Первые шаги в системе",
  },
  {
    id: 2,
    name: "Оператор",
    progress: 30,
    completed: 3,
    total: 10,
    description: "Основные операции и мониторинг",
  },
  {
    id: 3,
    name: "Администратор",
    progress: 0,
    completed: 0,
    total: 15,
    description: "Управление системой и интеграции",
  },
];

// ============= WALKTHROUGHS =============
const walkthroughs = [
  {
    id: 1,
    title: "Обзор дашборда",
    description: "Экскурсия по главному экрану управления",
    duration: "5 мин",
  },
  {
    id: 2,
    title: "Создание первого автомата",
    description: "Пошаговое добавление вендингового аппарата",
    duration: "7 мин",
  },
  {
    id: 3,
    title: "Настройка товаров и рецептур",
    description: "Создание меню для ваших аппаратов",
    duration: "8 мин",
  },
];

// ============= ENHANCED SUPPORT TICKETS (8 total) =============
const supportTickets = [
  {
    id: "TKT-2026-0089",
    subject: "Проблема с синхронизацией VM-045",
    status: "open" as const,
    priority: "high" as const,
    created: "01.03.2026",
    lastUpdate: "2 часа назад",
    assignee: "Техническая поддержка",
    messages: 3,
    category: "Техническая проблема",
    slaStatus: "on_track" as const,
  },
  {
    id: "TKT-2026-0088",
    subject: "Автомат VM-003 не фискализирует чеки",
    status: "open" as const,
    priority: "high" as const,
    created: "01.03.2026",
    lastUpdate: "4 часа назад",
    assignee: "Бухгалтерия",
    messages: 1,
    category: "Финансы",
    slaStatus: "at_risk" as const,
  },
  {
    id: "TKT-2026-0087",
    subject: "Вопрос по настройке webhook API v1",
    status: "in_progress" as const,
    priority: "medium" as const,
    created: "28.02.2026",
    lastUpdate: "1 день назад",
    assignee: "Разработка",
    messages: 5,
    category: "Разработка",
    slaStatus: "on_track" as const,
  },
  {
    id: "TKT-2026-0085",
    subject: "Не работает экспорт в PDF (Firefox)",
    status: "in_progress" as const,
    priority: "medium" as const,
    created: "27.02.2026",
    lastUpdate: "2 дня назад",
    assignee: "Разработка",
    messages: 8,
    category: "Баг",
    slaStatus: "on_track" as const,
  },
  {
    id: "TKT-2026-0082",
    subject: "Запрос на новый тип отчёта — LTV по когортам",
    status: "resolved" as const,
    priority: "low" as const,
    created: "25.02.2026",
    lastUpdate: "3 дня назад",
    assignee: "Продукт",
    messages: 4,
    category: "Запрос функции",
    slaStatus: "on_track" as const,
  },
  {
    id: "TKT-2026-0079",
    subject: "Обучение нового оператора — доступ к мануалу",
    status: "resolved" as const,
    priority: "low" as const,
    created: "22.02.2026",
    lastUpdate: "5 дней назад",
    assignee: "Техническая поддержка",
    messages: 2,
    category: "Обучение",
    slaStatus: "on_track" as const,
  },
  {
    id: "TKT-2026-0076",
    subject: "Критическая ошибка при инкассации VM-021",
    status: "open" as const,
    priority: "high" as const,
    created: "01.03.2026",
    lastUpdate: "30 минут назад",
    assignee: "Техническая поддержка",
    messages: 2,
    category: "Техническая проблема",
    slaStatus: "breached" as const,
  },
  {
    id: "TKT-2026-0072",
    subject: "Требуется полная переподготовка команды по новому интерфейсу",
    status: "in_progress" as const,
    priority: "medium" as const,
    created: "28.02.2026",
    lastUpdate: "18 часов назад",
    assignee: "Обучение",
    messages: 6,
    category: "Обучение",
    slaStatus: "on_track" as const,
  },
];

const TICKET_STATUS = {
  open: {
    label: "Открыт",
    color: "bg-red-100 text-red-700",
    icon: AlertCircle,
  },
  in_progress: {
    label: "В работе",
    color: "bg-amber-100 text-amber-700",
    icon: Clock,
  },
  resolved: {
    label: "Решён",
    color: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle,
  },
  closed: { label: "Закрыт", color: "bg-slate-100 text-slate-700", icon: X },
};

const PRIORITY_COLORS = {
  high: "bg-red-50 text-red-600",
  medium: "bg-amber-50 text-amber-600",
  low: "bg-blue-50 text-blue-600",
};
const PRIORITY_LABELS = { high: "Высокий", medium: "Средний", low: "Низкий" };

const SLA_STATUS = {
  on_track: {
    label: "В норме",
    color: "bg-emerald-50 text-emerald-600",
    icon: CheckCircle,
  },
  at_risk: {
    label: "Риск",
    color: "bg-amber-50 text-amber-600",
    icon: AlertTriangle,
  },
  breached: {
    label: "Нарушено",
    color: "bg-red-50 text-red-600",
    icon: AlertCircle,
  },
};

type ChangelogType = "feature" | "bugfix" | "improvement";

interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
  type: ChangelogType;
}

// ============= SYSTEM STATUS SERVICES =============
const systemServices = [
  {
    id: 1,
    name: "API сервис",
    status: "operational" as const,
    uptime: "99.98%",
    responseTime: "145ms",
  },
  {
    id: 2,
    name: "Платежные системы",
    status: "operational" as const,
    uptime: "99.95%",
    responseTime: "234ms",
  },
  {
    id: 3,
    name: "Телеметрия и датчики",
    status: "degraded" as const,
    uptime: "98.50%",
    responseTime: "567ms",
  },
  {
    id: 4,
    name: "Лендинг сайт",
    status: "operational" as const,
    uptime: "99.99%",
    responseTime: "98ms",
  },
];

// ============= CHANGELOG (8 entries) =============
const changelog: ChangelogEntry[] = [
  {
    version: "2.4.0",
    date: "01.03.2026",
    changes: [
      "Новый интерфейс аналитики с real-time графиками",
      "Оптимизация скорости API (+40%)",
      "Поддержка тёмной темы во всех приложениях",
    ],
    type: "feature",
  },
  {
    version: "2.3.8",
    date: "25.02.2026",
    changes: [
      "Исправлена критическая ошибка экспорта PDF в Firefox",
      "Улучшена производительность при работе с 1000+ машин (+25%)",
    ],
    type: "bugfix",
  },
  {
    version: "2.3.7",
    date: "20.02.2026",
    changes: [
      "Новые отчёты по когортам клиентов и LTV анализу",
      "Интеграция с Uzum Money и HUMO",
    ],
    type: "feature",
  },
  {
    version: "2.3.6",
    date: "15.02.2026",
    changes: [
      "Исправлена синхронизация данных с offline режимом",
      "Улучшены real-time алерты (задержка снижена на 60%)",
    ],
    type: "bugfix",
  },
  {
    version: "2.3.5",
    date: "10.02.2026",
    changes: [
      "Новая система push-уведомлений с персонализацией",
      "Полная поддержка кириллицы во всех экспортах",
    ],
    type: "feature",
  },
  {
    version: "2.3.4",
    date: "05.02.2026",
    changes: [
      "Исправлены баги RBAC при создании пользователей",
      "Оптимизирована загрузка планограмм (+35%)",
    ],
    type: "bugfix",
  },
  {
    version: "2.3.3",
    date: "01.02.2026",
    changes: [
      "Обновление интеграции с Multikassa 2.0 API",
      "Новые метрики в дашборде: маржинальность, CAC, LTV",
    ],
    type: "feature",
  },
  {
    version: "2.3.2",
    date: "25.01.2026",
    changes: [
      "Исправлена ошибка телеметрии при потере соединения",
      "Оптимизирована производительность БД для отчётов",
    ],
    type: "bugfix",
  },
];

// ============= POPULAR KNOWLEDGE BASE ARTICLES =============
const knowledgeBase = [
  {
    id: 1,
    title: "Полное руководство по планограммам",
    category: "Аппараты",
    reads: 523,
    updated: "28.02.2026",
    duration: "12 мин",
    type: "article",
  },
  {
    id: 2,
    title: "API v1 — Обмен данными в реальном времени",
    category: "Разработка",
    reads: 312,
    updated: "25.02.2026",
    duration: "18 мин",
    type: "article",
  },
  {
    id: 3,
    title: "Интеграция с 1C — пошаговая инструкция",
    category: "Интеграции",
    reads: 287,
    updated: "22.02.2026",
    duration: "14 мин",
    type: "article",
  },
  {
    id: 4,
    title: "Оптимизация расходов — кейсы из практики",
    category: "Финансы",
    reads: 456,
    updated: "20.02.2026",
    duration: "9 мин",
    type: "article",
  },
  {
    id: 5,
    title: "Лояльность 2.0 — как это работает",
    category: "Маркетинг",
    reads: 678,
    updated: "18.02.2026",
    duration: "11 мин",
    type: "article",
  },
  {
    id: 6,
    title: "Обслуживание автоматов — техническое обслуживание",
    category: "Аппараты",
    reads: 234,
    updated: "15.02.2026",
    duration: "8 мин",
    type: "video",
  },
  {
    id: 7,
    title: "Быстрый старт для новых администраторов",
    category: "Начало",
    reads: 789,
    updated: "10.02.2026",
    duration: "15 мин",
    type: "article",
  },
  {
    id: 8,
    title: "Видео: настройка уведомлений в админпанели",
    category: "Аппараты",
    reads: 145,
    updated: "05.02.2026",
    duration: "6 мин",
    type: "video",
  },
];

// ============= CONTACT INFO =============
const contactChannels = [
  {
    id: 1,
    type: "Email",
    value: "support@vendhub.uz",
    icon: Mail,
    description: "Свяжитесь по эмейлу",
  },
  {
    id: 2,
    type: "Телефон",
    value: "+998 71 200 39 99",
    icon: Phone,
    description: "Позвоните в рабочее время",
  },
  {
    id: 3,
    type: "Telegram",
    value: "@vendhub_support",
    icon: MessageSquare,
    description: "Чат с поддержкой 24/7",
  },
];

export default function HelpPage() {
  // Fetch CMS articles from API
  const { data: _articlesData, isLoading: _articlesLoading } = useCmsArticles({
    limit: 50,
    isPublished: true,
  });

  const [activeTab, setActiveTab] = useState<
    "faq" | "training" | "support" | "knowledge" | "changelog"
  >("faq");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [faqCategory, setFaqCategory] = useState("Все");
  const [faqHelpful, setFaqHelpful] = useState<Record<string, boolean | null>>(
    {},
  );
  const [supportSearch, setSupportSearch] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({
    subject: "",
    category: "",
    priority: "medium",
    description: "",
    file: null,
  });
  const [changelogFilter, setChangelogFilter] = useState<
    "all" | "feature" | "bugfix" | "improvement"
  >("all");

  // Get top 5 FAQ by views
  const topFaqs = useMemo(() => {
    return faqData
      .flatMap((cat) =>
        cat.questions.map((q) => ({ ...q, category: cat.category })),
      )
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
  }, []);

  // Filter FAQ by category
  const filteredFaq = useMemo(() => {
    if (faqCategory === "Все") return faqData;
    return faqData.filter((cat) => cat.category === faqCategory);
  }, [faqCategory]);

  // Filter support tickets
  const filteredTickets = useMemo(() => {
    return supportTickets.filter(
      (t) =>
        t.subject.toLowerCase().includes(supportSearch.toLowerCase()) ||
        t.id.toLowerCase().includes(supportSearch.toLowerCase()),
    );
  }, [supportSearch]);

  // Get recently updated articles
  const recentlyUpdated = useMemo(() => {
    return [...knowledgeBase]
      .sort(
        (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime(),
      )
      .slice(0, 5);
  }, []);

  // Filter changelog
  const filteredChangelog = useMemo(() => {
    if (changelogFilter === "all") return changelog;
    return changelog.filter((item) => item.type === changelogFilter);
  }, [changelogFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="w-8 h-8 text-amber-600" />
            <h1 className="text-3xl font-display font-bold text-amber-900">
              Помощь и поддержка
            </h1>
          </div>
          <p className="text-amber-700 text-lg">
            Найдите ответы, обучайтесь, свяжитесь с поддержкой
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 bg-white rounded-lg p-1 shadow-sm border border-amber-200 overflow-x-auto">
          {[
            { id: "faq" as const, label: "FAQ", icon: Lightbulb },
            { id: "knowledge" as const, label: "База знаний", icon: BookOpen },
            { id: "training" as const, label: "Обучение", icon: GraduationCap },
            { id: "support" as const, label: "Поддержка", icon: MessageCircle },
            { id: "changelog" as const, label: "Changelog", icon: RefreshCw },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all font-medium whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-espresso text-white shadow-md"
                    : "text-espresso-light hover:bg-amber-50"
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ============= FAQ TAB ============= */}
        {activeTab === "faq" && (
          <div className="space-y-8">
            {/* Popular Questions Section */}
            <div>
              <h2 className="text-xl font-display font-bold text-espresso-dark mb-4">
                Популярные вопросы
              </h2>
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-4 min-w-max">
                  {topFaqs.map((faq, idx) => (
                    <Card
                      key={idx}
                      className="flex-shrink-0 w-80 bg-white border-2 border-amber-200 hover:shadow-lg transition-shadow cursor-pointer"
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3 mb-3">
                          <Eye className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-espresso-dark text-sm line-clamp-2">
                              {faq.q}
                            </h3>
                            <p className="text-xs text-espresso-light mt-1">
                              {faq.views} просмотров
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="default"
                          className="text-xs bg-amber-100 text-amber-800"
                        >
                          {faq.category}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <h3 className="text-sm font-semibold text-espresso-dark mb-3">
                Категории
              </h3>
              <div className="flex flex-wrap gap-2">
                {["Все", ...faqData.map((cat) => cat.category)].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFaqCategory(cat)}
                    className={`px-4 py-2 rounded-full transition-all font-medium text-sm ${
                      faqCategory === cat
                        ? "bg-espresso text-white shadow-md"
                        : "bg-white border-2 border-amber-200 text-espresso-light hover:bg-amber-50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* FAQ Items */}
            <div className="space-y-4">
              {filteredFaq.map((cat, catIdx) => (
                <div key={catIdx}>
                  <div className="flex items-center gap-3 mb-3">
                    <cat.icon
                      className={`w-6 h-6 ${cat.color.split(" ")[1]}`}
                    />
                    <h3 className="text-lg font-semibold text-espresso-dark">
                      {cat.category}
                    </h3>
                  </div>
                  <div className="space-y-3 pl-9">
                    {cat.questions.map((faq, qIdx) => {
                      const faqKey = `${catIdx}-${qIdx}`;
                      return (
                        <Card
                          key={qIdx}
                          className="bg-white border-2 border-amber-100 hover:border-amber-300 transition-all"
                        >
                          <CardContent className="pt-6">
                            <button
                              onClick={() =>
                                setExpandedFaq(
                                  expandedFaq === faqKey ? null : faqKey,
                                )
                              }
                              className="w-full text-left"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <h4 className="font-semibold text-espresso-dark pr-4">
                                  {faq.q}
                                </h4>
                                <ChevronRight
                                  className={`w-5 h-5 text-amber-600 flex-shrink-0 transition-transform ${expandedFaq === faqKey ? "rotate-90" : ""}`}
                                />
                              </div>
                            </button>

                            {expandedFaq === faqKey && (
                              <div className="mt-4 pt-4 border-t-2 border-amber-100">
                                <p className="text-espresso-light mb-4">
                                  {faq.a}
                                </p>

                                {/* Related Articles */}
                                {faq.relatedArticles &&
                                  faq.relatedArticles.length > 0 && (
                                    <div className="mb-4 p-3 bg-amber-50 rounded-lg">
                                      <p className="text-xs font-semibold text-espresso-dark mb-2">
                                        Связанные статьи:
                                      </p>
                                      <ul className="text-xs space-y-1">
                                        {faq.relatedArticles.map(
                                          (article, idx) => (
                                            <li
                                              key={idx}
                                              className="flex items-center gap-2 text-amber-600 hover:text-amber-700 cursor-pointer"
                                            >
                                              <ArrowRight className="w-3 h-3" />
                                              {article}
                                            </li>
                                          ),
                                        )}
                                      </ul>
                                    </div>
                                  )}

                                {/* Was this helpful */}
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-espresso-light">
                                    Помог ли вам этот ответ?
                                  </span>
                                  <button
                                    onClick={() =>
                                      setFaqHelpful({
                                        ...faqHelpful,
                                        [faqKey]: true,
                                      })
                                    }
                                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                                      faqHelpful[faqKey] === true
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-gray-100 text-gray-600 hover:bg-emerald-50"
                                    }`}
                                  >
                                    <ThumbsUp className="w-3 h-3 inline mr-1" />{" "}
                                    Да
                                  </button>
                                  <button
                                    onClick={() =>
                                      setFaqHelpful({
                                        ...faqHelpful,
                                        [faqKey]: false,
                                      })
                                    }
                                    className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                                      faqHelpful[faqKey] === false
                                        ? "bg-red-100 text-red-700"
                                        : "bg-gray-100 text-gray-600 hover:bg-red-50"
                                    }`}
                                  >
                                    <ThumbsDown className="w-3 h-3 inline mr-1" />{" "}
                                    Нет
                                  </button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============= KNOWLEDGE BASE TAB ============= */}
        {activeTab === "knowledge" && (
          <div className="space-y-8">
            {/* Knowledge Base Categories */}
            <div>
              <h2 className="text-xl font-display font-bold text-espresso-dark mb-6">
                База знаний
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {knowledgeBaseCategories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <Card
                      key={cat.id}
                      className="bg-white border-2 border-amber-200 hover:shadow-lg transition-all cursor-pointer hover:border-amber-400"
                    >
                      <CardContent className="pt-6">
                        <div
                          className={`w-12 h-12 rounded-lg ${cat.color} flex items-center justify-center mb-3`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        <h3 className="font-semibold text-espresso-dark mb-1">
                          {cat.name}
                        </h3>
                        <p className="text-sm text-espresso-light">
                          {cat.count} статей
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Popular Articles */}
            <div>
              <h3 className="text-lg font-display font-bold text-espresso-dark mb-4">
                Топ статьи
              </h3>
              <div className="space-y-3">
                {knowledgeBase.slice(0, 5).map((article) => (
                  <Card
                    key={article.id}
                    className="bg-white border-2 border-amber-100 hover:border-amber-300 transition-all hover:shadow-md"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-espresso-dark mb-2">
                            {article.title}
                          </h4>
                          <div className="flex items-center gap-4 text-xs text-espresso-light">
                            <span className="flex items-center gap-1">
                              <Eye className="w-4 h-4" /> {article.reads}{" "}
                              просмотров
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" /> {article.duration}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant="default"
                          className="text-xs bg-amber-100 text-amber-800 flex-shrink-0"
                        >
                          {article.category}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Recent Updates */}
            <div>
              <h3 className="text-lg font-display font-bold text-espresso-dark mb-4">
                Последние обновления
              </h3>
              <div className="space-y-3">
                {recentlyUpdated.map((article) => (
                  <Card
                    key={article.id}
                    className="bg-white border-2 border-amber-100 hover:border-amber-300 transition-all"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Sparkles className="w-5 h-5 text-amber-600" />
                        <h4 className="font-semibold text-espresso-dark flex-1">
                          {article.title}
                        </h4>
                        <span className="text-xs text-espresso-light">
                          {article.updated}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============= TRAINING TAB ============= */}
        {activeTab === "training" && (
          <div className="space-y-8">
            {/* Video Tutorials */}
            <div>
              <h2 className="text-xl font-display font-bold text-espresso-dark mb-6">
                Видеоуроки
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videoTutorials.map((video) => (
                  <Card
                    key={video.id}
                    className="bg-white border-2 border-amber-200 hover:shadow-lg transition-all overflow-hidden group cursor-pointer"
                  >
                    <div className="aspect-video bg-gradient-to-br from-amber-200 to-orange-300 relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <PlayCircle className="w-16 h-16 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <CardContent className="pt-6">
                      <h3 className="font-semibold text-espresso-dark mb-2 line-clamp-2">
                        {video.title}
                      </h3>
                      <div className="flex items-center justify-between text-xs text-espresso-light mb-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" /> {video.duration}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" /> {video.views}
                        </span>
                      </div>
                      <Badge
                        variant="info"
                        className="text-xs bg-blue-100 text-blue-800"
                      >
                        {video.difficulty}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Learning Paths */}
            <div>
              <h3 className="text-lg font-display font-bold text-espresso-dark mb-6">
                Пути обучения
              </h3>
              <div className="space-y-4">
                {learningPaths.map((path) => (
                  <Card
                    key={path.id}
                    className="bg-white border-2 border-amber-200 hover:shadow-md transition-all"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-espresso-dark mb-1">
                            {path.name}
                          </h4>
                          <p className="text-sm text-espresso-light mb-3">
                            {path.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-espresso-light">
                            <span>
                              {path.completed} из {path.total} модулей
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-2xl font-bold text-amber-600">
                            {path.progress}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-amber-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all"
                          style={{ width: `${path.progress}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Interactive Walkthroughs */}
            <div>
              <h3 className="text-lg font-display font-bold text-espresso-dark mb-4">
                Интерактивные экскурсии
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {walkthroughs.map((walkthrough) => (
                  <Card
                    key={walkthrough.id}
                    className="bg-white border-2 border-amber-200 hover:shadow-lg transition-all cursor-pointer"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Route className="w-6 h-6 text-amber-600" />
                        <h4 className="font-semibold text-espresso-dark flex-1">
                          {walkthrough.title}
                        </h4>
                      </div>
                      <p className="text-sm text-espresso-light mb-3">
                        {walkthrough.description}
                      </p>
                      <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                        <Rocket className="w-4 h-4 mr-2" /> Начать экскурсию
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============= SUPPORT TAB ============= */}
        {activeTab === "support" && (
          <div className="space-y-8">
            {/* Contact Information */}
            <div>
              <h2 className="text-xl font-display font-bold text-espresso-dark mb-4">
                Контактные каналы
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {contactChannels.map((channel) => {
                  const Icon = channel.icon;
                  return (
                    <Card
                      key={channel.id}
                      className="bg-white border-2 border-amber-200 hover:shadow-lg transition-all"
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-amber-600" />
                          </div>
                          <h3 className="font-semibold text-espresso-dark">
                            {channel.type}
                          </h3>
                        </div>
                        <p className="text-sm text-espresso-light mb-2">
                          {channel.description}
                        </p>
                        <p className="font-medium text-amber-600">
                          {channel.value}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* New Ticket Button */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display font-bold text-espresso-dark">
                  Ваши тикеты
                </h2>
                <Button
                  onClick={() => setNewTicketOpen(!newTicketOpen)}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" /> Создать новый тикет
                </Button>
              </div>

              {/* New Ticket Form */}
              {newTicketOpen && (
                <Card className="bg-white border-2 border-amber-300 mb-6">
                  <CardHeader>
                    <CardTitle className="text-amber-900">
                      Создание нового тикета поддержки
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-espresso-dark mb-2">
                        Тема
                      </label>
                      <Input
                        placeholder="Описание проблемы"
                        value={newTicketForm.subject}
                        onChange={(e) =>
                          setNewTicketForm({
                            ...newTicketForm,
                            subject: e.target.value,
                          })
                        }
                        className="border-2 border-amber-200"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-espresso-dark mb-2">
                          Категория
                        </label>
                        <select
                          value={newTicketForm.category}
                          onChange={(e) =>
                            setNewTicketForm({
                              ...newTicketForm,
                              category: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border-2 border-amber-200 rounded-lg text-espresso-dark"
                        >
                          <option value="">Выберите категорию</option>
                          <option value="Техническая проблема">
                            Техническая проблема
                          </option>
                          <option value="Баг">Баг</option>
                          <option value="Финансы">Финансы</option>
                          <option value="Обучение">Обучение</option>
                          <option value="Запрос функции">Запрос функции</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-espresso-dark mb-2">
                          Приоритет
                        </label>
                        <select
                          value={newTicketForm.priority}
                          onChange={(e) =>
                            setNewTicketForm({
                              ...newTicketForm,
                              priority: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border-2 border-amber-200 rounded-lg text-espresso-dark"
                        >
                          <option value="low">Низкий</option>
                          <option value="medium">Средний</option>
                          <option value="high">Высокий</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-espresso-dark mb-2">
                        Описание
                      </label>
                      <textarea
                        placeholder="Подробное описание проблемы"
                        value={newTicketForm.description}
                        onChange={(e) =>
                          setNewTicketForm({
                            ...newTicketForm,
                            description: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border-2 border-amber-200 rounded-lg text-espresso-dark h-24 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-espresso-dark mb-2">
                        Прикрепить файл (опционально)
                      </label>
                      <div className="border-2 border-dashed border-amber-300 rounded-lg p-6 text-center cursor-pointer hover:bg-amber-50 transition-all">
                        <Paperclip className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                        <p className="text-sm text-espresso-light">
                          Перетащите файл сюда или нажмите для выбора
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white">
                        <Send className="w-4 h-4 mr-2" /> Отправить тикет
                      </Button>
                      <Button
                        onClick={() => setNewTicketOpen(false)}
                        variant="outline"
                        className="flex-1"
                      >
                        Отмена
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Tickets Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-amber-600" />
                <Input
                  placeholder="Поиск по номеру тикета или теме"
                  value={supportSearch}
                  onChange={(e) => setSupportSearch(e.target.value)}
                  className="pl-10 border-2 border-amber-200"
                />
              </div>
            </div>

            {/* Tickets List */}
            <div className="space-y-4">
              {filteredTickets.map((ticket) => {
                const StatusIcon = TICKET_STATUS[ticket.status].icon;
                const SlaIcon = SLA_STATUS[ticket.slaStatus].icon;
                return (
                  <Card
                    key={ticket.id}
                    onClick={() =>
                      setSelectedTicket(
                        selectedTicket === ticket.id ? null : ticket.id,
                      )
                    }
                    className="bg-white border-2 border-amber-100 hover:border-amber-300 transition-all cursor-pointer"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-mono text-amber-600">
                              {ticket.id}
                            </span>
                            <h3 className="font-semibold text-espresso-dark flex-1">
                              {ticket.subject}
                            </h3>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-espresso-light">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" /> Создано:{" "}
                              {ticket.created}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" /> {ticket.lastUpdate}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <StatusIcon
                              className={`w-5 h-5 ${TICKET_STATUS[ticket.status].color.split(" ")[1]}`}
                            />
                            <Badge
                              variant="default"
                              className={`${TICKET_STATUS[ticket.status].color} text-xs`}
                            >
                              {TICKET_STATUS[ticket.status].label}
                            </Badge>
                          </div>
                          <Badge
                            variant="default"
                            className={`${PRIORITY_COLORS[ticket.priority]} text-xs`}
                          >
                            {PRIORITY_LABELS[ticket.priority]}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <SlaIcon
                              className={`w-4 h-4 ${SLA_STATUS[ticket.slaStatus].color.split(" ")[1]}`}
                            />
                            <span className="text-xs text-espresso-light">
                              {SLA_STATUS[ticket.slaStatus].label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {selectedTicket === ticket.id && (
                        <div className="mt-4 pt-4 border-t-2 border-amber-100">
                          <p className="text-sm text-espresso-light mb-3">
                            <span className="font-semibold text-espresso-dark">
                              Категория:
                            </span>{" "}
                            {ticket.category}
                          </p>
                          <p className="text-sm text-espresso-light mb-3">
                            <span className="font-semibold text-espresso-dark">
                              Назначено:
                            </span>{" "}
                            {ticket.assignee}
                          </p>
                          <p className="text-sm text-espresso-light mb-4">
                            <span className="font-semibold text-espresso-dark">
                              Сообщений:
                            </span>{" "}
                            {ticket.messages}
                          </p>
                          <Button className="bg-amber-600 hover:bg-amber-700 text-white w-full">
                            <MessageSquare className="w-4 h-4 mr-2" />{" "}
                            Просмотреть подробности
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* System Status */}
            <div>
              <h3 className="text-lg font-display font-bold text-espresso-dark mb-4">
                Статус системы
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {systemServices.map((service) => {
                  const statusColor =
                    service.status === "operational"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-amber-50 text-amber-600";
                  const statusIcon =
                    service.status === "operational" ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    );
                  return (
                    <Card
                      key={service.id}
                      className="bg-white border-2 border-amber-100 hover:shadow-md transition-all"
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold text-espresso-dark">
                            {service.name}
                          </h4>
                          <div
                            className={`px-3 py-1 rounded-full ${statusColor} text-xs font-medium flex items-center gap-2`}
                          >
                            {statusIcon}
                            {service.status === "operational"
                              ? "Работает"
                              : "Проблемы"}
                          </div>
                        </div>
                        <div className="space-y-2 text-sm text-espresso-light">
                          <p>
                            Uptime:{" "}
                            <span className="text-emerald-600 font-semibold">
                              {service.uptime}
                            </span>
                          </p>
                          <p>
                            Время отклика:{" "}
                            <span className="text-espresso-dark font-semibold">
                              {service.responseTime}
                            </span>
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============= CHANGELOG TAB ============= */}
        {activeTab === "changelog" && (
          <div className="space-y-8">
            {/* Changelog Filter */}
            <div>
              <h2 className="text-xl font-display font-bold text-espresso-dark mb-4">
                История изменений
              </h2>
              <div className="flex flex-wrap gap-2 mb-6">
                {[
                  { id: "all" as const, label: "Все" },
                  { id: "feature" as const, label: "Функции" },
                  { id: "bugfix" as const, label: "Исправления" },
                  { id: "improvement" as const, label: "Улучшения" },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setChangelogFilter(filter.id)}
                    className={`px-4 py-2 rounded-full transition-all font-medium text-sm ${
                      changelogFilter === filter.id
                        ? "bg-espresso text-white shadow-md"
                        : "bg-white border-2 border-amber-200 text-espresso-light hover:bg-amber-50"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Changelog Entries */}
            <div className="space-y-4">
              {filteredChangelog.map((entry, idx) => {
                const typeConfig = {
                  feature: {
                    badge: "success",
                    icon: Sparkles,
                    label: "Функция",
                  },
                  bugfix: {
                    badge: "destructive" as const,
                    icon: AlertCircle,
                    label: "Исправление",
                  },
                  improvement: {
                    badge: "info" as const,
                    icon: TrendingUp,
                    label: "Улучшение",
                  },
                } as const;
                const type = typeConfig[entry.type];
                const TypeIcon = type.icon;
                return (
                  <Card
                    key={idx}
                    className="bg-white border-2 border-amber-100 hover:border-amber-300 transition-all"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 pt-1">
                          <TypeIcon
                            className={`w-5 h-5 ${type.badge === "success" ? "text-emerald-600" : type.badge === "destructive" ? "text-red-600" : "text-blue-600"}`}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-espresso-dark">
                              v{entry.version}
                            </h3>
                            <span className="text-xs text-espresso-light">
                              {entry.date}
                            </span>
                            <Badge
                              variant={type.badge}
                              className={`text-xs ${
                                type.badge === "success"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : type.badge === "destructive"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {type.label}
                            </Badge>
                          </div>
                          <ul className="space-y-1">
                            {entry.changes.map((change, changeIdx) => (
                              <li
                                key={changeIdx}
                                className="text-sm text-espresso-light flex items-start gap-2"
                              >
                                <ArrowRight className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                {change}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
