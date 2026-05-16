import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useSpring } from 'framer-motion';

interface NavItem {
  label: string;
  id: string;
  action: () => void;
}

const navItems: NavItem[] = [
  { label: 'Home', id: 'home-screen', action: () => window.goHome?.() },
  { label: 'Progress', id: 'progress-screen', action: () => window.showProgress?.() },
  { label: 'Mistakes', id: 'review-screen', action: () => window.showReview?.() },
  { label: 'Saved', id: 'bookmarks-screen', action: () => window.showBookmarks?.() },
  { label: 'Integrity', id: 'check-screen', action: () => window.showCheck?.() },
];

// quiz-screen and result-screen are not in navItems — show a neutral label instead
// of mapping them to 'home-screen', which caused the pill to show "Home" and then
// trigger goHome() when a touch-synthesised click landed on that button on expansion.
function screenToNavId(screenId: string) {
  return screenId;
}

export function PillBase() {
  const [activeSection, setActiveSection] = useState('home-screen');
  const [expanded, setExpanded] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Blocks clicks on nav items for 300 ms after the pill expands so that the
  // touch-synthesised click (mouseenter → expand → click) cannot accidentally
  // trigger a navigation action the user never intended.
  const blockClicksRef = useRef(false);
  const blockClicksTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pillWidth = useSpring(150, { stiffness: 220, damping: 25, mass: 1 });

  useEffect(() => {
    const handleScreenChange = (event: Event) => {
      const screenId = (event as CustomEvent<string>).detail;
      setActiveSection(screenToNavId(screenId));
    };

    window.addEventListener('studycouch:screen-change', handleScreenChange);
    return () => window.removeEventListener('studycouch:screen-change', handleScreenChange);
  }, []);

  useEffect(() => {
    if (hovering) {
      setExpanded(true);
      pillWidth.set(520);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      // Block nav-item clicks for 300 ms so touch-synthesised clicks don't fire
      blockClicksRef.current = true;
      if (blockClicksTimerRef.current) clearTimeout(blockClicksTimerRef.current);
      blockClicksTimerRef.current = setTimeout(() => {
        blockClicksRef.current = false;
      }, 300);
    } else {
      hoverTimeoutRef.current = setTimeout(() => {
        setExpanded(false);
        pillWidth.set(150);
      }, 600);
    }

    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (blockClicksTimerRef.current) clearTimeout(blockClicksTimerRef.current);
    };
  }, [hovering, pillWidth]);

  const handleSectionClick = (item: NavItem) => {
    if (blockClicksRef.current) return;
    setIsTransitioning(true);
    setActiveSection(item.id);
    setHovering(false);
    item.action();
    setTimeout(() => setIsTransitioning(false), 400);
  };

  // When on quiz-screen or result-screen there is no matching navItem — show a
  // neutral indicator rather than falling back to the first item (Home).
  const activeItem = navItems.find((item) => item.id === activeSection);
  const collapsedLabel = activeItem?.label ?? '▶ Quiz';

  return (
    <motion.nav
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="pointer-events-auto relative rounded-full"
      style={{
        width: pillWidth,
        height: '56px',
        background:
          'linear-gradient(135deg,#fcfcfd 0%,#f8f8fa 15%,#f3f4f6 30%,#eeeff2 45%,#e9eaed 60%,#e4e5e8 75%,#dee0e3 90%,#e2e3e6 100%)',
        boxShadow: expanded
          ? '0 2px 4px rgba(0,0,0,.08),0 12px 24px rgba(0,0,0,.14),0 24px 48px rgba(0,0,0,.10),inset 0 2px 2px rgba(255,255,255,.8),inset 0 -3px 8px rgba(0,0,0,.12),inset 3px 3px 8px rgba(0,0,0,.10),inset -3px 3px 8px rgba(0,0,0,.09)'
          : isTransitioning
            ? '0 3px 6px rgba(0,0,0,.10),0 8px 16px rgba(0,0,0,.08),0 16px 32px rgba(0,0,0,.06),inset 0 2px 1px rgba(255,255,255,.85),inset 0 -2px 6px rgba(0,0,0,.08)'
            : '0 3px 6px rgba(0,0,0,.12),0 8px 16px rgba(0,0,0,.10),0 16px 32px rgba(0,0,0,.08),inset 0 2px 1px rgba(255,255,255,.7),inset 0 -2px 6px rgba(0,0,0,.10)',
        overflow: 'hidden',
        transition: 'box-shadow 0.3s ease-out',
      }}
      aria-label="StudyCouch navigation"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] rounded-t-full bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,.95)_5%,#fff_15%,#fff_85%,rgba(255,255,255,.95)_95%,rgba(255,255,255,0)_100%)] blur-[.3px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[55%] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,.45)_0%,rgba(255,255,255,.25)_30%,rgba(255,255,255,.10)_60%,rgba(255,255,255,0)_100%)]" />
      <div className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,.40)_0%,rgba(255,255,255,.20)_20%,rgba(255,255,255,.08)_40%,rgba(255,255,255,0)_65%)]" />
      <div
        className="pointer-events-none absolute rounded-full blur"
        style={{
          left: expanded ? '18%' : '15%',
          top: '16%',
          width: expanded ? '140px' : '60px',
          height: '14px',
          background:
            'radial-gradient(ellipse at center,rgba(255,255,255,.70) 0%,rgba(255,255,255,.35) 40%,rgba(255,255,255,.10) 70%,rgba(255,255,255,0) 100%)',
          transform: 'rotate(-12deg)',
          transition: 'all 0.3s ease',
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 rounded-b-full bg-[linear-gradient(0deg,rgba(0,0,0,.14)_0%,rgba(0,0,0,.08)_25%,rgba(0,0,0,.03)_50%,rgba(0,0,0,0)_100%)]" />
      <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_40px_rgba(255,255,255,.22)]" />

      <div className="relative z-10 flex h-full items-center justify-center px-6">
        {!expanded && (
          <div className="flex items-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={activeSection}
                initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                className="whitespace-nowrap text-[15.5px] font-bold tracking-normal text-[#1a1a1a]"
              >
                {collapsedLabel}
              </motion.span>
            </AnimatePresence>
          </div>
        )}

        {expanded && (
          <div className="flex w-full items-center justify-evenly">
            {navItems.map((item, index) => {
              const isActive = item.id === activeSection;
              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: index * 0.05, duration: 0.2, ease: 'easeOut' }}
                  onClick={() => handleSectionClick(item)}
                  className="cursor-pointer whitespace-nowrap border-0 bg-transparent px-4 py-2 text-[15px] tracking-normal outline-none transition-colors duration-200"
                  style={{
                    fontWeight: isActive ? 700 : 560,
                    color: isActive ? '#1a1a1a' : '#656565',
                  }}
                >
                  {item.label}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </motion.nav>
  );
}

export default PillBase;
