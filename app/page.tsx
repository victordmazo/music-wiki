import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <h1 className="wiki-title font-serif text-4xl">Welcome to NE Scene-pedia</h1>
      <p className="mt-4 text-wikitext">
        NE Scene-pedia is a free wiki documenting bands and artists from the New England local music
        scene, built by and for the people who go to the shows. Anyone can browse; registered users
        can propose new entries and edits, and start discussions.
      </p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section>
          <h2 className="wiki-title font-serif text-xl">Getting started</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>
              <Link href="/entries">Browse bands &amp; artists</Link>
            </li>
            <li>
              <Link href="/discussions">Join a discussion</Link>
            </li>
            <li>
              <Link href="/register">Create an account</Link>
            </li>
            <li>
              <Link href="/entries/new">Add a new entry</Link>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="wiki-title font-serif text-xl">About this project</h2>
          <p className="mt-2 text-sm text-wikisubtle">
            Every new entry and edit goes through moderator review before it's published, and every
            approved change is recorded on that entry's history.
          </p>
        </section>
      </div>
    </div>
  );
}
