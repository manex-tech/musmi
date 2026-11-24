import madaniData from "./madani-pages.json";
import { ayahKey, type DisplayAyah, type QuranText } from "./quran-words";

export type PageRange = [fromSurah: number, fromAyah: number, toSurah: number, toAyah: number];

export const TOTAL_PAGES = 604;
export const MADANI_PAGES: PageRange[] = madaniData.pages as PageRange[];

export const JUZ_START_PAGES = [
  1, 22, 42, 62, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262, 282,
  302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
];

/** Returns the 1-based Juz number (1 to 30) for a given Madani page. */
export function getJuzForPage(page: number): number {
  for (let i = JUZ_START_PAGES.length - 1; i >= 0; i--) {
    if (page >= JUZ_START_PAGES[i]) return i + 1;
  }
  return 1;
}


/** Compare two Quran verse positions: negative if v1 < v2, 0 if equal, positive if v1 > v2. */
export function compareVerse(s1: number, a1: number, s2: number, a2: number): number {
  if (s1 !== s2) return s1 - s2;
  return a1 - a2;
}

/** Given a surah and ayah, returns the 1-based Madani Mushaf page number (1 to 604). */
export function getPageForVerse(surah: number, ayah: number): number {
  for (let i = 0; i < MADANI_PAGES.length; i++) {
    const [fromS, fromA, toS, toA] = MADANI_PAGES[i];
    if (compareVerse(surah, ayah, fromS, fromA) >= 0 && compareVerse(surah, ayah, toS, toA) <= 0) {
      return i + 1; // 1-based page
    }
  }
  return 1;
}

/** Returns the page range [fromSurah, fromAyah, toSurah, toAyah] for a given 1-based page number. */
export function getPageRange(page: number): PageRange {
  const p = Math.max(1, Math.min(TOTAL_PAGES, page));
  return MADANI_PAGES[p - 1];
}

/**
 * Returns all DisplayAyah entries that belong to a specific Madani Mushaf page.
 */
export function getPageVerses(page: number, quran: QuranText): DisplayAyah[] {
  const [fromS, fromA, toS, toA] = getPageRange(page);
  const verses: DisplayAyah[] = [];

  for (let s = fromS; s <= toS; s++) {
    const startAyah = s === fromS ? fromA : 1;
    let a = startAyah;
    while (true) {
      if (s === toS && a > toA) break;
      const key = ayahKey(s, a);
      const v = quran.get(key);
      if (!v) break; // End of surah in quran text
      verses.push(v);
      a++;
    }
  }

  return verses;
}

/**
 * Returns a random verse coordinate from a given Juz (1 to 30) suitable for a prompt.
 * Avoids the very last ayah of the Juz so the user has subsequent ayahs to continue reciting.
 */
export function getRandomAyahInJuz(juz: number, quran: QuranText): { surah: number; ayah: number; totalAyahsInSurah: number } {
  const j = Math.max(1, Math.min(30, juz));
  const startPage = JUZ_START_PAGES[j - 1];
  const endPage = j === 30 ? TOTAL_PAGES : JUZ_START_PAGES[j] - 1;

  // Collect all available verses across the pages of this Juz
  const allVerses: { surah: number; ayah: number }[] = [];
  for (let p = startPage; p <= endPage; p++) {
    const pageVerses = getPageVerses(p, quran);
    for (const pv of pageVerses) {
      allVerses.push({ surah: pv.surah, ayah: pv.ayah });
    }
  }

  if (allVerses.length === 0) {
    return { surah: 1, ayah: 1, totalAyahsInSurah: 7 };
  }

  // Pick a random verse (excluding the very last one in the juz so user can continue)
  const candidateIdx = Math.floor(Math.random() * Math.max(1, allVerses.length - 1));
  const picked = allVerses[candidateIdx];

  // Count total ayahs in this surah
  let totalAyahs = picked.ayah;
  while (quran.has(ayahKey(picked.surah, totalAyahs + 1))) {
    totalAyahs++;
  }

  return {
    surah: picked.surah,
    ayah: picked.ayah,
    totalAyahsInSurah: totalAyahs,
  };
}
