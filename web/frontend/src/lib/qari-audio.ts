/**
 * Qari / Imam Audio Service for Musmi‘
 * Powered by ImamApiService
 */

import { imamApi, IMAMS, type Imam } from "./imam-api";

export type { Imam as Reciter };
export const RECITERS = IMAMS;

export function getAyahAudioUrl(surah: number, ayah: number, reciterId = "alafasy"): string {
  return imamApi.getAyahAudioUrl(surah, ayah, reciterId);
}

export function playAyahAudio(surah: number, ayah: number, reciterId = "alafasy"): Promise<void> {
  return imamApi.playVerse(surah, ayah, reciterId);
}

export function stopAudio(): void {
  imamApi.stop();
}

let audioCtx: AudioContext | null = null;

/** Plays a soft judge bell / chime to signal mistake intervention (synthesized via Web Audio API). */
export function playJudgeBell(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    audioCtx ??= new AudioContextClass();
    if (audioCtx.state === "suspended") void audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
    osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.6);

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.85);
  } catch (err) {
    console.warn("Could not play judge chime:", err);
  }
}
