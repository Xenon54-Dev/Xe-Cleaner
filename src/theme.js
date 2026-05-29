// Xe Cleaner — "Midnight Aurora" base palette + seasonal holiday themes.
// The active theme is resolved ONCE at app launch from the device date, then
// merged into `colors`. Every screen imports `colors`, so the accent + aurora
// glows recolor app-wide automatically on the holiday.

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

// Each holiday overrides the two accents + the two aurora glows.
export const HOLIDAY_PALETTES = {
  valentines: { name: "Valentine's Day", mint: '#FF6FAE', violet: '#D14D8C', glowMint: 'rgba(255,111,174,0.5)', glowViolet: 'rgba(209,77,140,0.45)', bg1: '#160A12', bg2: '#1F0E18' },
  easter: { name: 'Easter', mint: '#6FE0D0', violet: '#C6A8FF', glowMint: 'rgba(111,224,208,0.45)', glowViolet: 'rgba(198,168,255,0.45)', bg1: '#10101F', bg2: '#16142A' },
  july4: { name: 'Independence Day', mint: '#4C8DFF', violet: '#FF4D5E', glowMint: 'rgba(76,141,255,0.5)', glowViolet: 'rgba(255,77,94,0.45)', bg1: '#08101F', bg2: '#0C1A2E' },
  halloween: { name: 'Halloween', mint: '#FF8A1E', violet: '#A05BFF', glowMint: 'rgba(255,138,30,0.5)', glowViolet: 'rgba(160,91,255,0.5)', bg1: '#120A1C', bg2: '#1B0E26' },
  thanksgiving: { name: 'Thanksgiving', mint: '#F0A93B', violet: '#C75B36', glowMint: 'rgba(240,169,59,0.5)', glowViolet: 'rgba(199,91,54,0.45)', bg1: '#150F08', bg2: '#1F160C' },
  christmas: { name: 'Christmas', mint: '#36D67A', violet: '#FF4D4D', glowMint: 'rgba(54,214,122,0.5)', glowViolet: 'rgba(255,77,77,0.45)', bg1: '#08160F', bg2: '#0C2016' },
};

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

function getHoliday(date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const day = date.getDate();
  const today = new Date(y, m, day);

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
  return null;
}

// Set to a holiday key (e.g. 'halloween') to force-preview a theme; null = auto.
const FORCE_THEME = null;

const activeKey = FORCE_THEME || getHoliday(new Date());
const override = activeKey ? HOLIDAY_PALETTES[activeKey] : null;

export const colors = override
  ? {
      ...BASE,
      mint: override.mint,
      violet: override.violet,
      glowMint: override.glowMint,
      glowViolet: override.glowViolet,
      bg1: override.bg1 || BASE.bg1,
      bg2: override.bg2 || BASE.bg2,
    }
  : BASE;

export const ACTIVE_HOLIDAY = override ? override.name : null;
export const ACTIVE_HOLIDAY_KEY = override ? activeKey : null;

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
