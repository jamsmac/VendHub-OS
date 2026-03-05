import { MetadataRoute } from "next";

const BASE_URL = "https://vendhub.uz";

const FALLBACK_SLUGS = ["js-001-a01", "jq-002-a", "tcn-csc-8c-v49"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let slugs = FALLBACK_SLUGS;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data } = await supabase
        .from("machine_types")
        .select("slug")
        .eq("is_active", true);

      if (data?.length) {
        slugs = data.map((t) => t.slug);
      }
    }
  } catch {
    // Use fallback slugs if Supabase is unavailable
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
