import type { Genre } from '../lib/types';

/** Multi-select pill picker used by the new-entry and edit-entry forms. */
export function GenrePicker({
  genres,
  selected,
  onChange,
}: {
  genres: Genre[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter((g) => g !== id) : [...selected, id]);
  }

  if (genres.length === 0) {
    return <p className="text-sm text-wikisubtle">Loading genres…</p>;
  }

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {genres.map((genre) => {
        const active = selected.includes(genre.id);
        return (
          <label key={genre.id} className="flex items-center gap-1.5">
            <input type="checkbox" checked={active} onChange={() => toggle(genre.id)} className="accent-wikiblue" />
            {genre.name}
          </label>
        );
      })}
    </div>
  );
}
