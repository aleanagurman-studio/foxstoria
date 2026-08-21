import Link from "next/link";
import { StoryCard } from "@/components/cards";
import { CatalogLayout, EmptyState, SiteHeader } from "@/components/layout";
import { fetchStories, StorySort } from "@/lib/api";

interface InteractivePageProps {
  searchParams: Promise<{ sort?: string }>;
}

const SORT_OPTIONS: { value: StorySort; label: string }[] = [
  { value: "popular", label: "Популярные" },
  { value: "rating", label: "По рейтингу" },
  { value: "new", label: "Новинки" },
  { value: "play_count", label: "По прохождениям" },
];

export default async function InteractiveStoriesPage({ searchParams }: InteractivePageProps) {
  const params = await searchParams;
  const sort = (params.sort as StorySort) ?? "popular";

  const stories = await fetchStories({
    story_type: "interactive",
    sort,
    page_size: 24,
  });

  return (
    <>
      <SiteHeader activeNav="interactive" />
      <CatalogLayout activePath="/stories/interactive">
        <header className="page-header">
          <h1>Интерактивные работы</h1>
          <p>Новеллы с ветвлением, выбором и несколькими концовками</p>
        </header>

        <div className="type-tabs">
          <Link href="/stories/interactive" className="type-tab active">
            Интерактивные
          </Link>
          <Link href="/stories/linear" className="type-tab">
            Линейные
          </Link>
        </div>

        <div className="sort-bar">
          <label>Сортировка:</label>
          {SORT_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={`/stories/interactive?sort=${opt.value}`}
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
            title="Интерактивных работ пока нет"
            description="Запустите PostgreSQL и выполните seed для тестовых данных."
            actionLabel="Поиск с фильтрами"
            actionHref="/search?story_type=interactive"
          />
        )}
      </CatalogLayout>
    </>
  );
}
