"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const t = useTranslations("admin.pagination");
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-1 pt-4">
      <p className="text-xs text-espresso/40">
        {from}–{to} {t("of")} {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label={t("prev")}
          className="p-1.5 rounded-lg text-espresso/40 hover:text-espresso hover:bg-foam transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={[
              "w-8 h-8 rounded-lg text-xs font-medium transition-all",
              page === currentPage
                ? "bg-espresso text-cream shadow-sm"
                : "text-espresso/50 hover:bg-foam",
            ].join(" ")}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label={t("next")}
          className="p-1.5 rounded-lg text-espresso/40 hover:text-espresso hover:bg-foam transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
