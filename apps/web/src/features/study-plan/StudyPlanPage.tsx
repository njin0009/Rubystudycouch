import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import './studyplan.css';
import {
  BookOpen,
  Camera,
  CalendarDays,
  Check,
  Clock3,
  ExternalLink,
  Quote,
  Save,
  Target,
  UserRound,
  X,
} from 'lucide-react';

const TOTAL_QUESTIONS = 719;
const PLAN_VERSION = 2;
const AWS_CLF_C02_EXAM_URL = 'https://aws.amazon.com/certification/certification-prep/testing/';
const AWS_CLF_C02_RESCHEDULE_URL = 'https://aws.amazon.com/certification/faqs/';

type StudyLevel = 'new' | 'reviewing' | 'cram';
type PlanType = 'buffer' | 'balanced' | 'minimum' | 'grand';

export type StudyPlan = {
  version: number;
  examDate: string;
  examTime: string;
  dailyMinutes: number;
  daysPerWeek: number;
  targetScore: number;
  level: StudyLevel;
  planType: PlanType;
  customDailyQuestions?: number;
  customDailyReview?: number;
  createdAt: string;
  updatedAt: string;
};

type StudySnapshot = {
  mastered: number;
  totalDone: number;
  todayAnswered: number;
  wrongCount: number;
  savedCount: number;
  accuracy: number | null;
};

type PlanMath = {
  hoursUntilExam: number;
  calendarDays: number;
  planDays: number;
  effectiveStudyDays: number;
  coverageStudyDays: number;
  reviewBlockDays: number;
  finalReviewDays: number;
  mockReviewDays: number;
  remainingQuestions: number;
  dailyQuestions: number;
  dailyReview: number;
  dailyWrongReview: number;
  dailySavedReview: number;
  dailyCapacity: number;
  dailyWorkloadUnits: number;
  estimatedDailyMinutes: number;
  rescheduleRecommended: boolean;
  mockExams: number;
  risk: 'Relaxed' | 'Steady' | 'Tight' | 'High pressure';
  phase: string;
  weeklyQuestions: number;
  todayAnswered: number;
  todayRemaining: number;
  todayPercent: number;
  sessionSize: number;
  planRows: Array<{ label: string; focus: string; workload: string }>;
};

type PlanOption = PlanMath & {
  type: PlanType;
  name: string;
  bestFor: string;
  recommendationReason: string;
  finishBufferDays: number;
  isRecommended: boolean;
};

type StudyPlanPageProps = {
  session: Session;
  initialPlan: StudyPlan | null;
  mode: 'onboarding' | 'profile';
  snapshot: StudySnapshot;
  onSave: (plan: StudyPlan) => void;
  onClose?: () => void;
};

type LocalProfile = {
  avatarDataUrl?: string;
  signature: string;
};

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function defaultExamDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function defaultExamTime() {
  return '09:00';
}

function normalizeDailyMinutes(value: number) {
  if (!Number.isFinite(value)) return 60;
  return Math.min(720, Math.max(0, Math.round(value)));
}

function normalizeNonNegativeInteger(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function userTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time';
}

function localDateTime(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hour, minute] = (timeValue || defaultExamTime()).split(':').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0, 0);
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function countAvailableStudyDays(planDays: number, daysPerWeek: number) {
  if (daysPerWeek >= 7) return Math.max(1, planDays);
  if (daysPerWeek <= 0) return 1;
  const fullWeeks = Math.floor(planDays / 7);
  const remainderDays = planDays % 7;
  const weeklyDays = Math.min(7, Math.max(1, daysPerWeek));
  return Math.max(1, fullWeeks * weeklyDays + Math.min(remainderDays, weeklyDays));
}

function planStructure(type: PlanType | undefined, effectiveStudyDays: number) {
  const selected = type ?? 'balanced';
  const config = {
    balanced: { coverageRatio: 20 / 35, mockRatio: 5 / 35, finalRatio: 2 / 35, mockExamRatio: 3 / 35 },
    buffer: { coverageRatio: 16 / 35, mockRatio: 7 / 35, finalRatio: 3 / 35, mockExamRatio: 4 / 35 },
    minimum: { coverageRatio: 23 / 35, mockRatio: 4 / 35, finalRatio: 1 / 35, mockExamRatio: 2 / 35 },
    grand: { coverageRatio: 15 / 35, mockRatio: 4 / 35, finalRatio: 1 / 35, mockExamRatio: 5 / 35 },
  }[selected];

  const coverageStudyDays = Math.min(
    Math.max(1, Math.round(effectiveStudyDays * config.coverageRatio)),
    Math.max(1, effectiveStudyDays),
  );
  const remainingDays = Math.max(0, effectiveStudyDays - coverageStudyDays);
  const desiredFinalReviewDays = Math.max(1, Math.round(effectiveStudyDays * config.finalRatio));
  const desiredMockReviewDays = Math.max(1, Math.round(effectiveStudyDays * config.mockRatio));
  const finalReviewDays = remainingDays === 0 ? 0 : Math.min(desiredFinalReviewDays, remainingDays);
  const mockReviewDays = Math.min(desiredMockReviewDays, Math.max(0, remainingDays - finalReviewDays));
  const reviewBlockDays = Math.max(0, effectiveStudyDays - coverageStudyDays - mockReviewDays - finalReviewDays);
  const mockCapacity = Math.max(1, mockReviewDays);
  const desiredMockExams = Math.max(1, Math.round(effectiveStudyDays * config.mockExamRatio));
  const minMockExams = selected === 'grand' ? Math.min(4, mockCapacity) : 1;
  const mockExams = Math.max(minMockExams, Math.min(mockCapacity, desiredMockExams));

  return { coverageStudyDays, reviewBlockDays, mockReviewDays, finalReviewDays, mockExams };
}

function estimateRecommendedExamDate({
  planType,
  dailyMinutes,
  daysPerWeek,
  level,
  snapshot,
}: {
  planType: PlanType;
  dailyMinutes: number;
  daysPerWeek: number;
  level: StudyLevel;
  snapshot: StudySnapshot;
}) {
  const remainingQuestions = Math.max(0, TOTAL_QUESTIONS - snapshot.mastered);
  const speedByLevel: Record<StudyLevel, number> = { new: 2.4, reviewing: 1.8, cram: 1.35 };
  const dailyCapacity = Math.max(1, Math.floor(dailyMinutes / speedByLevel[level]));
  const reviewLoad = snapshot.wrongCount * 2 + snapshot.savedCount * 2;
  const reviewEquivalent = Math.ceil(reviewLoad / Math.max(10, Math.floor(dailyCapacity * 0.65)));
  const desiredDailyNew =
    planType === 'grand'
      ? Math.max(40, Math.floor(dailyCapacity * 0.55))
      : planType === 'buffer'
        ? Math.max(35, Math.floor(dailyCapacity * 0.5))
        : planType === 'balanced'
          ? Math.max(30, Math.floor(dailyCapacity * 0.42))
          : Math.max(24, Math.floor(dailyCapacity * 0.35));
  const coverageDays = Math.ceil(remainingQuestions / Math.max(1, desiredDailyNew));
  const structure = planStructure(planType, 35);
  const phaseRatio = structure.coverageStudyDays / 35;
  const studyDaysNeeded = Math.max(
    coverageDays + reviewEquivalent,
    Math.ceil(coverageDays / Math.max(0.2, phaseRatio)),
  );
  const planDaysNeeded = Math.ceil(studyDaysNeeded / Math.min(1, Math.max(0.15, daysPerWeek / 7))) + 1;
  const recommended = addDays(startOfLocalDay(new Date()), planDaysNeeded + 1);

  return {
    date: `${recommended.getFullYear()}-${String(recommended.getMonth() + 1).padStart(2, '0')}-${String(recommended.getDate()).padStart(2, '0')}`,
    time: defaultExamTime(),
    dailyNew: desiredDailyNew,
    studyDaysNeeded,
    planDaysNeeded,
  };
}

export function getStudyPlanKey(userId: string) {
  return `studycouch_study_plan:${userId}`;
}

export function readStudyPlan(userId: string): StudyPlan | null {
  try {
    const raw = localStorage.getItem(getStudyPlanKey(userId));
    if (!raw) return null;
    const plan = JSON.parse(raw) as StudyPlan;
    if (!plan.examDate || !plan.dailyMinutes || !plan.daysPerWeek) return null;
    return {
      ...plan,
      examTime: plan.examTime ?? defaultExamTime(),
      planType: plan.planType ?? 'balanced',
      customDailyQuestions: plan.version >= 2 ? plan.customDailyQuestions : undefined,
      customDailyReview: plan.version >= 2 ? plan.customDailyReview : undefined,
    };
  } catch {
    return null;
  }
}

export function saveStudyPlan(userId: string, plan: StudyPlan) {
  localStorage.setItem(getStudyPlanKey(userId), JSON.stringify(plan));
}

function getLocalProfileKey(userId: string) {
  return `studycouch_local_profile:${userId}`;
}

function readLocalProfile(userId: string): LocalProfile {
  try {
    const raw = localStorage.getItem(getLocalProfileKey(userId));
    if (!raw) return { signature: 'Small daily reps. Real exam confidence.' };
    const profile = JSON.parse(raw) as LocalProfile;
    return {
      avatarDataUrl: profile.avatarDataUrl,
      signature: profile.signature || 'Small daily reps. Real exam confidence.',
    };
  } catch {
    return { signature: 'Small daily reps. Real exam confidence.' };
  }
}

function saveLocalProfile(userId: string, profile: LocalProfile) {
  localStorage.setItem(getLocalProfileKey(userId), JSON.stringify(profile));
}

export function readStudySnapshot(): StudySnapshot {
  try {
    const activeProfile = localStorage.getItem('clf_active_profile') || 'default';
    const storageKey = activeProfile === 'default' ? 'clf_en3' : `clf_en3:profile:${activeProfile}`;
    const raw = localStorage.getItem(storageKey) || localStorage.getItem('clf_en3');
    const data = raw ? JSON.parse(raw) : {};
    const totalDone = Number(data.totalDone || 0);
    const totalRight = Number(data.totalRight || 0);
    const todayDone = Number((data.dailyCount || {})[todayString()] || 0);
    return {
      mastered: Object.keys(data.correctMap || {}).length,
      totalDone,
      todayAnswered: todayDone,
      wrongCount: Object.keys(data.wrongMap || {}).length,
      savedCount: Object.keys(data.bmMap || {}).length,
      accuracy: totalDone > 0 ? Math.round((totalRight / totalDone) * 100) : null,
    };
  } catch {
    return { mastered: 0, totalDone: 0, todayAnswered: 0, wrongCount: 0, savedCount: 0, accuracy: null };
  }
}

function basePlanInputs(plan: Pick<StudyPlan, 'examDate' | 'examTime' | 'dailyMinutes' | 'daysPerWeek' | 'targetScore' | 'level'>) {
  const now = new Date();
  const exam = localDateTime(plan.examDate, plan.examTime);
  const hoursUntilExam = Math.max(1, Math.ceil((exam.getTime() - now.getTime()) / 3_600_000));
  const calendarDays = Math.max(1, Math.ceil(hoursUntilExam / 24));
  const tomorrow = addDays(startOfLocalDay(now), 1);
  const examDayStart = startOfLocalDay(exam);
  const planDays = Math.max(1, Math.ceil((examDayStart.getTime() - tomorrow.getTime()) / 86_400_000));
  const effectiveStudyDays = countAvailableStudyDays(planDays, plan.daysPerWeek);
  const speedByLevel: Record<StudyLevel, number> = { new: 2.4, reviewing: 1.8, cram: 1.35 };
  const minutesPerQuestion = speedByLevel[plan.level];
  const dailyCapacity = Math.max(1, Math.floor(normalizeDailyMinutes(plan.dailyMinutes) / minutesPerQuestion));

  return { hoursUntilExam, calendarDays, planDays, effectiveStudyDays, dailyCapacity, minutesPerQuestion };
}

export function calculatePlan(
  plan: Pick<StudyPlan, 'examDate' | 'examTime' | 'dailyMinutes' | 'daysPerWeek' | 'targetScore' | 'level'> & {
    planType?: PlanType;
    customDailyQuestions?: number;
    customDailyReview?: number;
  },
  snapshot: StudySnapshot,
): PlanMath {
  const { hoursUntilExam, calendarDays, planDays, effectiveStudyDays, dailyCapacity, minutesPerQuestion } = basePlanInputs(plan);
  const remainingQuestions = Math.max(0, TOTAL_QUESTIONS - snapshot.mastered);
  const { coverageStudyDays, reviewBlockDays, mockReviewDays, finalReviewDays, mockExams } = planStructure(
    plan.planType,
    effectiveStudyDays,
  );
  const plannedStudyDays = coverageStudyDays;
  const generatedDailyQuestions = Math.ceil(remainingQuestions / plannedStudyDays);
  const dailyQuestions = Math.max(1, normalizeNonNegativeInteger(plan.customDailyQuestions || generatedDailyQuestions));
  const reviewRatio =
    plan.planType === 'grand'
      ? 0.85
      : plan.planType === 'buffer'
        ? 0.28
        : plan.planType === 'balanced'
          ? 0.35
          : plan.level === 'cram'
            ? 0.5
            : 0.4;
  const dedicatedReviewDays = Math.max(1, reviewBlockDays + mockReviewDays + finalReviewDays);
  const dailyWrongReview = Math.ceil(snapshot.wrongCount / dedicatedReviewDays);
  const dailySavedReview = Math.ceil(snapshot.savedCount / dedicatedReviewDays);
  const generatedDailyReview = Math.max(5, dailyWrongReview + dailySavedReview + Math.ceil(dailyQuestions * reviewRatio));
  const dailyReview = normalizeNonNegativeInteger(plan.customDailyReview ?? generatedDailyReview);
  const dailyWorkloadUnits = dailyQuestions + Math.ceil(dailyReview * 0.55);
  const estimatedDailyMinutes = Math.ceil(dailyWorkloadUnits * minutesPerQuestion);
  const loadRatio = dailyWorkloadUnits / Math.max(1, dailyCapacity);
  const risk =
    loadRatio <= 0.65 ? 'Relaxed' : loadRatio <= 0.95 ? 'Steady' : loadRatio <= 1.25 ? 'Tight' : 'High pressure';
  const rescheduleRecommended = loadRatio > 1.25 || estimatedDailyMinutes > normalizeDailyMinutes(plan.dailyMinutes) * 1.25;
  const phase =
    calendarDays <= 7
      ? 'Final review'
      : calendarDays <= 21
        ? 'Practice and repair'
        : 'Coverage building';
  const todayAnswered = snapshot.todayAnswered;
  const todayRemaining = Math.max(0, dailyQuestions - todayAnswered);
  const todayPercent = Math.min(100, Math.round((todayAnswered / Math.max(1, dailyQuestions)) * 100));
  const sessionSize = Math.min(65, Math.max(10, dailyQuestions));
  const planRows = [
    {
      label: 'Question bank coverage',
      focus: `Use the first ${coverageStudyDays} available study day${coverageStudyDays === 1 ? '' : 's'} to complete first-pass coverage of the remaining question bank.`,
      workload: `${dailyQuestions} new questions/day`,
    },
    {
      label: 'Mistakes and saved review',
      focus: plan.planType === 'grand'
        ? `Use ${reviewBlockDays} dedicated review day${reviewBlockDays === 1 ? '' : 's'} for two passes over mistakes and saved questions, then compress anything still unstable into a Red List.`
        : `Use ${reviewBlockDays} dedicated review day${reviewBlockDays === 1 ? '' : 's'} plus daily repair to revisit about ${dailyWrongReview} mistake${dailyWrongReview === 1 ? '' : 's'} and ${dailySavedReview} saved question${dailySavedReview === 1 ? '' : 's'} per study day.`,
      workload: `${dailyReview} total review/day`,
    },
    {
      label: 'Mock test block',
      focus: `Reserve ${mockReviewDays} study day${mockReviewDays === 1 ? '' : 's'} for timed 65-question mock tests and same-day review.`,
      workload: `${mockExams} mock test${mockExams === 1 ? '' : 's'}`,
    },
    {
      label: 'Final review',
      focus: 'Use the final block for flagged explanations, weak categories, and light confidence checks before the exam time.',
      workload: `${finalReviewDays} final review day${finalReviewDays === 1 ? '' : 's'}`,
    },
  ];

  return {
    hoursUntilExam,
    calendarDays,
    planDays,
    effectiveStudyDays,
    coverageStudyDays,
    reviewBlockDays,
    finalReviewDays,
    mockReviewDays,
    remainingQuestions,
    dailyQuestions,
    dailyReview,
    dailyWrongReview,
    dailySavedReview,
    dailyCapacity,
    dailyWorkloadUnits,
    estimatedDailyMinutes,
    rescheduleRecommended,
    mockExams,
    risk,
    phase,
    weeklyQuestions: dailyQuestions * plan.daysPerWeek,
    todayAnswered,
    todayRemaining,
    todayPercent,
    sessionSize,
    planRows,
  };
}

function buildPlanOptions(
  plan: Pick<StudyPlan, 'examDate' | 'examTime' | 'dailyMinutes' | 'daysPerWeek' | 'targetScore' | 'level'>,
  snapshot: StudySnapshot,
): PlanOption[] {
  const { effectiveStudyDays, dailyCapacity } = basePlanInputs(plan);
  const definitions: Array<Pick<PlanOption, 'type' | 'name' | 'bestFor'>> = [
    {
      type: 'balanced',
      name: 'Plan A - Steady Pass',
      bestFor: 'Best if you can study consistently and want the safest balance: finish coverage first, then repair mistakes and simulate.',
    },
    {
      type: 'buffer',
      name: 'Plan B - Score Builder',
      bestFor: 'Best if you can invest more time daily and want a stronger score cushion through earlier coverage and more review.',
    },
    {
      type: 'minimum',
      name: 'Plan C - Flexible Baseline',
      bestFor: 'Best if your schedule is unstable and you need a lower daily floor with room to catch up on better days.',
    },
    {
      type: 'grand',
      name: 'Plan D - Full Coverage',
      bestFor: 'Best if you want maximum exam-day confidence: full question-bank coverage, two review passes, mock tests, and a final Red List review.',
    },
  ];

  const options = definitions.map((definition) => {
    const math = calculatePlan({ ...plan, planType: definition.type }, snapshot);
    return {
      ...math,
      ...definition,
      finishBufferDays: Math.max(0, math.finalReviewDays + math.mockReviewDays),
      recommendationReason: '',
      isRecommended: false,
    };
  });

  const withinCapacity = options.filter((option) => option.dailyQuestions <= dailyCapacity);
  const recommended =
    withinCapacity.find((option) => option.type === 'balanced') ??
    withinCapacity.find((option) => option.type === 'minimum') ??
    options.find((option) => option.type === 'minimum') ??
    options[0];

  return options.map((option) => ({
    ...option,
    isRecommended: option.type === recommended.type,
    recommendationReason:
      option.type === recommended.type
        ? option.type === 'balanced'
          ? `Recommended because it finishes coverage in ${option.coverageStudyDays} study days, keeps ${option.mockReviewDays} days for mock practice, and fits your estimated capacity of ${dailyCapacity}.`
          : option.type === 'buffer'
            ? `Recommended because your time budget can support ${option.dailyQuestions} new questions/day and leaves the longest repair window.`
            : option.type === 'grand'
              ? `Recommended because your time budget can support ${option.dailyQuestions} new questions/day, plus two review passes and ${option.mockExams} mock tests.`
              : `Recommended because your current time budget is tight, so this keeps the daily target closest to your estimated capacity of ${dailyCapacity}.`
        : '',
  }));
}

function getAdjustmentAdvice(planMath: PlanMath) {
  const loadRatio = planMath.dailyWorkloadUnits / Math.max(1, planMath.dailyCapacity);
  const requiredDaily = Math.ceil(planMath.remainingQuestions / Math.max(1, planMath.coverageStudyDays));
  if (planMath.dailyQuestions < requiredDaily) {
    return `This custom target is too low to finish the remaining question bank before your mock/final review blocks. Raise it to at least ${requiredDaily} new questions/day, or move the exam date later.`;
  }
  if (loadRatio > 1.25) {
    return `This is too tight: the plan needs about ${planMath.estimatedDailyMinutes} minutes/day for new questions and review, above your current study-time budget. Consider increasing study time or rescheduling the CLF-C02 exam.`;
  }
  if (planMath.dailyReview < Math.ceil(planMath.dailyQuestions * 0.25)) {
    return 'Review looks light. Add more missed or saved questions if your accuracy is below your target score.';
  }
  if (loadRatio < 0.65 && planMath.remainingQuestions > 0) {
    return 'This is comfortable. You can keep the extra buffer for review days or raise the daily target slightly to finish earlier.';
  }
  return 'This adjustment is balanced for your current inputs: it leaves room for new questions, review, and mock practice.';
}

function FieldLabel({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-stone-500">
      {icon}
      {children}
    </label>
  );
}

export function StudyPlanMiniCard({
  plan,
  snapshot,
  onOpen,
}: {
  plan: StudyPlan;
  snapshot: StudySnapshot;
  onOpen: () => void;
}) {
  const planMath = calculatePlan(plan, snapshot);

  return (
    <section className="fixed bottom-4 right-4 z-[125] w-[min(360px,calc(100vw-2rem))] rounded-lg border border-stone-200 bg-white p-3 text-stone-950 shadow-lg sp-mini-card">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.1em] text-teal-700">Today's plan</div>
          <div className="text-sm font-bold">{planMath.todayAnswered} / {planMath.dailyQuestions} questions</div>
        </div>
        <button
          type="button"
          className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-bold text-stone-700 transition-colors hover:bg-stone-100"
          onClick={onOpen}
        >
          Adjust
        </button>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-200">
        <div className="h-full rounded-full bg-teal-700" style={{ width: `${planMath.todayPercent}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
        <span>{planMath.todayRemaining} left today</span>
        <span>{planMath.risk}</span>
      </div>
    </section>
  );
}

export default function StudyPlanPage({
  session,
  initialPlan,
  mode,
  snapshot,
  onSave,
  onClose,
}: StudyPlanPageProps) {
  const [examDate, setExamDate] = useState(initialPlan?.examDate ?? defaultExamDate());
  const [examTime, setExamTime] = useState(initialPlan?.examTime ?? defaultExamTime());
  const [dailyMinutes, setDailyMinutes] = useState(normalizeDailyMinutes(initialPlan?.dailyMinutes ?? 60));
  const [daysPerWeek, setDaysPerWeek] = useState(initialPlan?.daysPerWeek ?? 6);
  const [targetScore, setTargetScore] = useState(initialPlan?.targetScore ?? 85);
  const [level, setLevel] = useState<StudyLevel>(initialPlan?.level ?? 'reviewing');
  const [selectedPlanType, setSelectedPlanType] = useState<PlanType>(initialPlan?.planType ?? 'balanced');
  const [customDailyQuestions, setCustomDailyQuestions] = useState<number | undefined>(initialPlan?.customDailyQuestions);
  const [customDailyReview, setCustomDailyReview] = useState<number | undefined>(initialPlan?.customDailyReview);
  const [isConfirmed, setIsConfirmed] = useState(Boolean(initialPlan));
  const [saved, setSaved] = useState(false);
  const [isEditingSignature, setIsEditingSignature] = useState(false);
  const [signatureDraft, setSignatureDraft] = useState('');
  const [examRecommendation, setExamRecommendation] = useState<ReturnType<typeof estimateRecommendedExamDate> | null>(null);

  const displayName = session.user.user_metadata?.full_name ?? session.user.email?.split('@')[0] ?? 'Student';
  const [localProfile, setLocalProfile] = useState(() => readLocalProfile(session.user.id));
  const avatarSrc =
    localProfile.avatarDataUrl || session.user.user_metadata?.avatar_url || undefined;
  const planOptions = useMemo(
    () => buildPlanOptions({ examDate, examTime, dailyMinutes, daysPerWeek, targetScore, level }, snapshot),
    [dailyMinutes, daysPerWeek, examDate, examTime, level, snapshot, targetScore],
  );
  const selectedOption = planOptions.find((option) => option.type === selectedPlanType) ?? planOptions[0];
  const planMath = useMemo(
    () =>
      calculatePlan(
        {
          examDate,
          examTime,
          dailyMinutes,
          daysPerWeek,
          targetScore,
          level,
          planType: selectedPlanType,
          customDailyQuestions,
          customDailyReview,
        },
        snapshot,
      ),
    [customDailyQuestions, customDailyReview, dailyMinutes, daysPerWeek, examDate, examTime, level, selectedPlanType, snapshot, targetScore],
  );
  const adjustmentAdvice = useMemo(() => getAdjustmentAdvice(planMath), [planMath]);

  function resetGeneratedPlan() {
    setIsConfirmed(false);
    setCustomDailyQuestions(undefined);
    setCustomDailyReview(undefined);
  }

  function handleConfirmInputs() {
    const recommended = planOptions.find((option) => option.isRecommended) ?? planOptions[0];
    setSelectedPlanType(recommended.type);
    setCustomDailyQuestions(recommended.dailyQuestions);
    setCustomDailyReview(recommended.dailyReview);
    setIsConfirmed(true);
  }

  function choosePlan(type: PlanType) {
    const option = planOptions.find((item) => item.type === type) ?? planOptions[0];
    setSelectedPlanType(option.type);
    setCustomDailyQuestions(option.dailyQuestions);
    setCustomDailyReview(option.dailyReview);
  }

  function recommendExamDate() {
    const recommendation = estimateRecommendedExamDate({
      planType: selectedPlanType,
      dailyMinutes,
      daysPerWeek,
      level,
      snapshot,
    });
    setExamRecommendation(recommendation);
    setExamDate(recommendation.date);
    setExamTime(recommendation.time);
    resetGeneratedPlan();
  }

  function handleSave() {
    const now = new Date().toISOString();
    onSave({
      version: PLAN_VERSION,
      examDate,
      examTime,
      dailyMinutes: normalizeDailyMinutes(dailyMinutes),
      daysPerWeek,
      targetScore,
      level,
      planType: selectedPlanType,
      customDailyQuestions: customDailyQuestions === undefined ? undefined : Math.max(1, normalizeNonNegativeInteger(customDailyQuestions)),
      customDailyReview: customDailyReview === undefined ? undefined : normalizeNonNegativeInteger(customDailyReview),
      createdAt: initialPlan?.createdAt ?? now,
      updatedAt: now,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function updateSignature(signature: string) {
    const nextProfile = { ...localProfile, signature };
    setLocalProfile(nextProfile);
    saveLocalProfile(session.user.id, nextProfile);
  }

  function startSignatureEdit() {
    setSignatureDraft(localProfile.signature);
    setIsEditingSignature(true);
  }

  function saveSignature() {
    updateSignature(signatureDraft.trim() || 'Small daily reps. Real exam confidence.');
    setIsEditingSignature(false);
  }

  function handleAvatarUpload(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const nextProfile = { ...localProfile, avatarDataUrl: String(reader.result) };
      setLocalProfile(nextProfile);
      saveLocalProfile(session.user.id, nextProfile);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="fixed inset-0 z-[220] overflow-y-auto bg-stone-50 text-stone-950 sp-page">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-700 text-white">
              <Target size={20} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-teal-700">
                {mode === 'onboarding' ? 'First study plan' : 'Profile and plan'}
              </p>
              <h1 className="text-2xl font-bold tracking-normal text-stone-950 sm:text-3xl">CLF-C02 Exam Plan</h1>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-600 shadow-sm transition-colors hover:bg-stone-100"
              onClick={onClose}
              aria-label="Close plan"
            >
              <X size={18} />
            </button>
          )}
        </header>

        <main className="grid flex-1 gap-4 lg:grid-cols-[1fr_390px]">
          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-5 border-b border-stone-200 pb-4">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-teal-700">Learning habits</p>
              <h2 className="mt-1 text-xl font-bold text-stone-950">Tell StudyCouch how you study</h2>
              <p className="mt-1 text-sm text-stone-500">
                Confirm these details first, then choose one of the generated plans below.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel icon={<CalendarDays size={14} />}>Exam date</FieldLabel>
                <input
                  className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold outline-none ring-teal-700 transition focus:ring-2"
                  type="date"
                  min={todayString()}
                  value={examDate}
                  onChange={(event) => {
                    setExamDate(event.target.value);
                    resetGeneratedPlan();
                  }}
                />
                <button
                  type="button"
                  className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-teal-700 bg-teal-50 px-3 text-xs font-bold text-teal-800 transition-colors hover:bg-teal-100"
                  onClick={recommendExamDate}
                >
                  Suggest an exam date
                </button>
                <a
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-xs font-bold text-stone-700 transition-colors hover:bg-stone-100"
                  href={AWS_CLF_C02_EXAM_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open AWS CLF-C02 exam site
                  <ExternalLink size={13} />
                </a>
                {examRecommendation && (
                  <div className="rounded-md bg-stone-100 px-3 py-2 text-xs font-semibold leading-5 text-stone-600">
                    Suggested {examRecommendation.date} based on about {examRecommendation.dailyNew} new questions/day,
                    {examRecommendation.studyDaysNeeded} study days, and your selected plan style.
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <FieldLabel icon={<Clock3 size={14} />}>Exam time</FieldLabel>
                <input
                  className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold outline-none ring-teal-700 transition focus:ring-2"
                  type="time"
                  value={examTime}
                  onChange={(event) => {
                    setExamTime(event.target.value);
                    resetGeneratedPlan();
                  }}
                />
                <div className="text-xs font-semibold text-stone-500">Calculated in your local timezone: {userTimeZone()}</div>
              </div>

              <div className="space-y-2">
                <FieldLabel icon={<Clock3 size={14} />}>Daily study time</FieldLabel>
                <div className="grid grid-cols-4 gap-2">
                  {[30, 60, 90, 120, 180, 240, 300].map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      className={`h-10 rounded-lg border text-sm font-bold transition-colors ${
                        dailyMinutes === minutes
                          ? 'border-teal-700 bg-teal-700 text-white'
                          : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100'
                      }`}
                      onClick={() => {
                        setDailyMinutes(minutes);
                        resetGeneratedPlan();
                      }}
                    >
                      {minutes}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold outline-none ring-teal-700 transition focus:ring-2"
                    type="number"
                    min={0}
                    max={720}
                    step={5}
                    value={dailyMinutes}
                    onChange={(event) => {
                      setDailyMinutes(normalizeDailyMinutes(Number(event.target.value)));
                      resetGeneratedPlan();
                    }}
                    onBlur={(event) => {
                      setDailyMinutes(normalizeDailyMinutes(Number(event.target.value)));
                    }}
                  />
                  <span className="shrink-0 text-xs font-bold uppercase tracking-[0.08em] text-stone-500">minutes</span>
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel icon={<BookOpen size={14} />}>Study days per week</FieldLabel>
                <div className="grid grid-cols-4 gap-2">
                  {[4, 5, 6, 7].map((days) => (
                    <button
                      key={days}
                      type="button"
                      className={`h-11 rounded-lg border text-sm font-bold transition-colors ${
                        daysPerWeek === days
                          ? 'border-teal-700 bg-teal-700 text-white'
                          : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100'
                      }`}
                      onClick={() => {
                        setDaysPerWeek(days);
                        resetGeneratedPlan();
                      }}
                    >
                      {days}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel icon={<Target size={14} />}>Target score</FieldLabel>
                <div className="grid grid-cols-4 gap-2">
                  {[75, 80, 85, 90].map((score) => (
                    <button
                      key={score}
                      type="button"
                      className={`h-11 rounded-lg border text-sm font-bold transition-colors ${
                        targetScore === score
                          ? 'border-teal-700 bg-teal-700 text-white'
                          : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100'
                      }`}
                      onClick={() => {
                        setTargetScore(score);
                        resetGeneratedPlan();
                      }}
                    >
                      {score}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <FieldLabel icon={<BookOpen size={14} />}>Preparation mode</FieldLabel>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  ['new', 'New learner'],
                  ['reviewing', 'Reviewing'],
                  ['cram', 'Final sprint'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`h-12 rounded-lg border px-3 text-sm font-bold transition-colors ${
                      level === value
                        ? 'border-teal-700 bg-teal-700 text-white'
                        : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100'
                    }`}
                    onClick={() => {
                      setLevel(value as StudyLevel);
                      resetGeneratedPlan();
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-stone-800"
                onClick={handleConfirmInputs}
              >
                <Check size={17} />
                Confirm details
              </button>
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-300"
                onClick={handleSave}
                disabled={!isConfirmed}
              >
                {saved ? <Check size={17} /> : <Save size={17} />}
                {saved ? 'Saved' : mode === 'onboarding' ? 'Save selected plan' : 'Save changes'}
              </button>
              {onClose && (
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 transition-colors hover:bg-stone-100"
                  onClick={onClose}
                >
                  Back to practice
                </button>
              )}
            </div>

            {isConfirmed && (
              <div className="mt-6 border-t border-stone-200 pt-5">
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-teal-700">Generated plans</p>
                    <h3 className="text-lg font-bold text-stone-950">Choose a plan level</h3>
                  </div>
                  <p className="text-sm text-stone-500">You can tune the selected plan after choosing.</p>
                </div>

                <div className="grid gap-3 xl:grid-cols-2">
                  {planOptions.map((option) => (
                    <button
                      key={option.type}
                      type="button"
                      className={`flex min-h-[260px] flex-col rounded-lg border p-4 text-left transition-colors ${
                        selectedPlanType === option.type
                          ? 'border-teal-700 bg-teal-50'
                          : 'border-stone-200 bg-white hover:bg-stone-50'
                      }`}
                      onClick={() => choosePlan(option.type)}
                    >
                      <div>
                        <div className="flex min-h-14 flex-col items-start gap-2">
                          <div className="text-base font-bold leading-snug text-stone-950">{option.name}</div>
                          {option.isRecommended && (
                            <span className="rounded-md bg-teal-700 px-2 py-1 text-[11px] font-bold text-white">
                              Recommended
                            </span>
                          )}
                        </div>
                        <div className="mt-3 text-sm leading-6 text-stone-500">{option.bestFor}</div>
                      </div>
                      <div className="mt-auto pt-4">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="min-w-0 rounded-md bg-white/80 p-2">
                            <div className="text-lg font-bold">{option.dailyQuestions}</div>
                            <div className="truncate text-[10px] font-semibold uppercase text-stone-500">New</div>
                          </div>
                          <div className="min-w-0 rounded-md bg-white/80 p-2">
                            <div className="text-lg font-bold">{option.dailyReview}</div>
                            <div className="truncate text-[10px] font-semibold uppercase text-stone-500">Review</div>
                          </div>
                        <div className="min-w-0 rounded-md bg-white/80 p-2">
                          <div className="text-lg font-bold">{option.finishBufferDays}</div>
                          <div className="truncate text-[10px] font-semibold uppercase text-stone-500">Review</div>
                        </div>
                        </div>
                        {option.isRecommended && (
                          <div className="mt-2 rounded-md bg-teal-100 px-2 py-1.5 text-xs font-semibold leading-5 text-teal-900">
                            {option.recommendationReason}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
                  <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-bold text-stone-950">Tune selected plan</div>
                      <div className="text-sm text-stone-500">Adjust the daily workload before saving.</div>
                    </div>
                    <span className="w-fit rounded-md bg-white px-2.5 py-1 text-xs font-bold text-teal-800">
                      {selectedOption.name}
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <FieldLabel icon={<BookOpen size={14} />}>New questions per day</FieldLabel>
                      <input
                        className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold outline-none ring-teal-700 transition focus:ring-2"
                        type="number"
                        min={0}
                        value={customDailyQuestions ?? planMath.dailyQuestions}
                        onChange={(event) => setCustomDailyQuestions(Math.max(1, normalizeNonNegativeInteger(Number(event.target.value))))}
                      />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel icon={<Target size={14} />}>Review questions per day</FieldLabel>
                      <input
                        className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold outline-none ring-teal-700 transition focus:ring-2"
                        type="number"
                        min={0}
                        value={customDailyReview ?? planMath.dailyReview}
                        onChange={(event) => setCustomDailyReview(normalizeNonNegativeInteger(Number(event.target.value)))}
                      />
                    </div>
                  </div>
                  <div className="mt-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-stone-700">
                    {adjustmentAdvice}
                  </div>
                  {planMath.rescheduleRecommended && (
                    <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm font-semibold leading-6 text-amber-950">
                      <div>
                        Your current CLF-C02 schedule looks overloaded: this plan estimates about {planMath.estimatedDailyMinutes}{' '}
                        minutes/day, while your study-time input is {dailyMinutes} minutes/day.
                      </div>
                      <a
                        className="mt-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-amber-900 underline-offset-4 hover:underline"
                        href={AWS_CLF_C02_RESCHEDULE_URL}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open AWS reschedule guidance
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-stone-100 text-stone-700">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt={`${displayName} avatar`} className="h-full w-full object-cover" />
                    ) : (
                      <UserRound size={28} />
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 shadow-sm transition-colors hover:bg-stone-100">
                    <Camera size={15} />
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleAvatarUpload(event.target.files?.[0])}
                    />
                  </label>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-bold">{displayName}</div>
                  <div className="truncate text-sm text-stone-500">{session.user.email}</div>
                  <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 text-xs font-bold text-teal-800">
                    <Target size={12} />
                    CLF-C02 candidate
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-stone-500">
                    <Quote size={14} />
                    Study signature
                  </div>
                  {!isEditingSignature && (
                    <button
                      type="button"
                      className="rounded-md border border-stone-300 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 transition-colors hover:bg-stone-100"
                      onClick={startSignatureEdit}
                    >
                      Edit
                    </button>
                  )}
                </div>
                {isEditingSignature ? (
                  <>
                    <textarea
                      className="min-h-20 w-full resize-none rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold leading-5 text-stone-800 outline-none ring-teal-700 transition focus:ring-2"
                      maxLength={120}
                      value={signatureDraft}
                      onChange={(event) => setSignatureDraft(event.target.value)}
                      placeholder="Write a short exam-day reminder..."
                    />
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold text-stone-400">{signatureDraft.length}/120</span>
                      <button
                        type="button"
                        className="rounded-md bg-teal-700 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-teal-800"
                        onClick={saveSignature}
                      >
                        Save
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg bg-white px-3 py-3 text-sm font-semibold leading-6 text-stone-800">
                    {localProfile.signature}
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-stone-100 px-3 py-2">
                  <div className="text-lg font-bold">{snapshot.mastered}</div>
                  <div className="text-[11px] font-semibold uppercase text-stone-500">Mastered</div>
                </div>
                <div className="rounded-md bg-stone-100 px-3 py-2">
                  <div className="text-lg font-bold">{snapshot.totalDone}</div>
                  <div className="text-[11px] font-semibold uppercase text-stone-500">Answered</div>
                </div>
                <div className="rounded-md bg-stone-100 px-3 py-2">
                  <div className="text-lg font-bold">{snapshot.accuracy ? `${snapshot.accuracy}%` : '-'}</div>
                  <div className="text-[11px] font-semibold uppercase text-stone-500">Accuracy</div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm">
                <div className="flex items-center justify-between rounded-md bg-stone-100 px-3 py-2">
                  <span className="text-stone-500">Target score</span>
                  <strong>{targetScore}%</strong>
                </div>
                <div className="flex items-center justify-between rounded-md bg-stone-100 px-3 py-2">
                  <span className="text-stone-500">Exam date</span>
                  <strong className="text-right">{examDate} {examTime}</strong>
                </div>
                <div className="flex items-center justify-between rounded-md bg-stone-100 px-3 py-2">
                  <span className="text-stone-500">Timezone</span>
                  <strong className="text-right">{userTimeZone()}</strong>
                </div>
                <div className="flex items-center justify-between rounded-md bg-stone-100 px-3 py-2">
                  <span className="text-stone-500">Saved questions</span>
                  <strong>{snapshot.savedCount}</strong>
                </div>
                <div className="flex items-center justify-between rounded-md bg-stone-100 px-3 py-2">
                  <span className="text-stone-500">Mistakes to repair</span>
                  <strong>{snapshot.wrongCount}</strong>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Current Plan</h2>
                  <p className="text-sm text-stone-500">Saved or selected plan status</p>
                </div>
                {isConfirmed && (
                  <span className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800">{planMath.risk}</span>
                )}
              </div>

              {!isConfirmed ? (
                <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4 text-center">
                  <div className="text-sm font-bold text-stone-950">Please choose a plan</div>
                  <div className="mt-1 text-sm text-stone-500">Confirm your learning habits to generate plan options.</div>
                </div>
              ) : (
                <div className="rounded-lg bg-stone-950 p-3 text-white">
                  <div className="text-xs font-bold uppercase tracking-[0.1em] text-teal-200">Selected</div>
                  <div className="mt-1 text-lg font-bold">{selectedOption.name}</div>
                  <div className="mt-1 text-sm text-stone-300">
                    {planMath.dailyQuestions} new/day, {planMath.dailyReview} review/day
                  </div>
                  <div className="mt-1 text-xs text-stone-400">
                    {planMath.mockExams} mock test{planMath.mockExams === 1 ? '' : 's'} + {planMath.finalReviewDays} final review day
                    {planMath.finalReviewDays === 1 ? '' : 's'}
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full rounded-full bg-teal-300" style={{ width: `${planMath.todayPercent}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-stone-300">
                    <span>Today {planMath.todayAnswered}/{planMath.dailyQuestions}</span>
                    <span>{planMath.todayRemaining} left</span>
                  </div>
                </div>
              )}
            </section>
          </aside>
        </main>

        {isConfirmed && (
          <section className="mt-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-teal-700">Selected plan details</p>
                <h2 className="text-xl font-bold text-stone-950">{selectedOption.name}</h2>
                <p className="mt-1 max-w-2xl text-sm text-stone-500">{selectedOption.bestFor}</p>
              </div>
              <span className="w-fit rounded-md bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800">{planMath.risk}</span>
            </div>

            {planMath.rescheduleRecommended && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-950">
                <div>
                  This CLF-C02 plan is likely too compressed for your current inputs. Based on your study time and study
                  days, StudyCouch estimates about {planMath.estimatedDailyMinutes} minutes/day. Consider moving the exam
                  date later, then regenerate the plan.
                </div>
                <a
                  className="mt-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-amber-900 underline-offset-4 hover:underline"
                  href={AWS_CLF_C02_RESCHEDULE_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  AWS reschedule guidance
                  <ExternalLink size={13} />
                </a>
              </div>
            )}

            <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
              <div className="rounded-lg bg-stone-950 p-4 text-white">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.1em] text-teal-200">Today progress</div>
                    <div className="text-2xl font-bold">{planMath.todayAnswered} / {planMath.dailyQuestions}</div>
                  </div>
                  <div className="text-right text-sm text-stone-300">
                    <div>{planMath.todayRemaining} left today</div>
                    <div>{planMath.todayPercent}% done</div>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full rounded-full bg-teal-300" style={{ width: `${planMath.todayPercent}%` }} />
                </div>
                <div className="mt-3 text-sm text-stone-300">
                  Today: {planMath.todayAnswered} / {planMath.dailyQuestions} new questions, plus {planMath.dailyReview}{' '}
                  review questions. Exam starts in about {planMath.hoursUntilExam} hours.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md bg-stone-100 p-3">
                  <div className="text-2xl font-bold">{planMath.dailyQuestions}</div>
                  <div className="text-xs font-semibold text-stone-500">New questions/day</div>
                </div>
                <div className="rounded-md bg-stone-100 p-3">
                  <div className="text-2xl font-bold">{planMath.dailyReview}</div>
                  <div className="text-xs font-semibold text-stone-500">Review/day</div>
                </div>
                <div className="rounded-md bg-stone-100 p-3">
                  <div className="text-2xl font-bold">{planMath.effectiveStudyDays}</div>
                  <div className="text-xs font-semibold text-stone-500">Available study days</div>
                </div>
                <div className="rounded-md bg-stone-100 p-3">
                  <div className="text-2xl font-bold">{planMath.mockExams}</div>
                  <div className="text-xs font-semibold text-stone-500">Mock exams</div>
                </div>
                <div className="rounded-md bg-stone-100 p-3">
                  <div className="text-2xl font-bold">{planMath.coverageStudyDays}</div>
                  <div className="text-xs font-semibold text-stone-500">Coverage days</div>
                </div>
                <div className="rounded-md bg-stone-100 p-3">
                  <div className="text-2xl font-bold">{planMath.finalReviewDays}</div>
                  <div className="text-xs font-semibold text-stone-500">Final review</div>
                </div>
                <div className="rounded-md bg-stone-100 p-3">
                  <div className="text-2xl font-bold">{planMath.reviewBlockDays}</div>
                  <div className="text-xs font-semibold text-stone-500">Repair days</div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-3 rounded-lg border border-stone-200 p-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-stone-500">Question bank</span>
                  <strong>{TOTAL_QUESTIONS}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-stone-500">Remaining</span>
                  <strong>{planMath.remainingQuestions}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-stone-500">Weekly load</span>
                  <strong>{planMath.weeklyQuestions}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-stone-500">Exam countdown</span>
                  <strong>{planMath.planDays} days / {planMath.hoursUntilExam} hours</strong>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-stone-500">Available study days</span>
                  <strong>{planMath.effectiveStudyDays}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-stone-500">Daily capacity</span>
                  <strong>{planMath.dailyCapacity}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-stone-500">Estimated daily time</span>
                  <strong>{planMath.estimatedDailyMinutes} min</strong>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-stone-500">Mistake review/day</span>
                  <strong>{planMath.dailyWrongReview}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-stone-500">Saved review/day</span>
                  <strong>{planMath.dailySavedReview}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-stone-500">Suggested session</span>
                  <strong>{planMath.sessionSize}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-stone-500">Current phase</span>
                  <strong>{planMath.phase}</strong>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {planMath.planRows.map((row) => (
                  <div key={row.label} className="rounded-lg border border-stone-200 p-3">
                    <div className="text-sm font-bold">{row.label}</div>
                    <div className="mt-1 text-xs font-bold text-teal-700">{row.workload}</div>
                    <div className="mt-2 text-sm text-stone-500">{row.focus}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
