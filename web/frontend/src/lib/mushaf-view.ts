import type { CheckerEvent, WordRef } from "@tilawa/core";
import { EXPLAIN, isShown } from "./explain";
import { getJuzForPage, getPageForVerse, getPageVerses, TOTAL_PAGES } from "./mushaf";
import { displayIndex, type QuranText } from "./quran-words";
import { imamApi, IMAMS } from "./imam-api";

export interface MushafViewOptions {
  container: HTMLElement;
  quran: QuranText;
  onPageChange?: (page: number) => void;
}

const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

export class MushafViewer {
  private container: HTMLElement;
  private quran: QuranText;
  private currentPage = 1;
  private activeWord: WordRef | null = null;
  private marks = new Map<string, CheckerEvent>();
  private autoFollow = true;
  private onPageChange?: (page: number) => void;

  // DOM elements inside the container
  private pageContentEl!: HTMLElement;
  private wordSpanMap = new Map<string, HTMLSpanElement>(); // "surah:ayah:displayWordIdx" -> span

  constructor(options: MushafViewOptions) {
    this.container = options.container;
    this.quran = options.quran;
    this.onPageChange = options.onPageChange;
    this.buildSkeleton();
  }

  private buildSkeleton() {
    this.container.innerHTML = `
      <div class="mushaf-frame">
        <div class="mushaf-header">
          <span class="mushaf-juz" id="mushaf-juz">الجزء ١</span>
          <span class="mushaf-surah" id="mushaf-surah">سورة الفاتحة</span>
          <div class="mushaf-nav">
            <button class="mushaf-btn" id="mushaf-prev" title="Previous page" type="button">‹</button>
            <span class="mushaf-page-num" id="mushaf-page-num">١</span>
            <button class="mushaf-btn" id="mushaf-next" title="Next page" type="button">›</button>
          </div>
        </div>
        <div class="mushaf-page-content" id="mushaf-page-content" dir="rtl" lang="ar"></div>
        <div class="mushaf-imam-bar">
          <div class="mushaf-imam-select-wrap">
            <span class="mushaf-imam-badge">Imam</span>
            <select id="mushaf-select-imam" class="mushaf-select-imam"></select>
          </div>
          <div class="mushaf-imam-actions">
            <button id="btn-mushaf-listen" class="mushaf-play-btn" type="button">
              <span id="mushaf-listen-text">Listen</span>
            </button>
            <span id="mushaf-playing-indicator" class="mushaf-wave" hidden>
              <span></span><span></span><span></span>
            </span>
          </div>
        </div>
        <div class="mushaf-footer">
          <span class="mushaf-status" id="mushaf-status">Free Recite & Auto-Detection</span>
          <label class="mushaf-toggle-label">
            <input type="checkbox" id="mushaf-autoturn" checked /> Auto-follow
          </label>
        </div>
      </div>
    `;

    this.pageContentEl = this.container.querySelector("#mushaf-page-content") as HTMLElement;

    const prevBtn = this.container.querySelector("#mushaf-prev") as HTMLButtonElement;
    const nextBtn = this.container.querySelector("#mushaf-next") as HTMLButtonElement;
    const autoTurnCb = this.container.querySelector("#mushaf-autoturn") as HTMLInputElement;

    prevBtn.addEventListener("click", () => this.setPage(this.currentPage - 1));
    nextBtn.addEventListener("click", () => this.setPage(this.currentPage + 1));
    autoTurnCb.addEventListener("change", () => {
      this.autoFollow = autoTurnCb.checked;
    });

    const imamSelect = this.container.querySelector("#mushaf-select-imam") as HTMLSelectElement;
    if (imamSelect) {
      imamSelect.replaceChildren(
        ...IMAMS.map((im) => {
          const opt = document.createElement("option");
          opt.value = im.id;
          opt.textContent = `${im.name} (${im.style})`;
          return opt;
        }),
      );
      imamSelect.addEventListener("change", () => {
        imamApi.setImam(imamSelect.value);
      });
    }

    const listenBtn = this.container.querySelector("#btn-mushaf-listen") as HTMLButtonElement;
    const listenText = this.container.querySelector("#mushaf-listen-text") as HTMLElement;
    const waveEl = this.container.querySelector("#mushaf-playing-indicator") as HTMLElement;

    if (listenBtn) {
      listenBtn.addEventListener("click", async () => {
        if (imamApi.isPlaying()) {
          imamApi.stop();
          if (listenText) listenText.textContent = "▶ Listen to Verse";
          if (waveEl) waveEl.hidden = true;
          return;
        }

        // Target active verse or first verse of the page
        const [fromS, fromA] = getPageVerses(this.currentPage, this.quran)[0]
          ? [getPageVerses(this.currentPage, this.quran)[0].surah, getPageVerses(this.currentPage, this.quran)[0].ayah]
          : [1, 1];
        const s = this.activeWord ? this.activeWord.surah : fromS;
        const a = this.activeWord ? this.activeWord.ayah : fromA;

        if (listenText) listenText.textContent = "Stop";
        if (waveEl) waveEl.hidden = false;

        try {
          await imamApi.playVerse(s, a);
        } catch (err) {
          console.warn("Imam audio error:", err);
        } finally {
          if (listenText) listenText.textContent = "Listen";
          if (waveEl) waveEl.hidden = true;
        }
      });
    }

    this.renderPage(1);
  }

  /** Navigates to a 1-based Madani page (1 to 604). */
  setPage(page: number, emitCallback = true) {
    const target = Math.max(1, Math.min(TOTAL_PAGES, page));
    if (this.currentPage === target && this.pageContentEl.childElementCount > 0) return;
    this.currentPage = target;
    this.renderPage(target);
    if (emitCallback && this.onPageChange) this.onPageChange(target);
  }

  getPage(): number {
    return this.currentPage;
  }

  /** Renders the target Madani page with headers and verses. */
  private renderPage(page: number) {
    const verses = getPageVerses(page, this.quran);
    this.wordSpanMap.clear();
    this.pageContentEl.replaceChildren();

    // Update Header
    const juz = getJuzForPage(page);
    const surahNames = Array.from(new Set(verses.map((v) => v.surahName))).join(" · ");
    const juzEl = this.container.querySelector("#mushaf-juz");
    const surahEl = this.container.querySelector("#mushaf-surah");
    const pageNumEl = this.container.querySelector("#mushaf-page-num");

    if (juzEl) juzEl.textContent = `الجزء ${toArabicDigits(juz)}`;
    if (surahEl) surahEl.textContent = surahNames || "";
    if (pageNumEl) pageNumEl.textContent = toArabicDigits(page);

    let lastSurah = -1;

    for (const v of verses) {
      // Check if this verse is the start of a new surah (ayah 1)
      if (v.ayah === 1 && v.surah !== lastSurah) {
        lastSurah = v.surah;
        const banner = document.createElement("div");
        banner.className = "mushaf-surah-banner";
        banner.textContent = `سُورَةُ ${v.surahName}`;
        this.pageContentEl.append(banner);

        // Basmala banner for all surahs except Al-Fatiha (1) and At-Tawbah (9)
        if (v.surah !== 1 && v.surah !== 9) {
          const basmala = document.createElement("div");
          basmala.className = "mushaf-basmala";
          basmala.textContent = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
          this.pageContentEl.append(basmala);
        }
      }

      // Verse wrapper
      const ayahWrap = document.createElement("span");
      ayahWrap.className = "mushaf-ayah-span";
      ayahWrap.dataset.surah = String(v.surah);
      ayahWrap.dataset.ayah = String(v.ayah);
      ayahWrap.title = `Click to listen to ayah ${v.ayah}`;
      ayahWrap.addEventListener("click", () => {
        this.highlightWord({ surah: v.surah, ayah: v.ayah, word: 1 }, false);
        void imamApi.playVerse(v.surah, v.ayah);
      });

      v.words.forEach((wText, wordIdx) => {
        const span = document.createElement("span");
        span.className = "mushaf-word";
        span.textContent = wText;
        span.dataset.surah = String(v.surah);
        span.dataset.ayah = String(v.ayah);
        span.dataset.wordIndex = String(wordIdx);

        const key = `${v.surah}:${v.ayah}:${wordIdx}`;
        this.wordSpanMap.set(key, span);

        ayahWrap.append(span);
        ayahWrap.append(document.createTextNode(" "));
      });

      // Ayah number marker glyph
      const ayahEnd = document.createElement("span");
      ayahEnd.className = "mushaf-ayah-number";
      ayahEnd.textContent = ` ﴿${toArabicDigits(v.ayah)}﴾ `;
      ayahWrap.append(ayahEnd);

      this.pageContentEl.append(ayahWrap);
    }

    // Reapply any active marks for this page
    for (const m of this.marks.values()) {
      this.applyMarkToDom(m);
    }

    // Reapply active word highlight if it belongs to this page
    if (this.activeWord) {
      this.highlightWord(this.activeWord, false);
    }
  }

  /**
   * Called on every tracker PositionEvent.
   * Detects the page and turns pages automatically if needed.
   */
  highlightWord(w: WordRef, allowPageTurn = true) {
    this.activeWord = w;
    const pageOfWord = getPageForVerse(w.surah, w.ayah);

    if (pageOfWord !== this.currentPage) {
      if (allowPageTurn && this.autoFollow) {
        this.setPage(pageOfWord);
      } else {
        return; // Word is on another page, user has auto-follow off or manual view
      }
    }

    const dispIdx = displayIndex(w.surah, w.ayah, w.word);
    const targetKey = `${w.surah}:${w.ayah}:${dispIdx}`;
    let foundCurrent = false;

    for (const [key, span] of this.wordSpanMap.entries()) {
      if (key === targetKey) {
        span.classList.add("current");
        span.classList.remove("said");
        foundCurrent = true;
        // Smoothly scroll active word into center if container is overflowing
        span.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      } else {
        span.classList.remove("current");
        if (!foundCurrent) {
          span.classList.add("said");
        } else {
          span.classList.remove("said");
        }
      }
    }
  }

  /** Record and highlight a checker mistake. */
  addCheckerMistake(e: CheckerEvent) {
    if (!isShown(e)) return;
    if (e.state === "confirmed") {
      this.marks.set(e.id, e);
      this.applyMarkToDom(e);
    } else if (e.state === "resolved") {
      this.marks.delete(e.id);
      this.removeMarkFromDom(e);
    }
  }

  private applyMarkToDom(e: CheckerEvent) {
    const dispIdx = displayIndex(e.location.surah, e.location.ayah, e.location.word);
    const key = `${e.location.surah}:${e.location.ayah}:${dispIdx}`;
    const span = this.wordSpanMap.get(key);
    if (!span) return;

    span.classList.add("mark");
    span.dataset.mark = e.errorClass;
    span.title = (EXPLAIN as Record<string, { label: string; text: string }>)[e.errorClass]?.text ?? e.errorClass;
  }

  private removeMarkFromDom(e: CheckerEvent) {
    const dispIdx = displayIndex(e.location.surah, e.location.ayah, e.location.word);
    const key = `${e.location.surah}:${e.location.ayah}:${dispIdx}`;
    const span = this.wordSpanMap.get(key);
    if (span) {
      span.classList.remove("mark");
      delete span.dataset.mark;
    }
  }

  /** Clears recitation highlights for a new session. */
  resetHighlights() {
    this.activeWord = null;
    this.marks.clear();
    for (const span of this.wordSpanMap.values()) {
      span.classList.remove("said", "current", "mark");
      delete span.dataset.mark;
    }
  }
}
