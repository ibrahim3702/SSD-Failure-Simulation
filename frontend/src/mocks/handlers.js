import { http, HttpResponse, delay } from 'msw';

const BASE_PRICE_USD = 129.99;
const SUPPORTED_RATES = { EUR: 0.92, GBP: 0.78 };

// In-memory notes store for dev mocking
const notesDb = new Map();

function correlationId() {
    if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'mock-' + Math.random().toString(16).slice(2);
}

export const handlers = [
    // Base price
    http.get('/api/basePrice', async () => {
        await delay(80);
        return HttpResponse.json({
            correlationId: correlationId(),
            currency: 'USD',
            amount: BASE_PRICE_USD,
        });
    }),

    // Rate with optional failure
    http.get('/api/rate', async ({ request }) => {
        const url = new URL(request.url);
        const target = (url.searchParams.get('target') || 'EUR').toUpperCase();
        const failureInjected = url.searchParams.get('failure') === 'true' || request.headers.get('X-Failure-Mode') === 'true';

        await delay(120);

        if (failureInjected) {
            return HttpResponse.json(
                {
                    correlationId: correlationId(),
                    error: 'rates-service internal failure',
                    code: 'INTERDEPENDENCY_FAIL',
                },
                { status: 500 }
            );
        }

        const rate = SUPPORTED_RATES[target];
        if (!rate) {
            return HttpResponse.json(
                { error: `Unsupported target currency: ${target}` },
                { status: 400 }
            );
        }

        return HttpResponse.json({
            correlationId: correlationId(),
            base: 'USD',
            target,
            rate,
        });
    }),

    // Aggregated price view (simulate server composition)
    http.get('/api/priceView', async ({ request }) => {
        const url = new URL(request.url);
        const target = (url.searchParams.get('target') || 'EUR').toUpperCase();
        const failureInjected = url.searchParams.get('failure') === 'true' || request.headers.get('X-Failure-Mode') === 'true';

        await delay(120);

        const id = correlationId();
        if (failureInjected) {
            return HttpResponse.json(
                {
                    correlationId: id,
                    error: 'Upstream failure: rates-service unavailable (500)',
                    humanMessage: 'Upstream failure: rates-service unavailable (500/slow)',
                    code: 'INTERDEPENDENCY_FAIL',
                },
                { status: 502 }
            );
        }

        const rate = SUPPORTED_RATES[target];
        if (!rate) {
            return HttpResponse.json(
                { correlationId: id, error: `Unsupported target currency: ${target}` },
                { status: 400 }
            );
        }

        const converted = +(BASE_PRICE_USD * rate).toFixed(2);
        return HttpResponse.json({
            correlationId: id,
            baseCurrency: 'USD',
            targetCurrency: target,
            baseAmount: BASE_PRICE_USD,
            rate,
            convertedAmount: converted,
        });
    }),

    // Notes save with simulated disk full ENOSPC
    http.post('/api/notes/save', async ({ request }) => {
        const body = await request.json();
        const { docId: rawDocId, user: rawUser, content = '', failToggle = false } = body || {};
        const docId = String(rawDocId || 'default');
        const user = String(rawUser || 'anonymous');
        const size = typeof content === 'string' ? content.length : JSON.stringify(content || '').length;

        const threshold = 500;
        const shouldFail = Boolean(failToggle) && size > threshold;

        await delay(80);

        if (shouldFail) {
            return HttpResponse.json(
                {
                    error: 'ENOSPC',
                    message: 'No space left on device',
                    code: 'ENOSPC',
                    threshold,
                    size,
                },
                { status: 507 }
            );
        }

        const note = { docId, user, size, updatedAt: new Date().toISOString(), content };
        notesDb.set(docId, note);

        return HttpResponse.json({ ok: true, docId, size });
    }),

    // Fetch a note by id
    http.get('/api/notes/:docId', async ({ params }) => {
        const { docId } = params;
        await delay(60);
        if (!notesDb.has(docId)) {
            return HttpResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
        }
        return HttpResponse.json(notesDb.get(docId));
    }),
];
