import Link from "next/link";
import { StoryCard } from "@/components/cards";
import { CatalogLayout, EmptyState, SiteHeader } from "@/components/layout";
import { fetchStories, fetchTaxonomy } from "@/lib/api";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    genre?: string;
    format?: string;
    warning?: string;
    kink?: string;
    story_type?: string;
    age_rating?: string;
    is_paid?: string;
    is_completed?: string;
    sort?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const taxonomy = await fetchTaxonomy();

  const stories = await fetchStories({
    q: params.q,
    genre: params.genre,
    format: params.format,
    warning: params.warning,
    kink: params.kink,
    story_type: params.story_type as "linear" | "interactive" | undefined,
    age_rating: params.age_rating,
    is_paid: params.is_paid === "true" ? true : params.is_paid === "false" ? false : undefined,
    is_completed: params.is_completed === "true" ? true : params.is_completed === "false" ? false : undefined,
    sort: (params.sort as "popular" | "rating" | "new") ?? "popular",
    page_size: 24,
  });

  return (
    <>
      <SiteHeader activeNav="search" />
      <CatalogLayout activePath="/search">
        <header className="page-header">
          <h1>Поиск работ</h1>
          <p>Фильтры по типу, жанрам, предупреждениям, формату и возрасту. Кинки — только у 18+.</p>
        </header>

        <form className="filter-panel" action="/search" method="get">
          <div className="filter-grid">
            <div className="filter-group">
              <label htmlFor="q">Название</label>
              <input id="q" name="q" type="search" defaultValue={params.q ?? ""} placeholder="Название истории…" />
            </div>
            <div className="filter-group">
              <label htmlFor="story_type">Тип</label>
              <select id="story_type" name="story_type" defaultValue={params.story_type ?? ""}>
                <option value="">Любой</option>
                <option value="interactive">Интерактивная</option>
                <option value="linear">Линейная</option>
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="genre">Жанр</label>
              <select id="genre" name="genre" defaultValue={params.genre ?? ""}>
                <option value="">Любой</option>
                {taxonomy.genres.map((g) => (
                  <option key={g.id} value={g.slug}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="format">Формат</label>
              <select id="format" name="format" defaultValue={params.format ?? ""}>
                <option value="">Любой</option>
                {taxonomy.formats.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="warning">Предупреждение</label>
              <select id="warning" name="warning" defaultValue={params.warning ?? ""}>
                <option value="">Любое</option>
                {taxonomy.warnings.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="kink">Кинк</label>
              <select id="kink" name="kink" defaultValue={params.kink ?? ""}>
                <option value="">Любой</option>
                {taxonomy.kinks.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="age_rating">Возраст</label>
              <select id="age_rating" name="age_rating" defaultValue={params.age_rating ?? ""}>
                <option value="">Любой</option>
                <option value="none">Без рейтинга</option>
                <option value="16+">16+</option>
                <option value="18+">18+</option>
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="is_paid">Доступ</label>
              <select id="is_paid" name="is_paid" defaultValue={params.is_paid ?? ""}>
                <option value="">Любой</option>
                <option value="false">Бесплатные</option>
                <option value="true">Платные</option>
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="is_completed">Статус</label>
              <select id="is_completed" name="is_completed" defaultValue={params.is_completed ?? ""}>
                <option value="">Любой</option>
                <option value="true">Завершена</option>
                <option value="false">В процессе</option>
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="sort">Сортировка</label>
              <select id="sort" name="sort" defaultValue={params.sort ?? "popular"}>
                <option value="popular">По популярности</option>
                <option value="rating">По рейтингу</option>
                <option value="new">По дате</option>
                <option value="play_count">По прохождениям</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button type="submit" className="btn btn-primary">Найти</button>
            <Link href="/search" className="btn btn-outline">Сбросить</Link>
          </div>
        </form>

        <p className="results-count">Найдено: {stories.total}</p>

        {stories.items.length > 0 ? (
          <div className="stories-grid">
            {stories.items.map((s) => (
              <StoryCard key={s.id} story={s} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Здесь пока пусто"
            description="Лисёнок сидит рядом с открытой книгой. Попробуйте изменить фильтры или загрузите тестовые данные."
            actionLabel="Смотреть интерактивные"
            actionHref="/stories/interactive"
          />
        )}
      </CatalogLayout>
    </>
  );
}
