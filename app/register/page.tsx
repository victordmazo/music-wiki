'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    setLoading(false);
    setMessage(response.ok ? 'Registration successful — you can log in now.' : data.error || 'Registration failed.');
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="wiki-title font-serif text-3xl">Create your account</h1>

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
          {loading ? 'Creating account…' : 'Register'}
        </button>
      </form>

      {message ? (
        <p className="mt-4 rounded border border-wikiborder bg-wikigray p-3 text-sm text-wikitext">{message}</p>
      ) : null}

      <p className="mt-6 text-sm text-wikitext">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
