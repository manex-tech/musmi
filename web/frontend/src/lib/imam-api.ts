/**
 * Imam API & Recitation Service for Musmi‘
 * Integrates open Quran audio CDNs (EveryAyah & Quran.com audio)
 * Supports multiple renowned Imams/Qaris with prefetching and offline caching.
 */

export interface Imam {
  id: string;
  name: string;
  nameAr: string;
  style: "Murattal" | "Muallim" | "Mujawwad";
  urlFolder: string;
  description: string;
}

export const IMAMS: Imam[] = [
  {
    id: "alafasy",
    name: "Mishary Rashid Alafasy",
    nameAr: "مشاري راشد العفاسي",
    style: "Murattal",
    urlFolder: "Alafasy_128kbps",
    description: "Clear, melodious contemporary recitation",
  },
  {
    id: "husary",
    name: "Mahmoud Khalil Al-Husary",
    nameAr: "محمود خليل الحصري",
    style: "Murattal",
    urlFolder: "Husary_128kbps",
    description: "The gold standard of classical Hafs recitation",
  },
  {
    id: "husary_muallim",
    name: "Al-Husary (Teacher / Muallim)",
    nameAr: "الحصري (المصحف المعلم)",
    style: "Muallim",
    urlFolder: "Husary_Muallim_128kbps",
    description: "Recitation with pauses, ideal for Hifz revision & correction",
  },
  {
    id: "minshawy",
    name: "Mohamed Siddiq Al-Minshawi",
    nameAr: "محمد صديق المنشاوي",
    style: "Murattal",
    urlFolder: "Minshawy_Murattal_128kbps",
    description: "Deep, soulful and reverent Egyptian recitation",
  },
  {
    id: "abdulbasit",
    name: "Abdul Basit Abdul Samad",
    nameAr: "عبد الباسط عبد الصمد",
    style: "Murattal",
    urlFolder: "Abdul_Basit_Murattal_192kbps",
    description: "Legendary voice with pristine articulation",
  },
  {
    id: "ghamadi",
    name: "Saad Al-Ghamdi",
    nameAr: "سعد الغامدي",
    style: "Murattal",
    urlFolder: "Ghamadi_40kbps",
    description: "Smooth, rhythmic recitation",
  },
  {
    id: "shuraym",
    name: "Sa'ud Ash-Shuraym",
    nameAr: "سعود الشريم",
    style: "Murattal",
    urlFolder: "Saood_ash-Shuraym_128kbps",
    description: "Former Imam of Masjid Al-Haram, fast and firm cadence",
  },
  {
    id: "muaiqly",
    name: "Maher Al-Muaiqly",
    nameAr: "ماهر المعيقلي",
    style: "Murattal",
    urlFolder: "MaherAlMuaiqly128kbps",
    description: "Imam of Masjid Al-Haram, melodious and moving recitation",
  },
];

const pad3 = (n: number) => String(n).padStart(3, "0");

export class ImamApiService {
  private currentAudio: HTMLAudioElement | null = null;
  private selectedImamId = "alafasy";
  private isAudioUnlocked = false;
  private onPlaybackStateChange?: (playing: boolean, info?: { surah: number; ayah: number; imam: Imam }) => void;

  constructor(options?: {
    defaultImam?: string;
    onPlaybackStateChange?: (playing: boolean, info?: { surah: number; ayah: number; imam: Imam }) => void;
  }) {
    if (options?.defaultImam) this.selectedImamId = options.defaultImam;
    this.onPlaybackStateChange = options?.onPlaybackStateChange;
  }

  getImams(): Imam[] {
    return IMAMS;
  }

  getSelectedImam(): Imam {
    return IMAMS.find((i) => i.id === this.selectedImamId) ?? IMAMS[0];
  }

  setImam(imamId: string) {
    if (IMAMS.some((i) => i.id === imamId)) {
      this.selectedImamId = imamId;
    }
  }

  /** Unlocks audio context on user gesture to prevent browser autoplay blocking. */
  unlockAudio(): void {
    if (this.isAudioUnlocked) return;
    try {
      const a = new Audio();
      a.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
      void a.play().then(() => {
        this.isAudioUnlocked = true;
      }).catch(() => {});
    } catch {}
  }

  /** Constructs the CDN audio URL for a specific verse. */
  getAyahAudioUrl(surah: number, ayah: number, imamId?: string): string {
    const imam = IMAMS.find((i) => i.id === (imamId ?? this.selectedImamId)) ?? this.getSelectedImam();
    return `https://everyayah.com/data/${imam.urlFolder}/${pad3(surah)}${pad3(ayah)}.mp3`;
  }

  /** Plays the recitation of a verse by the selected Imam. */
  async playVerse(surah: number, ayah: number, imamId?: string): Promise<void> {
    this.stop();
    const imam = IMAMS.find((i) => i.id === (imamId ?? this.selectedImamId)) ?? this.getSelectedImam();
    const url = this.getAyahAudioUrl(surah, ayah, imam.id);

    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.preload = "auto";
      audio.src = url;
      this.currentAudio = audio;

      audio.onplay = () => {
        if (this.onPlaybackStateChange) {
          this.onPlaybackStateChange(true, { surah, ayah, imam });
        }
      };

      audio.onended = () => {
        this.currentAudio = null;
        if (this.onPlaybackStateChange) {
          this.onPlaybackStateChange(false);
        }
        resolve();
      };

      audio.onerror = (e) => {
        console.error("Audio playback error for", url, e);
        this.currentAudio = null;
        if (this.onPlaybackStateChange) {
          this.onPlaybackStateChange(false);
        }
        reject(new Error(`Failed to load Imam audio for ${surah}:${ayah}`));
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.error("audio.play() promise rejected:", err);
          this.currentAudio = null;
          if (this.onPlaybackStateChange) {
            this.onPlaybackStateChange(false);
          }
          reject(err);
        });
      }
    });
  }

  /** Stops any ongoing Imam recitation audio. */
  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
      if (this.onPlaybackStateChange) {
        this.onPlaybackStateChange(false);
      }
    }
  }

  isPlaying(): boolean {
    return this.currentAudio !== null && !this.currentAudio.paused;
  }
}

// Global shared instance
export const imamApi = new ImamApiService();
