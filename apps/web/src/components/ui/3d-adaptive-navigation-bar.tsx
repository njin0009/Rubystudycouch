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
  { label: 'Questions', id: 'questions-screen', action: () => window.showQuestions?.() },
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
  const [hasActiveQuiz, setHasActiveQuiz] = useState(false);
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
    const handleQuizState = (event: Event) => {
      setHasActiveQuiz((event as CustomEvent<boolean>).detail);
    };
    window.addEventListener('studycouch:quiz-state', handleQuizState);
    return () => window.removeEventListener('studycouch:quiz-state', handleQuizState);
  }, []);

  useEffect(() => {
    if (hovering) {
      setExpanded(true);
      const showResume = hasActiveQuiz && activeSection !== 'quiz-screen';
      pillWidth.set(showResume ? 620 : 520);
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
  }, [hovering, pillWidth, hasActiveQuiz, activeSection]);

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

  const showResume = hasActiveQuiz && activeSection !== 'quiz-screen';
  const expandedItems = showResume
    ? [...navItems, { label: '▶ Resume', id: 'quiz-screen', action: () => window.goQuiz?.() }]
    : navItems;

  return (
    <motion.nav
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="pointer-events-auto relative rounded-full"
      style={{
        width: pillWidth,
        height: '52px',
        background: '#fffbf1',
        border: '2px solid #2a1f18',
        boxShadow: expanded ? '5px 7px 0 #2a1f18' : '4px 5px 0 #2a1f18',
        overflow: 'hidden',
        transition: 'box-shadow 0.15s ease-out',
      }}
      aria-label="StudyCouch navigation"
    >
      <div className="relative z-10 flex h-full items-center justify-center px-5">
        {!expanded && (
          <div className="flex items-center">
            <AnimatePresence mode="wait">
              <motion.span
                key={activeSection}
                initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                className="whitespace-nowrap text-[15px] font-bold tracking-normal"
                style={{ color: '#2a1f18', fontFamily: "'DM Sans', ui-sans-serif, sans-serif" }}
              >
                {collapsedLabel}
              </motion.span>
            </AnimatePresence>
          </div>
        )}

        {expanded && (
          <div className="flex w-full items-center justify-evenly">
            {expandedItems.map((item, index) => {
              const isActive = item.id === activeSection;
              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: index * 0.05, duration: 0.2, ease: 'easeOut' }}
                  onClick={() => handleSectionClick(item)}
                  className="cursor-pointer whitespace-nowrap border-0 px-3 py-1.5 text-[14px] tracking-normal outline-none transition-colors duration-150"
                  style={{
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#a0182b' : 'rgba(42,31,24,0.6)',
                    background: isActive ? 'rgba(242,201,76,0.28)' : 'transparent',
                    borderRadius: '999px',
                    fontFamily: "'DM Sans', ui-sans-serif, sans-serif",
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
