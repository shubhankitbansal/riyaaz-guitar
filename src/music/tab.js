// Build perfectly aligned ASCII tablature from note columns.
// Each column is [string, fret] or an array of those (notes played together), or '|' for a bar line.
// String 1 = high e ... string 6 = low E. Frets may be strings like '5h7', '7b9', '5/7'.

const NAMES = ['e', 'B', 'G', 'D', 'A', 'E'];

export function makeTab(columns) {
  const rows = NAMES.map((n) => `${n}|-`);
  for (const col of columns) {
    if (col === '|') {
      for (let s = 0; s < 6; s++) rows[s] += '|-';
      continue;
    }
    const notes = Array.isArray(col[0]) ? col : [col];
    const width = Math.max(...notes.map(([, f]) => String(f).length));
    for (let s = 0; s < 6; s++) {
      const hit = notes.find(([str]) => str === s + 1);
      const txt = hit ? String(hit[1]) : '';
      rows[s] += txt + '-'.repeat(width - txt.length + 1);
    }
  }
  return rows.map((r) => r + '|').join('\n');
}
