import type { CheckerEvent } from "@tilawa/core";
import { playAyahAudio, playJudgeBell, stopAudio } from "./qari-audio";

export interface MusabaqahScore {
  finalScore: number;
  grade: string;
  gradeAr: string;
  totalMistakes: number;
  interventions: number;
  notes: string[];
}

export type MusabaqahState = "idle" | "playing_prompt" | "user_reciting" | "correcting" | "finished";

export class MusabaqahEngine {
  private state: MusabaqahState = "idle";
  private score = 100;
  private mistakesCount = 0;
  private interventions = 0;
  private notes: string[] = [];
  private onStateChange?: (state: MusabaqahState, message: string) => void;
  private onScoreUpdate?: (score: number) => void;

  constructor(callbacks?: {
    onStateChange?: (state: MusabaqahState, message: string) => void;
    onScoreUpdate?: (score: number) => void;
  }) {
    this.onStateChange = callbacks?.onStateChange;
    this.onScoreUpdate = callbacks?.onScoreUpdate;
  }

  getState(): MusabaqahState {
    return this.state;
  }

  getScore(): number {
    return Math.max(0, Math.round(this.score));
  }

  /**
   * Starts a Musabaqah question:
   * Plays the Imam's prompt verse synchronously to honor browser gesture policies,
   * then calls onPromptFinished to activate user mic and tracking.
   */
  async startChallenge(
    surah: number,
    promptAyah: number,
    reciterId = "alafasy",
    onPromptFinished?: () => void,
  ): Promise<void> {
    this.reset();
    this.state = "playing_prompt";
    this.notifyState("playing_prompt", `Imam is reciting Surah ${surah}:${promptAyah}. Listen...`);

    try {
      await playAyahAudio(surah, promptAyah, reciterId);
    } catch (e) {
      console.warn("Could not play Imam prompt audio:", e);
    }

    // Cue the user with the competition judge bell
    playJudgeBell();
    this.state = "user_reciting";
    this.notifyState("user_reciting", `Now your turn! Continue reciting from verse ${promptAyah + 1}...`);

    if (onPromptFinished) {
      onPromptFinished();
    }
  }

  /** Intervenes when a confirmed mistake occurs during user recitation. */
  async handleMistake(e: CheckerEvent, reciterId = "alafasy"): Promise<void> {
    if (this.state !== "user_reciting") return;
    this.state = "correcting";
    this.mistakesCount++;
    this.interventions++;
    this.score = Math.max(0, this.score - 2.5); // Deduction for judge intervention
    this.notes.push(`Slip at ayah ${e.location.ayah} (${e.errorClass})`);

    if (this.onScoreUpdate) this.onScoreUpdate(this.getScore());
    this.notifyState("correcting", `Judge intervention: Listen to correct ayah ${e.location.ayah}...`);

    // Judge chime
    playJudgeBell();

    // Play correct ayah
    try {
      await playAyahAudio(e.location.surah, e.location.ayah, reciterId);
    } catch (err) {
      console.warn("Could not play correction audio:", err);
    }

    this.state = "user_reciting";
    this.notifyState("user_reciting", "Please resume reciting...");
  }

  /** Evaluates final competition score and ranking. */
  finishRound(): MusabaqahScore {
    this.state = "finished";
    stopAudio();
    const final = this.getScore();
    let grade = "Maqbool (Needs Revision)";
    let gradeAr = "مقبول";

    if (final >= 95) {
      grade = "Mumtaz (Excellent)";
      gradeAr = "ممتاز";
    } else if (final >= 85) {
      grade = "Jayyid Jiddan (Very Good)";
      gradeAr = "جيد جداً";
    } else if (final >= 75) {
      grade = "Jayyid (Good)";
      gradeAr = "جيد";
    }

    return {
      finalScore: final,
      grade,
      gradeAr,
      totalMistakes: this.mistakesCount,
      interventions: this.interventions,
      notes: [...this.notes],
    };
  }

  reset(): void {
    this.state = "idle";
    this.score = 100;
    this.mistakesCount = 0;
    this.interventions = 0;
    this.notes = [];
    stopAudio();
    if (this.onScoreUpdate) this.onScoreUpdate(100);
  }

  private notifyState(state: MusabaqahState, message: string) {
    if (this.onStateChange) this.onStateChange(state, message);
  }
}
