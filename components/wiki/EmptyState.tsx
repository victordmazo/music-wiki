import Link from 'next/link';

/** The "log in to…" / "that doesn't exist" guard card shared by every protected or not-found page. */
export function EmptyState({
  message,
  linkHref,
  linkLabel,
}: {
  message: string;
  linkHref: string;
  linkLabel: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-wikitext">{message}</p>
      <Link
        href={linkHref}
        className="inline-block rounded border border-wikiborder px-4 py-2 text-sm hover:bg-wikigray"
      >
        {linkLabel}
      </Link>
    </div>
  );
}
