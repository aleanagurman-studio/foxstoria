export type StoryType = "linear" | "interactive";

export type StorySort = "popular" | "rating" | "new" | "play_count";

export interface AuthorBrief {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  rating_avg: number;
  story_count: number;
}

export interface Label {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
}

export interface Genre extends Label {}

export interface Taxonomy {
  genres: Label[];
  formats: Label[];
  warnings: Label[];
  kinks: Label[];
}

export interface Story {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  story_type: StoryType;
  age_rating: string;
  is_paid: boolean;
  price: number | null;
  rating_avg: number;
  rating_count: number;
  play_count: number;
  scene_count: number | null;
  endings_count: number | null;
  chapter_count: number | null;
  is_completed: boolean;
  author: AuthorBrief;
  genres: Genre[];
  published_at: string | null;
}

export interface StoryListResponse {
  items: Story[];
  total: number;
  page: number;
  page_size: number;
}

export interface Author {
  id: number;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  rating_avg: number;
  story_count: number;
  follower_count: number;
}

export interface AuthorListResponse {
  items: Author[];
  total: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export function asSlugList(value?: string | string[]): string[] {
  if (!value) return [];
  const parts = Array.isArray(value) ? value : [value];
  return [...new Set(parts.flatMap((item) => item.split(",")).map((slug) => slug.trim()).filter(Boolean))];
}

export async function fetchStories(
  params: Record<string, string | number | boolean | string[] | undefined> = {}
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(","));
      continue;
    }
    search.set(key, String(value));
  }
  const res = await fetch(`${API_BASE}/api/stories?${search}`, { next: { revalidate: 30 } });
  if (!res.ok) return { items: [], total: 0, page: 1, page_size: 20 } satisfies StoryListResponse;
  return res.json() as Promise<StoryListResponse>;
}

export async function fetchAuthors(params: Record<string, string | number | undefined> = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const res = await fetch(`${API_BASE}/api/authors?${search}`, { next: { revalidate: 30 } });
  if (!res.ok) return { items: [], total: 0 } satisfies AuthorListResponse;
  return res.json() as Promise<AuthorListResponse>;
}

export async function fetchTaxonomy() {
  const res = await fetch(`${API_BASE}/api/taxonomy`, { next: { revalidate: 3600 } });
  if (!res.ok) {
    return { genres: [], formats: [], warnings: [], kinks: [] } satisfies Taxonomy;
  }
  return res.json() as Promise<Taxonomy>;
}

export async function fetchGenres() {
  const taxonomy = await fetchTaxonomy();
  return taxonomy.genres;
}
