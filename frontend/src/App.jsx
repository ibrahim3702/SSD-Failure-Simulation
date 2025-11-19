import React, { useState, useEffect } from 'react';
import PriceViewer from './components/PriceViewer.jsx';
import NotesEditor from './components/NotesEditor.jsx';
import TextType from './components/TextType.jsx';

export default function App() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <>
      <nav className="navbar" role="navigation" aria-label="Primary">
        <div className="brand" aria-label="Brand">
          <span className="logo-dot" aria-hidden="true" />
          <span>Reliability Lab</span>
        </div>
        <div className="theme-toggle">
          <button
            className="btn btn--ghost"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
      </nav>
      <header className="hero container" role="banner">
        <h1>Reliability Simulations</h1>
        <TextType
          as="p"
          className="description lead"
          text={[
            'Use the toggles below to inject controlled failures in the app.',
            'Interdependency failure (A→B→C).',
            'Simulated disk full (ENOSPC).'
          ]}
          typingSpeed={40}
          deletingSpeed={20}
          pauseDuration={1500}
          textColors={[theme === 'light' ? '#6366f1' : '#8b5cf6', theme === 'light' ? '#22d3ee' : '#06b6d4']}
        />
      </header>
      <section aria-labelledby="price-viewer-heading">
        <h2 id="price-viewer-heading">💱 Currency Price Viewer</h2>
        <p className="description">Interdependency Failure Simulation (Option F) — Chain A→B→C</p>
        <PriceViewer />
      </section>

      <hr />

      <NotesEditor />
      <footer role="contentinfo">
        <p className="meta">🔬 Failure types: INTERDEPENDENCY_FAIL (rates) • ENOSPC (disk full on save)</p>
        <p className="meta subtle">Built with React + Express • MSW for mocking</p>
      </footer>
    </>
  );
}