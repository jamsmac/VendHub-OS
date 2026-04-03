"use client";

import { useState, useEffect, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { cmsGetAll, cmsCreate, cmsUpdate } from "@/lib/admin-api";
import { useToast } from "@/components/ui/Toast";
import ImageUpload from "@/components/admin/ImageUpload";
import AdminFormField from "@/components/admin/AdminFormField";
import type { Machine } from "@/lib/types";

interface MachineFormProps {
  machine: Machine | null;
  onClose: () => void;
  onSaved: () => void;
}

const LOCATION_TYPE_KEYS = [
  "hospital",
  "university",
  "market",
  "government",
  "residential",
] as const;

export default function MachineForm({
  machine,
  onClose,
  onSaved,
}: MachineFormProps) {
  const { showToast } = useToast();
  const t = useTranslations("admin.machines.form");
  const tm = useTranslations("admin.machines");
  const tc = useTranslations("common");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [machineTypes, setMachineTypes] = useState<
    { slug: string; name: string }[]
  >([]);

  useEffect(() => {
    cmsGetAll<{ slug: string; name: string }>("machine_types").then(
      ({ data }) => {
        if (data)
          setMachineTypes(data.map((mt) => ({ slug: mt.slug, name: mt.name })));
      },
    );
  }, []);

  const [name, setName] = useState(machine?.name ?? "");
  const [address, setAddress] = useState(machine?.address ?? "");
  const [type, setType] = useState(machine?.type ?? "coffee");
  const [status, setStatus] = useState(machine?.status ?? "online");
  const [latitude, setLatitude] = useState(machine?.latitude ?? 0);
  const [longitude, setLongitude] = useState(machine?.longitude ?? 0);
  const [rating, setRating] = useState(machine?.rating ?? 4.5);
  const [reviewCount, setReviewCount] = useState(machine?.review_count ?? 0);
  const [floor, setFloor] = useState(machine?.floor ?? "");
  const [hours, setHours] = useState(machine?.hours ?? "24/7");
  const [productCount, setProductCount] = useState(machine?.product_count ?? 0);
  const [hasPromotion, setHasPromotion] = useState(
    machine?.has_promotion ?? false,
  );
  const [locationType, setLocationType] = useState(
    machine?.location_type ?? "",
  );
  const [imageUrl, setImageUrl] = useState(machine?.image_url ?? "");

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t("nameRequired");
    if (!address.trim()) errs.address = t("addressRequired");
    if (latitude && (latitude < 37 || latitude > 46))
      errs.latitude = t("latitudeRange");
    if (longitude && (longitude < 56 || longitude > 74))
      errs.longitude = t("longitudeRange");
    if (rating < 0 || rating > 5) errs.rating = t("ratingRange");
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
      address,
      type,
      status,
      latitude: latitude || null,
      longitude: longitude || null,
      rating,
      review_count: reviewCount,
      floor: floor || null,
      hours,
      product_count: productCount,
      has_promotion: hasPromotion,
      location_type: locationType || null,
      image_url: imageUrl || null,
    };

    try {
      const { error } = machine
        ? await cmsUpdate("machines", machine.id, payload)
        : await cmsCreate("machines", payload);
      if (error) throw new Error(error);
      showToast(machine ? t("updated") : t("created"), "success");
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
      aria-labelledby="machine-form-title"
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-espresso/10">
          <h2
            id="machine-form-title"
            className="text-lg font-bold text-espresso"
          >
            {machine ? t("editTitle") : t("createTitle")}
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
          {/* Name */}
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

          {/* Address */}
          <AdminFormField label={t("address")} required error={errors.address}>
            <input
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setErrors((p) => ({ ...p, address: "" }));
              }}
              required
              className={`admin-input ${errors.address ? "!border-red-400" : ""}`}
            />
          </AdminFormField>

          {/* Type + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminFormField label={t("type")}>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="admin-input"
              >
                {machineTypes.map((mt) => (
                  <option key={mt.slug} value={mt.slug}>
                    {mt.name}
                  </option>
                ))}
              </select>
            </AdminFormField>
            <AdminFormField label={t("status")}>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Machine["status"])}
                className="admin-input"
              >
                <option value="online">{tm("online")}</option>
                <option value="offline">{tm("offline")}</option>
              </select>
            </AdminFormField>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminFormField label={t("latitude")} error={errors.latitude}>
              <input
                type="number"
                value={latitude}
                onChange={(e) => {
                  setLatitude(Number(e.target.value));
                  setErrors((p) => ({ ...p, latitude: "" }));
                }}
                step="any"
                className={`admin-input ${errors.latitude ? "!border-red-400" : ""}`}
              />
            </AdminFormField>
            <AdminFormField label={t("longitude")} error={errors.longitude}>
              <input
                type="number"
                value={longitude}
                onChange={(e) => {
                  setLongitude(Number(e.target.value));
                  setErrors((p) => ({ ...p, longitude: "" }));
                }}
                step="any"
                className={`admin-input ${errors.longitude ? "!border-red-400" : ""}`}
              />
            </AdminFormField>
          </div>

          {/* Rating + Review Count + Product Count */}
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
            <AdminFormField label={t("reviewCount")}>
              <input
                type="number"
                value={reviewCount}
                onChange={(e) => setReviewCount(Number(e.target.value))}
                min={0}
                className="admin-input"
              />
            </AdminFormField>
            <AdminFormField label={t("productCount")}>
              <input
                type="number"
                value={productCount}
                onChange={(e) => setProductCount(Number(e.target.value))}
                min={0}
                className="admin-input"
              />
            </AdminFormField>
          </div>

          {/* Floor + Hours + Location Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <AdminFormField label={t("floor")}>
              <input
                type="text"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                className="admin-input"
              />
            </AdminFormField>
            <AdminFormField label={t("hours")}>
              <input
                type="text"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="24/7"
                className="admin-input"
              />
            </AdminFormField>
            <AdminFormField label={t("locationType")}>
              <select
                value={locationType}
                onChange={(e) => setLocationType(e.target.value)}
                className="admin-input"
              >
                <option value="">—</option>
                {LOCATION_TYPE_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {t(`locationTypes.${key}`)}
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
              folder="machines"
            />
          </AdminFormField>

          {/* Has Promotion */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasPromotion}
              onChange={(e) => setHasPromotion(e.target.checked)}
              className="admin-checkbox"
            />
            <span className="text-sm text-espresso/70">
              {t("hasPromotion")}
            </span>
          </label>

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
              {saving ? tc("saving") : machine ? tc("save") : tc("add")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
