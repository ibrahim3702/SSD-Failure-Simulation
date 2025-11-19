
const express = require('express');
const cors = require('cors');
const { randomUUID } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;
const BASE_PRICE_USD = 129.99;
const SUPPORTED_RATES = {
    EUR: 0.92,
    GBP: 0.78
};
function logStructuredFailure({
    upstreamService,
    statusOrReason,
    correlationId
}) {
    const logObj = {
        timestamp: new Date().toISOString(),
        chain: 'A→B→C',
        upstreamService,
        statusOrReason,
        correlationId,
        errorCode: 'INTERDEPENDENCY_FAIL'
    };
    console.error(JSON.stringify(logObj));
}
app.get('/api/basePrice', (req, res) => {
    const correlationId = req.header('X-Correlation-Id') || 'missing-correlation';
    res.json({
        correlationId,
        currency: 'USD',
        amount: BASE_PRICE_USD
    });
});
app.get('/api/rate', (req, res) => {
    const target = (req.query.target || 'EUR').toUpperCase();
    const failureInjected = req.query.failure === 'true' || req.header('X-Failure-Mode') === 'true';
    const correlationId = req.header('X-Correlation-Id') || 'missing-correlation';
    const baseLatencyMs = 120;
    if (failureInjected) {
        setTimeout(() => {
            logStructuredFailure({
                upstreamService: 'rates-service',
                statusOrReason: '500 internal failure',
                correlationId
            });
            return res.status(500).json({
                correlationId,
                error: 'rates-service internal failure',
                code: 'INTERDEPENDENCY_FAIL'
            });
        }, baseLatencyMs);
        return;
    }
    const rate = SUPPORTED_RATES[target];
    if (!rate) {
        return res.status(400).json({
            correlationId,
            error: `Unsupported target currency: ${target}`
        });
    }
    setTimeout(() => {
        res.json({
            correlationId,
            base: 'USD',
            target,
            rate
        });
    }, baseLatencyMs);
});

app.get('/api/priceView', async (req, res) => {
    const target = (req.query.target || 'EUR').toUpperCase();
    const failureInjected = req.query.failure === 'true' || req.header('X-Failure-Mode') === 'true';

    const correlationId = randomUUID();

    try {
        const basePrice = await fetchJson(`http://localhost:${PORT}/api/basePrice`, {
            headers: { 'X-Correlation-Id': correlationId }
        });
        const rate = await fetchJson(`http://localhost:${PORT}/api/rate?target=${encodeURIComponent(target)}&failure=${failureInjected}`, {
            headers: {
                'X-Correlation-Id': correlationId,
                'X-Failure-Mode': failureInjected ? 'true' : 'false'
            }
        });

        const converted = +(basePrice.amount * rate.rate).toFixed(2);

        return res.json({
            correlationId,
            baseCurrency: basePrice.currency,
            targetCurrency: target,
            baseAmount: basePrice.amount,
            rate: rate.rate,
            convertedAmount: converted
        });
    } catch (err) {
        logStructuredFailure({
            upstreamService: 'rates-service',
            statusOrReason: err.statusReason || err.message || 'unknown',
            correlationId
        });

        return res.status(502).json({
            correlationId,
            error: 'Upstream failure: rates-service unavailable (500)',
            humanMessage: 'Upstream failure: rates-service unavailable (500/slow)',
            code: 'INTERDEPENDENCY_FAIL'
        });
    }
});
async function fetchJson(url, options) {
    const r = await fetch(url, options);
    if (!r.ok) {
        const txt = await r.text();
        const error = new Error(`Fetch failed (${r.status}) ${url}`);
        error.status = r.status;
        error.statusReason = `HTTP_${r.status}`;
        error.body = txt;
        throw error;
    }
    return r.json();
}
// Serve built frontend in production (after `npm run build` in frontend)
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
}

// ===== Option A — Hardware Failure (simulated): Notes save with ENOSPC =====
const DATA_DIR = path.join(__dirname, 'data');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
const NOTES_LOG = path.join(DATA_DIR, 'notes.log.ndjson');

ensureDataFiles();

function ensureDataFiles() {
    try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        if (!fs.existsSync(NOTES_FILE)) fs.writeFileSync(NOTES_FILE, JSON.stringify({}), 'utf-8');
        if (!fs.existsSync(NOTES_LOG)) fs.writeFileSync(NOTES_LOG, '', 'utf-8');
    } catch (e) {
        console.error('Failed to ensure data files', e);
    }
}

function readNotesDb() {
    try {
        const raw = fs.readFileSync(NOTES_FILE, 'utf-8');
        return JSON.parse(raw || '{}');
    } catch (e) {
        return {};
    }
}

function writeNotesDb(db) {
    fs.writeFileSync(NOTES_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function logNotesEvent(event) {
    const line = JSON.stringify({
        timestamp: new Date().toISOString(),
        ...event
    });
    fs.appendFile(NOTES_LOG, line + '\n', () => { });
}

// Save note with failure injection
// Body: { docId, user, content, failToggle }
// When failToggle === true and content length > 500, simulate ENOSPC
app.post('/api/notes/save', (req, res) => {
    const { docId: rawDocId, user: rawUser, content = '', failToggle = false } = req.body || {};
    const docId = (rawDocId || 'default').toString();
    const user = (rawUser || 'anonymous').toString();
    const size = typeof content === 'string' ? content.length : JSON.stringify(content || '').length;

    const threshold = 500; // character limit for simulated disk full
    const shouldFail = Boolean(failToggle) && size > threshold;

    if (shouldFail) {
        // Log the failure event
        logNotesEvent({ user, docId, size, error: 'ENOSPC', message: 'No space left on device' });
        return res.status(507).json({
            error: 'ENOSPC',
            message: 'No space left on device',
            code: 'ENOSPC',
            threshold,
            size
        });
    }

    const db = readNotesDb();
    db[docId] = {
        docId,
        user,
        size,
        updatedAt: new Date().toISOString(),
        content
    };
    try {
        writeNotesDb(db);
        logNotesEvent({ user, docId, size, status: 'OK' });
        return res.json({ ok: true, docId, size });
    } catch (e) {
        logNotesEvent({ user, docId, size, error: e.code || 'EWRITE', message: e.message });
        return res.status(500).json({ error: e.code || 'EWRITE', message: 'Failed to write note' });
    }
});

// Fetch a note by id
app.get('/api/notes/:docId', (req, res) => {
    const docId = (req.params.docId || 'default').toString();
    const db = readNotesDb();
    const note = db[docId];
    if (!note) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json(note);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});