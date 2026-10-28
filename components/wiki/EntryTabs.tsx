import Link from 'next/link';

/**
 * The Wikipedia-style page-action tab bar (Article / Discussion / Edit source /
 * View history). Negative margins pull it flush against WikiShell's content-card
 * padding so it spans the full card width like the real Vector skin's tab strip.
 */
export function EntryTabs({
  slug,
  entryId,
  active,
}: {
  slug: string;
  entryId: number;
  active: 'read' | 'edit';
}) {
  function tabClass(isActive: boolean) {
    return `border border-b-0 px-4 py-2 text-sm ${
      isActive
        ? 'border-wikiborder bg-white font-semibold text-wikitext'
        : 'border-transparent text-wikiblue hover:underline'
    }`;
  }

  return (
    <div className="-mx-6 -mt-6 mb-6 flex flex-wrap items-end gap-1 border-b border-wikiborder bg-wikigray px-6 pt-2">
      <Link href={`/entries/${slug}`} className={tabClass(active === 'read')}>
        Article
      </Link>
      <Link href={`/discussions?entry_id=${entryId}`} className={tabClass(false)}>
        Discussion
      </Link>
      <span className="flex-1" />
      <Link href={`/entries/${slug}/edit`} className={tabClass(active === 'edit')}>
        Edit source
      </Link>
      <Link href={`/entries/${slug}#history`} className={tabClass(false)}>
        View history
      </Link>
    </div>
  );
}
