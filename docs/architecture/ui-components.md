# VendHub UI Components Guide

## shadcn/ui Components (apps/web/src/components/ui/)

### Layout
- Card, CardHeader, CardContent, CardTitle, CardDescription
- Tabs, TabsList, TabsTrigger, TabsContent
- Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle
- Sheet (side panel)
- Separator

### Forms
- Form, FormField, FormItem, FormLabel, FormControl, FormMessage
- Input, Textarea
- Select, SelectTrigger, SelectContent, SelectItem, SelectValue
- Checkbox, Switch
- RadioGroup, RadioGroupItem
- Calendar, DatePicker
- Popover, PopoverTrigger, PopoverContent

### Data Display
- Table, TableHeader, TableBody, TableRow, TableHead, TableCell
- Badge
- Avatar
- Progress
- Skeleton

### Actions
- Button (variants: default, outline, ghost, destructive)
- DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem

### Feedback
- Alert, AlertTitle, AlertDescription
- Toast (via useToast hook)

## Custom Components (apps/web/src/components/)

### Common
- PageHeader - заголовок страницы с breadcrumbs
- DataTable - обёртка над shadcn Table с пагинацией
- SearchInput - поиск с debounce
- StatusBadge - статусы с цветами
- LoadingSpinner
- EmptyState

### Forms
- DatePickerWithRange
- AsyncSelect - select с загрузкой опций
- FileUpload
- ImagePreview

### Charts (Recharts)
- BarChart, LineChart, PieChart
- ChartContainer, ChartTooltip

### Maps (Leaflet)
- MapContainer
- Marker, Polyline
- Custom markers with divIcon

## Usage Patterns

### Page Structure
```tsx
export default function SomePage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader title="Заголовок" />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          {/* filter inputs */}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <Table>...</Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Form Pattern
```tsx
const form = useForm<FormInput>({
  resolver: zodResolver(formSchema),
  defaultValues: { ... },
});

return (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormField
        control={form.control}
        name="fieldName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Label</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button type="submit">Submit</Button>
    </form>
  </Form>
);
```

### Table Pattern
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Column</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data?.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{item.value}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

## Icons
Use lucide-react:
```tsx
import { MapPin, Clock, User, Car, AlertTriangle } from 'lucide-react';
```

## Styling
- Tailwind CSS utility classes
- cn() helper for conditional classes
- CSS variables for theming (--primary, --secondary, etc.)
