import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import AnimatedCharactersLoginPage from '@/components/ui/animated-characters-login-page';
import { PillBase } from '@/components/ui/3d-adaptive-navigation-bar';
import StudyCouchCoverPage from '@/features/cover/StudyCouchCoverPage';
import StudyPlanPage, {
  readStudyPlan,
  readStudySnapshot,
  saveStudyPlan,
  StudyPlanMiniCard,
  type StudyPlan,
} from '@/features/study-plan/StudyPlanPage';
import ToBeContined from '@/features/todo/ToBeContined';
import { supabase } from '@/lib/supabase';
import { PALETTES, applyPalette, getSavedPalette, savePalette, type PaletteId } from '@/lib/theme';
import LegacyStudyCoach from './legacy/LegacyStudyCoach';
import '@/styles/app.css';

function getAvatarUrl(userId: string): string | null {
  try {
    const raw = localStorage.getItem(`studycouch_local_profile:${userId}`);
    if (!raw) return null;
    const p = JSON.parse(raw) as { avatarDataUrl?: string };
    return p.avatarDataUrl ?? null;
  } catch { return null; }
}

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
  const [authView, setAuthView] = useState<'cover' | 'login' | 'register'>('cover');
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [viewingCover, setViewingCover] = useState(false);
  const [activeToBeContined, setActiveToBeContined] = useState<string | null>(null);
  const [paletteId, setPaletteId] = useState<PaletteId>(() => getSavedPalette());
  const [studySnapshot, setStudySnapshot] = useState(() => readStudySnapshot());
  const [navPosition, setNavPosition] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('studycouch_nav_position') ?? '{"x":0,"y":0}') as { x: number; y: number };
    } catch {
      return { x: 0, y: 0 };
    }
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoadingSession(false);
      if (data.session) {
        void ensureProfile(data.session);
        const existingPlan = readStudyPlan(data.session.user.id);
        setStudyPlan(existingPlan);
        setIsPlanOpen(!existingPlan);
        setStudySnapshot(readStudySnapshot());
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
          const existingPlan = readStudyPlan(nextSession.user.id);
          setStudyPlan(existingPlan);
          setIsPlanOpen(!existingPlan);
          setStudySnapshot(readStudySnapshot());
          return nextSession;
        });
        void ensureProfile(nextSession);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setAuthView('cover');
        setStudyPlan(null);
        setIsPlanOpen(false);
        setViewingCover(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return undefined;
    const refreshSnapshot = () => setStudySnapshot(readStudySnapshot());
    window.addEventListener('focus', refreshSnapshot);
    const timer = window.setInterval(refreshSnapshot, 5000);
    return () => {
      window.removeEventListener('focus', refreshSnapshot);
      window.clearInterval(timer);
    };
  }, [session]);

  useEffect(() => {
    setAvatarUrl(session ? getAvatarUrl(session.user.id) : null);
  }, [session?.user.id]);

  // Apply palette on mount and whenever it changes
  useEffect(() => {
    applyPalette(PALETTES[paletteId]);
  }, [paletteId]);

  // Listen for TBC events from unauthenticated cover page (feature clicks)
  useEffect(() => {
    const handler = (e: Event) => {
      const featureId = (e as CustomEvent<string>).detail;
      setActiveToBeContined(featureId);
    };
    window.addEventListener('studycouch:tbc', handler);
    return () => window.removeEventListener('studycouch:tbc', handler);
  }, []);

  if (isLoadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading StudyCouch...
      </div>
    );
  }

  function setPaletteAndSave(id: PaletteId) {
    setPaletteId(id);
    savePalette(id);
    applyPalette(PALETTES[id]);
  }

  if (!session) {
    if (authView === 'cover') {
      return (
        <>
          <StudyCouchCoverPage
            onLogin={() => setAuthView('login')}
            onRegister={() => setAuthView('register')}
            palette={paletteId}
            setPalette={setPaletteAndSave}
          />
          {activeToBeContined && (
            <ToBeContined
              featureId={activeToBeContined}
              palette={PALETTES[paletteId]}
              onBack={() => setActiveToBeContined(null)}
            />
          )}
        </>
      );
    }

    return (
      <AnimatedCharactersLoginPage
        key={authView}
        initialMode={authView}
        onBackToCover={() => setAuthView('cover')}
      />
    );
  }

  const displayName =
    session.user.user_metadata?.full_name ?? session.user.email?.split('@')[0] ?? 'there';
  const userEmail = session.user.email ?? '';
  const userId = session.user.id;
  const avatarInitial = displayName.charAt(0).toUpperCase();

  function openPlan() {
    setStudySnapshot(readStudySnapshot());
    setStudyPlan(readStudyPlan(userId));
    setAvatarUrl(getAvatarUrl(userId));
    setIsPlanOpen(true);
    setIsAccountMenuOpen(false);
  }

  function handleCoverFeature(featureId: string) {
    setViewingCover(false);
    if (featureId === 'study-planner') {
      openPlan();
    } else if (featureId === 'streaks') {
      window.showProgress?.();
    } else {
      setActiveToBeContined(featureId);
    }
  }

  function handleSavePlan(nextPlan: StudyPlan) {
    saveStudyPlan(userId, nextPlan);
    setStudyPlan(nextPlan);
    setStudySnapshot(readStudySnapshot());
    setAvatarUrl(getAvatarUrl(userId));
    setIsPlanOpen(false);
  }

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

      {/* Account button + left-side menu */}
      <div className="fixed right-4 top-4 z-[130]">
        <button
          type="button"
          className="acct-btn"
          onClick={() => setIsAccountMenuOpen((o) => !o)}
          aria-haspopup="menu"
        >
          {avatarUrl
            ? <img src={avatarUrl} alt="" className="acct-btn-avatar" />
            : <span className="acct-btn-initial">{avatarInitial}</span>
          }
          Hello, {displayName}
        </button>

        {isAccountMenuOpen && (
          <div className="acct-menu" role="menu">
            {/* User info */}
            <div className="acct-menu-header">
              <div className="acct-menu-avatar">
                {avatarUrl
                  ? <img src={avatarUrl} alt="" />
                  : avatarInitial
                }
              </div>
              <div className="acct-menu-user">
                <div className="acct-menu-name">{displayName}</div>
                <div className="acct-menu-email">{userEmail}</div>
              </div>
            </div>

            {/* Navigation */}
            <button
              type="button"
              className="acct-menu-item"
              onClick={() => { window.goHome?.(); setIsAccountMenuOpen(false); }}
              role="menuitem"
            >
              <span className="acct-menu-item-icon">🏠</span>
              Home
            </button>
            <button
              type="button"
              className="acct-menu-item"
              onClick={openPlan}
              role="menuitem"
            >
              <span className="acct-menu-item-icon">👤</span>
              Profile &amp; Plan
            </button>
            <button
              type="button"
              className="acct-menu-item"
              onClick={() => { setViewingCover(true); setIsAccountMenuOpen(false); }}
              role="menuitem"
            >
              <span className="acct-menu-item-icon">🖼️</span>
              About StudyCouch
            </button>

            <div className="acct-menu-divider" />

            <button
              type="button"
              className="acct-menu-item acct-menu-item--muted"
              onClick={() => { setIsAccountMenuOpen(false); window.resetAllData?.(); }}
              role="menuitem"
            >
              <span className="acct-menu-item-icon">🗑️</span>
              Clean data
            </button>
            <button
              type="button"
              className="acct-menu-item acct-menu-item--danger"
              onClick={() => void supabase.auth.signOut()}
              role="menuitem"
            >
              <span className="acct-menu-item-icon">→</span>
              Sign out
            </button>
          </div>
        )}
      </div>

      <LegacyStudyCoach />

      {studyPlan && !isPlanOpen && (
        <StudyPlanMiniCard plan={studyPlan} snapshot={studySnapshot} onOpen={openPlan} />
      )}
      {isPlanOpen && (
        <StudyPlanPage
          session={session}
          initialPlan={studyPlan}
          mode={studyPlan ? 'profile' : 'onboarding'}
          snapshot={studySnapshot}
          onSave={handleSavePlan}
          onClose={studyPlan ? () => setIsPlanOpen(false) : undefined}
        />
      )}

      {/* Cover page overlay — shown when user chooses "About StudyCouch" from the menu */}
      {viewingCover && (
        <div className="fixed inset-0 z-[200] overflow-y-auto">
          <StudyCouchCoverPage
            onLogin={() => setViewingCover(false)}
            onRegister={() => setViewingCover(false)}
            onBack={() => setViewingCover(false)}
            palette={paletteId}
            setPalette={setPaletteAndSave}
            onFeature={handleCoverFeature}
          />
        </div>
      )}

      {/* To Be Continued overlay */}
      {activeToBeContined && (
        <ToBeContined
          featureId={activeToBeContined}
          palette={PALETTES[paletteId]}
          onBack={() => setActiveToBeContined(null)}
        />
      )}
    </>
  );
}
