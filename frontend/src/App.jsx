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
      <nav className="navbar">
        <div className="brand">
          <span className="logo-dot" />
          <span>Reliability Lab</span>
        </div>
        <div className="theme-toggle">
          <button
            className="btn btn--ghost"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
      </nav>
      <header className="hero container">
        <h1>Reliability Simulations</h1>
        <TextType
          as="p"
          className="description"
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
      <section>
        <h2>Currency Price Viewer</h2>
        <p>Interdependency Failure Simulation (Option F) — Chain A→B→C</p>
        <PriceViewer />
      </section>

      <hr style={{ margin: '2rem 0' }} />

      <NotesEditor />
      <footer>
        <small>
          Failure types: INTERDEPENDENCY_FAIL (rates) • ENOSPC (disk full on save)
        </small>
      </footer>
    </>
  );
}