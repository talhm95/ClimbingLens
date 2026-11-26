// All visible text goes through tr(key). English and Hebrew dictionaries (Hebrew: first draft, Q7).
// Limb codes LH / RH / LF / RF are never translated (D31).

type Lang = 'en' | 'he';

const en: Record<string, string> = {
  'app.title': 'ClimbingLens',
  'upload.takeA': 'Load video (take A)',
  'error.video': "This video format can't be played in Chrome. Convert to MP4 (H.264).",
  'error.pose': 'The pose model could not be loaded. Run "npm run setup" and reload.',
  'progress.processing': 'Analysing poses… {p}%',
  'empty.noVideo': 'Load a back-view tripod video to start.',
  'checklist.title': 'Layers',
  'checklist.tier2': 'Tier 2',
};

const he: Record<string, string> = {};

const dicts: Record<Lang, Record<string, string>> = { en, he };
let lang: Lang = 'en';

export function tr(key: string, vars?: Record<string, string | number>): string {
  let s = dicts[lang][key] ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** Switch language and text direction of the whole document. */
export function setLang(l: Lang): void {
  lang = l;
  document.documentElement.lang = l;
  document.documentElement.dir = l === 'he' ? 'rtl' : 'ltr';
}

export function getLang(): Lang {
  return lang;
}

/** Pick the label of a layer for the current language. */
export function label(l: { en: string; he: string }): string {
  return l[lang];
}
