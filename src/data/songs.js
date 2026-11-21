// Bundled songs are public-domain / traditional texts with simple original chord
// arrangements, plus original practice pieces. Film songs are copyrighted, so they are
// included as chord charts with a few-word position cue per section — never lyrics.

import { makeTab } from '../music/tab';

const sufiRiff = makeTab([
  [3, 2], [3, 1], [3, 2], [4, 3], [4, 2], [4, 0], [4, 2], [4, 3], '|',
  [3, 2], [3, 1], [3, 2], [4, 3], [4, 2], [4, 0], [5, 3], [5, 2], [5, 0],
]);

const amPicking = makeTab([
  [5, 0], [3, 2], [2, 1], [1, 0], [2, 1], [3, 2], '|',
  [4, 3], [3, 2], [2, 1], [1, 0], [2, 1], [3, 2], '|',
  [5, 3], [3, 0], [2, 1], [1, 0], [2, 1], [3, 0], '|',
  [6, 3], [3, 0], [2, 0], [1, 3], [2, 0], [3, 0],
]);

export const BUILTIN_SONGS = [
  {
    id: 'b-jana-gana-mana',
    title: 'Jana Gana Mana',
    artist: 'Rabindranath Tagore · National Anthem',
    key: 'C',
    capo: 0,
    bpm: 66,
    strum: 'D-D-D-D-',
    difficulty: 'Beginner',
    tags: ['patriotic'],
    note: 'Simple arrangement using four open chords. Play gently with slow down-strums; stand-alone performances should be at the official tempo (~52 seconds).',
    body: `{Anthem}
[C]Jana-gana-mana-adhi[G]nayaka jaya [C]he
[C]Bharata-bhagya-vi[G]dhata
[C]Punjaba-Sindhu-Gujarata-[F]Maratha
[G]Dravida-Utkala-[C]Banga
[C]Vindhya-Himachala-[F]Yamuna-Ganga
[G]Uchchhala-jaladhi-ta[C]ranga
[F]Tava shubha name [C]jage
[F]Tava shubha asisa [C]mage
[G]Gahe tava jaya-[C]gatha
[C]Jana-gana-mangala-[G]dayaka jaya [C]he
[F]Bharata-bhagya-vi[C]dhata

{Ending}
[F]Jaya he, [G]jaya he, [Am]jaya he
[F]Jaya jaya jaya, [G]jaya [C]he`,
  },
  {
    id: 'b-saare-jahan-se-achha',
    title: 'Saare Jahan Se Achha',
    artist: 'Muhammad Iqbal · Tarana-e-Hind',
    key: 'C',
    capo: 0,
    bpm: 80,
    strum: 'D-DU-UDU',
    difficulty: 'Beginner',
    tags: ['patriotic'],
    note: 'Simple arrangement. Great first song for the I–IV–V chord family (C, F, G).',
    body: `{Verse 1}
[C]Saare jahan se [F]achha, [G]Hindostan ha[C]mara
[C]Hum bulbulein hain [F]iski, [G]yeh gulsitan ha[C]mara

{Verse 2}
[Am]Ghurbat mein hon a[F]gar hum, [G]rehta hai dil wa[C]tan mein
[Am]Samjho wahin ha[F]mein bhi, [G]dil ho jahan ha[C]mara

{Verse 3}
[C]Parbat woh sabse [F]uncha, [G]hamsaya aas[C]man ka
[C]Woh santari ha[F]mara, [G]woh pasban ha[C]mara

{Verse 4}
[Am]Godi mein khelti [F]hain iski [G]hazaron nadi[C]yan
[Am]Gulshan hai jinke [F]dum se, [G]rashk-e-janaan ha[C]mara

{Verse 5}
[C]Mazhab nahin si[F]khata [G]aapas mein bair [C]rakhna
[F]Hindi hain hum, [C]watan hai [G]Hindostan ha[C]mara`,
  },
  {
    id: 'b-raghupati-raghav',
    title: 'Raghupati Raghav Raja Ram',
    artist: 'Traditional bhajan',
    key: 'G',
    capo: 0,
    bpm: 84,
    strum: 'D-DU-UDU',
    difficulty: 'Beginner',
    tags: ['bhajan'],
    note: 'Only three chords: G, C and D. Perfect first song after the beginner chord lessons.',
    body: `{Sthayi}
[G]Raghupati Raghav [C]Raja [G]Ram
[G]Patit Pavan [D]Sita [G]Ram

{Refrain}
[G]Sita Ram, [C]Sita [G]Ram
[G]Bhaj pyare tu [D]Sita [G]Ram

{Antara}
[G]Ishwar Allah [C]tero [G]naam
[G]Sabko sanmati [D]de Bhag[G]wan`,
  },
  {
    id: 'b-om-jai-jagdish',
    title: 'Om Jai Jagdish Hare',
    artist: 'Pt. Shardha Ram Phillauri · Aarti (1870)',
    key: 'C',
    capo: 0,
    bpm: 76,
    strum: 'D-DUDU',
    difficulty: 'Beginner',
    tags: ['bhajan'],
    note: 'Simple arrangement in 3/4 feel — count “1 2 3” per bar.',
    body: `{Sthayi}
[C]Om jai jagdish ha[F]re, [C]swami jai jagdish ha[G]re
[C]Bhakt jano ke [F]sankat, [C]das jano ke [F]sankat
[C]Kshan mein [G]door ka[C]re
[C]Om jai [G]jagdish ha[C]re

{Antara}
[C]Jo dhyave phal [F]pave, [C]dukh bin se man [G]ka
[C]Swami dukh bin se [F]man ka
[C]Sukh sampati ghar [F]aave, [C]sukh sampati ghar [F]aave
[C]Kasht mi[G]te tan [C]ka
[C]Om jai [G]jagdish ha[C]re`,
  },
  {
    id: 'b-vande-mataram',
    title: 'Vande Mataram',
    artist: 'Bankim Chandra Chattopadhyay · National Song',
    key: 'D',
    capo: 0,
    bpm: 72,
    strum: 'D-DU-UDU',
    difficulty: 'Beginner',
    tags: ['patriotic'],
    note: 'Simple arrangement using D, G and A.',
    body: `{Refrain}
[D]Vande Ma[G]taram, [A]Vande Ma[D]taram

{Verse 1}
[D]Sujalam su[G]phalam [D]malayaja shi[A]talam
[G]Shasya shya[A]malam ma[D]taram
[D]Vande Ma[A]ta[D]ram

{Verse 2}
[D]Shubhra jyotsna pu[G]lakita ya[D]minim
[D]Phulla kusumita [G]drumadala sho[A]bhinim
[G]Suhasinim su[A]madhura bha[D]shinim
[G]Sukhadam va[A]radam ma[D]taram
[D]Vande Ma[A]ta[D]ram`,
  },
  {
    id: 'b-bade-achhe-lagte-hain',
    title: 'Bade Achhe Lagte Hain',
    artist: 'Amit Kumar · Balika Badhu (1976) · R.D. Burman',
    key: 'F#',
    capo: 2,
    bpm: 84,
    strum: 'D-DU-UDU',
    difficulty: 'Intermediate',
    tags: ['film', 'romantic'],
    note: 'Chord chart only (no lyrics). Sounds in F#: put a capo on fret 2 and play easy E-family shapes (E, A, B7, C#m). Chords follow a community transcription; tempo and strumming are a suggested starting point — change the pattern below or open it in the Strum studio.',
    body: `{Mukhda}
“Bade achhe lagte hain …”
| F# | C# F# | F# | C# F# |
| B F# | C#7 F# | F# | D#m |
| B F# | C#7 F# |

{Interlude}
| F# | F# | F# | F# |

{Antara 1}
“Hum tum kitane …”
| F# D#m | C#7 F# | D#m B | C# F# |
| F# D#m | C#7 F# | D#m B | C# F# |
| F# | C# F# | B F# | C#7 F# |

{Interlude}
| F# | F# | F# | F# |

{Antara 2}
“Tum in sab ko …”
| F# D#m | C#7 F# | D#m B | C# F# |
| F# D#m | C#7 F# | D#m B | C# F# |
| F# | C# F# | B F# | C#7 F# |

{Outro}
“Bade achhe lagte hain …”
| F# | C# F# | B | F# |
| C#7 | F# |`,
  },
  {
    id: 'b-doraemon-zindagi-sawar-dun',
    title: 'Zindagi Sawar Dun (Doraemon Hindi theme)',
    artist: 'Doraemon (Hindi dub) · TV theme',
    key: 'D',
    capo: 0,
    bpm: 80,
    strum: 'D-DU-UDU',
    difficulty: 'Beginner',
    tags: ['kids', 'easy'],
    note: 'Chord chart only (no lyrics). Five open chords: D, Em, A, Bm, G. Chords follow a community transcription; strum one pattern per chord at 80 bpm. Want to sing along with the words? Add your own copy with Add song.',
    body: `{Intro}
| D | Em | A | D A |

{Verse}
“Zindagi sawar dun …”
| D | Bm | D | A |
| Em | A | G | A |

{Verse 2}
“Main kisi ka sapna hun …”
| D | Bm | Bm | A |
| A | Em A | D |

{Chorus}
“Aasma ko chunlun …”
| G | D | Em | A |
| Em | A | G |
“… udta robo Doraemon”
| A | D | G | A | D |

{Outro}
| G | D | Em | A |
| Em | A | D |`,
  },
  {
    id: 'b-ballad-progression',
    title: 'Bollywood Ballad Loop (I–V–vi–IV)',
    artist: 'Riyaaz practice piece',
    key: 'G',
    capo: 0,
    bpm: 72,
    strum: 'D-DU-UDU',
    difficulty: 'Beginner',
    tags: ['practice'],
    note: 'Original practice progression. This four-chord loop sits underneath a huge number of Hindi pop and film songs — once it is smooth, you can accompany many of them.',
    body: `{Intro}
| G | D | Em | C |

{Mukhda feel}
| G | D | Em | C |
| G | D | C | C |

{Antara feel}
| Em | C | G | D |
| Em | C | D | D |

{Outro}
| G | D | Em | C | G |`,
  },
  {
    id: 'b-romantic-fingerstyle',
    title: 'Romantic Fingerstyle Etude (vi–IV–I–V)',
    artist: 'Riyaaz practice piece',
    key: 'Am',
    capo: 0,
    bpm: 70,
    strum: 'D-DU-UDU',
    difficulty: 'Intermediate',
    tags: ['practice'],
    note: 'Original etude. The vi–IV–I–V loop gives the bittersweet sound of many romantic ballads. Fmaj7 is an easy substitute for F.',
    body: `{Strummed}
| Am | F | C | G |
| Am | Fmaj7 | C | G |

{Tab Fingerpicking (Am – Fmaj7 – C – G)}
${amPicking}`,
  },
  {
    id: 'b-sufi-groove',
    title: 'Sufi Groove in A minor',
    artist: 'Riyaaz practice piece',
    key: 'Am',
    capo: 0,
    bpm: 90,
    strum: 'D-XU-UXU',
    difficulty: 'Intermediate',
    tags: ['practice'],
    note: 'Original piece. Am–G–F–E with the A harmonic minor scale gives a Sufi / qawwali-inspired flavour. Use the percussive “chuck” (X) on beats 2 and 4.',
    body: `{Groove}
| Am | G | F | E |
| Am | G | F | E E7 |

{Tab Riff (A harmonic minor)}
${sufiRiff}`,
  },
];
