/**
 * Lightweight profanity / abuse filter for review text fields.
 * Word-boundary matching after simple leetspeak normalization.
 * Not perfect — meant to stop casual abuse on a friends-scale app.
 */

/** Single tokens matched after normalization (whole-word only). */
const BLOCKED_WORDS = [
  'anal',
  'anus',
  'arsehole',
  'asshole',
  'bastard',
  'bitch',
  'bitches',
  'bollocks',
  'boob',
  'boobs',
  'cock',
  'cocks',
  'coon',
  'cum',
  'cunt',
  'dick',
  'dicks',
  'dildo',
  'dyke',
  'fag',
  'faggot',
  'fags',
  'fuck',
  'fucked',
  'fucker',
  'fuckers',
  'fucking',
  'fuckin',
  'fucks',
  'goddamn',
  'gore',
  'horny',
  'jerkoff',
  'kike',
  'murder',
  'nazi',
  'nigga',
  'nigger',
  'nsfw',
  'nude',
  'nudes',
  'orgasm',
  'penis',
  'piss',
  'porn',
  'porno',
  'pussy',
  'rape',
  'rapist',
  'retard',
  'retarded',
  'shit',
  'shits',
  'shitty',
  'slut',
  'sluts',
  'suicide',
  'tits',
  'twat',
  'vagina',
  'wank',
  'whore',
  'whores',
] as const;

/** Multi-word / spaced phrases matched as substrings of the normalized string. */
const BLOCKED_PHRASES = [
  'child porn',
  'child pornograph',
  'go kill yourself',
  'kill yourself',
  'kys',
  'rape you',
  'sex tape',
] as const;

const BLOCKED_WORD_SET = new Set<string>(BLOCKED_WORDS);

/** Normalize for matching: lowercase, light leetspeak, strip punctuation. */
export function normalizeForContentFilter(text: string): string {
  return text
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a')
    .replace(/!/g, 'i')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns a blocked term if found, otherwise null.
 * The returned string is for logs/admin only — do not show it to end users.
 */
export function findBlockedTerm(text: string): string | null {
  const normalized = normalizeForContentFilter(text);
  if (!normalized) {
    return null;
  }

  for (const phrase of BLOCKED_PHRASES) {
    if (normalized.includes(phrase)) {
      return phrase;
    }
  }

  for (const token of normalized.split(' ')) {
    if (token && BLOCKED_WORD_SET.has(token)) {
      return token;
    }
  }

  return null;
}

/** True when any of the provided strings contains blocked language. */
export function containsBlockedLanguage(...parts: Array<string | null | undefined>): boolean {
  return parts.some((part) => !!part && findBlockedTerm(part) !== null);
}

/** User-facing message when a review is rejected for language. */
export const BLOCKED_LANGUAGE_MESSAGE =
  'Please remove inappropriate language before publishing.';
