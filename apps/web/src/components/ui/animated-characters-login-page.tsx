import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Mail, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';

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
  return PASSWORD_REQUIREMENTS.filter((requirement) => !requirement.test(password)).map((requirement) => requirement.label);
}

function getFriendlyAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('email rate limit') || normalized.includes('rate limit')) {
    return 'Verification email sending is temporarily rate limited. Wait a while, turn off email confirmation for local testing, or configure a custom SMTP provider in Supabase.';
  }

  if (normalized.includes('invalid login credentials')) {
    return 'The email or password is incorrect. If you just registered, confirm your email first, or turn off email confirmation in Supabase for local testing.';
  }

  if (normalized.includes('email not confirmed') || normalized.includes('not confirmed')) {
    return 'This account is registered but the email is not confirmed yet. Open the confirmation email first, then log in.';
  }

  if (normalized.includes('already registered') || normalized.includes('already exists')) {
    return 'This email is already registered. Try logging in instead.';
  }

  return message;
}

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
  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMouseX(event.clientX);
      setMouseY(event.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const getRandomBlinkInterval = () => Math.random() * 4000 + 3000;

    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsPurpleBlinking(true);
        setTimeout(() => {
          setIsPurpleBlinking(false);
          scheduleBlink();
        }, 150);
      }, getRandomBlinkInterval());

      return blinkTimeout;
    };

    const timeout = scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const getRandomBlinkInterval = () => Math.random() * 4000 + 3000;

    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsBlackBlinking(true);
        setTimeout(() => {
          setIsBlackBlinking(false);
          scheduleBlink();
        }, 150);
      }, getRandomBlinkInterval());

      return blinkTimeout;
    };

    const timeout = scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true);
      const timer = setTimeout(() => setIsLookingAtEachOther(false), 800);
      return () => clearTimeout(timer);
    }

    setIsLookingAtEachOther(false);
  }, [isTyping]);

  useEffect(() => {
    if (password.length > 0 && showPassword) {
      const peekInterval = setTimeout(() => {
        setIsPurplePeeking(true);
        setTimeout(() => setIsPurplePeeking(false), 800);
      }, Math.random() * 3000 + 2000);

      return () => clearTimeout(peekInterval);
    }

    setIsPurplePeeking(false);
  }, [password, showPassword, isPurplePeeking]);

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
  const blackPos = calculatePosition(blackRef);
  const yellowPos = calculatePosition(yellowRef);
  const orangePos = calculatePosition(orangeRef);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsLoading(true);

    if (mode === 'register') {
      const passwordIssues = getPasswordIssues(password);

      if (passwordIssues.length > 0) {
        setError(`Password must include: ${passwordIssues.join(', ')}.`);
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
            email,
            password,
            options: {
              data: {
                full_name: displayName || email.split('@')[0],
              },
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
      setNotice('Account created, but email confirmation is required. Open the confirmation email first, then log in. For local testing, you can turn off email confirmation in Supabase.');
    }

    setIsLoading(false);
  }

  async function handleGoogleLogin() {
    setError('');
    setNotice('');
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (authError) {
      setError(getFriendlyAuthError(authError.message));
    }
  }

  const title = mode === 'login' ? 'Welcome back!' : 'Create your account';
  const subtitle =
    mode === 'login'
      ? 'Log in to sync progress and keep your study history safe.'
      : 'Register to track attempts, mistakes, notes, and future PDF projects.';

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-primary/90 via-primary to-primary/80 p-12 text-primary-foreground">
        <div className="relative z-20">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <div className="size-8 rounded-lg bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="size-4" />
            </div>
            <span>StudyCouch</span>
          </div>
        </div>

        <div className="relative z-20 flex h-[500px] items-end justify-center">
          <div className="relative" style={{ width: '550px', height: '400px' }}>
            <div
              ref={purpleRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: '70px',
                width: '180px',
                height: isTyping || (password.length > 0 && !showPassword) ? '440px' : '400px',
                backgroundColor: '#6C3FF5',
                borderRadius: '10px 10px 0 0',
                zIndex: 1,
                transform:
                  password.length > 0 && showPassword
                    ? 'skewX(0deg)'
                    : isTyping || (password.length > 0 && !showPassword)
                      ? `skewX(${purplePos.bodySkew - 12}deg) translateX(40px)`
                      : `skewX(${purplePos.bodySkew}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              <div
                className="absolute flex gap-8 transition-all duration-700 ease-in-out"
                style={{
                  left: password.length > 0 && showPassword ? '20px' : isLookingAtEachOther ? '55px' : `${45 + purplePos.faceX}px`,
                  top: password.length > 0 && showPassword ? '35px' : isLookingAtEachOther ? '65px' : `${40 + purplePos.faceY}px`,
                }}
              >
                <EyeBall
                  size={18}
                  pupilSize={7}
                  maxDistance={5}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isPurpleBlinking}
                  forceLookX={password.length > 0 && showPassword ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                  forceLookY={password.length > 0 && showPassword ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
                />
                <EyeBall
                  size={18}
                  pupilSize={7}
                  maxDistance={5}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isPurpleBlinking}
                  forceLookX={password.length > 0 && showPassword ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                  forceLookY={password.length > 0 && showPassword ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
                />
              </div>
            </div>

            <div
              ref={blackRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: '240px',
                width: '120px',
                height: '310px',
                backgroundColor: '#2D2D2D',
                borderRadius: '8px 8px 0 0',
                zIndex: 2,
                transform:
                  password.length > 0 && showPassword
                    ? 'skewX(0deg)'
                    : isLookingAtEachOther
                      ? `skewX(${blackPos.bodySkew * 1.5 + 10}deg) translateX(20px)`
                      : isTyping || (password.length > 0 && !showPassword)
                        ? `skewX(${blackPos.bodySkew * 1.5}deg)`
                        : `skewX(${blackPos.bodySkew}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              <div
                className="absolute flex gap-6 transition-all duration-700 ease-in-out"
                style={{
                  left: password.length > 0 && showPassword ? '10px' : isLookingAtEachOther ? '32px' : `${26 + blackPos.faceX}px`,
                  top: password.length > 0 && showPassword ? '28px' : isLookingAtEachOther ? '12px' : `${32 + blackPos.faceY}px`,
                }}
              >
                <EyeBall
                  size={16}
                  pupilSize={6}
                  maxDistance={4}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isBlackBlinking}
                  forceLookX={password.length > 0 && showPassword ? -4 : isLookingAtEachOther ? 0 : undefined}
                  forceLookY={password.length > 0 && showPassword ? -4 : isLookingAtEachOther ? -4 : undefined}
                />
                <EyeBall
                  size={16}
                  pupilSize={6}
                  maxDistance={4}
                  eyeColor="white"
                  pupilColor="#2D2D2D"
                  isBlinking={isBlackBlinking}
                  forceLookX={password.length > 0 && showPassword ? -4 : isLookingAtEachOther ? 0 : undefined}
                  forceLookY={password.length > 0 && showPassword ? -4 : isLookingAtEachOther ? -4 : undefined}
                />
              </div>
            </div>

            <div
              ref={orangeRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: '0px',
                width: '240px',
                height: '200px',
                zIndex: 3,
                backgroundColor: '#FF9B6B',
                borderRadius: '120px 120px 0 0',
                transform: password.length > 0 && showPassword ? 'skewX(0deg)' : `skewX(${orangePos.bodySkew}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              <div
                className="absolute flex gap-8 transition-all duration-200 ease-out"
                style={{
                  left: password.length > 0 && showPassword ? '50px' : `${82 + orangePos.faceX}px`,
                  top: password.length > 0 && showPassword ? '85px' : `${90 + orangePos.faceY}px`,
                }}
              >
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={password.length > 0 && showPassword ? -5 : undefined} forceLookY={password.length > 0 && showPassword ? -4 : undefined} />
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={password.length > 0 && showPassword ? -5 : undefined} forceLookY={password.length > 0 && showPassword ? -4 : undefined} />
              </div>
            </div>

            <div
              ref={yellowRef}
              className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{
                left: '310px',
                width: '140px',
                height: '230px',
                backgroundColor: '#E8D754',
                borderRadius: '70px 70px 0 0',
                zIndex: 4,
                transform: password.length > 0 && showPassword ? 'skewX(0deg)' : `skewX(${yellowPos.bodySkew}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              <div
                className="absolute flex gap-6 transition-all duration-200 ease-out"
                style={{
                  left: password.length > 0 && showPassword ? '20px' : `${52 + yellowPos.faceX}px`,
                  top: password.length > 0 && showPassword ? '35px' : `${40 + yellowPos.faceY}px`,
                }}
              >
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={password.length > 0 && showPassword ? -5 : undefined} forceLookY={password.length > 0 && showPassword ? -4 : undefined} />
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={password.length > 0 && showPassword ? -5 : undefined} forceLookY={password.length > 0 && showPassword ? -4 : undefined} />
              </div>
              <div
                className="absolute h-[4px] w-20 rounded-full bg-[#2D2D2D] transition-all duration-200 ease-out"
                style={{
                  left: password.length > 0 && showPassword ? '10px' : `${40 + yellowPos.faceX}px`,
                  top: password.length > 0 && showPassword ? '88px' : `${88 + yellowPos.faceY}px`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="relative z-20 flex items-center gap-8 text-sm text-primary-foreground/70">
          <span>CLF-C02 prep</span>
          <span>Progress tracking</span>
          <span>PDF projects soon</span>
        </div>

        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="absolute top-1/4 right-1/4 size-64 bg-primary-foreground/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 size-96 bg-primary-foreground/5 rounded-full blur-3xl" />
      </div>

      <div className="flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-[420px]">
          {onBackToCover && (
            <button
              type="button"
              className="mb-8 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              onClick={onBackToCover}
            >
              ← Back to StudyCouch
            </button>
          )}

          <div className="mb-12 flex items-center justify-center gap-2 text-lg font-semibold lg:hidden">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="size-4 text-primary" />
            </div>
            <span>StudyCouch</span>
          </div>

          <div className="mb-10 text-center">
            <h1 className="mb-2 text-3xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${mode === 'login' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
              onClick={() => {
                setMode('login');
                setError('');
                setNotice('');
                setConfirmPassword('');
              }}
            >
              Log in
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${mode === 'register' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
              onClick={() => {
                setMode('register');
                setError('');
                setNotice('');
              }}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="display-name">Name</Label>
                <Input
                  id="display-name"
                  type="text"
                  placeholder="Anna"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="h-12 border-border/60 bg-background focus:border-primary"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="anna@gmail.com"
                value={email}
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                required
                className="h-12 border-border/60 bg-background focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'register' ? 'Abc@12' : 'Your password'}
                  value={password}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  maxLength={12}
                  className="h-12 border-border/60 bg-background pr-10 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    autoComplete="new-password"
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    minLength={6}
                    maxLength={12}
                    className="h-12 border-border/60 bg-background focus:border-primary"
                  />
                </div>

                <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                  <p className="mb-2 font-semibold text-foreground">Password rules</p>
                  <ul className="space-y-1">
                    {PASSWORD_REQUIREMENTS.map((requirement) => {
                      const passed = requirement.test(password);
                      return (
                        <li key={requirement.label} className={passed ? 'text-primary' : ''}>
                          {passed ? '✓' : '•'} {requirement.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" />
                <Label htmlFor="remember" className="cursor-pointer text-sm font-normal">
                  Remember me
                </Label>
              </div>
              <button type="button" className="text-sm font-medium text-primary hover:underline">
                Forgot password?
              </button>
            </div>

            {error && <div className="rounded-lg border border-red-900/30 bg-red-950/10 p-3 text-sm text-red-600">{error}</div>}
            {notice && <div className="rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm text-primary">{notice}</div>}

            <Button type="submit" className="h-12 w-full text-base font-medium" size="lg" disabled={isLoading}>
              {isLoading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
            </Button>
          </form>

          <div className="mt-6">
            <Button
              variant="outline"
              className="h-12 w-full border-border/60 bg-background hover:bg-accent"
              type="button"
              onClick={handleGoogleLogin}
            >
              <Mail className="mr-2 size-5" />
              Continue with Google
            </Button>
          </div>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              className="font-medium text-foreground hover:underline"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
                setNotice('');
                setConfirmPassword('');
              }}
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Component = LoginPage;
export default LoginPage;
