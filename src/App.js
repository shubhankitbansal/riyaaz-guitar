import { useEffect } from 'react';
import './App.css';
import { useHashRoute } from './hooks';
import Tuner from './components/Tuner';
import Songbook from './components/Songbook';
import Learn from './components/Learn';
import ChordLibrary from './components/ChordLibrary';
import Metronome from './components/Metronome';
import StrumStudio from './components/StrumStudio';
import Settings from './components/Settings';
import { I18nProvider, useT } from './i18n';

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const TABS = [
  { id: 'tuner', label: 'Tuner', icon: 'M4 16a8 8 0 0 1 16 0M12 16l4-6M3 20h18' },
  { id: 'songs', label: 'Songs', icon: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' },
  { id: 'learn', label: 'Learn', icon: 'M2 7l10-4 10 4-10 4L2 7zM6 9v5c0 1.5 3 3 6 3s6-1.5 6-3V9M22 7v6' },
  { id: 'strum', label: 'Strum', icon: 'M8 4v16M4 16l4 4 4-4M16 20V4M12 8l4-4 4 4' },
  { id: 'chords', label: 'Chords', icon: 'M5 3h14v18H5zM5 8h14M5 13h14M10 3v18M14 3v18' },
  { id: 'metronome', label: 'Metronome', icon: 'M8 21h8l-3-18h-2L8 21zM12 14l5-7' },
];
const GEAR =
  'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z';

export default function App() {
  return (
    <I18nProvider>
      <Shell />
    </I18nProvider>
  );
}

function Shell() {
  const t = useT();
  const route = useHashRoute();
  const page = TABS.some((x) => x.id === route[0]) || route[0] === 'settings' ? route[0] : 'tuner';
  const rest = route.slice(1);
  const routeKey = route.join('/');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [routeKey]);

  return (
    <div className="app">
      <header className="topbar">
        <a href="#/tuner" className="brand">
          <span className="brand-mark">R</span>
          <span>
            Riyaaz <small>{t('brand.sub')}</small>
          </span>
        </a>
        <a href="#/settings" className={`settings-link ${page === 'settings' ? 'active' : ''}`} aria-label={t('nav.settings')}>
          <Icon d={GEAR} />
        </a>
        <nav className="nav" aria-label="Main">
          {TABS.map((tab) => (
            <a key={tab.id} href={`#/${tab.id}`} className={page === tab.id ? 'active' : ''} aria-current={page === tab.id ? 'page' : undefined}>
              <Icon d={tab.icon} />
              <span>{t(`nav.${tab.id}`)}</span>
            </a>
          ))}
        </nav>
      </header>

      <main className="main">
        {page === 'tuner' && <Tuner />}
        {page === 'songs' && <Songbook route={rest} />}
        {page === 'learn' && <Learn route={rest} />}
        {page === 'strum' && <StrumStudio route={rest} />}
        {page === 'chords' && <ChordLibrary />}
        {page === 'metronome' && <Metronome />}
        {page === 'settings' && <Settings />}
      </main>
    </div>
  );
}
