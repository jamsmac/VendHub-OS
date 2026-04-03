import { MetadataRoute } from "next";
import { fetchPublicMachineTypes } from "@/lib/api-client";

const BASE_URL = "https://vendhub.uz";

const FALLBACK_SLUGS = ["js-001-a01", "jq-002-a", "tcn-csc-8c-v49"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let slugs = FALLBACK_SLUGS;

  try {
    const machineTypes = await fetchPublicMachineTypes();

    if (machineTypes.length > 0) {
      const parsed = machineTypes
        .filter((t) => t.is_active !== false && typeof t.slug === "string")
        .map((t) => t.slug as string);
      if (parsed.length > 0) slugs = parsed;
    }
  } catch {
    // Use fallback slugs if query fails
  }

  const machinePages: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${BASE_URL}/machines/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
    alternates: {
      languages: {
        ru: `${BASE_URL}/machines/${slug}`,
        uz: `${BASE_URL}/uz/machines/${slug}`,
      },
    },
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
      alternates: {
        languages: {
          ru: BASE_URL,
          uz: `${BASE_URL}/uz`,
        },
      },
    },
    ...machinePages,
  ];
}
