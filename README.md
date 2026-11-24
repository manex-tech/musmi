# Musmi‘ (مُسْمِع)

> An intelligent, offline-capable Quran Reviewer, Hifz Companion, and Musabaqah (Competition) Simulator.
> Built on top of the open-source [Tilawa](https://github.com/yazinsai/tilawa) recitation engine created by [Yazin Alirhayim](https://github.com/yazinsai) and contributors.

---

## Overview

**Musmi‘** (مُسْمِع - *The Listener & Examiner*) transforms on-device acoustic Quran recognition into an interactive review and competition experience. Designed with a clean, minimal iOS-inspired interface, it works seamlessly across phones, tablets, and desktop browsers.

### Key Features

1. **Hifz Auto-Detector & Mushaf Synchronizer**
   - Recite from anywhere in the Quran without selecting a surah or ayah beforehand.
   - Automatically identifies the verse within 2–3 spoken words.
   - Synchronizes word-by-word with the 604-page Madani Mushaf layout with automatic page-turning.
   - Switch effortlessly between Single Verse (1 Ayah) mode and Full Page Mushaf view.

2. **Musabaqah Competition Mode (المسابقة)**
   - Select any Juz (1 through 30).
   - The chosen Imam prompts a random ayah from that Juz.
   - When the bell sounds, continue reciting.
   - If a memorization slip occurs:
     - A chime sounds.
     - A subtle red signal illuminates.
     - The Imam recites the correct verse before you resume.
   - Final competition scoring and ranking (*Mumtaz*, *Jayyid Jiddan*, *Jayyid*, *Maqbool*) with detailed slip reports.

3. **Master Imam Audio Integration**
   - High-quality streaming reference audio from 8 renowned Qaris:
     - Mishary Rashid Alafasy
     - Mahmoud Khalil Al-Husary (Murattal)
     - Al-Husary (Teacher / Muallim with pauses)
     - Mohamed Siddiq Al-Minshawi
     - Abdul Basit Abdul Samad
     - Saad Al-Ghamdi
     - Sa'ud Ash-Shuraym
     - Maher Al-Muaiqly
   - One-tap audio testing and instant verse playback.

4. **100% Private & On-Device**
   - All voice processing and neural acoustic model inference run locally in the browser via WebGPU / WebAssembly (ONNX Runtime).
   - Audio never leaves your device.

---

## Running the Web App

### Prerequisites
- Node.js ≥ 20.12
- npm

### Development Server

```bash
# Install root/core dependencies if not already done
npm --prefix packages/tilawa-core ci
npm --prefix packages/tilawa-core run build

# Start frontend
npm --prefix web/frontend ci
npm --prefix web/frontend run dev
```

Open `http://localhost:5173/` in your browser.

### Production Build

```bash
npm --prefix web/frontend run build
```

---

## Technical Architecture

Musmi‘ bundles `@tilawa/core` for on-device phoneme decoding and tracking:

- **Frontend:** Vite, TypeScript, minimal iOS-style design tokens, Amiri Quranic typography.
- **Engine:** `@tilawa/core` (research engine by Yazin Alirhayim).
- **Runtime:** ONNX Runtime Web (`onnxruntime-web`) running quantized acoustic models (`spliced-clean@1-int8`).
- **Audio CDN:** EveryAyah high-bitrate streaming audio.

---

## Attribution & License

- **Engine:** Built on [Tilawa](https://github.com/yazinsai/tilawa) developed by Yazin Alirhayim and contributors (MIT License).
- **Quran Text:** Tanzil Project.
- **Dataset / Training:** Evaluated on tlog (Tarteel, CC-BY) and QUD alignment benchmarks.
- See [`NOTICE.md`](./NOTICE.md) for full licensing information.
