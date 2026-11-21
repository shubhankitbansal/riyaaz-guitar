import { useState } from 'react';
import { LANGUAGES, useI18n } from '../i18n';
import { useLocalStorage } from '../hooks';
import { testApiKey, friendlyError } from '../services/arranger';

export default function Settings() {
  const { lang, setLang, t } = useI18n();
  const [apiKey, setApiKey] = useLocalStorage('riyaaz.apiKey', '');
  const [draft, setDraft] = useState(apiKey);
  const [status, setStatus] = useState('');

  const save = () => {
    setApiKey(draft.trim());
    setStatus(t('settings.saved'));
  };

  const test = async () => {
    setStatus(t('settings.testing'));
    try {
      await testApiKey(draft.trim());
      setApiKey(draft.trim());
      setStatus(t('settings.testOk'));
    } catch (e) {
      setStatus(t('settings.testFail', { msg: friendlyError(e) }));
    }
  };

  return (
    <div className="page settings">
      <header className="page-head">
        <h1>{t('settings.title')}</h1>
      </header>

      <section className="card">
        <h3>{t('settings.language')}</h3>
        <p className="muted small">{t('settings.languageHint')}</p>
        <div className="lang-grid">
          {LANGUAGES.map((l) => (
            <button key={l.code} type="button" className={`chip ${lang === l.code ? 'on' : ''}`} onClick={() => setLang(l.code)}>
              {l.name}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>{t('settings.ai')}</h3>
        <p className="muted small">{t('settings.aiHint')}</p>
        <label className="field">
          <span>{t('settings.apiKey')}</span>
          <input
            type="password"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setStatus('');
            }}
            placeholder="sk-ant-…"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <div className="actions">
          <button type="button" className="btn primary" onClick={save} disabled={draft.trim() === apiKey}>
            {t('settings.save')}
          </button>
          <button type="button" className="btn" onClick={test} disabled={!draft.trim()}>
            {t('settings.test')}
          </button>
          {apiKey && (
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                setApiKey('');
                setDraft('');
                setStatus('');
              }}
            >
              {t('settings.remove')}
            </button>
          )}
        </div>
        {status && <p className="small status-line">{status}</p>}
      </section>

      <section className="card">
        <h3>{t('settings.about')}</h3>
        <p className="muted small">{t('settings.aboutText')}</p>
      </section>
    </div>
  );
}
