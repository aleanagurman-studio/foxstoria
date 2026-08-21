import Link from "next/link";
import { AuthorCard } from "@/components/cards";
import { CatalogLayout, EmptyState, SiteHeader } from "@/components/layout";
import { fetchAuthors } from "@/lib/api";

interface AuthorsPageProps {
  searchParams: Promise<{ q?: string; sort?: string }>;
}

const SORT_OPTIONS = [
  { value: "rating", label: "По рейтингу" },
  { value: "stories", label: "По кол-ву работ" },
  { value: "followers", label: "По подписчикам" },
  { value: "name", label: "По имени" },
];

export default async function AuthorsPage({ searchParams }: AuthorsPageProps) {
  const params = await searchParams;
  const sort = params.sort ?? "rating";

  const authors = await fetchAuthors({
    q: params.q,
    sort,
    page_size: 48,
  });

  return (
    <>
      <SiteHeader activeNav="authors" />
      <CatalogLayout activePath="/authors">
        <header className="page-header">
          <h1>Авторы</h1>
          <p>Все авторы платформы — интерактивные новеллы и линейные истории</p>
        </header>

        <form action="/authors" method="get" style={{ marginBottom: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Поиск автора…"
            style={{
              flex: 1, minWidth: 200, padding: "10px 14px",
              border: "1px solid var(--border-default)", borderRadius: "var(--radius-pill)",
              background: "var(--bg-subtle)", fontSize: "0.875rem",
            }}
          />
          <input type="hidden" name="sort" value={sort} />
          <button type="submit" className="btn btn-primary">Найти</button>
        </form>

        <div className="sort-bar">
          <label>Сортировка:</label>
          {SORT_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={`/authors?sort=${opt.value}${params.q ? `&q=${encodeURIComponent(params.q)}` : ""}`}
              className={`sort-btn ${sort === opt.value ? "active" : ""}`}
            >
              {opt.label}
            </Link>
          ))}
        </div>

        <p className="results-count">Всего авторов: {authors.total}</p>

        {authors.items.length > 0 ? (
          <div className="authors-grid">
            {authors.items.map((a) => (
              <AuthorCard key={a.id} author={a} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Авторов пока нет"
            description="Загрузите тестовые данные через seed-скрипт бэкенда."
            actionLabel="На главную"
            actionHref="/"
          />
        )}
      </CatalogLayout>
    </>
  );
}
