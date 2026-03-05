import type { ReactNode } from "react";
import { Search, Plus } from "lucide-react";

interface AdminSearchToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  onAdd: () => void;
  addLabel: string;
  extra?: ReactNode;
}

export default function AdminSearchToolbar({
  search,
  onSearchChange,
  placeholder,
  onAdd,
  addLabel,
  extra,
}: AdminSearchToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="relative flex-1 max-w-sm">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-espresso/30"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="admin-input !pl-9 w-full"
        />
      </div>
      <div className="flex items-center gap-3">
        {extra}
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-espresso to-espresso-light rounded-xl hover:shadow-lg transition-all shrink-0"
        >
          <Plus size={16} />
          {addLabel}
        </button>
      </div>
    </div>
  );
}
