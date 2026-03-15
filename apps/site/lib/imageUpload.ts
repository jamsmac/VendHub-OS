const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface ImageValidation {
  valid: boolean;
  errorKey?: "invalidFormat" | "tooLarge";
}

export function validateImage(file: File): ImageValidation {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, errorKey: "invalidFormat" };
  }
  if (file.size > MAX_SIZE) {
    return { valid: false, errorKey: "tooLarge" };
  }
  return { valid: true };
}

// Site admin CMS uses static data — file uploads are handled by the main admin (apps/web).
// If site CMS needs live uploads, wire to POST /api/v1/storage/upload.
export async function uploadImage(
  _file: File,
  _folder: string,
): Promise<string> {
  throw new Error(
    "File uploads are managed via the main admin panel (apps/web).",
  );
}

export async function deleteImage(_url: string): Promise<void> {
  throw new Error(
    "File deletions are managed via the main admin panel (apps/web).",
  );
}
