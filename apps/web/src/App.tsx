import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import AnimatedCharactersLoginPage from '@/components/ui/animated-characters-login-page';
import { PillBase } from '@/components/ui/3d-adaptive-navigation-bar';
import { supabase } from '@/lib/supabase';
import LegacyStudyCoach from './legacy/LegacyStudyCoach';

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

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [navPosition, setNavPosition] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('studycouch_nav_position') ?? '{"x":0,"y":0}') as { x: number; y: number };
    } catch {
      return { x: 0, y: 0 };
    }
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoadingSession(false);
      if (data.session) {
        void ensureProfile(data.session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (nextSession) {
        setSession((prev) => {
          // If the same user is still logged in (token refresh, INITIAL_SESSION, etc.)
          // return the *previous* object so React sees no state change and skips
          // re-rendering the entire tree — most importantly LegacyStudyCoach.
          if (prev?.user.id === nextSession.user.id) return prev;
          return nextSession;
        });
        void ensureProfile(nextSession);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading StudyCouch...
      </div>
    );
  }

  if (!session) {
    return <AnimatedCharactersLoginPage />;
  }

  const displayName =
    session.user.user_metadata?.full_name ?? session.user.email?.split('@')[0] ?? 'there';

  return (
    <>
      <motion.div
        className="fixed top-5 z-[120] hidden cursor-grab md:block"
        style={{ left: 'calc(50% - 75px)' }}
        drag
        dragMomentum={false}
        initial={false}
        animate={navPosition}
        onDragEnd={(_, info) => {
          const nextPosition = {
            x: navPosition.x + info.offset.x,
            y: navPosition.y + info.offset.y,
          };
          setNavPosition(nextPosition);
          localStorage.setItem('studycouch_nav_position', JSON.stringify(nextPosition));
        }}
        whileDrag={{ cursor: 'grabbing', scale: 1.02 }}
      >
        <PillBase />
      </motion.div>
      <div className="fixed right-4 top-4 z-[130] text-sm">
        <button
          type="button"
          className="rounded-full border border-border bg-background/95 px-4 py-2 font-semibold shadow-sm backdrop-blur transition-colors hover:bg-muted"
          onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
          aria-expanded={isAccountMenuOpen}
          aria-haspopup="menu"
        >
          Hello, {displayName}
        </button>

        {isAccountMenuOpen && (
          <div
            className="absolute right-0 mt-2 w-48 overflow-hidden rounded-lg border border-border bg-background shadow-lg"
            role="menu"
          >
            <button
              type="button"
              className="block w-full px-4 py-3 text-left transition-colors hover:bg-muted"
              onClick={() => {
                setIsAccountMenuOpen(false);
                window.resetAllData?.();
              }}
              role="menuitem"
            >
              Clean data
            </button>
            <button
              type="button"
              className="block w-full px-4 py-3 text-left text-red-600 transition-colors hover:bg-red-50"
              onClick={() => void supabase.auth.signOut()}
              role="menuitem"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
      <LegacyStudyCoach />
    </>
  );
}
