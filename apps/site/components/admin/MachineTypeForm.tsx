"use client";

import { useState, FormEvent } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { X, Plus, Trash2, GripVertical } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import ImageUpload from "@/components/admin/ImageUpload";
import type {
  MachineTypeDetail,
  MachineTypeSpec,
  MachineTypeAdvantage,
} from "@/lib/types";

interface MachineTypeFormProps {
  machineType: MachineTypeDetail | null;
  onClose: () => void;
  onSaved: () => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function MachineTypeForm({
  machineType,
  onClose,
  onSaved,
}: MachineTypeFormProps) {
  const { showToast } = useToast();
  const t = useTranslations("admin.machineTypes.form");
  const tc = useTranslations("common");
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(machineType?.name ?? "");
  const [slug, setSlug] = useState(machineType?.slug ?? "");
  const [modelName, setModelName] = useState(machineType?.model_name ?? "");
  const [description, setDescription] = useState(
    machineType?.description ?? "",
  );
  const [heroImageUrl, setHeroImageUrl] = useState(
    machineType?.hero_image_url ?? "",
  );
  const [specs, setSpecs] = useState<MachineTypeSpec[]>(
    machineType?.specs ?? [],
  );
  const [advantages, setAdvantages] = useState<MachineTypeAdvantage[]>(
    machineType?.advantages ?? [],
  );
  const [galleryImages, setGalleryImages] = useState<string[]>(
    machineType?.gallery_images ?? [],
  );
  const [isActive, setIsActive] = useState(machineType?.is_active ?? true);
  const [badge, setBadge] = useState(machineType?.badge ?? "");
  const [sortOrder, setSortOrder] = useState(machineType?.sort_order ?? 0);

  const isEditing = !!machineType;

  const handleNameChange = (value: string) => {
    setName(value);
    if (!isEditing) {
      setSlug(slugify(value));
    }
  };

  // Specs management
  const addSpec = () => setSpecs([...specs, { label: "", value: "" }]);
  const removeSpec = (i: number) =>
    setSpecs(specs.filter((_, idx) => idx !== i));
  const updateSpec = (i: number, field: keyof MachineTypeSpec, val: string) => {
    const updated = [...specs];
    updated[i] = { ...updated[i], [field]: val };
    setSpecs(updated);
  };

  // Advantages management
  const addAdvantage = () =>
    setAdvantages([...advantages, { title: "", desc: "" }]);
  const removeAdvantage = (i: number) =>
    setAdvantages(advantages.filter((_, idx) => idx !== i));
  const updateAdvantage = (
    i: number,
    field: keyof MachineTypeAdvantage,
    val: string,
  ) => {
    const updated = [...advantages];
    updated[i] = { ...updated[i], [field]: val };
    setAdvantages(updated);
  };

  // Gallery management
  const addGalleryImage = (url: string | null) => {
    if (url) setGalleryImages([...galleryImages, url]);
  };
  const removeGalleryImage = (i: number) =>
    setGalleryImages(galleryImages.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      showToast(t("nameRequired"), "error");
      return;
    }
    setSaving(true);

    const cleanSpecs = specs.filter((s) => s.label.trim() && s.value.trim());
    const cleanAdvantages = advantages.filter((a) => a.title.trim());

    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      model_name: modelName.trim() || null,
      description: description.trim(),
      hero_image_url: heroImageUrl || null,
      specs: cleanSpecs,
      advantages: cleanAdvantages,
      gallery_images: galleryImages,
      is_active: isActive,
      badge: badge.trim() || null,
      sort_order: sortOrder,
    };

    try {
      if (machineType) {
        const { error } = await supabase
          .from("machine_types")
          .update(payload)
          .eq("id", machineType.id);
        if (error) throw error;
        showToast(t("updated"), "success");
      } else {
        const { error } = await supabase.from("machine_types").insert(payload);
        if (error) throw error;
        showToast(t("created"), "success");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("saveError");
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="machine-type-form-title"
    >
      <div
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-espresso/10">
          <h2
            id="machine-type-form-title"
            className="text-lg font-bold text-espresso"
          >
            {machineType ? t("editTitle") : t("createTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={tc("close")}
            className="text-espresso/40 hover:text-espresso transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name + Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-espresso/70 mb-1.5">
                {t("name")}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                className="admin-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-espresso/70 mb-1.5">
                {t("slug")}
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                disabled={isEditing}
                className="admin-input disabled:opacity-50"
              />
            </div>
          </div>

          {/* Model name + Badge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-espresso/70 mb-1.5">
                {t("modelName")}
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="JQ-002-A"
                className="admin-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-espresso/70 mb-1.5">
                {t("badge")}
              </label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder={t("badgePlaceholder")}
                className="admin-input"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-espresso/70 mb-1.5">
              {t("description")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="admin-input resize-y"
            />
          </div>

          {/* Hero image */}
          <div>
            <label className="block text-sm font-medium text-espresso/70 mb-1.5">
              {t("heroImage")}
            </label>
            <ImageUpload
              value={heroImageUrl || null}
              onChange={(url) => setHeroImageUrl(url ?? "")}
              folder="machine-types"
            />
          </div>

          {/* Specs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-espresso/70">
                {t("specs")}
              </label>
              <button
                type="button"
                onClick={addSpec}
                className="flex items-center gap-1 text-xs text-espresso/50 hover:text-espresso transition-colors"
              >
                <Plus size={14} /> {t("addSpec")}
              </button>
            </div>
            <div className="space-y-2">
              {specs.map((spec, i) => (
                <div key={i} className="flex items-center gap-2">
                  <GripVertical
                    size={14}
                    className="text-espresso/20 shrink-0"
                  />
                  <input
                    type="text"
                    value={spec.label}
                    onChange={(e) => updateSpec(i, "label", e.target.value)}
                    placeholder={t("specLabel")}
                    className="admin-input !py-1.5 text-sm flex-1"
                  />
                  <input
                    type="text"
                    value={spec.value}
                    onChange={(e) => updateSpec(i, "value", e.target.value)}
                    placeholder={t("specValue")}
                    className="admin-input !py-1.5 text-sm flex-[2]"
                  />
                  <button
                    type="button"
                    onClick={() => removeSpec(i)}
                    aria-label={tc("delete")}
                    className="p-1.5 text-espresso/30 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {specs.length === 0 && (
                <p className="text-xs text-espresso/30 py-2">{t("noSpecs")}</p>
              )}
            </div>
          </div>

          {/* Advantages */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-espresso/70">
                {t("advantages")}
              </label>
              <button
                type="button"
                onClick={addAdvantage}
                className="flex items-center gap-1 text-xs text-espresso/50 hover:text-espresso transition-colors"
              >
                <Plus size={14} /> {t("addAdvantage")}
              </button>
            </div>
            <div className="space-y-2">
              {advantages.map((adv, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-caramel/20 text-caramel text-xs font-bold flex items-center justify-center shrink-0 mt-1.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={adv.title}
                      onChange={(e) =>
                        updateAdvantage(i, "title", e.target.value)
                      }
                      placeholder={t("advTitle")}
                      className="admin-input !py-1.5 text-sm w-full"
                    />
                    <input
                      type="text"
                      value={adv.desc}
                      onChange={(e) =>
                        updateAdvantage(i, "desc", e.target.value)
                      }
                      placeholder={t("advDesc")}
                      className="admin-input !py-1.5 text-sm w-full"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAdvantage(i)}
                    aria-label={tc("delete")}
                    className="p-1.5 text-espresso/30 hover:text-red-500 transition-colors shrink-0 mt-1.5"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {advantages.length === 0 && (
                <p className="text-xs text-espresso/30 py-2">
                  {t("noAdvantages")}
                </p>
              )}
            </div>
          </div>

          {/* Gallery */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-espresso/70">
                {t("gallery")}
              </label>
            </div>
            <div className="space-y-3">
              {galleryImages.map((url, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1 bg-foam rounded-xl p-2 flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white shrink-0">
                      <Image
                        src={url}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <span className="text-xs text-espresso/40 truncate flex-1">
                      {url}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeGalleryImage(i)}
                    aria-label={tc("delete")}
                    className="p-1.5 text-espresso/30 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <ImageUpload
                value={null}
                onChange={addGalleryImage}
                folder="machine-types"
              />
            </div>
          </div>

          {/* Active + Sort */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="admin-checkbox"
              />
              <span className="text-sm text-espresso/70">{t("isActive")}</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-espresso/70 mb-1.5">
                {t("sortOrder")}
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                min={0}
                className="admin-input"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-espresso/60 hover:text-espresso bg-foam rounded-xl transition-colors"
            >
              {tc("cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-espresso to-espresso-light rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
            >
              {saving ? tc("saving") : machineType ? tc("save") : tc("add")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
