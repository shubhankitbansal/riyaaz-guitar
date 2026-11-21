// Course content. Block types:
//  p, list, tip, chords (names), shapes (custom diagrams), tab, strum, link, practice

import { makeTab } from '../music/tab';

const X = -1;

const openStrings = makeTab([[6, 0], [5, 0], [4, 0], [3, 0], [2, 0], [1, 0]]);

const spider = makeTab([
  [6, 1], [6, 2], [6, 3], [6, 4], [5, 1], [5, 2], [5, 3], [5, 4], [4, 1], [4, 2], [4, 3], [4, 4],
  [3, 1], [3, 2], [3, 3], [3, 4], [2, 1], [2, 2], [2, 3], [2, 4], [1, 1], [1, 2], [1, 3], [1, 4],
]);

const cMajor = makeTab([
  [5, 3], [4, 0], [4, 2], [4, 3], [3, 0], [3, 2], [2, 0], [2, 1], '|',
  [2, 1], [2, 0], [3, 2], [3, 0], [4, 3], [4, 2], [4, 0], [5, 3],
]);

const pentaBox1 = makeTab([
  [6, 5], [6, 8], [5, 5], [5, 7], [4, 5], [4, 7], [3, 5], [3, 7], [2, 5], [2, 8], [1, 5], [1, 8],
]);

const pentaBox2 = makeTab([
  [6, 8], [6, 10], [5, 7], [5, 10], [4, 7], [4, 10], [3, 7], [3, 9], [2, 8], [2, 10], [1, 8], [1, 10],
]);

const arpeggios = makeTab([
  [5, 3], [3, 0], [2, 1], [1, 0], [2, 1], [3, 0], '|',
  [5, 0], [3, 2], [2, 1], [1, 0], [2, 1], [3, 2],
]);

const travis = makeTab([
  [[5, 3], [1, 0]], [2, 1], [4, 2], [3, 0], [[5, 3], [1, 0]], [2, 1], [4, 2], [3, 0], '|',
  [[6, 3], [1, 3]], [2, 0], [4, 0], [3, 0], [[6, 3], [1, 3]], [2, 0], [4, 0], [3, 0],
]);

const techniques = makeTab([[3, '5h7'], [3, '7p5'], '|', [3, '5/7'], [3, '7\\5'], '|', [2, '8b10'], [1, 5]]);

const legato = makeTab([
  [1, '5h8'], [2, '5h8'], [3, '5h7'], [4, '5h7'], '|', [4, '7p5'], [3, '7p5'], [2, '8p5'], [1, '8p5'],
]);

const yaman = makeTab([[5, 3], [4, 0], [4, 2], [4, 4], [4, 5], [3, 2], [3, 4], [3, 5]]);
const bhairav = makeTab([[5, 3], [5, 4], [4, 2], [4, 3], [4, 5], [3, 1], [3, 4], [3, 5]]);
const kafi = makeTab([[5, 3], [4, 0], [4, 1], [4, 3], [4, 5], [3, 2], [3, 3], [3, 5]]);

const harmonicMinor = makeTab([
  [5, 0], [5, 2], [5, 3], [4, 0], [4, 2], [4, 3], [3, 1], [3, 2],
]);

const CAGED_C = [
  { label: 'C shape', shape: { frets: [X, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] } },
  { label: 'A shape', shape: { frets: [X, 3, 5, 5, 5, 3], fingers: [0, 1, 3, 3, 3, 1], barre: { fret: 3, from: 1, to: 5 } } },
  { label: 'G shape', shape: { frets: [8, 7, 5, 5, 5, 8], fingers: [4, 3, 1, 1, 1, 4], barre: { fret: 5, from: 2, to: 4 } } },
  { label: 'E shape', shape: { frets: [8, 10, 10, 9, 8, 8], fingers: [1, 3, 4, 2, 1, 1], barre: { fret: 8, from: 0, to: 5 } } },
  { label: 'D shape', shape: { frets: [X, X, 10, 12, 13, 12], fingers: [0, 0, 1, 3, 4, 2] } },
];

export const LEVELS = [
  {
    id: 'beginner',
    title: 'Beginner',
    hindi: 'Shuruaat',
    description: 'Hold the guitar, tune it, play your first chords and strum your first song.',
    lessons: [
      {
        id: 'b1',
        title: 'Meet your guitar',
        minutes: 5,
        blocks: [
          { t: 'p', text: 'A standard guitar has six strings. From the thickest (closest to your face) to the thinnest they are tuned E – A – D – G – B – E. Strings are numbered backwards: the thin high E is string 1, the thick low E is string 6.' },
          { t: 'tip', text: 'Memory trick: “Eddie Ate Dynamite, Good Bye Eddie”.' },
          { t: 'tab', title: 'The six open strings', text: openStrings },
          { t: 'list', title: 'Parts of the guitar', items: [
            'Headstock & tuning pegs — turn them to raise or lower a string’s pitch.',
            'Nut — the small strip where the strings leave the headstock.',
            'Frets — the metal bars on the neck. Each fret raises the note by one semitone.',
            'Body & soundhole — where the sound resonates (acoustic) or pickups sit (electric).',
            'Bridge — anchors the strings to the body.',
          ] },
          { t: 'list', title: 'Posture checklist', items: [
            'Sit upright; rest the guitar’s waist on your right thigh (left thigh if you play left-handed).',
            'Fretting-hand thumb behind the neck, roughly opposite your middle finger.',
            'Press with your fingertips, just behind (not on top of) the fret wire.',
            'Hold the pick between thumb and the side of your index finger, with only a little tip showing.',
            'Keep fretting-hand nails short.',
          ] },
        ],
      },
      {
        id: 'b2',
        title: 'Tune your guitar',
        minutes: 5,
        blocks: [
          { t: 'p', text: 'An out-of-tune guitar makes even perfect technique sound wrong. Tune every time you pick it up — it only takes a minute.' },
          { t: 'list', title: 'Using the tuner', items: [
            'Open the Tuner tab and tap “Start tuning”. Allow microphone access.',
            'Pluck one string and let it ring.',
            'Needle left / “Too low” → tighten the peg to raise the pitch.',
            'Needle right / “Too high” → loosen the peg to lower the pitch.',
            'When the needle sits in the green zone the string gets a ✓. Do all six.',
          ] },
          { t: 'tip', text: 'Always finish by tuning UP to the note. If you are sharp, go a little below and come back up — the string holds its tuning better.' },
          { t: 'link', to: '#/tuner', label: 'Open the tuner' },
        ],
      },
      {
        id: 'b3',
        title: 'Reading tabs & chord diagrams',
        minutes: 8,
        blocks: [
          { t: 'p', text: 'Tablature (tab) shows WHERE to play, not traditional notation. The six lines are the strings — the top line is the thin high e, the bottom line is the thick low E. Numbers are frets: 0 means play the string open. Read left to right.' },
          { t: 'tab', title: 'Example: low E open, then 3rd fret on the A string, then open D', text: makeTab([[6, 0], [5, 3], [4, 0]]) },
          { t: 'p', text: 'A chord diagram is a picture of the neck standing upright. Vertical lines are strings (low E on the left), horizontal lines are frets. Dots show where fingers go, and the numbers are which finger: 1 = index, 2 = middle, 3 = ring, 4 = pinky. “×” means don’t play that string, “○” means play it open.' },
          { t: 'chords', names: ['Em', 'C'] },
          { t: 'tip', text: 'Tap any chord diagram in this app to hear how it should sound.' },
        ],
      },
      {
        id: 'b4',
        title: 'Finger warm-up (the spider)',
        minutes: 10,
        blocks: [
          { t: 'p', text: 'This chromatic exercise builds strength, independence and accuracy. Use one finger per fret: index on fret 1, middle on 2, ring on 3, pinky on 4.' },
          { t: 'tab', title: 'Spider exercise — ascending', text: spider },
          { t: 'practice', items: ['Set the metronome to 60 BPM, one note per click.', 'Keep each finger down until you need it elsewhere.', 'When it is clean 3 times in a row, add 5 BPM.'] },
          { t: 'link', to: '#/metronome', label: 'Open the metronome' },
        ],
      },
      {
        id: 'b5',
        title: 'Your first five chords',
        minutes: 15,
        blocks: [
          { t: 'p', text: 'These five open chords unlock hundreds of songs. Learn them in this order — Em is the easiest (two fingers).' },
          { t: 'chords', names: ['Em', 'Am', 'C', 'G', 'D'] },
          { t: 'list', title: 'Getting a clean sound', items: [
            'Arch your fingers so they don’t touch neighbouring strings.',
            'Press close to the fret wire — you need less pressure there.',
            'Pick each string one at a time and fix any buzzing or muted string.',
          ] },
          { t: 'tip', text: 'Sore fingertips are normal for the first 2–3 weeks. Play 15 minutes a day rather than 2 hours once a week.' },
        ],
      },
      {
        id: 'b6',
        title: 'Strumming basics',
        minutes: 15,
        blocks: [
          { t: 'p', text: 'Your strumming hand should move down and up constantly like a pendulum, on every “1 & 2 & 3 & 4 &”. Down on the numbers, up on the “&”s. To create a pattern you simply miss the strings on some strokes — but the hand never stops moving.' },
          { t: 'strum', title: 'Step 1 — four down strums', pattern: 'D-D-D-D-', chords: ['G'], bpm: 70 },
          { t: 'strum', title: 'Step 2 — the “D DU UDU” pattern', pattern: 'D-DU-UDU', chords: ['G', 'C'], bpm: 70 },
          { t: 'tip', text: '“D DU UDU” (down, down-up, up-down-up) is the go-to strum for countless Hindi acoustic covers. Say it out loud while you play.' },
        ],
      },
      {
        id: 'b7',
        title: 'Changing chords smoothly',
        minutes: 15,
        blocks: [
          { t: 'p', text: 'Clean changes matter more than speed. Look for “anchor” fingers that stay put: from C to Am your index and middle fingers don’t move — only the ring finger travels.' },
          { t: 'chords', names: ['C', 'Am', 'G', 'D', 'Em'] },
          { t: 'practice', items: [
            'One-minute changes: switch C ↔ Am as many times as you can in 60 seconds. Write the score down.',
            'Repeat with G ↔ D, Em ↔ C and G ↔ C.',
            'Beat your score tomorrow — aim for 30+ clean changes per minute.',
          ] },
        ],
      },
      {
        id: 'b8',
        title: 'Your first progression & song',
        minutes: 20,
        blocks: [
          { t: 'p', text: 'G – D – Em – C (the I–V–vi–IV progression) is the most famous loop in popular music. Play one bar of “D DU UDU” on each chord.' },
          { t: 'chords', names: ['G', 'D', 'Em', 'C'] },
          { t: 'strum', title: 'Play along', pattern: 'D-DU-UDU', chords: ['G', 'D', 'Em', 'C'], bpm: 72 },
          { t: 'p', text: 'Then try your first full song: “Raghupati Raghav Raja Ram” uses only G, C and D.' },
          { t: 'link', to: '#/songs/b-raghupati-raghav', label: 'Open “Raghupati Raghav” in the songbook' },
        ],
      },
    ],
  },
  {
    id: 'intermediate',
    title: 'Intermediate',
    hindi: 'Madhyam',
    description: 'Barre chords, fingerpicking, scales, capo tricks and richer rhythm.',
    lessons: [
      {
        id: 'i1',
        title: 'The F barre chord (E shape)',
        minutes: 20,
        blocks: [
          { t: 'p', text: 'A barre chord uses your index finger as a movable nut. The E-shape barre is an open E chord played with fingers 2-3-4, with the index finger flattened across all six strings behind it.' },
          { t: 'chords', names: ['Fmaj7', 'F', 'F#m', 'G7', 'Gm'] },
          { t: 'list', title: 'Barre tips', items: [
            'Roll your index finger slightly onto its bony edge (towards the headstock).',
            'Keep the barre right behind the fret wire.',
            'Use arm weight — pull back gently with your arm instead of squeezing with the thumb.',
            'Stepping stone: practise Fmaj7 first, then full F.',
          ] },
          { t: 'tip', text: 'The same shape anywhere on the neck: root on 6th string fret 1 = F, fret 3 = G, fret 5 = A, fret 7 = B.' },
        ],
      },
      {
        id: 'i2',
        title: 'A-shape barre chords',
        minutes: 20,
        blocks: [
          { t: 'p', text: 'The A-shape barre takes its root from the 5th string. With E-shape and A-shape barres you can play every major and minor chord.' },
          { t: 'chords', names: ['Bm', 'B', 'Bb', 'C#m', 'Cm'] },
          { t: 'tip', text: 'Bm (2nd fret) is very common in Hindi songs in the key of D and G. Practise G → Bm → Em → D.' },
          { t: 'strum', title: 'Practice: G – Bm – Em – D', pattern: 'D-DU-UDU', chords: ['G', 'Bm', 'Em', 'D'], bpm: 70 },
        ],
      },
      {
        id: 'i3',
        title: 'Fingerpicking basics',
        minutes: 20,
        blocks: [
          { t: 'p', text: 'Fingerstyle uses p-i-m-a: thumb (p) plays the bass strings 6-5-4, index (i) the G string, middle (m) the B string, ring (a) the high e. Hold the chord shape and pick the strings one at a time.' },
          { t: 'tab', title: 'Arpeggio pattern on C then Am (p-i-m-a-m-i)', text: arpeggios },
          { t: 'practice', items: ['Play each bar 4 times, then switch chord without stopping.', 'Let all notes ring together.', 'Start at 60 BPM, two notes per click.'] },
          { t: 'link', to: '#/songs/b-romantic-fingerstyle', label: 'Try the Romantic Fingerstyle Etude' },
        ],
      },
      {
        id: 'i4',
        title: 'The major scale & sargam',
        minutes: 15,
        blocks: [
          { t: 'p', text: 'The C major scale in open position. In Indian music the same seven notes are sung as Sa Re Ga Ma Pa Dha Ni Sa — so C D E F G A B C is Sa Re Ga Ma Pa Dha Ni Sa with Sa = C.' },
          { t: 'tab', title: 'C major — up and down (Sa Re Ga Ma Pa Dha Ni Sa)', text: cMajor },
          { t: 'tip', text: 'Sing the sargam while you play. It trains your ear to hear melodies — the key skill for figuring out Hindi songs by ear.' },
        ],
      },
      {
        id: 'i5',
        title: 'Minor pentatonic scale',
        minutes: 15,
        blocks: [
          { t: 'p', text: 'The five-note minor pentatonic is the most used scale for solos and fills. This is “box 1” of A minor pentatonic at the 5th fret. Use your index finger on fret 5 and ring/pinky on 7/8.' },
          { t: 'tab', title: 'A minor pentatonic — box 1', text: pentaBox1 },
          { t: 'practice', items: ['Play up and down with alternate picking (down-up).', 'Then improvise slowly over an Am chord loop.'] },
        ],
      },
      {
        id: 'i6',
        title: 'Using a capo & transposing',
        minutes: 10,
        blocks: [
          { t: 'p', text: 'A capo raises every string by one semitone per fret, so you can keep using easy open shapes in any key. Each capo fret moves the sounding key up a semitone: G shapes with capo 2 sound in A.' },
          { t: 'list', title: 'Quick rule', items: [
            'Sounding chord = shape + capo fret.',
            'To match a singer, transpose the song until it sits comfortably in their voice.',
            'In the songbook, set Capo and the chord names update to the shapes you should play.',
          ] },
          { t: 'tip', text: 'Many Hindi film songs are recorded in “awkward” guitar keys like F, Bb or C#m. The songbook’s “Easy shapes” suggestions find a capo position for you.' },
        ],
      },
      {
        id: 'i7',
        title: '7th & sus chords for colour',
        minutes: 15,
        blocks: [
          { t: 'p', text: 'Swap plain chords for these to add colour. sus2/sus4 chords create tension that resolves back to the major chord; 7th chords pull strongly to the next chord.' },
          { t: 'chords', names: ['Dsus2', 'D', 'Dsus4', 'Asus2', 'Asus4', 'Cadd9', 'E7', 'A7'] },
          { t: 'strum', title: 'Try: D – Dsus4 – D – Dsus2', pattern: 'D-DU-UDU', chords: ['D', 'Dsus4', 'D', 'Dsus2'], bpm: 76 },
        ],
      },
      {
        id: 'i8',
        title: 'Palm muting & dynamics',
        minutes: 10,
        blocks: [
          { t: 'p', text: 'Rest the edge of your strumming palm lightly on the strings right by the bridge to get a short, chunky “muted” sound. Lift it for the chorus — the contrast makes songs come alive.' },
          { t: 'list', items: ['Verse: palm-muted, softer down strums.', 'Chorus: open strings, full “D DU UDU”.', 'Practise switching every 4 bars.'] },
        ],
      },
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced',
    hindi: 'Ustaad',
    description: 'Lead techniques, the whole fretboard, Travis picking, raag flavours and playing by ear.',
    lessons: [
      {
        id: 'a1',
        title: 'Hammer-ons, pull-offs, slides & bends',
        minutes: 20,
        blocks: [
          { t: 'list', title: 'Tab symbols', items: [
            'h = hammer-on: pick the first note, then slam another finger down without picking.',
            'p = pull-off: pick the higher note, then flick that finger off to sound the lower one.',
            '/ and \\ = slide up / slide down.',
            'b = bend: push the string until it reaches the pitch of the second number.',
          ] },
          { t: 'tab', title: 'Technique sampler', text: techniques },
          { t: 'tab', title: 'Legato pentatonic run', text: legato },
          { t: 'tip', text: 'These ornaments are how guitar imitates the meend (glide) and murki (quick turns) of Indian vocal music.' },
        ],
      },
      {
        id: 'a2',
        title: 'The CAGED system',
        minutes: 25,
        blocks: [
          { t: 'p', text: 'Every major chord can be played with five shapes — C, A, G, E and D — moving up the neck. Here are all five shapes of a C chord. Learning them maps the entire fretboard.' },
          { t: 'shapes', items: CAGED_C },
          { t: 'practice', items: ['Play the five C shapes in order up the neck.', 'Repeat for G and D.', 'Find the root note in each shape.'] },
        ],
      },
      {
        id: 'a3',
        title: 'Connecting pentatonic positions',
        minutes: 20,
        blocks: [
          { t: 'p', text: 'Box 2 of A minor pentatonic sits just above box 1. Slide between them to escape “box playing”.' },
          { t: 'tab', title: 'Box 1', text: pentaBox1 },
          { t: 'tab', title: 'Box 2', text: pentaBox2 },
        ],
      },
      {
        id: 'a4',
        title: 'Travis picking',
        minutes: 25,
        blocks: [
          { t: 'p', text: 'The thumb alternates between two bass strings on every beat while the fingers play melody notes in between. It gives the full “two guitars at once” sound.' },
          { t: 'tab', title: 'Travis pattern on C then G', text: travis },
          { t: 'practice', items: ['Practise the thumb alone first: 3–2–3–2 on A and D strings.', 'Add the fingers one at a time.', 'Use the metronome at 60 BPM, two notes per click.'] },
        ],
      },
      {
        id: 'a5',
        title: 'Raag flavours on guitar',
        minutes: 25,
        blocks: [
          { t: 'p', text: 'Many Hindi film melodies are rooted in raags. Here are three thaats played from C (Sa = C). Play them slowly and listen to their mood.' },
          { t: 'tab', title: 'Yaman (Kalyan thaat) — Sa Re Ga ma(tivra) Pa Dha Ni Sa — dreamy, romantic', text: yaman },
          { t: 'tab', title: 'Bhairav — Sa re(komal) Ga Ma Pa dha(komal) Ni Sa — devotional, morning', text: bhairav },
          { t: 'tab', title: 'Kafi — Sa Re ga(komal) Ma Pa Dha ni(komal) Sa — folk, Sufi', text: kafi },
          { t: 'tip', text: 'Western equivalents: Yaman ≈ Lydian, Kafi ≈ Dorian. Bhairav has no common Western name — its two flattened notes give that temple-bell feel.' },
        ],
      },
      {
        id: 'a6',
        title: 'Improvising over a progression',
        minutes: 20,
        blocks: [
          { t: 'p', text: 'Over Am – G – F – E use A harmonic minor (A B C D E F G#). The G# note clashes on G but sounds perfect on the E chord — aim for it there.' },
          { t: 'tab', title: 'A harmonic minor — one octave', text: harmonicMinor },
          { t: 'strum', title: 'Backing loop', pattern: 'D-DU-UDU', chords: ['Am', 'G', 'F', 'E'], bpm: 84 },
          { t: 'link', to: '#/songs/b-sufi-groove', label: 'Play the Sufi Groove piece' },
        ],
      },
      {
        id: 'a7',
        title: 'Percussive strumming & chucks',
        minutes: 25,
        blocks: [
          { t: 'p', text: 'A “chuck” (written X or ✕) is a strum where the strings are muted instantly, so instead of a chord you hear a short “chk” — like a snare drum. Put it on beats 2 and 4 and one guitar sounds like guitar + drums. It’s the signature sound of unplugged Bollywood covers.' },
          {
            t: 'list',
            title: 'How to play a chuck (palm method)',
            items: [
              'Hold any chord normally (start with Em or Am — easy shapes).',
              'Strum down as usual, but let the side/heel of your strumming palm land on the strings at the same moment the pick hits them.',
              'Pick and palm arrive together: the strings sound for a split second and then stop dead. That is the “chk”.',
              'Think “slap”, not “hit”. The wrist does the work; the arm stays relaxed.',
              'After the chuck, lift the palm straight away — the next up strum must ring clearly.',
            ],
          },
          {
            t: 'list',
            title: 'Other way: fretting-hand mute',
            items: [
              'Strum down and, at the same moment, relax your fretting fingers so they still touch the strings but don’t press them.',
              'This gives a lighter, “ticky” chuck. Great for fast songs and for open chords where the palm is hard.',
              'Most players mix both. Learn the palm chuck first.',
            ],
          },
          { t: 'tip', text: 'Common mistakes: palm landing late (you hear the chord, then a thud), hitting too hard (it hurts and slows you down), and stopping the strumming arm on the chuck. Your arm keeps swinging down-up the whole time — the chuck is just one of those down strokes.' },
          { t: 'p', text: 'Practise in steps. Each box below plays along with you and counts every time you play the full pattern. Move to the next step only when the current one feels easy at the given speed. Use the slider to slow down.' },
          { t: 'strum', title: 'Step 1 — chuck only, on 2 and 4', pattern: '--X---X-', chords: ['Em'], bpm: 60 },
          { t: 'strum', title: 'Step 2 — down, chuck, down, chuck', pattern: 'D-X-D-X-', chords: ['Em'], bpm: 65 },
          { t: 'strum', title: 'Step 3 — add an up after each chuck', pattern: 'D-XUD-XU', chords: ['Em', 'C'], bpm: 70 },
          { t: 'strum', title: 'Step 4 — the classic: D X U – U X U', pattern: 'D-XU-UXU', chords: ['Am', 'F', 'C', 'G'], bpm: 76 },
          { t: 'strum', title: 'Step 5 — busy pop with chucks', pattern: 'DUXUDUXU', chords: ['G', 'D', 'Em', 'C'], bpm: 80 },
          { t: 'strum', title: 'Step 6 — 16th groove with chucks (advanced)', pattern: '16:D-DUX-DU-UDUX-DU', chords: ['Am', 'G'], bpm: 70 },
          {
            t: 'practice',
            items: [
              'Warm up: Step 1 for 1 minute — only the chuck, nothing else. Get a clean, short “chk”.',
              'Steps 2–3: 10 rounds each without stopping.',
              'Step 4: start at 60 BPM, raise by 5 BPM after 3 clean rounds. Goal: 90 BPM.',
              'Play Step 4 along with a song you know (most 4/4 Bollywood songs fit it).',
              'Daily: 5–10 minutes. Your counts are saved — see them in Learn → 📊 My practice.',
            ],
          },
          { t: 'link', to: '#/strum', label: 'Make your own chuck patterns in Strum studio (tap a box until it shows ✕)' },
        ],
      },
      {
        id: 'a8',
        title: 'Playing songs by ear',
        minutes: 30,
        blocks: [
          { t: 'list', title: 'A method that works', items: [
            'Find the key: the note the song “rests” on at the end is usually the key. Use the Tuner — it shows the name of any note you play or sing.',
            'Find the bass notes of each section by humming them and matching on the low strings.',
            'Try the common chords of that key: in G, the usual suspects are G, C, D, Em (and Am, Bm).',
            'Listen for common loops: I–V–vi–IV, vi–IV–I–V, and i–VII–VI–V (Am G F E).',
            'Add it to your songbook with “New song” and keep refining it.',
          ] },
          { t: 'link', to: '#/songs/new', label: 'Add a song to your songbook' },
        ],
      },
    ],
  },
];

export const ALL_LESSONS = LEVELS.flatMap((level) => level.lessons.map((l) => ({ ...l, level })));
