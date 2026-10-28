'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCurrentProfile } from '../../lib/use-current-profile';

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useCurrentProfile();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    setLoading(false);
    if (response.ok) {
      const accessToken = data?.session?.session?.access_token;
      if (accessToken) {
        localStorage.setItem('access_token', accessToken);
        refresh();
      }
      router.push('/profile');
    } else {
      setMessage(data.error || 'Login failed.');
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="wiki-title font-serif text-3xl">Log in</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm text-wikitext">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="mt-1 w-full rounded border border-wikiborder px-3 py-2 text-sm text-wikitext outline-none focus:border-wikiblue-dark"
            placeholder="student@example.com"
          />
        </label>

        <label className="block text-sm text-wikitext">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="mt-1 w-full rounded border border-wikiborder px-3 py-2 text-sm text-wikitext outline-none focus:border-wikiblue-dark"
            placeholder="••••••••"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-wikiblue px-4 py-2 text-sm font-semibold text-white transition hover:bg-wikiblue-dark disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Signing in…' : 'Log in'}
        </button>
      </form>

      {message ? (
        <p className="mt-4 rounded border border-wikired bg-red-50 p-3 text-sm text-wikired">{message}</p>
      ) : null}

      <p className="mt-6 text-sm text-wikitext">
        Need an account? <Link href="/register">Create one here</Link>
      </p>
    </div>
  );
}
