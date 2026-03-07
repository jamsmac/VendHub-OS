/**
 * File validation utilities
 * Magic bytes detection + filename sanitization
 */

import { BadRequestException } from "@nestjs/common";

/** Known file signatures (magic bytes) mapped to MIME types */
const MAGIC_BYTES: { mime: string; bytes: number[]; offset?: number }[] = [
  // Images
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  {
    mime: "image/png",
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF....WEBP
  // PDF
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  // ZIP-based (xlsx, docx)
  { mime: "application/zip", bytes: [0x50, 0x4b, 0x03, 0x04] }, // PK..
  // CSV/JSON are text — no reliable magic bytes, skip
];

/** WebP needs a secondary check at offset 8 */
const WEBP_MARKER = [0x57, 0x45, 0x42, 0x50]; // WEBP

/**
 * Detect MIME type from file buffer magic bytes.
 * Returns null if no known signature matches.
 */
export function detectMimeFromBuffer(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;

  for (const sig of MAGIC_BYTES) {
    const offset = sig.offset ?? 0;
    if (buffer.length < offset + sig.bytes.length) continue;

    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[offset + i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      // Special case: RIFF container — check for WEBP at offset 8
      if (sig.mime === "image/webp") {
        let isWebp = true;
        for (let i = 0; i < WEBP_MARKER.length; i++) {
          if (buffer[8 + i] !== WEBP_MARKER[i]) {
            isWebp = false;
            break;
          }
        }
        if (!isWebp) continue;
      }
      return sig.mime;
    }
  }

  return null;
}

/** MIME groups for category validation */
const IMAGE_MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const SPREADSHEET_MIMES = ["application/zip", "text/csv"];

/**
 * Validate that the file buffer's magic bytes match the claimed MIME type.
 * Throws BadRequestException if the content doesn't match.
 *
 * For text-based formats (CSV, JSON) where magic bytes don't apply,
 * validation is skipped.
 */
export function validateMagicBytes(
  buffer: Buffer,
  claimedMime: string,
  category?: "image" | "document" | "spreadsheet",
): void {
  // Text-based formats have no reliable magic bytes
  const textMimes = ["text/csv", "text/plain", "application/json"];
  if (textMimes.includes(claimedMime)) return;

  const detectedMime = detectMimeFromBuffer(buffer);
  if (!detectedMime) {
    // Unknown format — if claiming to be an image, reject
    if (category === "image" || IMAGE_MIMES.includes(claimedMime)) {
      throw new BadRequestException(
        "File content does not match any known image format. Upload rejected.",
      );
    }
    return; // For non-image categories, allow unknown signatures
  }

  // For images: detected MIME must be an image type
  if (category === "image" || IMAGE_MIMES.includes(claimedMime)) {
    if (!IMAGE_MIMES.includes(detectedMime)) {
      throw new BadRequestException(
        `File claims to be ${claimedMime} but content is ${detectedMime}. Upload rejected.`,
      );
    }
    return;
  }

  // For documents: PDF must match, zip-based is OK for docx/xlsx
  if (category === "document" && claimedMime === "application/pdf") {
    if (detectedMime !== "application/pdf") {
      throw new BadRequestException(
        `File claims to be PDF but content is ${detectedMime}. Upload rejected.`,
      );
    }
  }

  // For spreadsheets: xlsx is zip-based, CSV is text (already handled above)
  if (category === "spreadsheet" && claimedMime.includes("spreadsheet")) {
    if (!SPREADSHEET_MIMES.includes(detectedMime)) {
      throw new BadRequestException(
        `File claims to be a spreadsheet but content is ${detectedMime}. Upload rejected.`,
      );
    }
  }
}

/**
 * Sanitize folder path to prevent path traversal.
 * Removes "..", leading/trailing slashes, and collapses multiple slashes.
 */
export function sanitizeFolderPath(folder: string): string {
  return folder
    .replace(/\.\./g, "") // Remove ".."
    .replace(/^\/+|\/+$/g, "") // Trim leading/trailing slashes
    .replace(/\/+/g, "/") // Collapse multiple slashes
    .replace(/[^a-zA-Z0-9/_-]/g, "_"); // Only allow safe characters
}

/**
 * Sanitize filename for Content-Disposition headers.
 * Prevents header injection via newlines or special chars.
 */
export function sanitizeDownloadFilename(name: string): string {
  return name
    .replace(/[\r\n]/g, "") // Remove newlines (header injection)
    .replace(/[";\\]/g, "_") // Remove chars that break Content-Disposition
    .replace(/[^a-zA-Z0-9._-]/g, "_"); // Only safe chars
}
