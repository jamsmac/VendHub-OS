"use client";

interface DateRangeFilterProps {
  ranges: string[];
  activeRange: string;
  onRangeChange: (range: string) => void;
}

export function DateRangeFilter({
  ranges,
  activeRange,
  onRangeChange,
}: DateRangeFilterProps) {
  return (
    <div className="flex gap-2">
      {ranges.map((range) => (
        <button
          key={range}
          onClick={() => onRangeChange(range)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            activeRange === range
              ? "bg-espresso text-white"
              : "bg-espresso-50 text-espresso-light hover:bg-espresso-100"
          }`}
        >
          {range}
        </button>
      ))}
    </div>
  );
}
