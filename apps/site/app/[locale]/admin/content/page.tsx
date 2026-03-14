"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import type { SiteContent } from "@/lib/types";

const SECTION_KEYS = [
  "hero",
  "stats",
  "about",
  "footer",
  "partnership",
] as const;

export default function AdminContentPage() {
  const { showToast } = useToast();
  const t = useTranslations("admin.content");
  const tc = useTranslations("common");
  const [content, setContent] = useState<SiteContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContent() {
      try {
        const { data, error } = await supabase
          .from("site_content")
          .select("*")
          .order("section", { ascending: true });

        if (error) {
          showToast(t("loadError"), "error");
        } else {
          const contentData = data as SiteContent[];
          setContent(contentData);
          const newEdits: Record<string, string> = {};
          for (const item of contentData) {
            newEdits[item.id] = item.value;
          }
          setEdits(newEdits);
        }
      } catch (err: unknown) {
        console.error("Content fetch failed:", err);
        showToast(t("loadError"), "error");
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, [showToast, t]);

  const handleSave = async (item: SiteContent) => {
    setSavingId(item.id);
    const { error } = await supabase
      .from("site_content")
      .update({ value: edits[item.id] })
      .eq("id", item.id);

    if (error) {
      showToast(t("saveError"), "error");
    } else {
      showToast(t("updated"), "success");
    }
    setSavingId(null);
  };

  // Group content by section
  const grouped: Record<string, SiteContent[]> = {};
  for (const item of content) {
    if (!grouped[item.section]) {
      grouped[item.section] = [];
    }
    grouped[item.section].push(item);
  }

  // Sort sections
  const sortedSections = Object.keys(grouped).sort((a, b) => {
    const ai = SECTION_KEYS.indexOf(a as (typeof SECTION_KEYS)[number]);
    const bi = SECTION_KEYS.indexOf(b as (typeof SECTION_KEYS)[number]);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  if (loading) {
    return (
      <div className="text-center py-12 text-espresso/40">{tc("loading")}</div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-espresso/50">{t("description")}</p>

      {sortedSections.length === 0 ? (
        <div className="text-center py-12 text-espresso/40">{t("empty")}</div>
      ) : (
        sortedSections.map((section) => (
          <div key={section} className="space-y-3">
            <h2 className="text-sm font-bold text-espresso uppercase tracking-wider">
              {t(`sections.${section}`, { defaultValue: section })}
            </h2>
            <div className="bg-white rounded-2xl border border-espresso/5 overflow-hidden divide-y divide-espresso/5">
              {grouped[section].map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col sm:flex-row gap-3 px-4 py-3 ${
                    item.key.endsWith("_benefits") ||
                    item.key.endsWith("_description")
                      ? "sm:items-start"
                      : "sm:items-center"
                  }`}
                >
                  <div className="sm:w-40 shrink-0">
                    <span className="text-xs font-medium text-espresso/40 font-mono">
                      {item.key}
                    </span>
                  </div>
                  <div className="flex-1">
                    {item.key.endsWith("_benefits") ||
                    item.key.endsWith("_description") ? (
                      <textarea
                        value={edits[item.id] ?? ""}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        rows={item.key.endsWith("_benefits") ? 4 : 2}
                        className="admin-input !py-1.5 text-sm w-full resize-y"
                      />
                    ) : (
                      <input
                        type="text"
                        value={edits[item.id] ?? ""}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        className="admin-input !py-1.5 text-sm w-full"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSave(item)}
                    disabled={
                      savingId === item.id || edits[item.id] === item.value
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-espresso to-espresso-light rounded-lg hover:shadow-md transition-all disabled:opacity-30 shrink-0"
                  >
                    <Save size={12} />
                    {savingId === item.id ? "..." : tc("save")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
