# VendHub TypeScript Patterns

## Table of Contents

1. [Component Props](#component-props)
2. [API Hooks](#api-hooks)
3. [State Management](#state-management)
4. [Form Handling](#form-handling)
5. [Type Exports](#type-exports)

---

## Component Props

### Page Props

```tsx
interface PageProps {
  title: string;
  description?: string;
}

export default function PageName({ title, description }: PageProps) {
  return (
    <AdminLayout title={title} description={description}>
      {/* content */}
    </AdminLayout>
  );
}
```

### Component Props with Children

```tsx
interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  onClick?: () => void;
}

function CustomCard({ children, title, className, onClick }: CardProps) {
  return (
    <Card className={cn("...", className)} onClick={onClick}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}
```

### Status Badge Pattern

```tsx
interface StatusBadgeProps {
  status: "online" | "offline" | "maintenance" | "pending";
}

const statusConfig: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  online: {
    label: "Онлайн",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  offline: {
    label: "Офлайн",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: <XCircle className="w-3 h-3" />,
  },
  // ...more statuses
};

function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
        config.className,
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
```

---

## API Hooks

### Fetch с React Query

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api/v1";

// GET запрос
export function useProducts(organizationId: string) {
  return useQuery({
    queryKey: ["products", organizationId],
    queryFn: () =>
      fetch(`${API_BASE}/products?organizationId=${organizationId}`).then((r) =>
        r.json(),
      ),
  });
}

// POST/PATCH/DELETE мутация
export function useCreateProduct() {
  return useMutation({
    mutationFn: (data: CreateProductDto) =>
      fetch(`${API_BASE}/products`, {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }).then((r) => r.json()),
  });
}
```

### Query Pattern

```tsx
import { useQuery } from "@tanstack/react-query";

const API_BASE = "/api/v1";

export default function ProductsPage() {
  const {
    data: products,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetch(`${API_BASE}/products`).then((r) => r.json()),
  });

  if (isLoading) return <Spinner />;
  if (error) return <Alert variant="destructive">{error.message}</Alert>;

  return (
    <div>
      {products?.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### Query with Input

```tsx
const { data: product } = useQuery({
  queryKey: ["products", productId],
  queryFn: () =>
    fetch(`${API_BASE}/products/${productId}`).then((r) => r.json()),
});

const { data: filtered } = useQuery({
  queryKey: ["products", "byCategory", selectedCategory],
  queryFn: () =>
    fetch(`${API_BASE}/products?category=${selectedCategory}`).then((r) =>
      r.json(),
    ),
  enabled: !!selectedCategory, // Only run if category selected
});
```

### Mutation Pattern

```tsx
const queryClient = useQueryClient();
const createMutation = useMutation({
  mutationFn: (data: ProductFormData) =>
    fetch(`${API_BASE}/products`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    }).then((r) => r.json()),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast.success("Продукт создан");
  },
  onError: (error) => {
    toast.error(error.message);
  },
});

const handleSubmit = (data: ProductFormData) => {
  createMutation.mutate(data);
};
```

### Optimistic Updates

```tsx
const queryClient = useQueryClient();
const deleteMutation = useMutation({
  mutationFn: (id: string) =>
    fetch(`${API_BASE}/products/${id}`, { method: "DELETE" }).then((r) =>
      r.json(),
    ),
  onMutate: async (id) => {
    await queryClient.cancelQueries({ queryKey: ["products"] });
    const previous = queryClient.getQueryData(["products"]);
    queryClient.setQueryData(["products"], (old: Product[]) =>
      old?.filter((p) => p.id !== id),
    );
    return { previous };
  },
  onError: (err, id, context) => {
    queryClient.setQueryData(["products"], context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
  },
});
```

---

## State Management

### Zustand Store Pattern

```tsx
// stores/machinesStore.ts
import { create } from "zustand";

interface MachinesState {
  selectedMachineId: number | null;
  filters: {
    status: string | null;
    location: string | null;
  };
  setSelectedMachine: (id: number | null) => void;
  setFilter: (key: string, value: string | null) => void;
  resetFilters: () => void;
}

export const useMachinesStore = create<MachinesState>((set) => ({
  selectedMachineId: null,
  filters: { status: null, location: null },
  setSelectedMachine: (id) => set({ selectedMachineId: id }),
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),
  resetFilters: () => set({ filters: { status: null, location: null } }),
}));
```

### Using Store in Components

```tsx
function MachinesList() {
  const { selectedMachineId, setSelectedMachine, filters } = useMachinesStore();
  const { data: machines } = useQuery({
    queryKey: ["machines"],
    queryFn: () => fetch(`${API_BASE}/machines`).then((r) => r.json()),
  });

  const filteredMachines = machines?.filter(
    (m) =>
      (!filters.status || m.status === filters.status) &&
      (!filters.location || m.location === filters.location),
  );

  return (
    <div>
      {filteredMachines?.map((machine) => (
        <MachineCard
          key={machine.id}
          machine={machine}
          isSelected={selectedMachineId === machine.id}
          onSelect={() => setSelectedMachine(machine.id)}
        />
      ))}
    </div>
  );
}
```

---

## Form Handling

### React Hook Form + Zod

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  nameRu: z.string().optional(),
  price: z.number().min(0, "Цена должна быть положительной"),
  category: z.enum(["coffee", "tea", "snacks", "cold_drinks", "other"]),
  isAvailable: z.boolean().default(true),
});

type ProductFormData = z.infer<typeof productSchema>;

function ProductForm({
  product,
  onSubmit,
}: {
  product?: Product;
  onSubmit: (data: ProductFormData) => void;
}) {
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product || {
      name: "",
      price: 0,
      category: "coffee",
      isAvailable: true,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Название</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Капучино" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* more fields */}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? <Spinner /> : "Сохранить"}
        </Button>
      </form>
    </Form>
  );
}
```

---

## Type Exports

### From TypeORM / Shared Types

```tsx
// Import types from shared package
import type { Product, Machine, Order, Employee } from "@shared/types";

// Use in components
interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
}
```

### API Response Types

```tsx
// Define response types matching NestJS DTOs
interface ProductListResponse {
  data: Product[];
  total: number;
}

interface ProductResponse {
  data: Product;
}

// Use with React Query
const { data } = useQuery<ProductListResponse>({
  queryKey: ["products"],
  queryFn: () => fetch(`${API_BASE}/products`).then((r) => r.json()),
});
// data is typed as ProductListResponse
```

### Custom Types

```tsx
// Extend database types with UI-specific fields
interface ProductWithStats extends Product {
  orderCount: number;
  revenue: number;
  trend: "up" | "down" | "neutral";
}

// Status unions
type MachineStatus = "online" | "offline" | "maintenance" | "inactive";
type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";
type EmployeeRole =
  | "owner"
  | "admin"
  | "manager"
  | "operator"
  | "warehouse"
  | "accountant"
  | "viewer";
```
