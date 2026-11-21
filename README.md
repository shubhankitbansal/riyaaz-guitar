# Riyaaz Guitar

An Android app (built with React + Capacitor): **tuner**, **Hindi songbook with chords & tabs**, and a **beginner → advanced course**.

```bash
npm start        # dev server at http://localhost:3000
npm test         # unit tests (pitch detection, chords, song parser, content)
npm run build    # production build in /build
```

## Android app

Requires Android Studio (SDK) and JDK 21 — both already installed on this machine.

```bash
npm run android:apk    # build web + sync + debug APK
                       # → android/app/build/outputs/apk/debug/app-debug.apk
npm run android:run    # build and launch on a connected phone / emulator
npm run android:open   # open the native project in Android Studio
```

Install the APK on your phone: copy `app-debug.apk` to the phone and open it (allow "Install unknown apps"),
or plug the phone in with USB debugging on and run `npm run android:run`.

After changing anything in `src/`, run `npm run android:sync` (or `android:apk`) so the app picks it up.

**Play Store release:** in Android Studio use *Build → Generate Signed App Bundle*, create an upload keystore
(keep it safe — you need the same key for every update), and upload the `.aab` to the Play Console.

Native bits: microphone permission (`RECORD_AUDIO`) for the tuner, hardware back button navigates screens,
mic is released when the app goes to the background, song export opens the Android share sheet, fonts are bundled
so the app works fully offline. Icons/splash are generated from `assets/` with `npx @capacitor/assets generate --android`.

`npm start` still runs it in a browser for quick UI development.

## Features

| Section | What it does |
|---|---|
| **Tuner** | Real-time mic pitch detection (YIN algorithm), auto string detection or locked string, needle gauge in cents, ✓ per tuned string, reference tones, 7 tunings (Standard, Eb, Drop D, D, Open G, Open D, DADGAD), adjustable A4 (430–450 Hz). |
| **Songs** | Chords above lyrics, chord bars and tab blocks; transpose, capo (chords re-shape automatically), "easy shapes" capo suggestions, chord diagrams you can tap to hear, strum-pattern play-along, auto-scroll, font size, favourites. Add/edit your own songs, paste chord sheets from any website and **Auto-format**, import/export JSON. |
| **Learn** | 24 lessons in 3 levels (Shuruaat / Madhyam / Ustaad): posture, tabs, first chords, strumming, barre chords, fingerpicking, sargam & major scale, pentatonics, capo, CAGED, Travis picking, raag flavours (Yaman, Bhairav, Kafi), improvisation, percussive strumming, playing by ear. Progress is saved. |
| **Chords** | Any root × 11 chord types with diagrams generated for every key, strum/arpeggio playback. |
| **Find any song** | Search any song (Apple/iTunes catalogue, with 30-second previews). With an Anthropic API key (Settings), Claude researches the song with web search and returns key, capo, BPM, strumming, chords per section, riff tab and the main melody hook — saved as an editable song marked *AI*. Lyrics are not generated. |
| **Playback** | ▶ Play full song strums every chord of the arrangement with its pattern, highlighting and following the current chord; melody sections play note by note and show an auto-generated tab. |
| **Languages** | English (default), Hindi, Bengali, Marathi, Tamil, Telugu — menus and messages (Settings → Language). Lesson text is English. |
| **Metronome** | 30–240 BPM, tap tempo, accents, 2/3/4/6 beats, subdivisions, Space to start/stop. |

## Song format

```
{Mukhda}
[Am]Lyrics with [F]chords in brackets
| G | D | Em | C |          ← chord bars
{Tab Intro}
e|---0---3---|              ← tab lines are kept as-is
{Melody Hook}
E4 G4:0.5 A4:0.5 B4:2 -     ← note:beats, "-" = rest; tab is generated
```

Bundled songs are public-domain/traditional texts (Jana Gana Mana, Vande Mataram, Saare Jahan Se Achha,
Raghupati Raghav, Om Jai Jagdish Hare) with simple original arrangements, plus original practice pieces.
Film-song lyrics are copyrighted, so they are not bundled — add the songs you're learning via **+ New song**.
User data is stored in the browser's localStorage.

## Code map

- `src/audio/` — `pitch.js` (YIN detector), `synth.js` (Karplus–Strong guitar synth, clicks), `ticker.js` (look-ahead scheduler)
- `src/music/` — `theory.js` (notes, transposition), `chords.js` (open + generated barre shapes), `songParser.js` (song format + chord-sheet importer), `tab.js`
- `src/services/` — `songSearch.js` (iTunes), `arranger.js` (Claude: research with web search, then strict JSON)
- `src/locales/` + `src/i18n.js` — translations
- `src/data/` — songs, lessons, tunings
- `src/components/` — one component per screen plus `ChordDiagram`, `StrumPattern`
