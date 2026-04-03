"use client";

import { useState, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { X, Plus, Trash2 } from "lucide-react";
import { cmsCreate, cmsUpdate } from "@/lib/admin-api";
import { useToast } from "@/components/ui/Toast";
import ImageUpload from "@/components/admin/ImageUpload";
import AdminFormField from "@/components/admin/AdminFormField";
import type { Product, ProductOption } from "@/lib/types";

interface ProductFormProps {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyOption: ProductOption = { name: "", price: 0, temperature: "hot" };

export default function ProductForm({
  product,
  onClose,
  onSaved,
}: ProductFormProps) {
  const { showToast } = useToast();
  const t = useTranslations("admin.products.form");
  const tc = useTranslations("common");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState(product?.name ?? "");
  const [nameUz, setNameUz] = useState(product?.name_uz ?? "");
  const [price, setPrice] = useState(product?.price ?? 0);
  const [category, setCategory] = useState(product?.category ?? "coffee");
  const [temperature, setTemperature] = useState(product?.temperature ?? "hot");
  const [popular, setPopular] = useState(product?.popular ?? false);
  const [available, setAvailable] = useState(product?.available ?? true);
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [descriptionUz, setDescriptionUz] = useState(
    product?.description_uz ?? "",
  );
  const [detailDescription, setDetailDescription] = useState(
    product?.detail_description ?? "",
  );
  const [detailDescriptionUz, setDetailDescriptionUz] = useState(
    product?.detail_description_uz ?? "",
  );
  const [calories, setCalories] = useState<number | "">(
    product?.calories ?? "",
  );
  const [rating, setRating] = useState(product?.rating ?? 4.5);
  const [isNew, setIsNew] = useState(product?.is_new ?? false);
  const [discountPercent, setDiscountPercent] = useState(
    product?.discount_percent ?? 0,
  );
  const [sortOrder, setSortOrder] = useState(product?.sort_order ?? 0);
  const [options, setOptions] = useState<ProductOption[]>(
    product?.options ?? [],
  );

  const categoryLabels: Record<string, string> = {
    coffee: t("categoryLabels.coffee"),
    tea: t("categoryLabels.tea"),
    other: t("categoryLabels.other"),
    snack: t("categoryLabels.snack"),
  };

  const temperatureLabels: Record<string, string> = {
    hot: t("temperatureLabels.hot"),
    cold: t("temperatureLabels.cold"),
    both: t("temperatureLabels.both"),
    none: t("temperatureLabels.none"),
  };

  const addOption = () => {
    setOptions((prev) => [...prev, { ...emptyOption }]);
  };

  const removeOption = (index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateOption = (
    index: number,
    field: keyof ProductOption,
    value: string | number,
  ) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt)),
    );
  };

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t("nameRequired");
    if (price <= 0) errs.price = t("priceRequired");
    if (rating < 0 || rating > 5) errs.rating = t("ratingRange");
    if (discountPercent < 0 || discountPercent > 100)
      errs.discount = t("discountRange");
    for (let i = 0; i < options.length; i++) {
      if (!options[i].name.trim()) {
        errs[`option_${i}`] = `${t("optionName")} ${i + 1}`;
        break;
      }
      if (options[i].price < 0) {
        errs[`option_${i}`] = `${t("optionSurcharge")} ${i + 1}`;
        break;
      }
    }
    return errs;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSaving(true);

    const payload = {
      name,
      name_uz: nameUz || null,
      price,
      category,
      temperature,
      popular,
      available,
      image_url: imageUrl || null,
      description: description || null,
      description_uz: descriptionUz || null,
      detail_description: detailDescription || null,
      detail_description_uz: detailDescriptionUz || null,
      calories: calories === "" ? null : calories,
      rating,
      is_new: isNew,
      discount_percent: discountPercent || null,
      sort_order: sortOrder,
      options,
    };

    try {
      const { error } = product
        ? await cmsUpdate("products", product.id, payload)
        : await cmsCreate("products", payload);
      if (error) throw new Error(error);
      showToast(product ? t("updated") : t("created"), "success");
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
      aria-labelledby="product-form-title"
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-espresso/10">
          <h2
            id="product-form-title"
            className="text-lg font-bold text-espresso"
          >
            {product ? t("editTitle") : t("createTitle")}
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
          {/* Name + Name UZ + Price */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <AdminFormField label={t("name")} required error={errors.name}>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((p) => ({ ...p, name: "" }));
                }}
                required
                className={`admin-input ${errors.name ? "!border-red-400" : ""}`}
              />
            </AdminFormField>
            <AdminFormField label={t("nameUz")}>
              <input
                type="text"
                value={nameUz}
                onChange={(e) => setNameUz(e.target.value)}
                className="admin-input"
              />
            </AdminFormField>
            <AdminFormField label={t("price")} required error={errors.price}>
              <input
                type="number"
                value={price}
                onChange={(e) => {
                  setPrice(Number(e.target.value));
                  setErrors((p) => ({ ...p, price: "" }));
                }}
                required
                min={0}
                className={`admin-input ${errors.price ? "!border-red-400" : ""}`}
              />
            </AdminFormField>
          </div>

          {/* Category + Temperature */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminFormField label={t("category")}>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as Product["category"])
                }
                className="admin-input"
              >
                {Object.entries(categoryLabels).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </AdminFormField>
            <AdminFormField label={t("temperature")}>
              <select
                value={temperature}
                onChange={(e) =>
                  setTemperature(e.target.value as Product["temperature"])
                }
                className="admin-input"
              >
                {Object.entries(temperatureLabels).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </AdminFormField>
          </div>

          {/* Image */}
          <AdminFormField label={t("image")}>
            <ImageUpload
              value={imageUrl || null}
              onChange={(url) => setImageUrl(url ?? "")}
              folder="products"
            />
          </AdminFormField>

          {/* Description + Description UZ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminFormField label={t("description")}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="admin-input resize-y"
              />
            </AdminFormField>
            <AdminFormField label={t("descriptionUz")}>
              <textarea
                value={descriptionUz}
                onChange={(e) => setDescriptionUz(e.target.value)}
                rows={2}
                className="admin-input resize-y"
              />
            </AdminFormField>
          </div>

          {/* Detail Description + Detail Description UZ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminFormField label={t("detailDescription")}>
              <textarea
                value={detailDescription}
                onChange={(e) => setDetailDescription(e.target.value)}
                rows={3}
                placeholder={t("detailDescriptionHint")}
                className="admin-input resize-y"
              />
            </AdminFormField>
            <AdminFormField label={t("detailDescriptionUz")}>
              <textarea
                value={detailDescriptionUz}
                onChange={(e) => setDetailDescriptionUz(e.target.value)}
                rows={3}
                placeholder={t("detailDescriptionHint")}
                className="admin-input resize-y"
              />
            </AdminFormField>
          </div>

          {/* Calories */}
          <AdminFormField label={t("calories")}>
            <input
              type="number"
              value={calories}
              onChange={(e) =>
                setCalories(e.target.value === "" ? "" : Number(e.target.value))
              }
              min={0}
              className="admin-input w-40"
            />
          </AdminFormField>

          {/* Rating + Sort + Discount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <AdminFormField label={t("rating")} error={errors.rating}>
              <input
                type="number"
                value={rating}
                onChange={(e) => {
                  setRating(Number(e.target.value));
                  setErrors((p) => ({ ...p, rating: "" }));
                }}
                min={0}
                max={5}
                step={0.1}
                className={`admin-input ${errors.rating ? "!border-red-400" : ""}`}
              />
            </AdminFormField>
            <AdminFormField label={t("discount")} error={errors.discount}>
              <input
                type="number"
                value={discountPercent}
                onChange={(e) => {
                  setDiscountPercent(Number(e.target.value));
                  setErrors((p) => ({ ...p, discount: "" }));
                }}
                min={0}
                max={100}
                className={`admin-input ${errors.discount ? "!border-red-400" : ""}`}
              />
            </AdminFormField>
            <AdminFormField label={t("sortOrder")}>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="admin-input"
              />
            </AdminFormField>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={popular}
                onChange={(e) => setPopular(e.target.checked)}
                className="admin-checkbox"
              />
              <span className="text-sm text-espresso/70">{t("popular")}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
                className="admin-checkbox"
              />
              <span className="text-sm text-espresso/70">{t("available")}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isNew}
                onChange={(e) => setIsNew(e.target.checked)}
                className="admin-checkbox"
              />
              <span className="text-sm text-espresso/70">{t("isNew")}</span>
            </label>
          </div>

          {/* Options */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-espresso/70">
                {t("options")} ({options.length})
              </label>
              <button
                type="button"
                onClick={addOption}
                className="flex items-center gap-1 text-xs text-caramel-dark hover:text-caramel transition-colors font-medium"
              >
                <Plus size={14} />
                {t("addOption")}
              </button>
            </div>
            {options.length > 0 && (
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx}>
                    <div className="flex items-center gap-2 bg-foam rounded-xl p-3">
                      <input
                        type="text"
                        value={opt.name}
                        onChange={(e) => {
                          updateOption(idx, "name", e.target.value);
                          setErrors((p) => ({ ...p, [`option_${idx}`]: "" }));
                        }}
                        placeholder={t("optionName")}
                        className={`admin-input flex-1 !py-1.5 text-sm ${errors[`option_${idx}`] ? "!border-red-400" : ""}`}
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-espresso/50 font-medium">
                          +
                        </span>
                        <input
                          type="number"
                          value={opt.price}
                          onChange={(e) => {
                            updateOption(idx, "price", Number(e.target.value));
                            setErrors((p) => ({ ...p, [`option_${idx}`]: "" }));
                          }}
                          placeholder="0"
                          min={0}
                          className={`admin-input w-24 !py-1.5 text-sm ${errors[`option_${idx}`] ? "!border-red-400" : ""}`}
                        />
                      </div>
                      <select
                        value={opt.temperature}
                        onChange={(e) =>
                          updateOption(idx, "temperature", e.target.value)
                        }
                        className="admin-input w-28 !py-1.5 text-sm"
                      >
                        <option value="hot">{t("optionHot")}</option>
                        <option value="cold">{t("optionCold")}</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        className="text-red-400 hover:text-red-600 transition-colors shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mt-1 ml-3">
                      {errors[`option_${idx}`] && (
                        <p className="text-xs text-red-500">
                          {errors[`option_${idx}`]}
                        </p>
                      )}
                      <p className="text-xs text-espresso/40">
                        {t("optionSurchargeHint")} · {t("optionSurcharge")}:{" "}
                        {(price + opt.price).toLocaleString()} UZS
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              {saving ? tc("saving") : product ? tc("save") : tc("add")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
