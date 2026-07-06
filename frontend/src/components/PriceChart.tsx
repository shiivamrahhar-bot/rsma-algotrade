import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  createSeriesMarkers,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import type { OrderBlock, FairValueGap, StructureEvent, SMCCandle } from "../types/smc";

interface PriceChartProps {
  candles: SMCCandle[];
  orderBlocks?: OrderBlock[];
  fvgs?: FairValueGap[];
  events?: StructureEvent[];
  entryLow?: number | null;
  entryHigh?: number | null;
  stopLoss?: number | null;
  target1?: number | null;
  height?: number;
}

// lightweight-charts requires strictly ascending Time values. Daily candles
// from Kite (e.g. "2026-07-04T00:00:00+0530") and intraday candles (e.g.
// "2026-07-04T13:35:00+0530") both need a unique, ordered timestamp — a plain
// date string would collapse all of a day's intraday candles onto one point.
function toTime(date: string): Time {
  return Math.floor(new Date(date).getTime() / 1000) as Time;
}

export default function PriceChart({
  candles,
  orderBlocks = [],
  fvgs = [],
  events = [],
  entryLow,
  entryHigh,
  stopLoss,
  target1,
  height = 320,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

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
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { mode: 0 },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
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
    if (!series || !chart || candles.length === 0) return;

    series.setData(
      candles.map((c) => ({
        time: toTime(c.date),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    orderBlocks.forEach((b) => {
      const color = b.type === "bullish" ? "#22c55e" : "#ef4444";
      series.createPriceLine({
        price: b.high,
        color,
        lineWidth: 1,
        lineStyle: b.mitigated ? 3 : 0,
        axisLabelVisible: false,
        title: `${b.type === "bullish" ? "Bull" : "Bear"} OB${b.mitigated ? " (mitigated)" : ""}`,
      });
      series.createPriceLine({
        price: b.low,
        color,
        lineWidth: 1,
        lineStyle: b.mitigated ? 3 : 0,
        axisLabelVisible: false,
        title: "",
      });
    });

    fvgs
      .filter((g) => !g.filled)
      .forEach((g) => {
        const color = g.type === "bullish" ? "#3b82f6" : "#f59e0b";
        series.createPriceLine({
          price: g.top,
          color,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: false,
          title: `FVG ${g.fillPercent}%`,
        });
      });

    if (entryLow != null && entryHigh != null) {
      series.createPriceLine({
        price: entryHigh,
        color: "#3b82f6",
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: "Entry",
      });
    }
    if (stopLoss != null) {
      series.createPriceLine({
        price: stopLoss,
        color: "#ef4444",
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: "Stop Loss",
      });
    }
    if (target1 != null) {
      series.createPriceLine({
        price: target1,
        color: "#22c55e",
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: "Target",
      });
    }

    const markers: SeriesMarker<Time>[] = events.map((e) => ({
      time: toTime(e.date),
      position: e.type.includes("BULL") ? "belowBar" : "aboveBar",
      color: e.type.includes("BULL") ? "#22c55e" : "#ef4444",
      shape: e.type.includes("BULL") ? "arrowUp" : "arrowDown",
      text: e.type.replace("_", " "),
    }));
    createSeriesMarkers(series, markers);

    chart.timeScale().fitContent();
  }, [candles, orderBlocks, fvgs, events, entryLow, entryHigh, stopLoss, target1]);

  if (candles.length === 0) {
    return <div className="empty-state">Chart ke liye enough historical candles nahi hain</div>;
  }

  return <div ref={containerRef} className="price-chart-container" />;
}
