"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  ColorType,
} from "lightweight-charts";
import type { Candle, CandleInterval } from "@/app/(pages)/trade/_lib/useCandleData";
import { useCandleData } from "@/app/(pages)/trade/_lib/useCandleData";
import styles from "./CandleChart.module.scss";

interface CandleChartProps {
  market: string;
}

const INTERVALS: { label: string; value: CandleInterval }[] = [
  { label: "1m", value: 60 },
  { label: "5m", value: 300 },
  { label: "15m", value: 900 },
  { label: "1h", value: 3600 },
];

export function CandleChart({ market }: CandleChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [interval, setInterval] = useState<CandleInterval>(300);

  const { candles, loading } = useCandleData(market, interval);

  // Create chart on mount
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#999",
      },
      grid: {
        vertLines: { color: "rgba(128, 128, 128, 0.1)" },
        horzLines: { color: "rgba(128, 128, 128, 0.1)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 250,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "rgba(128, 128, 128, 0.2)",
      },
      rightPriceScale: {
        borderColor: "rgba(128, 128, 128, 0.2)",
      },
      crosshair: {
        mode: 0,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderDownColor: "#ef5350",
      borderUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      wickUpColor: "#26a69a",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Update data when candles change
  useEffect(() => {
    if (seriesRef.current && candles.length > 0) {
      seriesRef.current.setData(
        candles.map((c) => ({
          time: c.time as any,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
      chartRef.current?.timeScale().fitContent();
    }
  }, [candles]);

  const handleIntervalChange = useCallback((value: CandleInterval) => {
    setInterval(value);
  }, []);

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.title}>
          {market || "—"} Chart
        </span>
        <div className={styles.intervals}>
          {INTERVALS.map((item) => (
            <button
              key={item.value}
              className={`${styles.intervalBtn} ${
                interval === item.value ? styles.active : ""
              }`}
              onClick={() => handleIntervalChange(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {!market ? (
        <div className={styles.empty}>Select a market to view chart</div>
      ) : loading && candles.length === 0 ? (
        <div className={styles.empty}>Loading chart data…</div>
      ) : candles.length === 0 ? (
        <div className={styles.empty}>No trade data available</div>
      ) : (
        <div ref={chartContainerRef} className={styles.chartContainer} />
      )}
    </div>
  );
}

export default CandleChart;
