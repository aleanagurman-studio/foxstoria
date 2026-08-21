import Link from "next/link";
import { ReactNode } from "react";

export function FoxLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <circle cx="18" cy="18" r="18" fill="#F8E9E4" />
      <path d="M10 22c0-5 3.5-9 8-9s8 4 8 9" fill="#C85A3D" />
      <path d="M8 14l3 2 2-4 2 4 3-2-1 5H9l-1-5z" fill="#C85A3D" />
      <circle cx="14" cy="19" r="1.5" fill="#292624" />
      <circle cx="22" cy="19" r="1.5" fill="#292624" />
    </svg>
  );
}

export function SiteHeader({ activeNav }: { activeNav?: string }) {
  return (
    <header className="header">
      <Link href="/" className="logo">
        <FoxLogo />
        <span className="logo-text">
          Fox<span>Storia</span>
        </span>
      </Link>

      <nav className="nav-main">
        <Link href="/stories/interactive" className={activeNav === "interactive" ? "active" : ""}>
          Интерактивные
        </Link>
        <Link href="/stories/linear" className={activeNav === "linear" ? "active" : ""}>
          Линейные
        </Link>
        <Link href="/authors" className={activeNav === "authors" ? "active" : ""}>
          Авторы
        </Link>
        <Link href="/search" className={activeNav === "search" ? "active" : ""}>
          Поиск
        </Link>
      </nav>

      <form className="search-bar" action="/search" method="get">
        <input type="search" name="q" placeholder="Найти историю, автора или жанр…" />
      </form>

      <div className="header-actions">
        <Link href="#" className="btn btn-ghost">
          Войти
        </Link>
        <Link href="#" className="btn btn-primary">
          Регистрация
        </Link>
      </div>
    </header>
  );
}

export function CatalogSidebar({ activePath }: { activePath?: string }) {
  const genres = [
    "Фэнтези", "Романтика", "Драма", "Мистика",
    "Приключения", "Sci-Fi", "Хоррор", "Повседневность",
  ];

  return (
    <aside className="sidebar-left">
      <nav className="sidebar-nav">
        <Link href="/" className={activePath === "/" ? "active" : ""}>Главная</Link>
        <Link href="/stories/interactive" className={activePath === "/stories/interactive" ? "active" : ""}>
          Интерактивные
        </Link>
        <Link href="/stories/linear" className={activePath === "/stories/linear" ? "active" : ""}>
          Линейные
        </Link>
        <Link href="/authors" className={activePath === "/authors" ? "active" : ""}>Авторы</Link>
        <Link href="/search" className={activePath === "/search" ? "active" : ""}>Поиск</Link>
      </nav>

      <div style={{ marginTop: 28 }}>
        <div className="sidebar-section-title">Жанры</div>
        <div className="genres-list">
          {genres.map((g) => (
            <Link key={g} href={`/search?genre=${encodeURIComponent(g.toLowerCase())}`}>
              {g}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="sidebar-section-title">Тип работы</div>
        <div className="genres-list">
          <Link href="/stories/interactive">Интерактивные новеллы</Link>
          <Link href="/stories/linear">Линейные истории</Link>
        </div>
      </div>
    </aside>
  );
}

export function CatalogLayout({
  children,
  activePath,
}: {
  children: ReactNode;
  activePath?: string;
}) {
  return (
    <div className="catalog-layout">
      <CatalogSidebar activePath={activePath} />
      <div className="main-content">{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn btn-primary">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
