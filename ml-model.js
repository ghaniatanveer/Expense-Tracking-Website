export function predictNextMonth(expenses) {
    const byMonth = aggregateMonthly(expenses);
    if (byMonth.length < 2) {
        const fallback = byMonth[0]?.total || 0;
        return { prediction: fallback, confidence: 0.2 };
    }

    const points = byMonth.map((item, idx) => ({ x: idx + 1, y: item.total }));
    const regression = linearRegression(points);
    const nextX = points.length + 1;
    const prediction = Math.max(0, regression.slope * nextX + regression.intercept);
    const confidence = Math.max(0.1, Math.min(0.95, 1 - regression.errorRatio));
    return { prediction, confidence };
}

export function detectAnomalies(expenses) {
    if (expenses.length < 6) return [];
    const amounts = expenses.map((x) => Number(x.amount));
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((sum, x) => sum + ((x - mean) ** 2), 0) / amounts.length;
    const std = Math.sqrt(variance);
    const threshold = mean + std * 2;
    return expenses.filter((x) => Number(x.amount) > threshold).map((x) => x.id);
}

function aggregateMonthly(expenses) {
    const map = new Map();
    expenses.forEach((expense) => {
        const month = (expense.date || '').slice(0, 7);
        if (!month) return;
        map.set(month, (map.get(month) || 0) + Number(expense.amount || 0));
    });
    return [...map.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, total]) => ({ month, total }));
}

function linearRegression(points) {
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
    const slope = ((n * sumXY) - (sumX * sumY)) / ((n * sumXX) - (sumX * sumX) || 1);
    const intercept = (sumY - slope * sumX) / n;

    const yMean = sumY / n;
    let ssRes = 0;
    let ssTot = 0;
    points.forEach((p) => {
        const yHat = (slope * p.x) + intercept;
        ssRes += (p.y - yHat) ** 2;
        ssTot += (p.y - yMean) ** 2;
    });
    const rSquared = ssTot ? (1 - (ssRes / ssTot)) : 0;
    return { slope, intercept, errorRatio: 1 - Math.max(0, rSquared) };
}
