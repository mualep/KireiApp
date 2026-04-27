import "server-only";

import { createClient } from "@/lib/supabase/server";

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

type LandingContentRow = {
  section: string;
  content_key: string;
  content_value: JsonValue;
};

type ServiceRow = {
  id: string;
  game_name: string;
  service_type: string;
  description: string | null;
  icon_url: string | null;
  image_url: string | null;
  sort_order: number;
};

type TestimonialRow = {
  id: string;
  buyer_name: string;
  game: string;
  rating: number;
  comment: string;
  avatar_url: string | null;
  sort_order: number;
};

type FaqRow = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
};

export type LandingStat = {
  label: string;
  value: number;
  suffix: string;
};

export type LandingCard = {
  title: string;
  description: string;
};

export type LandingStep = {
  title: string;
  description: string;
};

export type LandingSectionCopy = {
  eyebrow?: string;
  title: string;
  description: string;
};

export type LandingService = {
  id: string;
  gameName: string;
  serviceType: string;
  description: string;
  iconUrl: string | null;
  imageUrl: string | null;
  sortOrder: number;
};

export type LandingTestimonial = {
  id: string;
  buyerName: string;
  game: string;
  rating: number;
  comment: string;
  avatarUrl: string | null;
  sortOrder: number;
};

export type LandingFaq = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
};

export type LandingData = {
  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    primaryCtaLabel: string;
    primaryCtaHref: string;
    secondaryCtaLabel: string;
    secondaryCtaHref: string;
  };
  sections: {
    services: LandingSectionCopy;
    why: LandingSectionCopy;
    testimonials: LandingSectionCopy;
    howItWorks: LandingSectionCopy;
  };
  stats: LandingStat[];
  why: LandingCard[];
  howItWorks: LandingStep[];
  footer: {
    brandSummary: string;
    g2gUrl: string;
    socialLinks: Array<{ label: string; href: string }>;
    copyright: string;
  };
  services: LandingService[];
  testimonials: LandingTestimonial[];
  faqs: LandingFaq[];
};

const fallbackLandingData: LandingData = {
  hero: {
    eyebrow: "Kireiku Game Boosting",
    headline: "Level Up Your Game,\nWe Handle The Rest",
    subheadline:
      "Fast, safe, and reliable boosting services for Mobile Legends, Valorant, Genshin Impact, and more. Dominate the leaderboards with professional players at your side.",
    primaryCtaLabel: "Order Now",
    primaryCtaHref: "https://www.g2g.com/KireiBoost",
    secondaryCtaLabel: "Explore Services",
    secondaryCtaHref: "#services",
  },
  sections: {
    services: {
      title: "Our Services",
      description:
        "Everything you need to reach the top. Tailored progression for your favorite titles by verified professionals.",
    },
    why: {
      title: "Why Kireiku",
      description:
        "A safer boost lobby built around clear communication, focused execution, and consistent support.",
    },
    testimonials: {
      title: "Customer Reviews",
      description:
        "Do not just take our word for it. Hear from buyers who reached their goals with us.",
    },
    howItWorks: {
      eyebrow: "How It Works",
      title: "A simple path from request to completed progress.",
      description:
        "The order flow stays lightweight, predictable, and easy to follow.",
    },
  },
  stats: [
    { label: "Order selesai", value: 1200, suffix: "+" },
    { label: "Buyer terbantu", value: 850, suffix: "+" },
    { label: "Game populer", value: 8, suffix: "+" },
    { label: "Tahun pengalaman", value: 3, suffix: "+" },
  ],
  why: [
    {
      title: "Proses jelas",
      description:
        "Setiap order diarahkan dengan informasi layanan, estimasi, dan komunikasi yang tertata.",
    },
    {
      title: "Tim terkurasi",
      description:
        "Pekerjaan ditangani oleh booster yang mengikuti standar operasional Kireiku.",
    },
    {
      title: "Fokus keamanan",
      description:
        "Instruksi akun dan progres ditangani secara hati-hati sesuai kebutuhan tiap game.",
    },
    {
      title: "Support responsif",
      description:
        "Tim Kireiku menjaga komunikasi tetap rapi agar buyer tahu progres dan langkah berikutnya.",
    },
  ],
  howItWorks: [
    {
      title: "Pilih layanan",
      description:
        "Buyer memilih game, jenis boosting, dan target progres yang diinginkan.",
    },
    {
      title: "Konfirmasi detail",
      description:
        "Tim Kireiku mengonfirmasi scope, estimasi, dan kebutuhan order sebelum mulai.",
    },
    {
      title: "Pantau progres",
      description:
        "Order dikerjakan bertahap dengan update yang rapi sampai target selesai.",
    },
  ],
  footer: {
    brandSummary:
      "Kireiku adalah layanan game boosting yang mengutamakan proses rapi, komunikasi jelas, dan pengalaman buyer yang nyaman.",
    g2gUrl: "https://www.g2g.com/KireiBoost",
    socialLinks: [
      { label: "Instagram", href: "https://instagram.com/kireiku" },
      { label: "TikTok", href: "https://tiktok.com/@kireiku" },
    ],
    copyright: "© 2026 Kireiku. All rights reserved.",
  },
  services: [
    {
      id: "fallback-mobile-legends",
      gameName: "Mobile Legends",
      serviceType: "Rank Boost",
      description:
        "Bantuan push rank bertahap dengan booster berpengalaman dan proses yang tertata.",
      iconUrl: null,
      imageUrl: null,
      sortOrder: 10,
    },
    {
      id: "fallback-valorant",
      gameName: "Valorant",
      serviceType: "Rank Boost",
      description:
        "Layanan peningkatan rank dengan koordinasi detail target dan estimasi pengerjaan.",
      iconUrl: null,
      imageUrl: null,
      sortOrder: 20,
    },
    {
      id: "fallback-genshin-impact",
      gameName: "Genshin Impact",
      serviceType: "Quest Completion",
      description:
        "Bantuan penyelesaian quest, eksplorasi, dan progres akun sesuai kebutuhan buyer.",
      iconUrl: null,
      imageUrl: null,
      sortOrder: 30,
    },
  ],
  testimonials: [],
  faqs: [
    {
      id: "fallback-faq-1",
      question: "Layanan apa saja yang tersedia di Kireiku?",
      answer:
        "Kireiku menyediakan layanan seperti rank boost, quest completion, account leveling, dan request custom sesuai game yang didukung.",
      sortOrder: 10,
    },
    {
      id: "fallback-faq-2",
      question: "Bagaimana proses order dimulai?",
      answer:
        "Buyer memilih layanan, mengirim detail kebutuhan, lalu tim Kireiku mengonfirmasi scope dan estimasi sebelum pekerjaan dimulai.",
      sortOrder: 20,
    },
  ],
};

function hasSupabasePublicEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

function isRecord(value: JsonValue | undefined): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringValue(value: JsonValue | undefined, fallback: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function statValue(value: JsonValue | undefined, fallback: LandingStat) {
  if (!isRecord(value)) {
    return fallback;
  }

  return {
    label: stringValue(value.label, fallback.label),
    value: typeof value.value === "number" ? value.value : fallback.value,
    suffix: stringValue(value.suffix, fallback.suffix),
  };
}

function cardListValue(value: JsonValue | undefined, fallback: LandingCard[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const cards = value
    .filter(isRecord)
    .map((item) => ({
      title: stringValue(item.title, ""),
      description: stringValue(item.description, ""),
    }))
    .filter((item) => item.title && item.description);

  return cards.length > 0 ? cards : fallback;
}

function stepListValue(value: JsonValue | undefined, fallback: LandingStep[]) {
  return cardListValue(value, fallback);
}

function filledCardListValue(
  value: JsonValue | undefined,
  fallback: LandingCard[],
) {
  const cards = cardListValue(value, fallback);

  if (cards.length >= fallback.length) {
    return cards;
  }

  return [...cards, ...fallback.slice(cards.length)];
}

function socialLinksValue(
  value: JsonValue | undefined,
  fallback: Array<{ label: string; href: string }>,
) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const links = value
    .filter(isRecord)
    .map((item) => ({
      label: stringValue(item.label, ""),
      href: stringValue(item.href, ""),
    }))
    .filter((item) => item.label && item.href);

  return links.length > 0 ? links : fallback;
}

function contentMap(rows: LandingContentRow[]) {
  return rows.reduce<Record<string, Record<string, JsonValue>>>((acc, row) => {
    acc[row.section] ??= {};
    acc[row.section][row.content_key] = row.content_value;
    return acc;
  }, {});
}

function landingDataFromContent(rows: LandingContentRow[]): LandingData {
  const content = contentMap(rows);
  const fallback = fallbackLandingData;
  const g2gUrl = stringValue(content.footer?.g2g_url, fallback.footer.g2gUrl);

  return {
    ...fallback,
    hero: {
      eyebrow: stringValue(content.hero?.eyebrow, fallback.hero.eyebrow),
      headline: stringValue(content.hero?.headline, fallback.hero.headline),
      subheadline: stringValue(
        content.hero?.subheadline,
        fallback.hero.subheadline,
      ),
      primaryCtaLabel: stringValue(
        content.hero?.primary_cta_label,
        fallback.hero.primaryCtaLabel,
      ),
      primaryCtaHref: g2gUrl,
      secondaryCtaLabel: stringValue(
        content.hero?.secondary_cta_label,
        fallback.hero.secondaryCtaLabel,
      ),
      secondaryCtaHref: stringValue(
        content.hero?.secondary_cta_href,
        fallback.hero.secondaryCtaHref,
      ),
    },
    sections: {
      services: {
        title: stringValue(
          content.hero?.services_heading,
          fallback.sections.services.title,
        ),
        description: stringValue(
          content.hero?.services_subheadline,
          fallback.sections.services.description,
        ),
      },
      why: {
        title: stringValue(content.why?.heading, fallback.sections.why.title),
        description: stringValue(
          content.why?.subheadline,
          fallback.sections.why.description,
        ),
      },
      testimonials: {
        title: stringValue(
          content.hero?.testimonials_heading,
          fallback.sections.testimonials.title,
        ),
        description: stringValue(
          content.hero?.testimonials_subheadline,
          fallback.sections.testimonials.description,
        ),
      },
      howItWorks: {
        eyebrow: stringValue(
          content.how_it_works?.eyebrow,
          fallback.sections.howItWorks.eyebrow ?? "",
        ),
        title: stringValue(
          content.how_it_works?.heading,
          fallback.sections.howItWorks.title,
        ),
        description: stringValue(
          content.how_it_works?.subheadline,
          fallback.sections.howItWorks.description,
        ),
      },
    },
    stats: [
      statValue(content.stats?.orders_completed, fallback.stats[0]),
      statValue(content.stats?.happy_buyers, fallback.stats[1]),
      statValue(content.stats?.supported_games, fallback.stats[2]),
      statValue(content.stats?.service_years, fallback.stats[3]),
    ],
    why: filledCardListValue(content.why?.cards, fallback.why),
    howItWorks: stepListValue(content.how_it_works?.steps, fallback.howItWorks),
    footer: {
      brandSummary: stringValue(
        content.footer?.brand_summary,
        fallback.footer.brandSummary,
      ),
      g2gUrl,
      socialLinks: socialLinksValue(
        content.footer?.social_links,
        fallback.footer.socialLinks,
      ),
      copyright: stringValue(content.footer?.copyright, fallback.footer.copyright),
    },
  };
}

function mapServices(rows: ServiceRow[]): LandingService[] {
  return rows.map((row) => ({
    id: row.id,
    gameName: row.game_name,
    serviceType: row.service_type,
    description: row.description ?? "Layanan Kireiku siap membantu progres game kamu.",
    iconUrl: row.icon_url,
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
  }));
}

function mapTestimonials(rows: TestimonialRow[]): LandingTestimonial[] {
  return rows.map((row) => ({
    id: row.id,
    buyerName: row.buyer_name,
    game: row.game,
    rating: row.rating,
    comment: row.comment,
    avatarUrl: row.avatar_url,
    sortOrder: row.sort_order,
  }));
}

function mapFaqs(rows: FaqRow[]): LandingFaq[] {
  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    sortOrder: row.sort_order,
  }));
}

export async function getLandingData(): Promise<LandingData> {
  if (!hasSupabasePublicEnv()) {
    return fallbackLandingData;
  }

  try {
    const supabase = await createClient();

    const [contentResult, servicesResult, testimonialsResult, faqsResult] =
      await Promise.all([
        supabase
          .from("landing_content")
          .select("section, content_key, content_value"),
        supabase
          .from("services")
          .select("id, game_name, service_type, description, icon_url, image_url, sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("testimonials")
          .select("id, buyer_name, game, rating, comment, avatar_url, sort_order")
          .eq("is_visible", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("faq_items")
          .select("id, question, answer, sort_order")
          .order("sort_order", { ascending: true }),
      ]);

    const base =
      contentResult.error || !contentResult.data
        ? fallbackLandingData
        : landingDataFromContent(contentResult.data as LandingContentRow[]);

    return {
      ...base,
      services:
        servicesResult.error || !servicesResult.data
          ? fallbackLandingData.services
          : mapServices(servicesResult.data as ServiceRow[]),
      testimonials:
        testimonialsResult.error || !testimonialsResult.data
          ? fallbackLandingData.testimonials
          : mapTestimonials(testimonialsResult.data as TestimonialRow[]),
      faqs:
        faqsResult.error || !faqsResult.data
          ? fallbackLandingData.faqs
          : mapFaqs(faqsResult.data as FaqRow[]),
    };
  } catch {
    return fallbackLandingData;
  }
}
