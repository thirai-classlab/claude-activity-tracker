/**
 * Simple linear regression: y = slope * x + intercept
 */
export function linearRegression(points: { x: number; y: number }[]): {
  slope: number;
  intercept: number;
  predict: (x: number) => number;
} {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0, predict: () => 0 };
  if (n === 1) return { slope: 0, intercept: points[0].y, predict: () => points[0].y };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const { x, y } of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, predict: () => sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  return {
    slope,
    intercept,
    predict: (x: number) => slope * x + intercept,
  };
}

/**
 * Generate forecast data points using linear regression on daily token data.
 */
export function forecastTokens(
  dailyData: { date: string; tokens: number }[],
  forecastDays: number = 7,
): { date: string; predicted: number }[] {
  if (dailyData.length < 2) return [];

  const baseDate = new Date(dailyData[0].date).getTime();
  const points = dailyData.map(d => ({
    x: (new Date(d.date).getTime() - baseDate) / (1000 * 60 * 60 * 24),
    y: d.tokens,
  }));

  const reg = linearRegression(points);
  const lastX = points[points.length - 1].x;

  const forecasts: { date: string; predicted: number }[] = [];
  for (let i = 1; i <= forecastDays; i++) {
    const futureX = lastX + i;
    const predicted = Math.max(0, reg.predict(futureX));
    const futureDate = new Date(baseDate + futureX * 24 * 60 * 60 * 1000);
    forecasts.push({
      date: futureDate.toISOString().split('T')[0],
      predicted: Math.round(predicted),
    });
  }

  return forecasts;
}
