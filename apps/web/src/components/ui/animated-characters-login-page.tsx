import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── Animated eye helpers ──────────────────────────────────────────────────────

interface EyeBallProps {
  size?: number;
  pupilSize?: number;
  maxDistance?: number;
  eyeColor?: string;
  pupilColor?: string;
  isBlinking?: boolean;
  forceLookX?: number;
  forceLookY?: number;
}

const EyeBall = ({
  size = 48,
  pupilSize = 16,
  maxDistance = 10,
  eyeColor = 'white',
  pupilColor = 'black',
  isBlinking = false,
  forceLookX,
  forceLookY,
}: EyeBallProps) => {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const eyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMouseX(event.clientX);
      setMouseY(event.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const calculatePupilPosition = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };
    const eye = eyeRef.current.getBoundingClientRect();
    const eyeCenterX = eye.left + eye.width / 2;
    const eyeCenterY = eye.top + eye.height / 2;
    const deltaX = mouseX - eyeCenterX;
    const deltaY = mouseY - eyeCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={eyeRef}
      className="flex items-center justify-center rounded-full transition-all duration-150"
      style={{
        width: `${size}px`,
        height: isBlinking ? '2px' : `${size}px`,
        backgroundColor: eyeColor,
        overflow: 'hidden',
      }}
    >
      {!isBlinking && (
        <div
          className="rounded-full"
          style={{
            width: `${pupilSize}px`,
            height: `${pupilSize}px`,
            backgroundColor: pupilColor,
            transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
      )}
    </div>
  );
};

interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
}

const Pupil = ({ size = 12, maxDistance = 5, pupilColor = 'black', forceLookX, forceLookY }: PupilProps) => {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const pupilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMouseX(event.clientX);
      setMouseY(event.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const calculatePupilPosition = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };
    const pupil = pupilRef.current.getBoundingClientRect();
    const pupilCenterX = pupil.left + pupil.width / 2;
    const pupilCenterY = pupil.top + pupil.height / 2;
    const deltaX = mouseX - pupilCenterX;
    const deltaY = mouseY - pupilCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={pupilRef}
      className="rounded-full"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: pupilColor,
        transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
        transition: 'transform 0.1s ease-out',
      }}
    />
  );
};

// ── Auth logic ────────────────────────────────────────────────────────────────

type AuthMode = 'login' | 'register';

type LoginPageProps = {
  initialMode?: AuthMode;
  onBackToCover?: () => void;
};

const PASSWORD_REQUIREMENTS = [
  { label: '6-12 characters', test: (value: string) => value.length >= 6 && value.length <= 12 },
  { label: 'At least one uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'At least one lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'At least one number', test: (value: string) => /[0-9]/.test(value) },
  { label: 'At least one special symbol', test: (value: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(value) },
];

function getPasswordIssues(password: string) {
  return PASSWORD_REQUIREMENTS.filter((r) => !r.test(password)).map((r) => r.label);
}

function getFriendlyAuthError(message: string) {
  const n = message.toLowerCase();
  if (n.includes('email rate limit') || n.includes('rate limit'))
    return 'Verification email sending is temporarily rate limited. Wait a while, turn off email confirmation for local testing, or configure a custom SMTP provider in Supabase.';
  if (n.includes('invalid login credentials'))
    return 'The email or password is incorrect. If you just registered, confirm your email first, or turn off email confirmation in Supabase for local testing.';
  if (n.includes('email not confirmed') || n.includes('not confirmed'))
    return 'This account is registered but the email is not confirmed yet. Open the confirmation email first, then log in.';
  if (n.includes('already registered') || n.includes('already exists'))
    return 'This email is already registered. Try logging in instead.';
  return message;
}

// ── Cover-style decorative SVGs ───────────────────────────────────────────────

const Sparkle = ({ color, size = 18, style }: { color: string; size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" style={style}>
    <path d="M10 0 L11.5 8.5 L20 10 L11.5 11.5 L10 20 L8.5 11.5 L0 10 L8.5 8.5 Z" fill={color} />
  </svg>
);

const CouchMark = () => (
  <svg width="28" height="28" viewBox="0 0 32 32">
    <path d="M4 20 L4 24 L28 24 L28 20 L24 20 L24 16 C24 13 22 11 18 11 L14 11 C10 11 8 13 8 16 L8 20 Z"
      style={{ fill: 'var(--bg)' }} />
    <path d="M2 24 L30 24" style={{ stroke: 'var(--bg)' }} strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
    <circle cx="9" cy="6" r="1.5" style={{ fill: 'var(--bg)' }} opacity="0.7" />
    <circle cx="23" cy="6" r="1.5" style={{ fill: 'var(--amber)' }} />
  </svg>
);

// ── Left panel — characters stage ─────────────────────────────────────────────

function CharactersStage({
  isTyping, showPassword, password, isPurpleBlinking, isBlackBlinking,
  isLookingAtEachOther, isPurplePeeking, mouseX, mouseY,
}: {
  isTyping: boolean; showPassword: boolean; password: string;
  isPurpleBlinking: boolean; isBlackBlinking: boolean;
  isLookingAtEachOther: boolean; isPurplePeeking: boolean;
  mouseX: number; mouseY: number;
}) {
  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef  = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);

  const calculatePosition = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 3;
    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;
    return {
      faceX: Math.max(-15, Math.min(15, deltaX / 20)),
      faceY: Math.max(-10, Math.min(10, deltaY / 30)),
      bodySkew: Math.max(-6, Math.min(6, -deltaX / 120)),
    };
  };

  const purplePos = calculatePosition(purpleRef);
  const blackPos  = calculatePosition(blackRef);
  const yellowPos = calculatePosition(yellowRef);
  const orangePos = calculatePosition(orangeRef);

  return (
    <div style={{ position: 'relative', width: 550, height: 400 }}>
      {/* Purple */}
      <div ref={purpleRef} className="absolute bottom-0 transition-all duration-700 ease-in-out" style={{
        left: 70, width: 180,
        height: isTyping || (password.length > 0 && !showPassword) ? 440 : 400,
        backgroundColor: '#6C3FF5', borderRadius: '10px 10px 0 0', zIndex: 1,
        transform: password.length > 0 && showPassword
          ? 'skewX(0deg)'
          : isTyping || (password.length > 0 && !showPassword)
            ? `skewX(${purplePos.bodySkew - 12}deg) translateX(40px)`
            : `skewX(${purplePos.bodySkew}deg)`,
        transformOrigin: 'bottom center',
      }}>
        <div className="absolute flex gap-8 transition-all duration-700 ease-in-out" style={{
          left: password.length > 0 && showPassword ? 20 : isLookingAtEachOther ? 55 : 45 + purplePos.faceX,
          top:  password.length > 0 && showPassword ? 35 : isLookingAtEachOther ? 65 : 40 + purplePos.faceY,
        }}>
          {[0, 1].map((i) => (
            <EyeBall key={i} size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#2D2D2D"
              isBlinking={isPurpleBlinking}
              forceLookX={password.length > 0 && showPassword ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
              forceLookY={password.length > 0 && showPassword ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
            />
          ))}
        </div>
      </div>

      {/* Black */}
      <div ref={blackRef} className="absolute bottom-0 transition-all duration-700 ease-in-out" style={{
        left: 240, width: 120, height: 310,
        backgroundColor: '#2D2D2D', borderRadius: '8px 8px 0 0', zIndex: 2,
        transform: password.length > 0 && showPassword
          ? 'skewX(0deg)'
          : isLookingAtEachOther
            ? `skewX(${blackPos.bodySkew * 1.5 + 10}deg) translateX(20px)`
            : isTyping || (password.length > 0 && !showPassword)
              ? `skewX(${blackPos.bodySkew * 1.5}deg)`
              : `skewX(${blackPos.bodySkew}deg)`,
        transformOrigin: 'bottom center',
      }}>
        <div className="absolute flex gap-6 transition-all duration-700 ease-in-out" style={{
          left: password.length > 0 && showPassword ? 10 : isLookingAtEachOther ? 32 : 26 + blackPos.faceX,
          top:  password.length > 0 && showPassword ? 28 : isLookingAtEachOther ? 12 : 32 + blackPos.faceY,
        }}>
          {[0, 1].map((i) => (
            <EyeBall key={i} size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="#2D2D2D"
              isBlinking={isBlackBlinking}
              forceLookX={password.length > 0 && showPassword ? -4 : isLookingAtEachOther ? 0 : undefined}
              forceLookY={password.length > 0 && showPassword ? -4 : isLookingAtEachOther ? -4 : undefined}
            />
          ))}
        </div>
      </div>

      {/* Orange */}
      <div ref={orangeRef} className="absolute bottom-0 transition-all duration-700 ease-in-out" style={{
        left: 0, width: 240, height: 200, zIndex: 3,
        backgroundColor: '#FF9B6B', borderRadius: '120px 120px 0 0',
        transform: password.length > 0 && showPassword ? 'skewX(0deg)' : `skewX(${orangePos.bodySkew}deg)`,
        transformOrigin: 'bottom center',
      }}>
        <div className="absolute flex gap-8 transition-all duration-200 ease-out" style={{
          left: password.length > 0 && showPassword ? 50 : 82 + orangePos.faceX,
          top:  password.length > 0 && showPassword ? 85 : 90 + orangePos.faceY,
        }}>
          {[0, 1].map((i) => (
            <Pupil key={i} size={12} maxDistance={5} pupilColor="#2D2D2D"
              forceLookX={password.length > 0 && showPassword ? -5 : undefined}
              forceLookY={password.length > 0 && showPassword ? -4 : undefined}
            />
          ))}
        </div>
      </div>

      {/* Yellow */}
      <div ref={yellowRef} className="absolute bottom-0 transition-all duration-700 ease-in-out" style={{
        left: 310, width: 140, height: 230,
        backgroundColor: '#E8D754', borderRadius: '70px 70px 0 0', zIndex: 4,
        transform: password.length > 0 && showPassword ? 'skewX(0deg)' : `skewX(${yellowPos.bodySkew}deg)`,
        transformOrigin: 'bottom center',
      }}>
        <div className="absolute flex gap-6 transition-all duration-200 ease-out" style={{
          left: password.length > 0 && showPassword ? 20 : 52 + yellowPos.faceX,
          top:  password.length > 0 && showPassword ? 35 : 40 + yellowPos.faceY,
        }}>
          {[0, 1].map((i) => (
            <Pupil key={i} size={12} maxDistance={5} pupilColor="#2D2D2D"
              forceLookX={password.length > 0 && showPassword ? -5 : undefined}
              forceLookY={password.length > 0 && showPassword ? -4 : undefined}
            />
          ))}
        </div>
        <div className="absolute h-[4px] w-20 rounded-full bg-[#2D2D2D] transition-all duration-200 ease-out" style={{
          left: password.length > 0 && showPassword ? 10 : 40 + yellowPos.faceX,
          top:  password.length > 0 && showPassword ? 88 : 88 + yellowPos.faceY,
        }} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function LoginPage({ initialMode = 'login', onBackToCover }: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => { setMouseX(event.clientX); setMouseY(event.clientY); };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const scheduleBlink = (setter: (v: boolean) => void) => {
      const t = setTimeout(() => {
        setter(true);
        setTimeout(() => { setter(false); scheduleBlink(setter); }, 150);
      }, Math.random() * 4000 + 3000);
      return t;
    };
    const t1 = scheduleBlink(setIsPurpleBlinking);
    const t2 = scheduleBlink(setIsBlackBlinking);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true);
      const t = setTimeout(() => setIsLookingAtEachOther(false), 800);
      return () => clearTimeout(t);
    }
    setIsLookingAtEachOther(false);
  }, [isTyping]);

  useEffect(() => {
    if (password.length > 0 && showPassword) {
      const t = setTimeout(() => {
        setIsPurplePeeking(true);
        setTimeout(() => setIsPurplePeeking(false), 800);
      }, Math.random() * 3000 + 2000);
      return () => clearTimeout(t);
    }
    setIsPurplePeeking(false);
  }, [password, showPassword, isPurplePeeking]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsLoading(true);

    if (mode === 'register') {
      const issues = getPasswordIssues(password);
      if (issues.length > 0) {
        setError(`Password must include: ${issues.join(', ')}.`);
        setIsLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setIsLoading(false);
        return;
      }
    }

    const authRequest =
      mode === 'login'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({
            email, password,
            options: {
              data: { full_name: displayName || email.split('@')[0] },
              emailRedirectTo: window.location.origin,
            },
          });

    const { data, error: authError } = await authRequest;

    if (authError) {
      setError(getFriendlyAuthError(authError.message));
      setIsLoading(false);
      return;
    }

    if (mode === 'register' && !data.session) {
      setNotice('Account created, but email confirmation is required. Open the confirmation email first, then log in.');
    }

    setIsLoading(false);
  }

  async function handleGoogleLogin() {
    setError('');
    setNotice('');
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (authError) setError(getFriendlyAuthError(authError.message));
  }

  function switchMode(next: AuthMode) {
    setMode(next);
    setError('');
    setNotice('');
    setConfirmPassword('');
  }

  const isRegister = mode === 'register';

  // ── shared inline-style tokens ──────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 48, padding: '0 14px',
    background: 'var(--surface)', color: 'var(--ink)',
    border: '2px solid var(--border2)', borderRadius: 10,
    boxShadow: '2px 3px 0 var(--border)',
    fontSize: 14, fontFamily: 'inherit', outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 600,
    color: 'var(--ink)', marginBottom: 6,
  };

  return (
    <div style={{ fontFamily: "'DM Sans', ui-sans-serif, sans-serif" }}
      className="min-h-screen grid lg:grid-cols-2"
    >

      {/* ── Left panel ──────────────────────────────────────────────────────── */}
      <div
        className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12"
        style={{ background: 'var(--ink)', color: 'var(--bg)' }}
      >
        {/* Wordmark */}
        <div style={{ position: 'relative', zIndex: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CouchMark />
            <span style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em',
              color: 'var(--bg)',
            }}>StudyCouch</span>
            <span style={{
              fontFamily: "'Caveat', cursive",
              fontSize: 17, color: 'var(--amber)',
              transform: 'rotate(-6deg)', display: 'inline-block', marginLeft: 4,
            }}>CLF-C02</span>
          </div>
        </div>

        {/* Characters */}
        <div style={{ position: 'relative', zIndex: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: 500 }}>
          <CharactersStage
            isTyping={isTyping} showPassword={showPassword} password={password}
            isPurpleBlinking={isPurpleBlinking} isBlackBlinking={isBlackBlinking}
            isLookingAtEachOther={isLookingAtEachOther} isPurplePeeking={isPurplePeeking}
            mouseX={mouseX} mouseY={mouseY}
          />
        </div>

        {/* Footer bullets */}
        <div style={{ position: 'relative', zIndex: 20, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          {['CLF-C02 prep', 'Progress tracking', 'Focus sessions'].map((x) => (
            <span key={x} style={{
              fontFamily: "'Caveat', cursive", fontSize: 17,
              color: 'var(--bg)', opacity: 0.65,
            }}>✺ {x}</span>
          ))}
        </div>

        {/* Decorative blobs */}
        <Sparkle color="var(--amber)" size={28} style={{ position: 'absolute', top: 90, right: 60, opacity: 0.5, zIndex: 1 }} />
        <Sparkle color="var(--bg)" size={14} style={{ position: 'absolute', top: 130, right: 100, opacity: 0.3, zIndex: 1 }} />
        <div style={{
          position: 'absolute', top: '25%', right: '20%',
          width: 240, height: 240, borderRadius: '50%',
          background: 'var(--bg)', opacity: 0.04, filter: 'blur(40px)', zIndex: 0,
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', left: '15%',
          width: 320, height: 320, borderRadius: '50%',
          background: 'var(--amber)', opacity: 0.06, filter: 'blur(50px)', zIndex: 0,
        }} />
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-center p-8"
        style={{ background: 'var(--bg)' }}
      >
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Back link */}
          {onBackToCover && (
            <button
              type="button"
              onClick={onBackToCover}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: "'Caveat', cursive", fontSize: 17,
                color: 'var(--ink3)', marginBottom: 28, padding: 0,
                display: 'block',
              }}
            >
              ← Back to StudyCouch
            </button>
          )}

          {/* Mobile wordmark */}
          <div className="lg:hidden" style={{ textAlign: 'center', marginBottom: 32 }}>
            <span style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 22, fontWeight: 500, color: 'var(--ink)',
            }}>StudyCouch</span>
          </div>

          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              fontFamily: "'Caveat', cursive", fontSize: 22,
              color: 'var(--ruby)', marginBottom: 6,
            }}>
              {isRegister ? '~ join the couch ~' : '~ welcome back ~'}
            </div>
            <h1 style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontWeight: 400, fontSize: 32, lineHeight: 1.1,
              letterSpacing: '-0.025em', color: 'var(--ink)',
              margin: '0 0 8px',
            }}>
              {isRegister ? 'Create your account' : 'Welcome back!'}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--ink3)', lineHeight: 1.5, margin: 0 }}>
              {isRegister
                ? 'Register to track attempts, mistakes, notes, and save your progress.'
                : 'Log in to sync progress and keep your study history safe.'}
            </p>
          </div>

          {/* Mode tabs */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4,
            background: 'var(--surface2)', padding: 4,
            borderRadius: 10, border: '1.5px solid var(--border)',
            marginBottom: 28,
          }}>
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                style={{
                  borderRadius: 7, padding: '9px 12px',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: mode === m ? 'var(--surface)' : 'transparent',
                  color: 'var(--ink)',
                  border: mode === m ? '1.5px solid var(--border2)' : '1.5px solid transparent',
                  boxShadow: mode === m ? '2px 2px 0 var(--border)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {m === 'login' ? 'Log in' : 'Register'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {isRegister && (
              <div>
                <label style={labelStyle} htmlFor="display-name">Name</label>
                <input
                  id="display-name" type="text" placeholder="Anna"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ruby)'; e.currentTarget.style.boxShadow = '2px 3px 0 var(--ruby)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.boxShadow = '2px 3px 0 var(--border)'; }}
                />
              </div>
            )}

            <div>
              <label style={labelStyle} htmlFor="email">Email</label>
              <input
                id="email" type="email" placeholder="anna@gmail.com"
                value={email} autoComplete="email" required
                onChange={(e) => setEmail(e.target.value)}
                onFocus={(e) => { setIsTyping(true); e.currentTarget.style.borderColor = 'var(--ruby)'; e.currentTarget.style.boxShadow = '2px 3px 0 var(--ruby)'; }}
                onBlur={(e) => { setIsTyping(false); e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.boxShadow = '2px 3px 0 var(--border)'; }}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle} htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isRegister ? 'Abc@12' : 'Your password'}
                  value={password}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  onChange={(e) => setPassword(e.target.value)}
                  required minLength={6} maxLength={12}
                  style={{ ...inputStyle, paddingRight: 44 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ruby)'; e.currentTarget.style.boxShadow = '2px 3px 0 var(--ruby)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.boxShadow = '2px 3px 0 var(--border)'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--ink3)', display: 'flex', padding: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {isRegister && (
              <>
                <div>
                  <label style={labelStyle} htmlFor="confirm-password">Confirm password</label>
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    autoComplete="new-password" required minLength={6} maxLength={12}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ruby)'; e.currentTarget.style.boxShadow = '2px 3px 0 var(--ruby)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.boxShadow = '2px 3px 0 var(--border)'; }}
                  />
                </div>

                <div style={{
                  background: 'var(--surface2)', border: '1.5px solid var(--border)',
                  borderRadius: 10, padding: '10px 14px', fontSize: 12, color: 'var(--ink3)',
                }}>
                  <p style={{ fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>Password rules</p>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {PASSWORD_REQUIREMENTS.map((req) => {
                      const passed = req.test(password);
                      return (
                        <li key={req.label} style={{ color: passed ? 'var(--teal)' : 'var(--ink3)' }}>
                          {passed ? '✓' : '·'} {req.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}

            {/* Remember / Forgot */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--ink2)' }}>
                <input type="checkbox" style={{ accentColor: 'var(--ruby)', width: 15, height: 15 }} />
                Remember me
              </label>
              <button type="button" style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: 'var(--ruby)', fontFamily: 'inherit',
              }}>
                Forgot password?
              </button>
            </div>

            {error && (
              <div style={{
                background: 'var(--rose-lt)', border: '1.5px solid var(--ruby)',
                borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--ruby)',
                boxShadow: '2px 3px 0 var(--rose-lt)',
              }}>{error}</div>
            )}
            {notice && (
              <div style={{
                background: 'var(--amber-lt)', border: '1.5px solid var(--amber)',
                borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--ink2)',
              }}>{notice}</div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                height: 50, width: '100%', fontSize: 16, fontWeight: 700,
                fontFamily: 'inherit', cursor: isLoading ? 'not-allowed' : 'pointer',
                background: isLoading ? 'var(--surface2)' : 'var(--ruby)',
                color: isLoading ? 'var(--ink3)' : 'var(--surface)',
                border: '2px solid var(--ink)',
                borderRadius: 999,
                boxShadow: isLoading ? 'none' : '3px 4px 0 var(--ink)',
                transition: 'transform 0.12s, box-shadow 0.12s',
              }}
              onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '4px 6px 0 var(--ink)'; } }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = isLoading ? 'none' : '3px 4px 0 var(--ink)'; }}
            >
              {isLoading ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            margin: '22px 0', color: 'var(--ink3)', fontSize: 12,
          }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontFamily: "'Caveat', cursive", fontSize: 15 }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            style={{
              height: 48, width: '100%',
              background: 'var(--surface)', color: 'var(--ink)',
              border: '2px solid var(--ink)', borderRadius: 999,
              boxShadow: '2px 3px 0 var(--ink)',
              fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'transform 0.12s, box-shadow 0.12s, background 0.12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--amber-lt)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '3px 4px 0 var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '2px 3px 0 var(--ink)'; }}
          >
            {/* Google "G" icon */}
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Switch mode */}
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink3)', marginTop: 24, margin: '24px 0 0' }}>
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <button
              type="button"
              onClick={() => switchMode(isRegister ? 'login' : 'register')}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontWeight: 700, color: 'var(--ink)', fontFamily: 'inherit', fontSize: 13,
                textDecoration: 'underline',
              }}
            >
              {isRegister ? 'Log in' : 'Sign up'}
            </button>
          </p>

        </div>
      </div>
    </div>
  );
}

export const Component = LoginPage;
export default LoginPage;
