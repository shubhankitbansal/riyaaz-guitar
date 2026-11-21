import { LEVELS, ALL_LESSONS } from '../data/lessons';
import { useLocalStorage, navigate } from '../hooks';
import { ChordCard } from './ChordDiagram';
import StrumPattern from './StrumPattern';
import { useI18n, useT } from '../i18n';
import Sargam from './Sargam';
import PracticeStats from './PracticeStats';
import FingerExercises from './FingerExercises';

const LEVEL_NUM = { beginner: 1, intermediate: 2, advanced: 3 };

function Block({ b }) {
  const t = useT();
  switch (b.t) {
    case 'p':
      return <p>{b.text}</p>;
    case 'tip':
      return <div className="tip">💡 {b.text}</div>;
    case 'list':
      return (
        <div>
          {b.title && <h4>{b.title}</h4>}
          <ul>
            {b.items.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
        </div>
      );
    case 'practice':
      return (
        <div className="practice">
          <h4>{t('learn.practice')}</h4>
          <ol>
            {b.items.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ol>
        </div>
      );
    case 'chords':
      return (
        <div className="chord-grid">
          {b.names.map((n) => (
            <ChordCard key={n} name={n} />
          ))}
        </div>
      );
    case 'shapes':
      return (
        <div className="chord-grid">
          {b.items.map((it) => (
            <ChordCard key={it.label} name={it.label} label={it.label} shape={it.shape} />
          ))}
        </div>
      );
    case 'tab':
      return (
        <figure className="tab-figure">
          {b.title && <figcaption>{b.title}</figcaption>}
          <pre className="tab">{b.text}</pre>
        </figure>
      );
    case 'strum':
      return <StrumPattern title={b.title} pattern={b.pattern} chords={b.chords} bpm={b.bpm} />;
    case 'link':
      return (
        <a className="btn link-btn" href={b.to}>
          {b.label} →
        </a>
      );
    default:
      return null;
  }
}

function LessonView({ lesson, index, done, onToggle }) {
  const { t, lang } = useI18n();
  const prev = ALL_LESSONS[index - 1];
  const next = ALL_LESSONS[index + 1];
  return (
    <div className="page lesson">
      <a className="back" href="#/learn">
        {t('learn.all')}
      </a>
      <header className="page-head">
        <div className="eyebrow">
          {t(`level.${lesson.level.id}`)} · {t('learn.min', { n: lesson.minutes })}
        </div>
        <h1>{lesson.title}</h1>
      </header>
      {lang !== 'en' && <p className="muted small">{t('learn.englishOnly')}</p>}
      <article className="card lesson-body">
        {lesson.blocks.map((b, i) => (
          <Block key={i} b={b} />
        ))}
      </article>
      <div className="lesson-nav">
        {prev ? (
          <a className="btn" href={`#/learn/${prev.id}`}>
            ← {prev.title}
          </a>
        ) : (
          <span />
        )}
        <button
          type="button"
          className={`btn ${done ? '' : 'primary'}`}
          onClick={() => {
            onToggle();
            if (!done && next) navigate(`/learn/${next.id}`);
          }}
        >
          {done ? t('learn.done') : next ? t('learn.markNext') : t('learn.mark')}
        </button>
        {next ? (
          <a className="btn" href={`#/learn/${next.id}`}>
            {next.title} →
          </a>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

export default function Learn({ route }) {
  const { t, lang } = useI18n();
  const [progress, setProgress] = useLocalStorage('riyaaz.progress', {});
  const toggle = (id) => setProgress((p) => ({ ...p, [id]: !p[id] }));

  if (route[0] === 'sargam') return <Sargam />;
  if (route[0] === 'stats') return <PracticeStats />;
  if (route[0] === 'fingers') return <FingerExercises />;
  const lessonIdx = ALL_LESSONS.findIndex((l) => l.id === route[0]);
  if (lessonIdx >= 0) {
    const lesson = ALL_LESSONS[lessonIdx];
    return <LessonView key={lesson.id} lesson={lesson} index={lessonIdx} done={!!progress[lesson.id]} onToggle={() => toggle(lesson.id)} />;
  }

  const total = ALL_LESSONS.length;
  const completed = ALL_LESSONS.filter((l) => progress[l.id]).length;
  const nextUp = ALL_LESSONS.find((l) => !progress[l.id]);

  return (
    <div className="page learn">
      <header className="page-head">
        <h1>{t('learn.title')}</h1>
        <p>{t('learn.subtitle')}</p>
      </header>

      <section className="card progress-card">
        <div>
          <div className="eyebrow">{t('learn.progress')}</div>
          <div className="progress-num">
            {t('learn.count', { done: completed, total })}
          </div>
        </div>
        <div className="progress-bar">
          <span style={{ width: `${(completed / total) * 100}%` }} />
        </div>
        {nextUp && (
          <a className="btn primary" href={`#/learn/${nextUp.id}`}>
            {t(completed ? 'learn.continue' : 'learn.start', { title: nextUp.title })}
          </a>
        )}
      </section>
      <a className="card sargam-card" href="#/learn/sargam">
        <span className="sargam-card-icon">सा</span>
        <span>
          <strong>{t('sargam.title')}</strong>
          <span className="muted small">{t('sargam.cardHint')}</span>
        </span>
        <span aria-hidden="true">→</span>
      </a>
      <a className="card sargam-card" href="#/learn/fingers">
        <span className="sargam-card-icon">✋</span>
        <span>
          <strong>{t('fingers.title')}</strong>
          <span className="muted small">{t('fingers.cardHint')}</span>
        </span>
        <span aria-hidden="true">→</span>
      </a>
      <a className="card sargam-card" href="#/learn/a7">
        <span className="sargam-card-icon">✕</span>
        <span>
          <strong>{t('chuck.title')}</strong>
          <span className="muted small">{t('chuck.cardHint')}</span>
        </span>
        <span aria-hidden="true">→</span>
      </a>
      <a className="card sargam-card" href="#/learn/stats">
        <span className="sargam-card-icon">📊</span>
        <span>
          <strong>{t('stats.title')}</strong>
          <span className="muted small">{t('stats.cardHint')}</span>
        </span>
        <span aria-hidden="true">→</span>
      </a>
      {lang !== 'en' && <p className="muted small">{t('learn.englishOnly')}</p>}

      {LEVELS.map((level) => {
        const n = level.lessons.filter((l) => progress[l.id]).length;
        return (
          <section key={level.id} className={`card level level-${level.id}`}>
            <div className="level-head">
              <div>
                <div className="eyebrow">{t(`learn.level${LEVEL_NUM[level.id]}`)}</div>
                <h2>{t(`level.${level.id}`)}</h2>
                <p className="muted">{t(`learn.desc.${level.id}`)}</p>
              </div>
              <div className="level-count">
                {n}/{level.lessons.length}
              </div>
            </div>
            <ol className="lesson-list">
              {level.lessons.map((l) => (
                <li key={l.id}>
                  <a href={`#/learn/${l.id}`} className={progress[l.id] ? 'done' : ''}>
                    <span className="check">{progress[l.id] ? '✓' : ''}</span>
                    <span className="lesson-title">{l.title}</span>
                    <span className="muted small">{t('learn.min', { n: l.minutes })}</span>
                  </a>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
