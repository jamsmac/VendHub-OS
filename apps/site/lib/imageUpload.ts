const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface ImageValidation {
  valid: boolean;
  error?: string;
}

export function validateImage(file: File): ImageValidation {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: "Допустимые форматы: JPEG, PNG, WebP" };
  }
  if (file.size > MAX_SIZE) {
    return { valid: false, error: "Максимальный размер файла: 5 МБ" };
  }
  return { valid: true };
}

// TODO: Migrate to VendHub API file upload (POST /api/v1/uploads)
export async function uploadImage(
  _file: File,
  _folder: string,
): Promise<string> {
  throw new Error(
    "Image upload is being migrated to VendHub API. " +
      "Supabase storage has been removed.",
  );
}

export async function deleteImage(_url: string): Promise<void> {
  throw new Error(
    "Image deletion is being migrated to VendHub API. " +
      "Supabase storage has been removed.",
  );
}
