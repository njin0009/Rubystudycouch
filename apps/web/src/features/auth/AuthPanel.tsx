import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import './auth.css';

type AuthStatus = 'idle' | 'loading' | 'sent' | 'error';

async function ensureProfile(session: Session) {
  const user = session.user;

  await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email,
    display_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
    updated_at: new Date().toISOString(),
  });
}

export default function AuthPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<AuthStatus>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        void ensureProfile(data.session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        void ensureProfile(nextSession);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }

    setStatus('sent');
    setMessage('Check your email for the login link.');
  }

  async function signOut() {
    setStatus('loading');
    const { error } = await supabase.auth.signOut();
    setStatus(error ? 'error' : 'idle');
    setMessage(error?.message ?? '');
  }

  if (session?.user) {
    return (
      <aside className="auth-panel" aria-label="User account">
        <div className="auth-copy">
          <span className="auth-kicker">Signed in</span>
          <strong>{session.user.email}</strong>
        </div>
        <button className="auth-button secondary" type="button" onClick={signOut}>
          Sign out
        </button>
        {message && <p className="auth-message error">{message}</p>}
      </aside>
    );
  }

  return (
    <aside className="auth-panel" aria-label="User login">
      <form className="auth-form" onSubmit={sendMagicLink}>
        <label className="auth-copy" htmlFor="auth-email">
          <span className="auth-kicker">Cloud sync</span>
          <strong>Sign in to save progress</strong>
        </label>
        <div className="auth-row">
          <input
            id="auth-email"
            className="auth-input"
            type="email"
            value={email}
            placeholder="you@example.com"
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <button className="auth-button" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Sending' : 'Send link'}
          </button>
        </div>
        {message && <p className={`auth-message ${status === 'error' ? 'error' : ''}`}>{message}</p>}
      </form>
    </aside>
  );
}
