import Link from "next/link";
import { AuthorCard, StoryCard } from "@/components/cards";
import { CatalogLayout, SiteHeader } from "@/components/layout";
import { fetchAuthors, fetchGenres, fetchStories } from "@/lib/api";

export default async function HomePage() {
  const [interactive, linear, authors, genres] = await Promise.all([
    fetchStories({ story_type: "interactive", sort: "popular", page_size: 6 }),
    fetchStories({ story_type: "linear", sort: "popular", page_size: 6 }),
    fetchAuthors({ sort: "rating", page_size: 4 }),
    fetchGenres(),
  ]);

  return (
    <>
      <SiteHeader />
      <CatalogLayout activePath="/">
        <section className="hero">
          <div className="hero-content">
            <h1>Истории, где выбор — это сюжет</h1>
            <p>
              Интерактивные новеллы и линейные работы от авторов платформы.
              Читайте, влияйте на сюжет и поддерживайте творцов.
            </p>
            <div className="hero-actions">
              <Link href="/stories/interactive" className="btn btn-primary">
                Интерактивные
              </Link>
              <Link href="/stories/linear" className="btn btn-outline">
                Линейные истории
              </Link>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <h2>Топ интерактивных</h2>
            <Link href="/stories/interactive" className="section-link">
              Все интерактивные →
            </Link>
          </div>
          {interactive.items.length > 0 ? (
            <div className="stories-row">
              {interactive.items.map((s, i) => (
                <StoryCard key={s.id} story={s} rank={i + 1} />
              ))}
            </div>
          ) : (
            <p className="results-count">Пока нет опубликованных работ. Запустите seed базы данных.</p>
          )}
        </section>

        <section className="section">
          <div className="section-header">
            <h2>Топ линейных</h2>
            <Link href="/stories/linear" className="section-link">
              Все линейные →
            </Link>
          </div>
          {linear.items.length > 0 ? (
            <div className="stories-row">
              {linear.items.map((s, i) => (
                <StoryCard key={s.id} story={s} rank={i + 1} />
              ))}
            </div>
          ) : (
            <p className="results-count">Пока нет опубликованных работ.</p>
          )}
        </section>

        <section className="section">
          <div className="section-header">
            <h2>Популярные авторы</h2>
            <Link href="/authors" className="section-link">
              Все авторы →
            </Link>
          </div>
          {authors.items.length > 0 ? (
            <div className="authors-grid">
              {authors.items.map((a) => (
                <AuthorCard key={a.id} author={a} />
              ))}
            </div>
          ) : (
            <p className="results-count">Авторы появятся после загрузки данных.</p>
          )}
        </section>

        <section className="section">
          <div className="section-header">
            <h2>Категории</h2>
            <Link href="/search" className="section-link">
              Расширенный поиск →
            </Link>
          </div>
          <div className="categories-row">
            {genres.slice(0, 8).map((g) => (
              <Link key={g.id} href={`/search?genre=${g.slug}`} className="category-card">
                <h3>{g.name}</h3>
                <p>Интерактивные и линейные</p>
              </Link>
            ))}
          </div>
        </section>
      </CatalogLayout>
    </>
  );
}
