import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import WidgetConfigPanel from '../widgets/WidgetConfigPanel';
import { loadWidgetsConfig, saveWidgetsConfig, type WidgetsConfig } from '../widgets/widgetSystem';
import { PALETTES, getSavedPalette } from '@/lib/theme';
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

type DomainStat = {
  id: 'tech' | 'security' | 'concepts' | 'billing';
  name: string;
  weight: number;
  total: number;
  right: number;
  wrong: number;
};

type DayPoint = { day: string; done: number; accuracy: number | null };

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
  onWidgetConfig?: (cfg: WidgetsConfig) => void;
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

function readDomainStats(): DomainStat[] {
  try {
    const raw = localStorage.getItem('clf_en3:domains');
    if (raw) return JSON.parse(raw) as DomainStat[];
  } catch {
    // fall through to seeded design data
  }
  return [
    { id: 'tech', name: 'Cloud Technology & Services', weight: 0.34, total: 11, right: 3, wrong: 8 },
    { id: 'security', name: 'Security & Compliance', weight: 0.30, total: 14, right: 4, wrong: 10 },
    { id: 'billing', name: 'Billing & Pricing', weight: 0.12, total: 6, right: 2, wrong: 4 },
    { id: 'concepts', name: 'Cloud Concepts', weight: 0.24, total: 9, right: 4, wrong: 5 },
  ];
}

function readSevenDayTrend(): DayPoint[] {
  try {
    const raw = localStorage.getItem('clf_en3:trend');
    if (raw) return JSON.parse(raw) as DayPoint[];
  } catch {
    // fall through to seeded design data
  }
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
  const values = [28, 31, null, 35, 38, 40, 44];
  return labels.map((day, index) => ({
    day,
    done: index === 6 ? 20 : 8 + index * 3,
    accuracy: values[index],
  }));
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

function getAdjustmentAdvice(planMath: PlanMath, selectedOption: PlanOption) {
  const loadRatio = planMath.dailyWorkloadUnits / Math.max(1, planMath.dailyCapacity);
  const requiredDaily = Math.ceil(planMath.remainingQuestions / Math.max(1, planMath.coverageStudyDays));
  const newDelta = planMath.dailyQuestions - selectedOption.dailyQuestions;
  const reviewDelta = planMath.dailyReview - selectedOption.dailyReview;
  const isPersonalized = newDelta !== 0 || reviewDelta !== 0;
  const direction =
    newDelta > 0
      ? `You added ${newDelta} new question${newDelta === 1 ? '' : 's'}/day`
      : newDelta < 0
        ? `You reduced new questions by ${Math.abs(newDelta)}/day`
        : 'You kept the original new-question target';
  const reviewDirection =
    reviewDelta > 0
      ? `and added ${reviewDelta} review question${reviewDelta === 1 ? '' : 's'}/day`
      : reviewDelta < 0
        ? `and reduced review by ${Math.abs(reviewDelta)}/day`
        : 'with the same review target';

  if (planMath.dailyQuestions < requiredDaily) {
    return `${direction} compared with ${selectedOption.name}, but this custom target is too low to finish the remaining question bank before mock/final review. Raise it to at least ${requiredDaily} new questions/day, or move the exam date later.`;
  }
  if (loadRatio > 1.25) {
    return `${direction} ${reviewDirection}. That makes the plan too tight at about ${planMath.estimatedDailyMinutes} minutes/day, above your current study-time budget. Reduce the daily load, increase study time, or reschedule the CLF-C02 exam.`;
  }
  if (planMath.dailyReview < Math.ceil(planMath.dailyQuestions * 0.25)) {
    return `${direction} ${reviewDirection}. The personalized plan can work, but review looks light. Add more missed or saved questions if your accuracy is below your target score.`;
  }
  if (loadRatio < 0.65 && planMath.remainingQuestions > 0) {
    return isPersonalized
      ? `${direction} ${reviewDirection}. This personalized version is comfortable, so you can keep the extra buffer for repair days or raise the daily target slightly to finish earlier.`
      : 'This is comfortable. You can keep the extra buffer for review days or raise the daily target slightly to finish earlier.';
  }
  return isPersonalized
    ? `${direction} ${reviewDirection}. This personalized version stays balanced for your current inputs and still leaves room for mock practice.`
    : 'This selected plan is balanced for your current inputs: it leaves room for new questions, review, and mock practice.';
}

function getPlanEncouragement(planMath: PlanMath) {
  if (planMath.todayRemaining === 0) {
    return 'Nice. Today is already covered, so protect your streak with a light review pass.';
  }
  if (planMath.risk === 'High pressure') {
    return 'This is a demanding day, but it is still concrete: finish one focused block first, then decide whether to continue.';
  }
  if (planMath.risk === 'Tight') {
    return 'Keep it simple today: complete the new-question target first, then use review to repair the highest-friction topics.';
  }
  if (planMath.risk === 'Relaxed') {
    return 'You have useful breathing room. Use it to build confidence, not to rush.';
  }
  return 'This is a steady plan. One complete session today keeps the whole journey moving.';
}

const RUBY = {
  bg: 'var(--sp-bg)',
  ink: 'var(--sp-ink)',
  accent: 'var(--sp-accent)',
  yellow: 'var(--sp-yellow)',
  green: 'var(--sp-green)',
  pink: 'var(--sp-pink)',
  paper: 'var(--sp-paper)',
};

function textOn(hex: string) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#1A150F' : '#FAF6E9';
}

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatExamDate(dateValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function marker(children: ReactNode) {
  return (
    <span className="sp-marker">
      <svg viewBox="0 0 100 30" preserveAspectRatio="none">
        <path
          d="M2 14 C 20 6, 50 22, 70 12 S 96 8, 98 16 L 98 22 C 80 28, 50 14, 30 22 S 4 26, 2 20 Z"
          fill={RUBY.yellow}
          opacity="0.55"
        />
      </svg>
      <span>{children}</span>
    </span>
  );
}

function CouchMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M4 20 L4 24 L28 24 L28 20 L24 20 L24 16 C24 13 22 11 18 11 L14 11 C10 11 8 13 8 16 L8 20 Z" fill={RUBY.accent} />
      <path d="M2 24 L30 24" stroke={RUBY.ink} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="6" r="1.5" fill={RUBY.ink} />
      <circle cx="23" cy="6" r="1.5" fill={RUBY.yellow} />
    </svg>
  );
}

function Pill({ label, value, tone = 'ink', big = false }: { label: string; value: string; tone?: 'ink' | 'accent' | 'green'; big?: boolean }) {
  return (
    <div className={`sp-pill sp-pill-${tone} ${big ? 'sp-pill-big' : ''}`}>
      <div>{label}</div>
      <strong>{value}</strong>
    </div>
  );
}

function Bar({ label, done, total, color, dark = false }: { label: string; done: number; total: number; color: string; dark?: boolean }) {
  const pct = Math.min(100, Math.round((done / Math.max(1, total)) * 100));
  return (
    <div>
      <div className={`sp-bar-label ${dark ? 'sp-dark-label' : ''}`}>
        <span>{label}</span>
        <span>{done}/{total} · {pct}%</span>
      </div>
      <div className={dark ? 'sp-progress-track-dark' : 'sp-progress-track'}>
        <div style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function DomainAnalytics({ snapshot, planMath }: { snapshot: StudySnapshot; planMath: PlanMath }) {
  const domains = readDomainStats()
    .map((domain) => {
      const accuracy = domain.total > 0 ? Math.round((domain.right / domain.total) * 100) : null;
      return {
        ...domain,
        accuracy,
        priority: (accuracy != null ? 100 - accuracy : 50) * (1 + domain.weight),
      };
    })
    .sort((a, b) => b.priority - a.priority);
  const trend = readSevenDayTrend();
  const first = trend.find((point) => point.accuracy != null)?.accuracy ?? 0;
  const last = [...trend].reverse().find((point) => point.accuracy != null)?.accuracy ?? 0;

  return (
    <section className="sp-section">
      <div className="sp-section-head">
        <div>
          <div className="sp-eyebrow">Analytics</div>
          <h2>Where you're <em>slipping</em></h2>
        </div>
        <p>Weighted by CLF-C02 exam blueprint. Fix the top row first — it's the biggest score lift.</p>
      </div>
      <div className="sp-analytics-grid">
        <div className="sp-data-card">
          <div className="sp-card-kicker"><span>Domain accuracy</span><span>Done · wrong · weight</span></div>
          {domains.map((domain, index) => {
            const acc = domain.accuracy ?? 0;
            const color = acc < 50 ? RUBY.accent : acc < 70 ? RUBY.yellow : RUBY.green;
            return (
              <div className="sp-domain-row" key={domain.id}>
                <div className="sp-domain-top">
                  <div>{index === 0 && <span className="sp-focus-chip">Focus</span>}<strong>{domain.name}</strong></div>
                  <span>{domain.total} · <b>{domain.wrong} wrong</b> · {Math.round(domain.weight * 100)}%</span>
                </div>
                <div className="sp-domain-meter">
                  <div className="sp-domain-track"><div style={{ width: `${acc}%`, background: color }} /><i style={{ left: `${domain.weight * 100}%` }} /></div>
                  <strong style={{ color }}>{domain.accuracy != null ? `${domain.accuracy}%` : '-'}</strong>
                </div>
              </div>
            );
          })}
        </div>
        <div className="sp-data-card sp-trend-card">
          <div className="sp-card-kicker"><span>Last 7 days · accuracy</span><span>{snapshot.accuracy ?? '-'}% overall</span></div>
          <TrendChart trend={trend} />
          <div className="sp-micro-grid">
            <div><strong>{planMath.todayAnswered}</strong><span>answered today</span></div>
            <div><strong className={last - first >= 0 ? 'sp-green' : ''}>{last - first >= 0 ? '+' : ''}{last - first}pp</strong><span>vs. 7 days ago</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrendChart({ trend }: { trend: DayPoint[] }) {
  const w = 280;
  const h = 88;
  const pad = 6;
  const xs = trend.map((_, index) => pad + (index / Math.max(1, trend.length - 1)) * (w - pad * 2));
  const pts = trend.map((point, index) => ({
    ...point,
    x: xs[index],
    y: point.accuracy == null ? null : h - pad - (point.accuracy / 100) * (h - pad * 2),
  }));
  let pathD = '';
  let started = false;
  pts.forEach((point) => {
    if (point.y == null) {
      started = false;
      return;
    }
    pathD += started ? `L ${point.x} ${point.y} ` : `M ${point.x} ${point.y} `;
    started = true;
  });
  const baselineY = h - pad - 0.5 * (h - pad * 2);
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h + 22}`} className="sp-trend">
      <line x1={pad} x2={w - pad} y1={baselineY} y2={baselineY} stroke={RUBY.ink} strokeOpacity="0.14" strokeDasharray="3 4" />
      <path d={pathD} fill="none" stroke={RUBY.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((point, index) => point.y == null ? null : (
        <circle key={point.day} cx={point.x} cy={point.y} r={index === pts.length - 1 ? 4 : 3} fill={index === pts.length - 1 ? RUBY.accent : RUBY.paper} stroke={RUBY.accent} strokeWidth="1.5" />
      ))}
      {pts.map((point, index) => (
        <text key={`${point.day}-label`} x={point.x} y={h + 14} textAnchor="middle" fontSize="10" fill={index === pts.length - 1 ? RUBY.accent : RUBY.ink} opacity={index === pts.length - 1 ? 1 : 0.7} fontWeight={index === pts.length - 1 ? 700 : 400}>{point.day}</text>
      ))}
      {last?.y != null && <text x={last.x} y={last.y - 8} textAnchor="middle" fontSize="11" fontWeight="600" fill={RUBY.accent}>{last.accuracy}%</text>}
    </svg>
  );
}

function PhaseTimeline({ planMath }: { planMath: PlanMath }) {
  const phases = [
    { name: 'Coverage', days: planMath.coverageStudyDays, color: RUBY.accent, fg: RUBY.bg },
    { name: 'Review block', days: planMath.reviewBlockDays, color: RUBY.yellow, fg: RUBY.ink },
    { name: 'Mock tests', days: planMath.mockReviewDays, color: RUBY.green, fg: RUBY.bg },
    { name: 'Final review', days: planMath.finalReviewDays, color: RUBY.pink, fg: RUBY.ink },
  ].filter((phase) => phase.days > 0);
  const total = phases.reduce((sum, phase) => sum + phase.days, 0) || 1;
  return (
    <div>
      <div className="sp-card-kicker"><span>Plan phases · {planMath.effectiveStudyDays} study days total</span><span>T-{planMath.calendarDays} days · {planMath.phase}</span></div>
      <div className="sp-phase-bar">
        {phases.map((phase) => (
          <div key={phase.name} style={{ flex: phase.days / total, background: phase.color, color: phase.fg }}>
            {phase.name} · {phase.days}d
          </div>
        ))}
      </div>
    </div>
  );
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

  // Bridge: keep legacy engine's pool-count display in sync with the active plan
  if (typeof window.studyCouchSetPlanTargets === 'function') {
    window.studyCouchSetPlanTargets(planMath.dailyQuestions, planMath.dailyReview);
  }

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

function EditGoalModal({
  plan,
  snapshot,
  onClose,
  onSave,
}: {
  plan: StudyPlan;
  snapshot: StudySnapshot;
  onClose: () => void;
  onSave: (plan: StudyPlan) => void;
}) {
  const [draft, setDraft] = useState<StudyPlan>(plan);
  const preview = useMemo(() => calculatePlan(draft, snapshot), [draft, snapshot]);
  const update = (patch: Partial<StudyPlan>) => setDraft((prev) => ({ ...prev, ...patch, customDailyQuestions: undefined, customDailyReview: undefined }));
  const segment = <T extends string | number>(value: T, label: string, current: T, onClick: () => void) => (
    <button type="button" className={value === current ? 'active' : ''} onClick={onClick}>{label}</button>
  );

  return (
    <div className="sp-modal" onClick={onClose}>
      <div className="sp-modal-card" onClick={(event) => event.stopPropagation()}>
        <header>
          <div><span>tell us how you study</span><h2>Edit your goal</h2></div>
          <button type="button" onClick={onClose}>×</button>
        </header>
        <div className="sp-modal-grid">
          <label>Exam date<input type="date" min={todayString()} value={draft.examDate} onChange={(event) => update({ examDate: event.target.value })} /></label>
          <label>Exam time<input type="time" value={draft.examTime} onChange={(event) => update({ examTime: event.target.value })} /></label>
          <div><span>Target score</span><div className="sp-segments">{[75, 80, 85, 90].map((score) => segment(score, `${score}%`, draft.targetScore, () => update({ targetScore: score })))}</div></div>
          <div><span>Days per week</span><div className="sp-segments">{[4, 5, 6, 7].map((days) => segment(days, String(days), draft.daysPerWeek, () => update({ daysPerWeek: days })))}</div></div>
          <div className="wide"><span>Daily study time</span><div className="sp-segments">{[30, 60, 120, 180, 240, 300].map((minutes) => segment(minutes, `${minutes}m`, draft.dailyMinutes, () => update({ dailyMinutes: minutes })))}</div></div>
          <div className="wide"><span>Preparation mode</span><div className="sp-segments">
            {segment('new', 'New learner', draft.level, () => update({ level: 'new' }))}
            {segment('reviewing', 'Reviewing', draft.level, () => update({ level: 'reviewing' }))}
            {segment('cram', 'Final sprint', draft.level, () => update({ level: 'cram' }))}
          </div></div>
        </div>
        <div className="sp-preview"><b>with these settings →</b><br />{preview.dailyQuestions} new + {preview.dailyReview} review per day · ~{formatMinutes(preview.estimatedDailyMinutes)}/day · {preview.risk.toLowerCase()}</div>
        <footer><button type="button" onClick={onClose}>Cancel</button><button type="button" onClick={() => onSave(draft)}>Save goal →</button></footer>
      </div>
    </div>
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
  const [picker, setPicker] = useState(!initialPlan);
  const [editingGoal, setEditingGoal] = useState(!initialPlan);
  const [toast, setToast] = useState('');
  const [localProfile, setLocalProfile] = useState(() => readLocalProfile(session.user.id));
  const planSectionRef = useRef<HTMLElement | null>(null);

  const displayName = session.user.user_metadata?.full_name ?? session.user.email?.split('@')[0] ?? 'Student';
  const avatarSrc = localProfile.avatarDataUrl || session.user.user_metadata?.avatar_url || undefined;
  const planOptions = useMemo(
    () => buildPlanOptions({ examDate, examTime, dailyMinutes, daysPerWeek, targetScore, level }, snapshot),
    [dailyMinutes, daysPerWeek, examDate, examTime, level, snapshot, targetScore],
  );
  const selectedOption = planOptions.find((option) => option.type === selectedPlanType) ?? planOptions[0];
  const planMath = useMemo(
    () => calculatePlan({ examDate, examTime, dailyMinutes, daysPerWeek, targetScore, level, planType: selectedPlanType, customDailyQuestions, customDailyReview }, snapshot),
    [customDailyQuestions, customDailyReview, dailyMinutes, daysPerWeek, examDate, examTime, level, selectedPlanType, snapshot, targetScore],
  );
  const adjustmentAdvice = useMemo(() => getAdjustmentAdvice(planMath, selectedOption), [planMath, selectedOption]);
  const planEncouragement = useMemo(() => getPlanEncouragement(planMath), [planMath]);
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const coveragePct = Math.round((snapshot.mastered / TOTAL_QUESTIONS) * 100);
  const palette = PALETTES[getSavedPalette()];
  const themeStyle = {
    '--sp-bg': palette.bg,
    '--sp-ink': palette.ink,
    '--sp-accent': palette.accent,
    '--sp-yellow': palette.yellow,
    '--sp-green': palette.green,
    '--sp-pink': palette.pink,
    '--sp-paper': palette.paper,
  } as CSSProperties;
  const currentPlan: StudyPlan = {
    version: PLAN_VERSION,
    examDate,
    examTime,
    dailyMinutes,
    daysPerWeek,
    targetScore,
    level,
    planType: selectedPlanType,
    customDailyQuestions,
    customDailyReview,
    createdAt: initialPlan?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  function persistPlan(overrides: Partial<StudyPlan> = {}) {
    const now = new Date().toISOString();
    onSave({
      ...currentPlan,
      ...overrides,
      createdAt: initialPlan?.createdAt ?? currentPlan.createdAt,
      updatedAt: now,
    });
  }

  function choosePlan(type: PlanType) {
    const option = planOptions.find((item) => item.type === type) ?? planOptions[0];
    setSelectedPlanType(option.type);
    setCustomDailyQuestions(option.dailyQuestions);
    setCustomDailyReview(option.dailyReview);
    setPicker(false);
    setToast(`Switched to ${option.name}`);
  }

  function handleAvatarUpload(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const nextProfile = { ...localProfile, avatarDataUrl: String(reader.result) };
      setLocalProfile(nextProfile);
      saveLocalProfile(session.user.id, nextProfile);
    };
    reader.readAsDataURL(file);
  }

  function handleGoalSave(draft: StudyPlan) {
    const nextPlan = {
      ...draft,
      customDailyQuestions: undefined,
      customDailyReview: undefined,
      updatedAt: new Date().toISOString(),
    };
    setExamDate(nextPlan.examDate);
    setExamTime(nextPlan.examTime);
    setDailyMinutes(nextPlan.dailyMinutes);
    setDaysPerWeek(nextPlan.daysPerWeek);
    setTargetScore(nextPlan.targetScore);
    setLevel(nextPlan.level);
    setCustomDailyQuestions(undefined);
    setCustomDailyReview(undefined);
    saveStudyPlan(session.user.id, nextPlan);
    setEditingGoal(false);
    setPicker(true);
    setToast('Goal saved. Choose the plan that fits best.');
    window.requestAnimationFrame(() => {
      planSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  return (
    <div className="fixed inset-0 z-[220] overflow-y-auto sp-redesign" style={themeStyle}>
      <div className="sp-shell">
        <header className="sp-topbar">
          <div className="sp-brand"><CouchMark /><span>StudyCouch</span><i /><b>{mode === 'onboarding' ? 'First study plan' : 'Profile & Plan'}</b></div>
          <button type="button" className="sp-close" onClick={onClose}>×</button>
        </header>

        <div className="sp-grid">
          <main>
            <section className="sp-hero">
              <div>
                <div className="sp-script">studying for</div>
                <h1>{marker('CLF-C02')}<em>· AWS Cloud Practitioner</em></h1>
                <div className="sp-pill-row">
                  <button type="button" onClick={() => setEditingGoal(true)}><Pill label="exam" value={formatExamDate(examDate)} /></button>
                  <button type="button" onClick={() => setEditingGoal(true)}><Pill label="t-minus" value={`${planMath.calendarDays} days`} tone="accent" big /></button>
                  <button type="button" onClick={() => setEditingGoal(true)}><Pill label="target" value={`${targetScore}%`} tone="green" /></button>
                  <button type="button" className="sp-edit-goal" onClick={() => setEditingGoal(true)}>✎ Edit goal</button>
                </div>
              </div>
            </section>

            <section className="sp-today">
              <div className="sp-today-card">
                <div className="sp-today-head"><span>today, {todayName}</span><b>Phase: {planMath.phase} · <em>{planMath.risk}</em></b></div>
                <h2><em>{planMath.todayRemaining} new</em>, <i>{planMath.dailyReview} review</i>, <strong>~{formatMinutes(planMath.estimatedDailyMinutes)}</strong>.</h2>
                <div className="sp-today-bars">
                  <Bar label="Today's new questions" done={planMath.todayAnswered} total={planMath.dailyQuestions} color={RUBY.yellow} dark />
                  <Bar label="Question bank coverage" done={snapshot.mastered} total={TOTAL_QUESTIONS} color={RUBY.green} dark />
                </div>
                <div className="sp-today-actions">
                  <button type="button" className="sp-primary" onClick={() => { persistPlan(); setToast(`Start session · ${planMath.sessionSize} questions`); }}>Start session · {planMath.sessionSize} questions →</button>
                  <button type="button" className="sp-rest" onClick={() => setToast('Rest day logged. Keep the plan gentle.')}>Log a rest day</button>
                  <p>"{planEncouragement}"</p>
                </div>
              </div>
            </section>

            <DomainAnalytics snapshot={snapshot} planMath={planMath} />

            <section className="sp-section" ref={planSectionRef}>
              <div className="sp-section-head">
                <div><div className="sp-eyebrow">Your plan</div><h2>{selectedOption.name}{selectedOption.isRecommended && <span className="sp-rec">recommended</span>}</h2></div>
                <button type="button" className="sp-change" onClick={() => setPicker((open) => !open)}>{picker ? 'Close picker' : 'Change plan →'}</button>
              </div>
              <div className="sp-plan-card">
                <p>{selectedOption.bestFor}</p>
                <PhaseTimeline planMath={planMath} />
                <div className="sp-plan-bottom">
                  <div>
                    <div className="sp-card-kicker">This plan, in numbers</div>
                    <div className="sp-number-table">
                      {[
                        [planMath.dailyQuestions, 'new/day'],
                        [planMath.dailyReview, 'review/day'],
                        [planMath.mockExams, 'mocks'],
                        [formatMinutes(planMath.estimatedDailyMinutes), 'est/day'],
                        [planMath.dailyCapacity, 'capacity'],
                      ].map(([value, label]) => <div key={label} className={label === 'capacity' ? 'subtle' : ''}><strong>{value}</strong><span>{label}</span></div>)}
                    </div>
                    <div className="sp-advice">{adjustmentAdvice}</div>
                  </div>
                  <div>
                    <div className="sp-card-kicker">Fine-tune today</div>
                    <label className="sp-slider"><span>New questions / day <b>{planMath.dailyQuestions}</b></span><input type="range" min={1} max={Math.max(300, planMath.dailyQuestions + 80)} value={planMath.dailyQuestions} onChange={(event) => setCustomDailyQuestions(Number(event.target.value))} /></label>
                    <label className="sp-slider"><span>Review / day <b>{planMath.dailyReview}</b></span><input type="range" min={0} max={Math.max(250, planMath.dailyReview + 60)} value={planMath.dailyReview} onChange={(event) => setCustomDailyReview(Number(event.target.value))} /></label>
                    <div className="sp-risk">Risk: <b>{planMath.risk}</b> · {planMath.coverageStudyDays}d coverage · {planMath.reviewBlockDays}d review · {planMath.mockReviewDays}d mocks · {planMath.finalReviewDays}d final</div>
                  </div>
                </div>
              </div>

              {picker && (
                <div className="sp-picker">
                  <div className="sp-picker-head"><span>Tap to switch</span><b>your capacity ≈ {planMath.dailyCapacity} q/day at {dailyMinutes}m study</b></div>
                  <div className="sp-picker-grid">
                    {planOptions.map((option, index) => {
                      const selected = option.type === selectedPlanType;
                      const over = option.dailyQuestions > planMath.dailyCapacity;
                      return (
                        <button key={option.type} type="button" className={`${selected ? 'selected' : ''} ${over ? 'over' : ''}`} onClick={() => choosePlan(option.type)}>
                          <div className="sp-plan-label"><span>Plan {String.fromCharCode(65 + index)}</span><i>{option.isRecommended && 'REC'}{over && ` OVER ${option.dailyQuestions - planMath.dailyCapacity}`}</i></div>
                          <h3>{option.name.replace(/^Plan [A-D] - /, '')}</h3>
                          <p>{option.bestFor}</p>
                          <div className="sp-mini-stats"><span><b>{option.dailyQuestions}</b>new</span><span><b>{option.dailyReview}</b>review</span><span><b>{option.mockExams}</b>mocks</span></div>
                          {selected && <em>✓</em>}
                        </button>
                      );
                    })}
                  </div>
                  <p>Plans marked OVER need more daily study time than you set — pick one within capacity or bump your daily minutes in goal settings.</p>
                </div>
              )}
            </section>

            <section className="sp-library sp-section">
              <div className="sp-eyebrow">Library</div>
              <h2>Pick up where you left off</h2>
              <div>
                {[
                  [snapshot.savedCount, 'Saved', 'Marked for later', RUBY.yellow],
                  [snapshot.wrongCount, 'Mistakes', 'Biggest score lift', RUBY.accent],
                  [snapshot.mastered, 'Mastered', `of ${TOTAL_QUESTIONS} total`, RUBY.green],
                ].map(([value, label, sub, color]) => (
                  <button type="button" key={label} style={{ borderLeftColor: String(color) }}>
                    <span><strong>{value}</strong><b>{label}</b><i>{sub}</i></span><em>↗</em>
                  </button>
                ))}
              </div>
            </section>
          </main>

          <aside className="sp-sidebar">
            <section className="sp-profile-card">
              <div>
                <div className="sp-avatar">
                  {avatarSrc ? <img src={avatarSrc} alt={`${displayName} avatar`} /> : displayName.charAt(0).toUpperCase()}
                  <label><Camera size={13} /><input className="sr-only" type="file" aria-label="Upload avatar photo" accept="image/*" onChange={(event) => handleAvatarUpload(event.target.files?.[0])} /></label>
                </div>
                <div><h2>{displayName}</h2><p>{session.user.email}</p></div>
              </div>
              <span><i /> CLF-C02 candidate</span>
            </section>
            <section className="sp-side-card">
              <div className="sp-card-kicker">Progress</div>
              <div className="sp-progress-stats"><div><strong>{snapshot.mastered}</strong><span>mastered</span></div><div><strong>{snapshot.totalDone}</strong><span>answered</span></div><div><strong className={(snapshot.accuracy ?? 0) < 60 ? 'sp-red' : 'sp-green'}>{snapshot.accuracy ? `${snapshot.accuracy}%` : '-'}</strong><span>accuracy</span></div></div>
              <div className="sp-progress-track"><div style={{ width: `${coveragePct}%`, background: RUBY.green }} /></div>
              <div className="sp-progress-caption"><span>{snapshot.mastered} / {TOTAL_QUESTIONS}</span><span>{coveragePct}% of bank</span></div>
            </section>
            <section className="sp-side-card">
              <div className="sp-schedule-head"><div className="sp-card-kicker">Schedule</div><button type="button" onClick={() => setEditingGoal(true)}>edit</button></div>
              {[
                ['Daily study', `${dailyMinutes} min`],
                ['Days per week', `${daysPerWeek} days`],
                ['Mode', level === 'new' ? 'New learner' : level === 'reviewing' ? 'Reviewing' : 'Final sprint'],
                ['Timezone', userTimeZone().split('/').pop() ?? userTimeZone()],
              ].map(([label, value]) => <div className="sp-setting-row" key={label}><span>{label}</span><b>{value}</b></div>)}
            </section>
            <section className="sp-streak"><div>●●●●●○○</div><p>5-day streak. keep going.</p></section>
          </aside>
        </div>
      </div>

      {editingGoal && (
        <EditGoalModal
          plan={currentPlan}
          snapshot={snapshot}
          onClose={() => setEditingGoal(false)}
          onSave={handleGoalSave}
        />
      )}
      {toast && <div className="sp-toast" onAnimationEnd={() => setToast('')}>{toast}</div>}
    </div>
  );
}

function LegacyStudyPlanPage({
  session,
  initialPlan,
  mode,
  snapshot,
  onSave,
  onClose,
  onWidgetConfig,
}: StudyPlanPageProps) {
  const [widgetConfig, setWidgetConfig] = useState<WidgetsConfig>(loadWidgetsConfig);

  const handleWidgetConfig = (cfg: WidgetsConfig) => {
    saveWidgetsConfig(cfg);
    setWidgetConfig(cfg);
    onWidgetConfig?.(cfg);
  };
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
  const [showingInputForm, setShowingInputForm] = useState(!initialPlan);
  const [showingPlanPicker, setShowingPlanPicker] = useState(false);
  const [showingPlanDetails, setShowingPlanDetails] = useState(false);
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
  const adjustmentAdvice = useMemo(() => getAdjustmentAdvice(planMath, selectedOption), [planMath, selectedOption]);
  const planEncouragement = useMemo(() => getPlanEncouragement(planMath), [planMath]);

  function resetGeneratedPlan() {
    setIsConfirmed(false);
    setShowingPlanPicker(false);
    setCustomDailyQuestions(undefined);
    setCustomDailyReview(undefined);
  }

  function handleConfirmInputs() {
    const recommended = planOptions.find((option) => option.isRecommended) ?? planOptions[0];
    setSelectedPlanType(recommended.type);
    setCustomDailyQuestions(recommended.dailyQuestions);
    setCustomDailyReview(recommended.dailyReview);
    setIsConfirmed(true);
    setShowingInputForm(false);
    setShowingPlanPicker(true);
  }

  function choosePlan(type: PlanType) {
    const option = planOptions.find((item) => item.type === type) ?? planOptions[0];
    setSelectedPlanType(option.type);
    setCustomDailyQuestions(option.dailyQuestions);
    setCustomDailyReview(option.dailyReview);
    setShowingPlanPicker(false);
    setShowingPlanDetails(false);
  }

  function changePlan() {
    setShowingPlanPicker(true);
    setShowingPlanDetails(false);
  }

  function startJourney() {
    handleSave();
    onClose?.();
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
            <AnimatePresence mode="wait">
              {showingInputForm ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
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
                        aria-label="Exam date"
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
                        aria-label="Exam time"
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
                          aria-label="Daily study time in minutes"
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
                </motion.div>
              ) : (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.1em] text-teal-700">Learning habits</p>
                      <h2 className="mt-0.5 text-xl font-bold text-stone-950">Your settings</h2>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-700 transition-colors hover:bg-stone-100"
                      onClick={() => setShowingInputForm(true)}
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-md bg-stone-100 px-3 py-2.5">
                      <span className="text-xs font-semibold text-stone-500">Exam date</span>
                      <strong className="text-sm">{examDate} · {examTime}</strong>
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-stone-100 px-3 py-2.5">
                      <span className="text-xs font-semibold text-stone-500">Daily study</span>
                      <strong className="text-sm">{dailyMinutes} min</strong>
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-stone-100 px-3 py-2.5">
                      <span className="text-xs font-semibold text-stone-500">Days per week</span>
                      <strong className="text-sm">{daysPerWeek} days</strong>
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-stone-100 px-3 py-2.5">
                      <span className="text-xs font-semibold text-stone-500">Target score</span>
                      <strong className="text-sm">{targetScore}%</strong>
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-stone-100 px-3 py-2.5 sm:col-span-2">
                      <span className="text-xs font-semibold text-stone-500">Preparation mode</span>
                      <strong className="text-sm">
                        {level === 'new' ? 'New learner' : level === 'reviewing' ? 'Reviewing' : 'Final sprint'}
                      </strong>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isConfirmed && (
              <div className="mt-6 border-t border-stone-200 pt-5">
                <AnimatePresence mode="wait">
                  {showingPlanPicker ? (
                    <motion.div
                      key="picker"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.1em] text-teal-700">Generated plans</p>
                          <h3 className="text-lg font-bold text-stone-950">Choose a plan level</h3>
                        </div>
                        <p className="text-sm text-stone-500">Tap a plan to select it.</p>
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
                                  <div className="text-lg font-bold">{option.mockExams}</div>
                                  <div className="truncate text-[10px] font-semibold uppercase text-stone-500">Mocks</div>
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
                    </motion.div>
                  ) : (
                    <motion.div
                      key="selected"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.1em] text-teal-700">Selected plan</p>
                          <h3 className="text-lg font-bold text-stone-950">{selectedOption.name}</h3>
                        </div>
                        <button
                          type="button"
                          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-700 transition-colors hover:bg-stone-100"
                          onClick={changePlan}
                        >
                          Change plan
                        </button>
                      </div>
                      <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm leading-6 text-stone-600">
                        {selectedOption.bestFor}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

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
                        aria-label="New questions per day"
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
                        aria-label="Review questions per day"
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
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      className={`h-11 rounded-lg border text-sm font-bold transition-colors ${
                        showingPlanDetails
                          ? 'border-teal-700 bg-teal-700 text-white'
                          : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100'
                      }`}
                      onClick={() => setShowingPlanDetails(d => !d)}
                    >
                      Plan Details
                    </button>
                    <button
                      type="button"
                      className="h-11 rounded-lg bg-stone-950 text-sm font-bold text-white transition-colors hover:bg-stone-800"
                      onClick={startJourney}
                    >
                      Start Journey →
                    </button>
                  </div>

                  <AnimatePresence>
                    {showingPlanDetails && (
                      <motion.section
                        key="plan-details"
                        className="mt-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.1em] text-teal-700">Today's journey</p>
                            <h2 className="text-xl font-bold text-stone-950">{selectedOption.name}</h2>
                            <p className="mt-1 max-w-2xl text-sm text-stone-500">What to do today, how far you are from the target, and the next best move.</p>
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

                        <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
                          <div className="rounded-lg bg-stone-950 p-4 text-white">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="text-xs font-bold uppercase tracking-[0.1em] text-teal-200">Today</div>
                                <div className="mt-1 text-3xl font-bold">{planMath.todayRemaining}</div>
                                <div className="text-sm font-semibold text-stone-300">new questions left</div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm sm:w-56">
                                <div className="rounded-md bg-white/15 p-2">
                                  <div className="text-lg font-bold">{planMath.dailyReview}</div>
                                  <div className="text-xs text-stone-300">review today</div>
                                </div>
                                <div className="rounded-md bg-white/15 p-2">
                                  <div className="text-lg font-bold">{planMath.estimatedDailyMinutes}m</div>
                                  <div className="text-xs text-stone-300">est. time</div>
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
                              <div className="h-full rounded-full bg-teal-300" style={{ width: `${planMath.todayPercent}%` }} />
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold text-stone-300">
                              <span>{planMath.todayAnswered}/{planMath.dailyQuestions} done</span>
                              <span>{planMath.todayPercent}% complete</span>
                            </div>
                            <div className="mt-4 rounded-md bg-white/10 p-3 text-sm font-semibold leading-6 text-stone-100">
                              {planEncouragement}
                            </div>
                          </div>

                          <div className="grid gap-2">
                            <div className="rounded-lg border border-teal-700 bg-teal-50 p-3">
                              <div className="text-xs font-bold uppercase tracking-[0.08em] text-teal-700">Distance to target</div>
                              <div className="mt-1 text-2xl font-bold text-stone-950">{planMath.remainingQuestions}</div>
                              <div className="text-sm font-semibold text-stone-600">questions left from {TOTAL_QUESTIONS}</div>
                            </div>
                            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                              <div className="text-xs font-bold uppercase tracking-[0.08em] text-amber-900">Time runway</div>
                              <div className="mt-1 text-2xl font-bold text-stone-950">{planMath.effectiveStudyDays}</div>
                              <div className="text-sm font-semibold text-stone-600">study days before exam</div>
                            </div>
                            <div className="rounded-lg border border-stone-300 bg-white p-3">
                              <div className="text-xs font-bold uppercase tracking-[0.08em] text-stone-500">Next best move</div>
                              <div className="mt-1 text-sm font-bold leading-6 text-stone-950">
                                Do one {planMath.sessionSize}-question focus block, then review mistakes before adding more.
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-stone-500">Journey rhythm</div>
                          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            {planMath.planRows.map((row, index) => {
                              const colors = [
                                'border-teal-700 bg-teal-50 text-teal-800',
                                'border-amber-300 bg-amber-50 text-amber-900',
                                'border-stone-300 bg-white text-stone-700',
                                'border-teal-700 bg-stone-950 text-white',
                              ];
                              return (
                                <div key={row.label} className={`rounded-lg border p-3 ${colors[index]}`}>
                                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] opacity-70">Step {index + 1}</div>
                                  <div className="mt-1 text-sm font-bold leading-5">{row.label}</div>
                                  <div className="mt-2 text-lg font-bold">{row.workload}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <details className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3">
                          <summary className="cursor-pointer text-sm font-bold text-stone-950">Advanced plan diagnostics</summary>
                          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                            {[
                              ['Exam countdown', `${planMath.planDays} days / ${planMath.hoursUntilExam} hours`],
                              ['Weekly load', planMath.weeklyQuestions],
                              ['Daily capacity', planMath.dailyCapacity],
                              ['Mistake review/day', planMath.dailyWrongReview],
                              ['Saved review/day', planMath.dailySavedReview],
                              ['Current phase', planMath.phase],
                            ].map(([label, value]) => (
                              <div key={label} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2">
                                <span className="text-stone-500">{label}</span>
                                <strong className="text-right">{value}</strong>
                              </div>
                            ))}
                          </div>
                        </details>
                      </motion.section>
                    )}
                  </AnimatePresence>
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
                      aria-label="Upload avatar photo"
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

            {mode === 'profile' && (
              <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                <WidgetConfigPanel config={widgetConfig} onConfigChange={handleWidgetConfig} />
              </section>
            )}
          </aside>
        </main>

      </div>
    </div>
  );
}
