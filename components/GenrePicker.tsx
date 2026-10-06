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
    return <p className="text-sm text-slate-500">Loading genres…</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {genres.map((genre) => {
        const active = selected.includes(genre.id);
        return (
          <button
            type="button"
            key={genre.id}
            onClick={() => toggle(genre.id)}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              active
                ? 'border-emerald-400 bg-emerald-400/10 text-emerald-200'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
            }`}
          >
            {genre.name}
          </button>
        );
      })}
    </div>
  );
}
