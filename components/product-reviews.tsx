import Link from "next/link";

import { StarRating } from "@/components/star-rating";
import type { ReviewSummary } from "@/lib/reviews";

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

type Props = {
  productSlug: string;
  summary: ReviewSummary;
};

export function ProductReviews({ productSlug, summary }: Props) {
  const { items, total, page, pageSize, avg, distribution } = summary;
  const maxBucket = Math.max(
    distribution[1],
    distribution[2],
    distribution[3],
    distribution[4],
    distribution[5],
    1,
  );
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section id="reviews" className="container scroll-mt-24 py-12 md:py-16">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Testimonials
          </span>
          <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
            What buyers say
          </h2>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-3">
            <StarRating value={avg} size="lg" />
            <div className="text-sm">
              <div className="font-semibold">{avg.toFixed(1)} of 5</div>
              <div className="text-xs text-muted-foreground">
                {total} review{total === 1 ? "" : "s"}
              </div>
            </div>
          </div>
        )}
      </header>

      {total === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <p className="text-base font-medium">No reviews yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Be the first to share your experience after your order is delivered.
          </p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-2 text-sm">
            {([5, 4, 3, 2, 1] as const).map((n) => {
              const count = distribution[n];
              const width = (count / maxBucket) * 100;
              return (
                <div key={n} className="flex items-center gap-3">
                  <span className="w-6 text-xs font-medium">{n}★</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${width}%` }}
                      aria-hidden
                    />
                  </div>
                  <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </div>
              );
            })}
          </aside>

          <div className="space-y-4">
            {items.map((r) => (
              <article key={r.id} className="rounded-2xl border bg-card p-5">
                <header className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <StarRating value={r.rating} size="sm" />
                    <span className="text-sm font-semibold">{r.businessName}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                </header>
                {r.body && (
                  <p className="mt-3 whitespace-pre-line text-sm text-foreground/90">{r.body}</p>
                )}
              </article>
            ))}

            {totalPages > 1 && (
              <nav className="flex items-center justify-between pt-2 text-sm">
                {page > 1 ? (
                  <Link
                    href={`/products/${productSlug}?reviewPage=${page - 1}#reviews`}
                    className="font-medium text-primary hover:underline"
                  >
                    ← Newer
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages ? (
                  <Link
                    href={`/products/${productSlug}?reviewPage=${page + 1}#reviews`}
                    className="font-medium text-primary hover:underline"
                  >
                    Older →
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
