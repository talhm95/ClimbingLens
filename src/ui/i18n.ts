// All visible text goes through tr(key). English and Hebrew dictionaries (Hebrew: first draft, Q7).
// Limb codes LH / RH / LF / RF are never translated (D31).

type Lang = 'en' | 'he';

const en: Record<string, string> = {
  'app.title': 'ClimbingLens',
  'upload.takeA': 'Load video (take A)',
  'upload.takeB': '+ Add second take',
  'take.A': 'Take A',
  'take.B': 'Take B',
  'error.video': "This video format can't be played in Chrome. Convert to MP4 (H.264).",
  'error.pose': 'The pose model could not be loaded. Run "npm run setup" and reload.',
  'progress.processing': 'Analysing poses… {p}%',
  'empty.noVideo': 'Load a back-view tripod video to start.',
  'checklist.title': 'Layers',
  'checklist.tier2': 'Tier 2',
  'holds.title': 'Holds',
  'holds.mark': 'Mark holds',
  'holds.done': 'Done',
  'holds.undo': 'Undo',
  'holds.clear': 'Clear',
  'holds.hint': 'Click each hold on the video, in route order (footholds too).',
  'holds.count': 'Holds marked:',
  'contacts.title': 'Contact sequence',
  'contacts.off': 'Turn on "Limb contacts" to see the sequence.',
  'contacts.none': 'No contacts found.',
  'contacts.markHolds': 'Mark the holds to see which limb touched which hold.',
  'contacts.toHold': '→ hold',
  'contacts.noHold': '→ no hold',
  'contacts.corrections': 'corrections:',
  'metrics.title': 'Metrics',
  'metrics.total': 'Total',
  'attempts.start': 'Attempt start',
  'attempts.end': 'Attempt end',
  'attempts.clear': 'Clear attempts',
  'attempts.auto': 'Auto-detect',
  'attempts.badgeAuto': 'Auto',
  'attempts.badgeManual': 'Manual',
  'attempts.pending': 'Attempt started at',
  'timing.source': 'Attempts',
  'timing.attempt': 'Attempt {n}',
  'timing.rest': 'Rest {n}',
  'timing.restNow': 'Resting:',
  'diff.title': 'Take A → take B, first attempt (Δ)',
  'diff.none': 'Check a metric to compare it.',
  'diff.touches': 'Touches',
  'diff.footCorrections': 'Foot corrections',
  'diff.attempt': 'Attempt time',
  'diff.offBalance': 'Off balance',
  'weight.offBalance': 'Off balance (share of time)',
  'arrow': '→',
  'lang.en': 'EN',
  'lang.he': 'עב',
};

// First draft, to be checked by a Hebrew-speaking climber (Q7).
const he: Record<string, string> = {
  'app.title': 'ClimbingLens',
  'upload.takeA': 'טעינת סרטון (A)',
  'upload.takeB': '+ הוספת סרטון שני',
  'take.A': 'סרטון A',
  'take.B': 'סרטון B',
  'error.video': 'לא ניתן לנגן את פורמט הווידאו הזה ב-Chrome. יש להמיר ל-MP4 ‏(H.264).',
  'error.pose': 'לא ניתן לטעון את מודל התנוחה. יש להריץ "npm run setup" ולטעון מחדש.',
  'progress.processing': 'מנתח תנוחות… {p}%',
  'empty.noVideo': 'יש לטעון וידאו מחצובה, מצולם מאחור, כדי להתחיל.',
  'checklist.title': 'שכבות',
  'checklist.tier2': 'שלב 2',
  'holds.title': 'אחיזות',
  'holds.mark': 'סימון אחיזות',
  'holds.done': 'סיום',
  'holds.undo': 'ביטול אחרון',
  'holds.clear': 'ניקוי',
  'holds.hint': 'יש ללחוץ על כל אחיזה בווידאו, לפי סדר המסלול (כולל אחיזות רגל).',
  'holds.count': 'אחיזות מסומנות:',
  'contacts.title': 'רצף מגעים',
  'contacts.off': 'יש להפעיל את "מגע גפיים" כדי לראות את הרצף.',
  'contacts.none': 'לא נמצאו מגעים.',
  'contacts.markHolds': 'יש לסמן את האחיזות כדי לראות איזו גפה נגעה באיזו אחיזה.',
  'contacts.toHold': '← אחיזה',
  'contacts.noHold': '← ללא אחיזה',
  'contacts.corrections': 'תיקונים:',
  'metrics.title': 'מדדים',
  'metrics.total': 'סה"כ',
  'attempts.start': 'תחילת ניסיון',
  'attempts.end': 'סוף ניסיון',
  'attempts.clear': 'ניקוי ניסיונות',
  'attempts.auto': 'זיהוי אוטומטי',
  'attempts.badgeAuto': 'אוטומטי',
  'attempts.badgeManual': 'ידני',
  'attempts.pending': 'ניסיון התחיל ב-',
  'timing.source': 'ניסיונות',
  'timing.attempt': 'ניסיון {n}',
  'timing.rest': 'מנוחה {n}',
  'timing.restNow': 'במנוחה:',
  'diff.title': 'סרטון A ← סרטון B, ניסיון ראשון ‏(Δ)',
  'diff.none': 'יש לסמן מדד כדי להשוות אותו.',
  'diff.touches': 'מגעים',
  'diff.footCorrections': 'תיקוני רגל',
  'diff.attempt': 'זמן ניסיון',
  'diff.offBalance': 'מחוץ לאיזון',
  'weight.offBalance': 'מחוץ לאיזון (חלק מהזמן)',
  'arrow': '←',
  'lang.en': 'EN',
  'lang.he': 'עב',
};

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
