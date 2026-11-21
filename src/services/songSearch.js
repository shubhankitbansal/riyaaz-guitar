// Song search via the public iTunes Search API (no key needed; good Bollywood coverage, 30s previews).

const SOUNDTRACK = /\s*[([]?(?:from\s+["“]?)?(?:original motion picture soundtrack|original soundtrack|ost)[)\]]?\s*/gi;

/** "Aashiqui 2 (Original Motion Picture Soundtrack)" -> "Aashiqui 2" */
export function cleanAlbum(name = '') {
  return name.replace(SOUNDTRACK, ' ').replace(/\s*-\s*$/, '').replace(/\s{2,}/g, ' ').trim();
}

export async function searchSongs(term, { country = 'IN', limit = 25, signal } = {}) {
  const params = new URLSearchParams({ term, media: 'music', entity: 'song', country, limit: String(limit) });
  const res = await fetch(`https://itunes.apple.com/search?${params}`, { signal });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const data = await res.json();
  const seen = new Set();
  return (data.results || [])
    .filter((r) => r.kind === 'song')
    .map((r) => ({
      id: String(r.trackId),
      title: r.trackName,
      artist: r.artistName,
      album: cleanAlbum(r.collectionName),
      year: r.releaseDate ? r.releaseDate.slice(0, 4) : '',
      artwork: r.artworkUrl100 ? r.artworkUrl100.replace('100x100', '300x300') : '',
      preview: r.previewUrl || '',
      durationSec: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : 0,
    }))
    .filter((s) => {
      const key = `${s.title}|${s.artist}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export const youtubeSearchUrl = (song) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.title} ${song.artist || ''}`.trim())}`;
