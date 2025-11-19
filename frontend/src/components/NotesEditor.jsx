import React, { useEffect, useMemo, useState } from 'react';

// Tiny Notes editor demonstrating Option A — Hardware Failure (simulated)
// - Failure injection: when character count exceeds threshold and toggle ON, backend returns ENOSPC
// - Shows crash banner and logs structured event to console
export default function NotesEditor() {
    const [user, setUser] = useState(localStorage.getItem('notes.user') || 'anonymous');
    const [docId, setDocId] = useState(localStorage.getItem('notes.docId') || 'doc-1');
    const [content, setContent] = useState('');
    const [failToggle, setFailToggle] = useState(false);
    const [saving, setSaving] = useState(false);
    const [banner, setBanner] = useState(null); // { type: 'error'|'success', message: string }

    const size = useMemo(() => (content ? content.length : 0), [content]);
    const threshold = 500;

    // Load content from localStorage on docId change
    useEffect(() => {
        const key = `notes.content.${docId}`;
        setContent(localStorage.getItem(key) || '');
    }, [docId]);

    // Persist small bits in localStorage
    useEffect(() => {
        localStorage.setItem('notes.user', user);
    }, [user]);
    useEffect(() => {
        localStorage.setItem('notes.docId', docId);
    }, [docId]);
    useEffect(() => {
        const key = `notes.content.${docId}`;
        localStorage.setItem(key, content);
    }, [content, docId]);

    async function onSave() {
        setSaving(true);
        setBanner(null);
        try {
            const resp = await fetch('/api/notes/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user, docId, content, failToggle })
            });
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                // Structured client log
                const log = {
                    timestamp: new Date().toISOString(),
                    user,
                    docId,
                    size,
                    error: data.code || data.error || `HTTP_${resp.status}`,
                    message: data.message || 'Save failed',
                };
                console.log(JSON.stringify(log));
                setBanner({ type: 'error', message: `Save failed: ${log.error} (${log.message})` });
                return;
            }
            setBanner({ type: 'success', message: `Saved ✓ (size: ${size})` });
        } catch (e) {
            console.error('Save unexpected error', e);
            setBanner({ type: 'error', message: 'Save failed: CLIENT_ERROR (Unexpected)' });
        } finally {
            setSaving(false);
        }
    }

    return (
        <section>
            <h2>Notes Editor — Disk Full Simulation</h2>
            <p className="description">Toggle failure and exceed {threshold} characters to simulate ENOSPC (No space left on device).</p>
            <div className="panel">
                <div className="controls" style={{ display: 'grid', gap: '.6rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <label>
                            <span>User:</span>
                            <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="anonymous" />
                        </label>
                        <label>
                            <span>Doc ID:</span>
                            <input value={docId} onChange={(e) => setDocId(e.target.value)} />
                        </label>
                        <label style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                            <input type="checkbox" checked={failToggle} onChange={(e) => setFailToggle(e.target.checked)} />
                            <span>Failure Toggle</span>
                            {failToggle && <span className="badge">ENOSPC active</span>}
                        </label>
                        <div style={{ marginLeft: 'auto', opacity: .8 }}>
                            Size: <strong>{size}</strong> / {threshold}
                        </div>
                    </div>

                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write your notes here..."
                        rows={10}
                        style={{ fontFamily: 'inherit', fontSize: '1rem' }}
                    />

                    <div>
                        <button className="btn" onClick={onSave} disabled={saving}>
                            {saving ? 'Saving…' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>

            {banner && (
                <div className={banner.type === 'error' ? 'error-banner' : 'card'}>
                    <strong>{banner.message}</strong>
                    {banner.type === 'error' && (
                        <div style={{ marginTop: '.4rem', fontSize: '.85rem', opacity: .85 }}>
                            Simulated condition when Failure Toggle is ON and character count exceeds {threshold}.
                            Error code: ENOSPC (No space left on device)
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
