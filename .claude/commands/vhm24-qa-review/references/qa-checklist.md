# VendHub QA Review Checklist

## 1. Код (Code Quality)

### TypeScript

- [ ] Все пропсы имеют интерфейсы
- [ ] Нет `any` типов
- [ ] Используются правильные generic types для API запросов
- [ ] Enum'ы вместо magic strings

### Imports

- [ ] shadcn/ui компоненты из `@/components/ui/`
- [ ] Lucide иконки из `lucide-react`
- [ ] API клиент из `@/lib/api`
- [ ] Утилиты из `@/lib/utils`
- [ ] Нет неиспользуемых импортов

### Naming

- [ ] Компоненты в PascalCase
- [ ] Функции в camelCase
- [ ] Константы в UPPER_SNAKE_CASE
- [ ] Файлы в kebab-case или PascalCase

---

## 2. UI/UX (Visual Quality)

### Дизайн-система "Warm Brew"

- [ ] Primary: amber-500 (#f59e0b)
- [ ] Success: green-500/emerald-500
- [ ] Error: red-500
- [ ] Warning: yellow-500
- [ ] Info: blue-500

### Dark Mode

- [ ] Все bg-_ имеют dark:bg-_ варианты
- [ ] Все text-_ имеют dark:text-_ варианты
- [ ] Все border-_ имеют dark:border-_ варианты

### Консистентность

- [ ] Все карточки используют Card из shadcn/ui
- [ ] Все кнопки используют Button с правильным variant
- [ ] Все таблицы используют Table компоненты
- [ ] Все модалки используют Dialog

### Состояния

- [ ] Loading: Skeleton или Spinner
- [ ] Empty: EmptyState с иконкой и текстом
- [ ] Error: Alert variant="destructive"
- [ ] Success: Toast уведомление

---

## 3. Функциональность (Functionality)

### REST API Интеграция

- [ ] useQuery (React Query) для GET запросов через fetch
- [ ] useMutation (React Query) для POST/PATCH/DELETE через fetch
- [ ] Правильные DTO types для request/response
- [ ] onSuccess/onError обработчики
- [ ] queryClient.invalidateQueries() после мутаций

### Состояние

- [ ] Локальное состояние через useState
- [ ] Глобальное через Zustand (если нужно)
- [ ] Фильтры работают корректно
- [ ] Пагинация работает

### Формы

- [ ] React Hook Form + Zod validation
- [ ] Все поля имеют label
- [ ] Показываются ошибки валидации
- [ ] Disabled во время отправки
- [ ] Сброс после успешной отправки

---

## 4. Адаптивность (Responsiveness)

### Breakpoints

- [ ] sm: 640px - мобильная адаптация
- [ ] md: 768px - планшетная адаптация
- [ ] lg: 1024px - десктоп

### Grid

- [ ] grid-cols-1 для mobile
- [ ] md:grid-cols-2 для tablet
- [ ] lg:grid-cols-4 для desktop

### Таблицы

- [ ] overflow-x-auto на контейнере
- [ ] Карточки вместо таблицы на мобильных (опционально)

---

## 5. Accessibility (A11Y)

### Базовое

- [ ] Все изображения имеют alt
- [ ] Все кнопки имеют aria-label если нет текста
- [ ] Фокус-стили видны
- [ ] Tab navigation работает

### Модалки

- [ ] Закрытие по Escape
- [ ] Focus trap внутри
- [ ] aria-modal="true"

### Формы

- [ ] Labels связаны с inputs
- [ ] Ошибки связаны с полями
- [ ] Required поля отмечены

---

## 6. Локализация (i18n)

### Язык

- [ ] Весь UI текст на русском
- [ ] Правильные окончания (1 задача, 2 задачи, 5 задач)
- [ ] Даты в формате DD.MM.YYYY
- [ ] Время в формате HH:mm

### Валюта

- [ ] Сумма в формате "1 234 567 UZS"
- [ ] Сокращение для больших сумм: "1.2 млн"
- [ ] Правильный разделитель тысяч (пробел)

---

## 7. Производительность (Performance)

### React

- [ ] Нет лишних re-renders
- [ ] useMemo для тяжёлых вычислений
- [ ] useCallback для функций в пропсах
- [ ] React.memo для дорогих компонентов

### Данные

- [ ] Пагинация для больших списков
- [ ] Дебаунс для поиска
- [ ] Кеширование через React Query

---

## 8. Безопасность (Security)

### Общее

- [ ] Нет console.log в production
- [ ] Нет hardcoded secrets
- [ ] Правильная санитизация пользовательского ввода
- [ ] XSS защита (нет dangerouslySetInnerHTML без санитизации)

### API

- [ ] Bearer JWT токен в заголовке Authorization
- [ ] Ролевой доступ через @Roles() на бэкенде
- [ ] Валидация всех inputs через class-validator (бэкенд) и Zod (фронтенд)

---

## Результат проверки

```markdown
## QA Review: [Название экрана]

**Дата:** YYYY-MM-DD
**Ревьюер:** Claude

### Результаты

| Категория      | Статус   | Замечания |
| -------------- | -------- | --------- |
| Code Quality   | ✅/⚠️/❌ |           |
| Visual Quality | ✅/⚠️/❌ |           |
| Functionality  | ✅/⚠️/❌ |           |
| Responsiveness | ✅/⚠️/❌ |           |
| Accessibility  | ✅/⚠️/❌ |           |
| Localization   | ✅/⚠️/❌ |           |
| Performance    | ✅/⚠️/❌ |           |
| Security       | ✅/⚠️/❌ |           |

### Критические проблемы

1. [Если есть]

### Рекомендации

1. [Улучшения]

### Вердикт

**APPROVED** / **NEEDS FIXES**
```
