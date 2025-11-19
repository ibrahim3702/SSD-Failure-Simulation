import React, { useState, useCallback } from 'react';

export default function PriceViewer() {
    const [currency, setCurrency] = useState('EUR');
    const [failure, setFailure] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [errorInfo, setErrorInfo] = useState(null);

    const fetchPrice = useCallback(async () => {
        setLoading(true);
        setErrorInfo(null);
        setResult(null);
        try {
            const url = `/api/priceView?target=${encodeURIComponent(currency)}&failure=${failure}`;
            const resp = await fetch(url, {
                headers: {
                    'X-Failure-Mode': failure ? 'true' : 'false'
                }
            });
            const data = await resp.json();
            if (!resp.ok) {
                // Structured log (client context)
                const log = {
                    timestamp: new Date().toISOString(),
                    chain: 'A→B→C',
                    upstreamService: 'rates-service',
                    statusOrReason: 'HTTP_' + resp.status,
                    correlationId: data.correlationId,
                    errorCode: 'INTERDEPENDENCY_FAIL',
                    uiContext: 'priceViewFetchReact'
                };
                console.log(JSON.stringify(log));
                setErrorInfo({
                    message: data.humanMessage || data.error || 'Unknown upstream failure',
                    correlationId: data.correlationId
                });
            } else {
                setResult(data);
            }
        } catch (e) {
            console.error('Client unexpected error', e);
            setErrorInfo({
                message: 'Client unexpected error',
                correlationId: null
            });
        } finally {
            setLoading(false);
        }
    }, [currency, failure]);

    return (
        <div>
            <div className="panel controls">
                <label>
                    <input
                        type="checkbox"
                        checked={failure}
                        onChange={(e) => setFailure(e.target.checked)}
                    />
                    <span>Inject Failure</span>
                    {failure && <span className="badge">500 upstream</span>}
                </label>
                <label>
                    <span>Target Currency:</span>
                    <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        disabled={loading}
                    >
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                    </select>
                </label>
                <button className="btn" onClick={fetchPrice} disabled={loading}>
                    {loading ? 'Loading...' : 'Fetch Converted Price'}
                </button>
            </div>

            {errorInfo && (
                <div className="error-banner">
                    <strong>
                        Upstream failure: rates-service unavailable (500/slow) — Correlation ID:{' '}
                        {errorInfo.correlationId || 'n/a'}
                    </strong>
                    <div style={{ marginTop: '.4rem', fontSize: '.8rem', opacity: 0.85 }}>
                        Detail: {errorInfo.message}
                    </div>
                </div>
            )}

            {result && (
                <div className="card">
                    <h2>Price Result</h2>
                    <p><strong>Base:</strong> {result.baseAmount} {result.baseCurrency}</p>
                    <p><strong>Rate:</strong> 1 {result.baseCurrency} = {result.rate} {result.targetCurrency}</p>
                    <p><strong>Converted:</strong> {result.convertedAmount} {result.targetCurrency}</p>
                    <p><strong>Correlation ID:</strong> <code>{result.correlationId}</code></p>
                </div>
            )}
        </div>
    );
}