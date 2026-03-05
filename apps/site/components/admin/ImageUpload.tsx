"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Upload, Trash2, Loader2, ImageIcon } from "lucide-react";
import { uploadImage, deleteImage, validateImage } from "@/lib/imageUpload";

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: string;
}

export default function ImageUpload({
  value,
  onChange,
  folder,
}: ImageUploadProps) {
  const t = useTranslations("admin.imageUpload");
  const tc = useTranslations("common");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    const validation = validateImage(file);
    if (!validation.valid) {
      setError(validation.error ?? tc("errorOccurred"));
      return;
    }

    setUploading(true);
    try {
      if (value) {
        await deleteImage(value).catch(() => {});
      }
      const url = await uploadImage(file, folder);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("errorOccurred"));
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = async () => {
    if (!value) return;
    setUploading(true);
    try {
      await deleteImage(value);
    } catch (_error: unknown) {
      // Ignore delete errors — file may already be gone
    }
    onChange(null);
    setUploading(false);
  };

  if (uploading) {
    return (
      <div className="flex items-center justify-center h-40 rounded-xl border-2 border-dashed border-espresso/10 bg-foam/50">
        <div className="flex flex-col items-center gap-2 text-espresso/40">
          <Loader2 size={24} className="animate-spin" />
          <span className="text-xs">{t("uploading")}</span>
        </div>
      </div>
    );
  }

  if (value) {
    return (
      <div className="relative group">
        <div className="relative h-40 rounded-xl border border-espresso/10 overflow-hidden bg-foam/50">
          <Image
            src={value}
            alt={t("preview")}
            fill
            className="object-contain"
            sizes="(max-width: 640px) 100vw, 400px"
          />
        </div>
        <button
          type="button"
          onClick={handleRemove}
          aria-label={t("remove")}
          className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
        >
          <Trash2 size={14} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          "flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
          isDragging
            ? "border-espresso/30 bg-foam"
            : "border-espresso/10 bg-foam/30 hover:border-espresso/20 hover:bg-foam/50",
        ].join(" ")}
      >
        {isDragging ? (
          <ImageIcon size={24} className="text-espresso/40 mb-2" />
        ) : (
          <Upload size={24} className="text-espresso/30 mb-2" />
        )}
        <span className="text-xs text-espresso/40">
          {isDragging ? t("dropHere") : t("dragOrClick")}
        </span>
        <span className="text-[10px] text-espresso/25 mt-1">
          {t("formats")}
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}
