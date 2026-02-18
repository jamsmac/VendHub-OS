import {
  Coffee,
  BarChart3,
  Boxes,
  Users,
  CreditCard,
  Shield,
  Smartphone,
  Zap,
  CheckCircle,
  ArrowRight,
  MapPin,
  Gift,
  ClipboardList,
  Globe,
  MessageCircle,
  Star,
} from "lucide-react";

// ============================================================================
// Navbar
// ============================================================================

function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <Coffee className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">VendHub</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm text-gray-600 hover:text-gray-900 transition"
            >
              Возможности
            </a>
            <a
              href="#modules"
              className="text-sm text-gray-600 hover:text-gray-900 transition"
            >
              Модули
            </a>
            <a
              href="#pricing"
              className="text-sm text-gray-600 hover:text-gray-900 transition"
            >
              Тарифы
            </a>
            <a
              href="#contact"
              className="text-sm text-gray-600 hover:text-gray-900 transition"
            >
              Контакты
            </a>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/auth"
              className="text-sm text-gray-600 hover:text-gray-900 transition hidden sm:block"
            >
              Войти
            </a>
            <a
              href="#contact"
              className="px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition"
            >
              Попробовать
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}

// ============================================================================
// Hero
// ============================================================================

function Hero() {
  return (
    <section className="pt-32 pb-20 bg-gradient-to-b from-primary-50/50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Создано для рынка Узбекистана
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            Управляйте вендинговым
            <br />
            <span className="text-primary-500">бизнесом</span> из одного окна
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            VendHub — единая платформа для управления автоматами, складом,
            персоналом, финансами и лояльностью клиентов. Интеграция с Payme,
            Click, Uzum и фискализацией.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#contact"
              className="w-full sm:w-auto px-8 py-3.5 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2"
            >
              Начать бесплатно
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-3.5 bg-white text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition border border-gray-200 flex items-center justify-center"
            >
              Узнать подробнее
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
          {[
            { value: "60+", label: "Модулей системы" },
            { value: "7", label: "Ролей доступа" },
            { value: "3", label: "Платформы" },
            { value: "24/7", label: "Мониторинг" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-primary-600">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Features
// ============================================================================

const FEATURES = [
  {
    icon: Coffee,
    title: "Управление автоматами",
    description:
      "Полный контроль парка автоматов: статусы, слоты, загрузки, телеметрия в реальном времени",
  },
  {
    icon: Boxes,
    title: "3-уровневый склад",
    description:
      "Склад → Оператор → Автомат. Полная прослеживаемость товара от закупки до продажи",
  },
  {
    icon: ClipboardList,
    title: "Задачи и маршруты",
    description:
      "Создание задач, назначение операторам, фото-контроль выполнения, оптимизация маршрутов",
  },
  {
    icon: CreditCard,
    title: "Платежи Узбекистана",
    description:
      "Payme, Click, Uzum Bank, HUMO, UZCARD — все платёжные системы в одном месте",
  },
  {
    icon: BarChart3,
    title: "Аналитика и отчёты",
    description:
      "Дашборды продаж, финансовые отчёты, сверки, KPI операторов, прогнозы",
  },
  {
    icon: Gift,
    title: "Программа лояльности",
    description:
      "Баллы, уровни, достижения, квесты, промокоды — полная геймификация для клиентов",
  },
  {
    icon: Shield,
    title: "Фискализация",
    description:
      "Интеграция с MultiKassa, формирование чеков, Z-отчёты, соответствие OFD/Soliq",
  },
  {
    icon: Users,
    title: "7 ролей доступа",
    description:
      "Владелец, админ, менеджер, оператор, кладовщик, бухгалтер, зритель — каждому своё",
  },
  {
    icon: MapPin,
    title: "Карта и GPS",
    description:
      "Live-карта автоматов, отслеживание рейсов операторов, аналитика по локациям",
  },
];

function Features() {
  return (
    <section id="features" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Всё для вендинга в одном месте
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            60+ модулей для полного управления вендинговым бизнесом любого
            масштаба
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-500/5 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Modules / Platforms
// ============================================================================

const PLATFORMS = [
  {
    icon: Globe,
    title: "Админ-панель",
    description:
      "Полнофункциональная веб-панель для управления всем бизнесом. Дашборды, отчёты, настройки.",
    tech: "Next.js + React",
  },
  {
    icon: Smartphone,
    title: "Мобильное приложение",
    description:
      "Приложения для клиентов и операторов. Заказ кофе, оплата, задачи на маршруте.",
    tech: "React Native + Expo",
  },
  {
    icon: MessageCircle,
    title: "Telegram бот",
    description:
      "Бот для клиентов — поиск автоматов, баланс баллов, заказ. Бот для сотрудников — задачи, отчёты.",
    tech: "Telegraf + WebApp",
  },
];

function Platforms() {
  return (
    <section id="modules" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Три платформы — одна система
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Управляйте бизнесом с любого устройства
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {PLATFORMS.map((platform) => (
            <div
              key={platform.title}
              className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent-100 flex items-center justify-center mb-6">
                <platform.icon className="w-7 h-7 text-accent-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{platform.title}</h3>
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                {platform.description}
              </p>
              <p className="text-xs text-gray-400 font-medium">
                {platform.tech}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Benefits
// ============================================================================

const BENEFITS = [
  "Полная автоматизация бизнес-процессов вендинга",
  "Интеграция со всеми платёжными системами Узбекистана",
  "Фискализация по требованиям законодательства",
  "Мониторинг автоматов в реальном времени",
  "Геймификация для повышения лояльности клиентов",
  "Оптимизация маршрутов и задач для операторов",
  "Многоуровневая система складского учёта",
  "Гибкая система ролей и прав доступа",
];

function Benefits() {
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Почему VendHub?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Единственная платформа, созданная специально для вендингового
              бизнеса в Узбекистане с учётом всех локальных особенностей.
            </p>
            <div className="space-y-3">
              {BENEFITS.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-3xl p-8 text-white">
            <div className="grid grid-cols-2 gap-6">
              {[
                { value: "99.9%", label: "Uptime системы" },
                { value: "<500ms", label: "Время отклика API" },
                { value: "60+", label: "API модулей" },
                { value: "120+", label: "Сущностей в БД" },
                { value: "SSO", label: "Telegram Auth" },
                { value: "i18n", label: "UZ / RU / EN" },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-primary-200 text-sm">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Pricing
// ============================================================================

const PLANS = [
  {
    name: "Старт",
    price: "Бесплатно",
    period: "",
    description: "Для начала работы с 1-5 автоматами",
    features: [
      "До 5 автоматов",
      "Базовая аналитика",
      "Telegram бот для клиентов",
      "1 пользователь",
      "Email поддержка",
    ],
    cta: "Начать бесплатно",
    highlight: false,
  },
  {
    name: "Бизнес",
    price: "990 000",
    period: "сум/мес",
    description: "Для растущего бизнеса с 6-50 автоматами",
    features: [
      "До 50 автоматов",
      "Полная аналитика и отчёты",
      "Программа лояльности",
      "10 пользователей",
      "Мобильное приложение",
      "Приоритетная поддержка",
      "Фискализация MultiKassa",
    ],
    cta: "Выбрать план",
    highlight: true,
  },
  {
    name: "Корпорация",
    price: "По запросу",
    period: "",
    description: "Для крупных сетей 50+ автоматов",
    features: [
      "Безлимит автоматов",
      "Все модули системы",
      "API интеграции",
      "Безлимит пользователей",
      "SLA 99.9%",
      "Выделенный менеджер",
      "On-premise установка",
    ],
    cta: "Связаться",
    highlight: false,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Простые и прозрачные тарифы
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Начните бесплатно, масштабируйтесь по мере роста бизнеса
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 ${
                plan.highlight
                  ? "bg-primary-500 text-white shadow-xl shadow-primary-500/25 ring-2 ring-primary-500 relative"
                  : "bg-white border border-gray-200"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Популярный
                </div>
              )}
              <h3
                className={`text-xl font-bold mb-2 ${plan.highlight ? "" : "text-gray-900"}`}
              >
                {plan.name}
              </h3>
              <div className="mb-2">
                <span className="text-3xl font-extrabold">{plan.price}</span>
                {plan.period && (
                  <span
                    className={`text-sm ml-1 ${plan.highlight ? "text-primary-200" : "text-gray-500"}`}
                  >
                    {plan.period}
                  </span>
                )}
              </div>
              <p
                className={`text-sm mb-6 ${plan.highlight ? "text-primary-200" : "text-gray-500"}`}
              >
                {plan.description}
              </p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <CheckCircle
                      className={`w-4 h-4 shrink-0 ${plan.highlight ? "text-primary-200" : "text-green-500"}`}
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <a
                href="#contact"
                className={`block text-center py-3 rounded-xl font-semibold transition ${
                  plan.highlight
                    ? "bg-white text-primary-600 hover:bg-primary-50"
                    : "bg-primary-500 text-white hover:bg-primary-600"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Contact / CTA
// ============================================================================

function Contact() {
  return (
    <section id="contact" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Готовы автоматизировать бизнес?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Оставьте заявку и мы свяжемся с вами для демонстрации системы
          </p>
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <form className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Имя"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition"
                />
                <input
                  type="tel"
                  placeholder="Телефон"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition"
                />
              </div>
              <input
                type="email"
                placeholder="Email"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition"
              />
              <select className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition text-gray-500">
                <option>Количество автоматов</option>
                <option>1-5 автоматов</option>
                <option>6-20 автоматов</option>
                <option>21-50 автоматов</option>
                <option>50+ автоматов</option>
              </select>
              <textarea
                placeholder="Расскажите о вашем бизнесе (необязательно)"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition resize-none"
              />
              <button
                type="submit"
                className="w-full py-3.5 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition shadow-lg shadow-primary-500/25"
              >
                Отправить заявку
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Footer
// ============================================================================

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <Coffee className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-white">VendHub</span>
            </div>
            <p className="text-sm leading-relaxed max-w-md">
              Единая платформа для управления вендинговым бизнесом в
              Узбекистане. Автоматы, склад, персонал, финансы и лояльность — всё
              в одном месте.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Продукт</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#features" className="hover:text-white transition">
                  Возможности
                </a>
              </li>
              <li>
                <a href="#modules" className="hover:text-white transition">
                  Модули
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition">
                  Тарифы
                </a>
              </li>
              <li>
                <a href="/docs" className="hover:text-white transition">
                  Документация
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Контакты</h4>
            <ul className="space-y-2 text-sm">
              <li>Ташкент, Узбекистан</li>
              <li>
                <a
                  href="tel:+998901234567"
                  className="hover:text-white transition"
                >
                  +998 90 123 45 67
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@vendhub.uz"
                  className="hover:text-white transition"
                >
                  info@vendhub.uz
                </a>
              </li>
              <li>
                <a
                  href="https://t.me/vendhub"
                  className="hover:text-white transition"
                >
                  @vendhub в Telegram
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} VendHub. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Platforms />
        <Benefits />
        <Pricing />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
