import { memo, useEffect } from 'react';
import { studySync } from '@/lib/studySync';
import legacyMarkup from './legacyMarkup';

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing?.dataset.loaded === 'true') {
      resolve();
      return;
    }

    const script = existing ?? document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));

    if (!existing) {
      document.body.appendChild(script);
    }
  });

// memo: LegacyStudyCoach has no props, so it must never re-render due to parent
// state changes (e.g. Supabase token refresh re-rendering App). A re-render would
// re-run dangerouslySetInnerHTML reconciliation and could cause subtle DOM resets.
export default memo(function LegacyStudyCoach() {
  useEffect(() => {
    let cancelled = false;
    window.StudyCouchSync = studySync;

    async function bootLegacyApp() {
      if (window.__studyCouchLegacyLoaded) {
        window.reloadStudyData?.();
        window.hydrateFromCloud?.();
        window.restoreCurrentScreen?.();
        return;
      }

      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
      if (cancelled) return;

      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      await loadScript('/assets/js/questions.js');
      if (cancelled) return;

      await loadScript('/assets/js/explanations.js');
      if (cancelled) return;

      await loadScript('/assets/js/app.js');
      window.__studyCouchLegacyLoaded = true;
    }

    bootLegacyApp().catch((error) => {
      console.error(error);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: legacyMarkup }} />;
});
