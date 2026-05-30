// Xe Cleaner — "Midnight Aurora" base palette + hidden seasonal themes.
//
// The active theme is resolved ONCE at app launch from the device date, then
// merged into `colors`. Every screen imports `colors`, so accents, glows, and
// background tint recolor app-wide automatically. Themes are intentionally a
// hidden delight — there is no in-app theme picker. They appear on their dates
// (plus a rare leap-day easter egg). Because StyleSheets bake colors at module
// load, switching requires a relaunch — which is exactly how the date system
// works.

const BASE = {
  bg0: '#06080F',
  bg1: '#0B1020',
  bg2: '#0E1430',
  card: 'rgba(255,255,255,0.045)',
  cardStrong: 'rgba(255,255,255,0.07)',
  cardBorder: 'rgba(255,255,255,0.10)',
  text: '#EEF2FF',
  dim: '#9AA3C2',
  faint: '#5C658A',
  mint: '#67E8C3',
  violet: '#8B6CFF',
  danger: '#FF5C6A',
  warn: '#FFC861',
  glowMint: 'rgba(103,232,195,0.55)',
  glowViolet: 'rgba(139,108,255,0.50)',
};

// Each theme overrides the two accents, the two aurora glows, and (optionally)
// the background tints for a fully different atmosphere.
export const THEMES = {
  newyear: { name: 'New Year', mint: '#FFD86B', violet: '#B9A6FF', glowMint: 'rgba(255,216,107,0.5)', glowViolet: 'rgba(185,166,255,0.45)', bg0: '#070611', bg1: '#100C22', bg2: '#171130' },
  winter: { name: 'Winter', mint: '#8FD8FF', violet: '#B8C6FF', glowMint: 'rgba(143,216,255,0.5)', glowViolet: 'rgba(184,198,255,0.45)', bg0: '#060B14', bg1: '#0A1322', bg2: '#0E1B30' },
  valentines: { name: "Valentine's Day", mint: '#FF6FAE', violet: '#D14D8C', glowMint: 'rgba(255,111,174,0.5)', glowViolet: 'rgba(209,77,140,0.45)', bg0: '#0E060B', bg1: '#170A12', bg2: '#210E18' },
  stpatrick: { name: "St. Patrick's Day", mint: '#3FD97A', violet: '#E8C547', glowMint: 'rgba(63,217,122,0.5)', glowViolet: 'rgba(232,197,71,0.45)', bg0: '#05100A', bg1: '#07140D', bg2: '#0B1E12' },
  aprilfools: { name: 'April Fools', mint: '#FF6FAE', violet: '#5AC8FA', glowMint: 'rgba(255,111,174,0.5)', glowViolet: 'rgba(90,200,250,0.45)', bg0: '#070810', bg1: '#0E1020', bg2: '#141228' },
  easter: { name: 'Easter', mint: '#6FE0D0', violet: '#C6A8FF', glowMint: 'rgba(111,224,208,0.45)', glowViolet: 'rgba(198,168,255,0.45)', bg0: '#080A14', bg1: '#10101F', bg2: '#16142A' },
  summer: { name: 'Summer', mint: '#2FE3C2', violet: '#FF8A5B', glowMint: 'rgba(47,227,194,0.5)', glowViolet: 'rgba(255,138,91,0.45)', bg0: '#05121A', bg1: '#08161C', bg2: '#0C2230' },
  july4: { name: 'Independence Day', mint: '#4C8DFF', violet: '#FF4D5E', glowMint: 'rgba(76,141,255,0.5)', glowViolet: 'rgba(255,77,94,0.45)', bg0: '#05090F', bg1: '#08101F', bg2: '#0C1A2E' },
  halloween: { name: 'Halloween', mint: '#FF8A1E', violet: '#A05BFF', glowMint: 'rgba(255,138,30,0.5)', glowViolet: 'rgba(160,91,255,0.5)', bg0: '#0B0712', bg1: '#120A1C', bg2: '#1B0E26' },
  thanksgiving: { name: 'Thanksgiving', mint: '#F0A93B', violet: '#C75B36', glowMint: 'rgba(240,169,59,0.5)', glowViolet: 'rgba(199,91,54,0.45)', bg0: '#0E0A05', bg1: '#150F08', bg2: '#1F160C' },
  christmas: { name: 'Christmas', mint: '#36D67A', violet: '#FF4D4D', glowMint: 'rgba(54,214,122,0.5)', glowViolet: 'rgba(255,77,77,0.45)', bg0: '#050F0A', bg1: '#08160F', bg2: '#0C2016' },
  // Rare easter egg — only appears on leap day (Feb 29, every ~4 years).
  aurora: { name: 'Cosmic Aurora', mint: '#9D7CFF', violet: '#FF6FD5', glowMint: 'rgba(157,124,255,0.55)', glowViolet: 'rgba(255,111,213,0.5)', bg0: '#05030F', bg1: '#0B0820', bg2: '#140A2E' },
  // Ultra-rare — 1-in-100 chance on every app launch (rolled below). `rare`
  // keeps it out of the festive greeting and triggers a celebratory toast.
  synthwave: { name: 'Synthwave', rare: true, mint: '#2DE2E6', violet: '#FF2E97', glowMint: 'rgba(45,226,230,0.5)', glowViolet: 'rgba(255,46,151,0.5)', bg0: '#08041C', bg1: '#150A35', bg2: '#1F0E4A' },
};

// Back-compat alias (older imports).
export const HOLIDAY_PALETTES = THEMES;

// Gregorian Easter Sunday (Anonymous computus). Returns { month (0-based), day }.
function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month: month - 1, day };
}

// Day-of-month for the nth given weekday (0=Sun) of a month (0-based).
function nthWeekday(year, month, weekday, n) {
  const first = new Date(year, month, 1).getDay();
  return 1 + ((7 + weekday - first) % 7) + (n - 1) * 7;
}

// First match wins — specific single-day events before broad seasonal ranges.
function getActiveTheme(date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const day = date.getDate();
  const today = new Date(y, m, day);

  // Ultra-rare: 1-in-100 chance on every launch, wins over everything.
  if (Math.random() < 0.01) return 'synthwave';

  // Rare easter egg: leap day only.
  if (m === 1 && day === 29) return 'aurora';

  if ((m === 11 && day === 31) || (m === 0 && day === 1)) return 'newyear';
  if (m === 3 && day === 1) return 'aprilfools';
  if (m === 2 && day >= 16 && day <= 18) return 'stpatrick';
  if (m === 1 && day >= 10 && day <= 14) return 'valentines';

  const e = easterSunday(y);
  const easter = new Date(y, e.month, e.day);
  const easterStart = new Date(easter);
  easterStart.setDate(easter.getDate() - 6);
  if (today >= easterStart && today <= easter) return 'easter';

  if (m === 6 && day >= 1 && day <= 4) return 'july4';
  if (m === 9 && day >= 24 && day <= 31) return 'halloween';

  const thanksgiving = nthWeekday(y, 10, 4, 4); // 4th Thursday of November
  if (m === 10 && day >= thanksgiving && day <= thanksgiving + 3) return 'thanksgiving';

  if (m === 11 && day >= 18 && day <= 26) return 'christmas';

  // Winter: deep Jan, early Feb, and the tail of December.
  if ((m === 0 && day >= 2) || (m === 1 && day <= 9) || (m === 11 && day >= 27 && day <= 30)) return 'winter';

  // Summer: late June, all July (after the 4th), August, early September.
  if ((m === 5 && day >= 21) || m === 6 || m === 7 || (m === 8 && day <= 5)) return 'summer';

  return null;
}

// Set to a theme key (e.g. 'halloween') to force-preview during development.
const FORCE_THEME = null;

const activeKey = FORCE_THEME || getActiveTheme(new Date());
const override = activeKey ? THEMES[activeKey] : null;

export const colors = override ? { ...BASE, ...override, name: undefined } : BASE;

// Rare themes don't drive the "Happy <holiday>" greeting — their reveal is the
// visuals + a celebratory toast instead.
export const ACTIVE_HOLIDAY = override && !override.rare ? override.name : null;
export const ACTIVE_HOLIDAY_KEY = override ? activeKey : null;
export const IS_RARE_THEME = Boolean(override && override.rare);
export const RARE_THEME = IS_RARE_THEME ? override.name : null;

export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displayX: 'BricolageGrotesque_800ExtraBold',
  displaySemi: 'BricolageGrotesque_600SemiBold',
  body: 'Manrope_500Medium',
  bodySemi: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
};

export const radius = { xs: 6, sm: 10, md: 13, lg: 16, xl: 20, pill: 999 };

export const shadow = {
  sm: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  md: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } },
  glow: { shadowColor: colors.mint, shadowOpacity: 0.55, shadowRadius: 24, shadowOffset: { width: 0, height: 0 } },
};
