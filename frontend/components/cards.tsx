import Link from "next/link";
import { Story } from "@/lib/api";

const PLACEHOLDERS = ["placeholder-1", "placeholder-2", "placeholder-3", "placeholder-4", "placeholder-5"];

export function StoryCard({ story, rank }: { story: Story; rank?: number }) {
  const ph = PLACEHOLDERS[story.id % PLACEHOLDERS.length];
  const genreLabel = story.genres.map((g) => g.name).join(" · ");
  const typeLabel = story.story_type === "interactive" ? "Интерактив" : "Линейная";

  return (
    <Link href={`/stories/${story.slug}`} className="story-card">
      <div className={`story-cover ${ph}`}>
        <span className="story-type-badge">{typeLabel}</span>
        {rank !== undefined && (
          <span style={{
            position: "absolute", top: 8, left: 8,
            width: 28, height: 28, borderRadius: 8,
            background: "var(--accent-primary)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.75rem", fontWeight: 700,
          }}>
            {rank}
          </span>
        )}
      </div>
      <div className="story-title">{story.title}</div>
      <div className="story-meta">{genreLabel || "—"}</div>
      <div className="story-stats">
        <span className="rating">★ {story.rating_avg.toFixed(1)}</span>
        <span className="age-badge">{story.age_rating}</span>
      </div>
    </Link>
  );
}

export function AuthorCard({
  author,
}: {
  author: {
    id: number;
    username: string;
    display_name: string;
    rating_avg: number;
    story_count: number;
    follower_count: number;
  };
}) {
  return (
    <Link href={`/authors/${author.username}`} className="author-card">
      <div className="author-avatar" />
      <div className="author-name">{author.display_name}</div>
      <div className="author-stats">
        <span>★ {author.rating_avg.toFixed(1)}</span>
        <span>{author.story_count} работ</span>
        <span>{author.follower_count} подписчиков</span>
      </div>
    </Link>
  );
}
