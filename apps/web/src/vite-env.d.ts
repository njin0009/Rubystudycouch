/// <reference types="vite/client" />

declare global {
  interface Window {
    __studyCouchLegacyLoaded?: boolean;
    pdfjsLib: {
      GlobalWorkerOptions: {
        workerSrc: string;
      };
    };
    StudyCouchSync?: {
      loadStudySnapshot(): Promise<{
        ok: boolean;
        message: string | null;
        data: {
          wrongMap: Record<string, string>;
          bmMap: Record<string, string>;
          markMap: Record<string, string>;
          correctMap: Record<string, string>;
          comments: Record<string, string>;
          totalDone: number;
          totalRight: number;
          checkinDates: string[];
          dailyCount: Record<string, number>;
          dailyCatCount: Record<string, Record<string, number>>;
        } | null;
      }>;
      recordAttempt(input: {
        questionId: number;
        selectedAnswers: string[];
        correctAnswers: string[];
        isCorrect: boolean;
        category?: string;
        isMultiSelect: boolean;
      }): Promise<{ ok: boolean; message: string }>;
      recordSavedQuestion(questionId: number, isSaved: boolean): Promise<{ ok: boolean; message: string | null }>;
      recordImportantQuestion(questionId: number, isImportant: boolean): Promise<{ ok: boolean; message: string | null }>;
      recordQuestionNote(questionId: number, note: string): Promise<{ ok: boolean; message: string | null }>;
      recordCheckin(checkinDate: string, isCheckedIn: boolean): Promise<{ ok: boolean; message: string | null }>;
      clearStudyData(): Promise<{ ok: boolean; message: string | null }>;
    };
    hydrateFromCloud?: () => void;
    resetAllData?: () => void;
    goHome?: () => void;
    showProgress?: () => void;
    showReview?: () => void;
    showBookmarks?: () => void;
    showCheck?: () => void;
  }
}

export {};
