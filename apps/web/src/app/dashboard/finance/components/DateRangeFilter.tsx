"use client";

import { Button } from "@/components/ui/button";

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
        <Button
          key={range}
          variant="ghost"
          size="sm"
          onClick={() => onRangeChange(range)}
          className={`${
            activeRange === range
              ? "bg-espresso text-white hover:bg-espresso-dark"
              : "bg-espresso-50 text-espresso-light hover:bg-espresso-100"
          }`}
        >
          {range}
        </Button>
      ))}
    </div>
  );
}
