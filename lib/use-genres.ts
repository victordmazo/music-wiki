'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from './api-client';
import type { Genre } from './types';

/** Fetches the public genre list once. Used by the entry browser and the entry forms. */
export function useGenres() {
  const [genres, setGenres] = useState<Genre[]>([]);

  useEffect(() => {
    apiFetch<{ genres: Genre[] }>('/api/genres').then((result) => {
      if (result.ok) setGenres(result.data.genres);
    });
  }, []);

  return genres;
}
