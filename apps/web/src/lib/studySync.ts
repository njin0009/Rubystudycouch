import { supabase } from './supabase';

export interface RecordAttemptInput {
  questionId: number;
  selectedAnswers: string[];
  correctAnswers: string[];
  isCorrect: boolean;
  category?: string;
  isMultiSelect: boolean;
}

export interface StudySnapshot {
  wrongMap: Record<string, string>;
  bmMap: Record<string, string>;
  markMap: Record<string, string>;
  correctMap: Record<string, string>;
  wrongCountMap: Record<string, number>;
  correctCountMap: Record<string, number>;
  comments: Record<string, string>;
  totalDone: number;
  totalRight: number;
  checkinDates: string[];
  dailyCount: Record<string, number>;
  dailyCatCount: Record<string, Record<string, number>>;
}

async function getSignedInUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      message: error?.message ?? 'No signed-in user.',
    };
  }

  return {
    user,
    message: null,
  };
}

function toStudyDate(value: string) {
  return value.slice(0, 10);
}

function toCategoryKey(category: string) {
  const categoryMap: Record<string, string> = {
    'Cloud Concepts': 'cc',
    'Security & Compliance': 'sc',
    'Cloud Technology & Services': 'ct',
    'Billing & Pricing': 'bp',
    'Migration & Innovation': 'mi',
  };

  return categoryMap[category] ?? category;
}

export async function recordAttempt(input: RecordAttemptInput) {
  const { user, message } = await getSignedInUser();

  if (!user) {
    return {
      ok: false,
      message,
    };
  }

  const { error } = await supabase.from('question_attempts').insert({
    user_id: user.id,
    question_id: input.questionId,
    selected_answers: input.selectedAnswers,
    correct_answers: input.correctAnswers,
    is_correct: input.isCorrect,
    category: input.category ?? null,
    is_multi_select: input.isMultiSelect,
  });

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  return {
    ok: true,
    message: 'Attempt recorded.',
  };
}

export async function loadStudySnapshot() {
  const { user, message } = await getSignedInUser();

  if (!user) {
    return {
      ok: false,
      message,
      data: null,
    };
  }

  const [attemptsResult, savedResult, importantResult, notesResult, checkinsResult] = await Promise.all([
    supabase
      .from('question_attempts')
      .select('question_id,is_correct,category,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(10000),
    supabase.from('saved_questions').select('question_id,created_at').eq('user_id', user.id),
    supabase.from('important_questions').select('question_id,created_at').eq('user_id', user.id),
    supabase.from('question_notes').select('question_id,note').eq('user_id', user.id),
    supabase.from('study_checkins').select('checkin_date').eq('user_id', user.id),
  ]);

  const firstError =
    attemptsResult.error ?? savedResult.error ?? importantResult.error ?? notesResult.error ?? checkinsResult.error;

  if (firstError) {
    return {
      ok: false,
      message: firstError.message,
      data: null,
    };
  }

  const snapshot: StudySnapshot = {
    wrongMap: {},
    bmMap: {},
    markMap: {},
    correctMap: {},
    wrongCountMap: {},
    correctCountMap: {},
    comments: {},
    totalDone: 0,
    totalRight: 0,
    checkinDates: [],
    dailyCount: {},
    dailyCatCount: {},
  };

  for (const attempt of attemptsResult.data ?? []) {
    const questionId = String(attempt.question_id);
    const date = toStudyDate(attempt.created_at);

    snapshot.totalDone += 1;
    snapshot.dailyCount[date] = (snapshot.dailyCount[date] ?? 0) + 1;

    if (attempt.category) {
      snapshot.dailyCatCount[date] ??= {};
      const categoryKey = toCategoryKey(attempt.category);
      snapshot.dailyCatCount[date][categoryKey] = (snapshot.dailyCatCount[date][categoryKey] ?? 0) + 1;
    }

    if (attempt.is_correct) {
      snapshot.totalRight += 1;
      snapshot.correctMap[questionId] = date;
      delete snapshot.wrongMap[questionId];
      snapshot.correctCountMap[questionId] = (snapshot.correctCountMap[questionId] ?? 0) + 1;
    } else {
      snapshot.wrongMap[questionId] = date;
      snapshot.wrongCountMap[questionId] = (snapshot.wrongCountMap[questionId] ?? 0) + 1;
    }
  }

  for (const saved of savedResult.data ?? []) {
    snapshot.bmMap[String(saved.question_id)] = toStudyDate(saved.created_at);
  }

  for (const important of importantResult.data ?? []) {
    snapshot.markMap[String(important.question_id)] = toStudyDate(important.created_at);
  }

  for (const note of notesResult.data ?? []) {
    snapshot.comments[String(note.question_id)] = note.note;
  }

  snapshot.checkinDates = (checkinsResult.data ?? []).map((checkin) => checkin.checkin_date).sort();

  return {
    ok: true,
    message: 'Study snapshot loaded.',
    data: snapshot,
  };
}

export async function recordSavedQuestion(questionId: number, isSaved: boolean) {
  const { user, message } = await getSignedInUser();

  if (!user) {
    return { ok: false, message };
  }

  const query = isSaved
    ? supabase.from('saved_questions').upsert(
        {
          user_id: user.id,
          question_id: questionId,
        },
        { onConflict: 'user_id,question_id' },
      )
    : supabase.from('saved_questions').delete().eq('user_id', user.id).eq('question_id', questionId);

  const { error } = await query;
  return { ok: !error, message: error?.message ?? 'Saved question synced.' };
}

export async function recordImportantQuestion(questionId: number, isImportant: boolean) {
  const { user, message } = await getSignedInUser();

  if (!user) {
    return { ok: false, message };
  }

  const query = isImportant
    ? supabase.from('important_questions').upsert(
        {
          user_id: user.id,
          question_id: questionId,
        },
        { onConflict: 'user_id,question_id' },
      )
    : supabase.from('important_questions').delete().eq('user_id', user.id).eq('question_id', questionId);

  const { error } = await query;
  return { ok: !error, message: error?.message ?? 'Important question synced.' };
}

export async function recordQuestionNote(questionId: number, note: string) {
  const { user, message } = await getSignedInUser();

  if (!user) {
    return { ok: false, message };
  }

  const query = note
    ? supabase.from('question_notes').upsert(
        {
          user_id: user.id,
          question_id: questionId,
          note,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,question_id' },
      )
    : supabase.from('question_notes').delete().eq('user_id', user.id).eq('question_id', questionId);

  const { error } = await query;
  return { ok: !error, message: error?.message ?? 'Question note synced.' };
}

export async function recordCheckin(checkinDate: string, isCheckedIn: boolean) {
  const { user, message } = await getSignedInUser();

  if (!user) {
    return { ok: false, message };
  }

  const query = isCheckedIn
    ? supabase.from('study_checkins').upsert(
        {
          user_id: user.id,
          checkin_date: checkinDate,
        },
        { onConflict: 'user_id,checkin_date' },
      )
    : supabase.from('study_checkins').delete().eq('user_id', user.id).eq('checkin_date', checkinDate);

  const { error } = await query;
  return { ok: !error, message: error?.message ?? 'Check-in synced.' };
}

export async function clearStudyData() {
  const { user, message } = await getSignedInUser();

  if (!user) {
    return { ok: false, message };
  }

  const results = await Promise.all([
    supabase.from('question_attempts').delete().eq('user_id', user.id),
    supabase.from('saved_questions').delete().eq('user_id', user.id),
    supabase.from('important_questions').delete().eq('user_id', user.id),
    supabase.from('question_notes').delete().eq('user_id', user.id),
    supabase.from('study_checkins').delete().eq('user_id', user.id),
    supabase.from('study_events').delete().eq('user_id', user.id),
    supabase.from('study_sessions').delete().eq('user_id', user.id),
  ]);

  const firstError = results.find((result) => result.error)?.error;

  return {
    ok: !firstError,
    message: firstError?.message ?? 'Study data cleared.',
  };
}

export const studySync = {
  loadStudySnapshot,
  recordAttempt,
  recordSavedQuestion,
  recordImportantQuestion,
  recordQuestionNote,
  recordCheckin,
  clearStudyData,
};
