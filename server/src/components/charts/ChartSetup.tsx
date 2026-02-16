'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Register Chart.js components globally
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
  TimeScale,
);

// Set global defaults
ChartJS.defaults.color = '#94a3b8';
ChartJS.defaults.borderColor = '#334155';
ChartJS.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
ChartJS.defaults.font.size = 11;
ChartJS.defaults.plugins.legend.display = false;
ChartJS.defaults.plugins.tooltip.backgroundColor = '#1e293b';
ChartJS.defaults.plugins.tooltip.borderColor = '#334155';
ChartJS.defaults.plugins.tooltip.borderWidth = 1;
ChartJS.defaults.plugins.tooltip.titleFont = { size: 12, weight: 'bold' as const };
ChartJS.defaults.plugins.tooltip.bodyFont = { size: 11 };
ChartJS.defaults.plugins.tooltip.padding = 10;
ChartJS.defaults.plugins.tooltip.cornerRadius = 6;
ChartJS.defaults.animation = false;

export function ChartSetupProvider({ children }: { children: React.ReactNode }) {
  // This component exists to ensure Chart.js registration happens on the client
  return <>{children}</>;
}

export { ChartJS };
