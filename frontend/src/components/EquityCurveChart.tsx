import { useEffect, useRef } from "react";
import {
  createChart,
  LineSeries,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import type { EquityPoint } from "../types/backtest";

interface EquityCurveChartProps {
  points: EquityPoint[];
  height?: number;
}

export default function EquityCurveChart({ points, height = 220 }: EquityCurveChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
        fontFamily: "DM Sans, system-ui, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
      timeScale: { borderColor: "rgba(255,255,255,0.08)", timeVisible: true, secondsVisible: false },
    });

    const series = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 2,
    });
    series.createPriceLine({
      price: 0,
      color: "rgba(255,255,255,0.25)",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: false,
      title: "",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver((entries) => {
      chart.applyOptions({ width: entries[0].contentRect.width });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart || points.length === 0) return;

    const data = points
      .map((p) => ({
        time: Math.floor(new Date(p.date).getTime() / 1000) as Time,
        value: p.cumulativePnlPct,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number))
      .filter((v, i, arr) => i === 0 || v.time !== arr[i - 1].time);

    try {
      series.setData(data);
      chart.timeScale().fitContent();
    } catch (err) {
      console.error("Equity curve render failed:", err);
    }
  }, [points]);

  if (points.length === 0) {
    return <div className="empty-state">Koi closed trades nahi mile equity curve banane ke liye</div>;
  }

  return <div ref={containerRef} className="price-chart-container" />;
}
