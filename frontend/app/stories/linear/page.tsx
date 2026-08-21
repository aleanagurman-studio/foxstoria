import Link from "next/link";
import { StoryCard } from "@/components/cards";
import { CatalogLayout, EmptyState, SiteHeader } from "@/components/layout";
import { fetchStories, StorySort } from "@/lib/api";

interface LinearPageProps {
  searchParams: Promise<{ sort?: string }>;
}

const SORT_OPTIONS: { value: StorySort; label: string }[] = [
  { value: "popular", label: "Популярные" },
  { value: "rating", label: "По рейтингу" },
  { value: "new", label: "Новинки" },
  { value: "play_count", label: "По прочтениям" },
];

export default async function LinearStoriesPage({ searchParams }: LinearPageProps) {
  const params = await searchParams;
  const sort = (params.sort as StorySort) ?? "popular";

  const stories = await fetchStories({
    story_type: "linear",
    sort,
    page_size: 24,
  });

  return (
    <>
      <SiteHeader activeNav="linear" />
      <CatalogLayout activePath="/stories/linear">
        <header className="page-header">
          <h1>Линейные истории</h1>
          <p>Классическое чтение без ветвлений — главы и повествование</p>
        </header>

        <div className="type-tabs">
          <Link href="/stories/interactive" className="type-tab">
            Интерактивные
          </Link>
          <Link href="/stories/linear" className="type-tab active">
            Линейные
          </Link>
        </div>

        <div className="sort-bar">
          <label>Сортировка:</label>
          {SORT_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={`/stories/linear?sort=${opt.value}`}
              className={`sort-btn ${sort === opt.value ? "active" : ""}`}
            >
              {opt.label}
            </Link>
          ))}
        </div>

        <p className="results-count">Всего: {stories.total}</p>

        {stories.items.length > 0 ? (
          <div className="stories-grid">
            {stories.items.map((s) => (
              <StoryCard key={s.id} story={s} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Линейных работ пока нет"
            description="Загрузите тестовые данные через seed-скрипт."
            actionHref="/search?story_type=linear"
            actionLabel="Поиск линейных"
          />
        )}
      </CatalogLayout>
    </>
  );
}
