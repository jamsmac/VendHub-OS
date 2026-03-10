import { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const BASE_URL = "https://vendhub.uz";

const FALLBACK_SLUGS = ["js-001-a01", "jq-002-a", "tcn-csc-8c-v49"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let slugs = FALLBACK_SLUGS;

  try {
    const { data } = await supabase
      .from("machine_types")
      .select("slug")
      .eq("is_active", true);

    if (data && Array.isArray(data) && data.length > 0) {
      slugs = (data as { slug: string }[]).map((t) => t.slug);
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
