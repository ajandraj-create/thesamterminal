"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CandlestickData, ColorType, CrosshairMode, HistogramData, IChartApi,
  ISeriesApi, LineData, PriceScaleMode, UTCTimestamp, createChart,
} from "lightweight-charts";
import { BarChart3, CandlestickChart, Camera, LineChart, Maximize2, Waves, ZoomIn, ZoomOut } from "lucide-react";
import { Candle, DataSource } from "@/lib/types";
import { smaSeries, emaSeries, vwapSeries, sessionVwapSeries, supertrendSeries } from "@/lib/indicators";
import { DrawingEngine, Drawing, PositionLine, ToolId, loadDrawings, saveDrawings } from "@/lib/drawing";
import { klineStream } from "@/lib/streams";

type IntervalKey = "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w";
type ChartType = "candles" | "line" | "area";

const INTERVALS: IntervalKey[] = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"];

const OVERLAYS = [
  { id: "sma20", label: "SMA 20", color: "#22D3EE", kind: "sma", period: 20 },
  { id: "sma50", label: "SMA 50", color: "#A78BFA", kind: "sma", period: 50 },
  { id: "sma200", label: "SMA 200", color: "#F59E0B", kind: "sma", period: 200 },
  { id: "ema9", label: "EMA 9", color: "#34D399", kind: "ema", period: 9 },
  { id: "ema21", label: "EMA 21", color: "#FB7185", kind: "ema", period: 21 },
] as const;

type OverlayId = (typeof OVERLAYS)[number]["id"];

function rollingStdev(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    out[i] = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
  }
  return out;
}

export default function CryptoChart({
  symbol,
  support,
  resistance,
  activeTool = "cursor",
  onToolDone,
  clearSignal = 0,
}: {
  symbol: string;
  support: number[];
  resistance: number[];
  activeTool?: ToolId;
  onToolDone?: () => void;
  clearSignal?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | ISeriesApi<"Area"> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const overlayRefs = useRef<Partial<Record<OverlayId, ISeriesApi<"Line">>>>({});
  const bbRefs = useRef<ISeriesApi<"Line">[]>([]);
  const candlesRef = useRef<Candle[]>([]);
  const loadingOlderRef = useRef(false);
  const noMoreHistoryRef = useRef(false);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DrawingEngine | null>(null);
  const [showVWAP, setShowVWAP] = useState(false);
  const [replayOn, setReplayOn] = useState(false);
  const [replayIdx, setReplayIdx] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(3);
  const [showST, setShowST] = useState(false);
  const vwapRef = useRef<ISeriesApi<"Line"> | null>(null);
  const stRefs = useRef<ISeriesApi<"Line">[]>([]);

  const [interval, setIntervalKey] = useState<IntervalKey>("1h");
  const [chartType, setChartType] = useState<ChartType>("candles");
  const [overlays, setOverlays] = useState<Set<OverlayId>>(new Set<OverlayId>(["sma20", "sma50"]));
  const [showBB, setShowBB] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [showLevels, setShowLevels] = useState(true);
  const [logScale, setLogScale] = useState(false);
  const [source, setSource] = useState<DataSource | null>(null);
  const [error, setError] = useState("");

  // ----- chart creation -----
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8B95A7",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(148,163,184,0.06)" },
        horzLines: { color: "rgba(148,163,184,0.06)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "rgba(148,163,184,0.15)" },
      timeScale: { borderColor: "rgba(148,163,184,0.15)", timeVisible: true, secondsVisible: false },
      autoSize: true,
    });
    chartRef.current = chart;
    if (overlayRef.current) {
      const engine = new DrawingEngine(overlayRef.current, chart, () => mainSeriesRef.current);
      engine.drawings = loadDrawings(symbol);
      engineRef.current = engine;
      engine.resize();
      const redraw = () => { engine.resize(); engine.render(); };
      chart.timeScale().subscribeVisibleLogicalRangeChange(() => engine.render());
      const ro = new ResizeObserver(redraw);
      ro.observe(overlayRef.current);
    }
    return () => {
      chart.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      volSeriesRef.current = null;
      overlayRefs.current = {};
      bbRefs.current = [];
    };
    // Chart is created once on mount; drawings reload via a dedicated effect on `symbol`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- main + volume series, rebuilt on chart-type change -----
  const rebuildMainSeries = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (mainSeriesRef.current) chart.removeSeries(mainSeriesRef.current);
    if (chartType === "candles") {
      mainSeriesRef.current = chart.addCandlestickSeries({
        upColor: "#10B981", downColor: "#F43F5E",
        wickUpColor: "#10B981", wickDownColor: "#F43F5E",
        borderVisible: false,
      });
    } else if (chartType === "line") {
      mainSeriesRef.current = chart.addLineSeries({ color: "#22D3EE", lineWidth: 2 });
    } else {
      mainSeriesRef.current = chart.addAreaSeries({
        lineColor: "#22D3EE", lineWidth: 2,
        topColor: "rgba(34,211,238,0.25)", bottomColor: "rgba(34,211,238,0.0)",
      });
    }
  }, [chartType]);

  const setMainData = useCallback((candles: Candle[]) => {
    const s = mainSeriesRef.current;
    if (!s) return;
    if (chartType === "candles") {
      (s as ISeriesApi<"Candlestick">).setData(
        candles.map<CandlestickData>((c) => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close }))
      );
    } else {
      (s as ISeriesApi<"Line">).setData(
        candles.map<LineData>((c) => ({ time: c.time as UTCTimestamp, value: c.close }))
      );
    }
  }, [chartType]);

  const redrawIndicators = useCallback((list?: Candle[]) => {
    const chart = chartRef.current;
    if (!chart) return;
    const candles = list ?? candlesRef.current;
    const closes = candles.map((c) => c.close);

    // overlays
    for (const o of OVERLAYS) {
      const want = overlays.has(o.id);
      const existing = overlayRefs.current[o.id];
      if (want && !existing) {
        overlayRefs.current[o.id] = chart.addLineSeries({ color: o.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      } else if (!want && existing) {
        chart.removeSeries(existing);
        delete overlayRefs.current[o.id];
      }
      const series = overlayRefs.current[o.id];
      if (series) {
        const values = o.kind === "sma" ? smaSeries(closes, o.period) : emaSeries(closes, o.period);
        const data: LineData[] = [];
        values.forEach((v, i) => { if (v != null) data.push({ time: candles[i].time as UTCTimestamp, value: v }); });
        series.setData(data);
      }
    }

    // bollinger bands (20, 2)
    bbRefs.current.forEach((s) => chart.removeSeries(s));
    bbRefs.current = [];
    if (showBB && closes.length >= 20) {
      const mid = smaSeries(closes, 20);
      const sd = rollingStdev(closes, 20);
      const mk = (style: number) => chart.addLineSeries({ color: "rgba(167,139,250,0.55)", lineWidth: 1, lineStyle: style, priceLineVisible: false, lastValueVisible: false });
      const upper = mk(2), middle = mk(0), lower = mk(2);
      const u: LineData[] = [], m: LineData[] = [], l: LineData[] = [];
      mid.forEach((v, i) => {
        const s = sd[i];
        if (v != null && s != null) {
          const t = candles[i].time as UTCTimestamp;
          u.push({ time: t, value: v + 2 * s });
          m.push({ time: t, value: v });
          l.push({ time: t, value: v - 2 * s });
        }
      });
      upper.setData(u); middle.setData(m); lower.setData(l);
      bbRefs.current = [upper, middle, lower];
    }

    // VWAP — session-anchored (resets at 00:00 UTC) on intraday timeframes,
    // load-anchored on 1d/1w where daily sessions don't apply.
    if (showVWAP && !vwapRef.current) {
      vwapRef.current = chart.addLineSeries({ color: "#7CFFB0", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
    } else if (!showVWAP && vwapRef.current) {
      chart.removeSeries(vwapRef.current);
      vwapRef.current = null;
    }
    if (vwapRef.current) {
      const intraday = interval !== "1d" && interval !== "1w";
      const vw = intraday ? sessionVwapSeries(candles) : vwapSeries(candles);
      const data: LineData[] = [];
      vw.forEach((v, i) => { if (v != null) data.push({ time: candles[i].time as UTCTimestamp, value: v }); });
      vwapRef.current.setData(data);
    }

    // Supertrend (10, 3)
    stRefs.current.forEach((sr) => chart.removeSeries(sr));
    stRefs.current = [];
    if (showST && candles.length > 12) {
      const st = supertrendSeries(candles, 10, 3);
      const upS = chart.addLineSeries({ color: "rgba(46,189,133,0.9)", lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
      const dnS = chart.addLineSeries({ color: "rgba(229,72,77,0.9)", lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
      const upD: LineData[] = [], dnD: LineData[] = [];
      st.up.forEach((v, i) => { if (v != null) upD.push({ time: candles[i].time as UTCTimestamp, value: v }); });
      st.down.forEach((v, i) => { if (v != null) dnD.push({ time: candles[i].time as UTCTimestamp, value: v }); });
      upS.setData(upD); dnS.setData(dnD);
      stRefs.current = [upS, dnS];
    }

    // volume
    if (showVolume && !volSeriesRef.current) {
      volSeriesRef.current = chart.addHistogramSeries({ priceScaleId: "vol", priceFormat: { type: "volume" } });
      chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    } else if (!showVolume && volSeriesRef.current) {
      chart.removeSeries(volSeriesRef.current);
      volSeriesRef.current = null;
    }
    volSeriesRef.current?.setData(
      candles.map<HistogramData>((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? "rgba(16,185,129,0.35)" : "rgba(244,63,94,0.35)",
      }))
    );
  }, [overlays, showBB, showVolume, showVWAP, showST]);

  // ----- data load on symbol/interval/type change -----
  useEffect(() => {
    let cancelled = false;
    loadingOlderRef.current = false;
    noMoreHistoryRef.current = false;
    rebuildMainSeries();
    (async () => {
      try {
        const res = await fetch(`/api/klines/${symbol.replace(/USDT$/, "")}?interval=${interval}&limit=600`);
        if (!res.ok) throw new Error("Market data temporarily unavailable.");
        const json: { data: Candle[]; source: DataSource } = await res.json();
        if (cancelled) return;
        candlesRef.current = json.data;
        setSource(json.source);
        setError("");
        setMainData(json.data);
        redrawIndicators();
        chartRef.current?.timeScale().fitContent();
        if (engineRef.current) {
          engineRef.current.drawings = loadDrawings(symbol);
          engineRef.current.render();
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [symbol, interval, chartType, rebuildMainSeries, setMainData, redrawIndicators]);

  // ----- indicator toggles redraw -----
  useEffect(() => {
    if (candlesRef.current.length) redrawIndicators();
  }, [overlays, showBB, showVolume, showVWAP, showST, redrawIndicators]);

  // ----- infinite history: scrolling near the left edge loads older candles -----
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || source === "demo") return;
    const onRange = async (range: { from: number; to: number } | null) => {
      if (!range || range.from > 12) return;
      if (loadingOlderRef.current || noMoreHistoryRef.current) return;
      const arr = candlesRef.current;
      if (!arr.length) return;
      loadingOlderRef.current = true;
      try {
        const endTime = arr[0].time * 1000 - 1;
        const res = await fetch(
          `/api/klines/${symbol.replace(/USDT$/, "")}?interval=${interval}&limit=600&endTime=${endTime}`
        );
        if (!res.ok) throw new Error("history unavailable");
        const json: { data: Candle[]; source: DataSource } = await res.json();
        const older = (json.data ?? []).filter((c) => c.time < arr[0].time);
        if (json.source === "demo" || older.length === 0) {
          noMoreHistoryRef.current = true;
          return;
        }
        const prevRange = chart.timeScale().getVisibleLogicalRange();
        candlesRef.current = [...older, ...arr];
        setMainData(candlesRef.current);
        redrawIndicators();
        if (prevRange) {
          chart.timeScale().setVisibleLogicalRange({
            from: prevRange.from + older.length,
            to: prevRange.to + older.length,
          });
        }
        if (older.length < 500) noMoreHistoryRef.current = true;
      } catch {
        noMoreHistoryRef.current = true;
      } finally {
        loadingOlderRef.current = false;
      }
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRange);
    return () => chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRange);
  }, [symbol, interval, chartType, source, setMainData, redrawIndicators]);

  // ----- live kline stream: updates the forming candle in real time -----
  useEffect(() => {
    if (source === "demo" || replayOn) return;
    let ws: WebSocket | null = null;
    let closed = false;
    const connect = () => {
      if (closed) return;
      ws = new WebSocket(klineStream(symbol, interval));
      ws.onmessage = (ev) => {
        try {
          const k = JSON.parse(ev.data)?.k;
          if (!k) return;
          const candle: Candle = {
            time: Math.floor(k.t / 1000),
            open: parseFloat(k.o), high: parseFloat(k.h),
            low: parseFloat(k.l), close: parseFloat(k.c),
            volume: parseFloat(k.v),
          };
          const arr = candlesRef.current;
          if (arr.length && arr[arr.length - 1].time === candle.time) arr[arr.length - 1] = candle;
          else if (!arr.length || candle.time > arr[arr.length - 1].time) arr.push(candle);
          const s = mainSeriesRef.current;
          if (!s) return;
          if (chartType === "candles") {
            (s as ISeriesApi<"Candlestick">).update({ time: candle.time as UTCTimestamp, open: candle.open, high: candle.high, low: candle.low, close: candle.close });
          } else {
            (s as ISeriesApi<"Line">).update({ time: candle.time as UTCTimestamp, value: candle.close });
          }
          volSeriesRef.current?.update({
            time: candle.time as UTCTimestamp, value: candle.volume,
            color: candle.close >= candle.open ? "rgba(16,185,129,0.35)" : "rgba(244,63,94,0.35)",
          });
        } catch {}
      };
      ws.onclose = () => { if (!closed) setTimeout(connect, 3000); };
      ws.onerror = () => ws?.close();
    };
    connect();
    return () => { closed = true; ws?.close(); };
  }, [symbol, interval, chartType, source, replayOn]);

  // ----- log scale -----
  useEffect(() => {
    chartRef.current?.priceScale("right").applyOptions({
      mode: logScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
    });
  }, [logScale]);

  // ----- support/resistance lines -----
  useEffect(() => {
    const s = mainSeriesRef.current;
    if (!s || !showLevels) return;
    const lines = [
      ...support.map((p) => s.createPriceLine({ price: p, color: "rgba(16,185,129,0.7)", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "S" })),
      ...resistance.map((p) => s.createPriceLine({ price: p, color: "rgba(244,63,94,0.7)", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "R" })),
    ];
    return () => lines.forEach((l) => s.removePriceLine(l));
  }, [support, resistance, showLevels, source, chartType, interval]);

  // ----- drawing tool interactions -----
  useEffect(() => {
    const canvas = overlayRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;
    if (activeTool === "cursor") return;

    let textPending = false;
    let editing: { id: string; line: PositionLine } | null = null;
    const xy = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const pos = (e: PointerEvent) => {
      const { x, y } = xy(e);
      return engine.toMarket(x, y);
    };
    const down = (e: PointerEvent) => {
      const p = pos(e);
      if (!p) return;
      // position tools: grab an existing entry/TP/SL line to drag it alone
      if (activeTool === "long" || activeTool === "short") {
        const { x, y } = xy(e);
        const hit = engine.hitPositionLine(x, y);
        if (hit) {
          editing = hit;
          return;
        }
      }
      if (activeTool === "hline" || activeTool === "vline") {
        engine.drawings.push({ id: Math.random().toString(36).slice(2), tool: activeTool, a: p });
        saveDrawings(symbol, engine.drawings);
        engine.render();
        onToolDone?.();
        return;
      }
      if (activeTool === "text") {
        const text = window.prompt("Annotation text:");
        if (text) {
          engine.drawings.push({ id: Math.random().toString(36).slice(2), tool: "text", a: p, text });
          saveDrawings(symbol, engine.drawings);
          engine.render();
        }
        onToolDone?.();
        textPending = true;
        return;
      }
      engine.pending = { tool: activeTool, a: p };
    };
    const move = (e: PointerEvent) => {
      const p = pos(e);
      if (!p) return;
      if (editing) {
        engine.setPositionLine(editing.id, editing.line, p.price);
        engine.render();
        return;
      }
      if (!engine.pending) return;
      engine.pending.b = p;
      engine.render();
    };
    const up = () => {
      if (editing) {
        editing = null;
        saveDrawings(symbol, engine.drawings);
        engine.render();
        return; // keep the tool active for further adjustments
      }
      if (textPending) { textPending = false; return; }
      const pend = engine.pending;
      engine.pending = null;
      if (pend?.b && pend.tool !== "ruler" && pend.tool !== "cursor") {
        const d: Drawing = { id: Math.random().toString(36).slice(2), tool: pend.tool as Drawing["tool"], a: pend.a, b: pend.b };
        if (pend.tool === "long" || pend.tool === "short") {
          const risk = Math.abs(pend.b.price - pend.a.price) / 2;
          d.c = { time: pend.a.time, price: pend.tool === "long" ? pend.a.price - risk : pend.a.price + risk };
        }
        engine.drawings.push(d);
        saveDrawings(symbol, engine.drawings);
      }
      engine.render();
      if (activeTool !== "long" && activeTool !== "short") onToolDone?.();
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [activeTool, symbol, onToolDone]);

  // ----- clear drawings signal -----
  useEffect(() => {
    if (!clearSignal || !engineRef.current) return;
    engineRef.current.drawings = [];
    saveDrawings(symbol, []);
    engineRef.current.render();
  }, [clearSignal, symbol]);

  const zoom = (factor: number) => {
    const chart = chartRef.current;
    if (!chart) return;
    const ts = chart.timeScale();
    const range = ts.getVisibleLogicalRange();
    if (!range) return;
    const mid = (range.from + range.to) / 2;
    const half = ((range.to - range.from) / 2) * factor;
    ts.setVisibleLogicalRange({ from: mid - half, to: mid + half });
  };

  const screenshot = () => {
    const chart = chartRef.current;
    const overlay = overlayRef.current;
    if (!chart) return;
    const shot = chart.takeScreenshot();
    const out = document.createElement("canvas");
    out.width = shot.width;
    out.height = shot.height;
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = "#0B0B0F";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(shot, 0, 0);
    if (overlay) ctx.drawImage(overlay, 0, 0, out.width, out.height);
    const a = document.createElement("a");
    a.download = `${symbol}-chart.png`;
    a.href = out.toDataURL("image/png");
    a.click();
  };

  // ----- bar replay -----
  const applyReplay = useCallback((idx: number) => {
    const slice = candlesRef.current.slice(0, idx);
    if (!slice.length) return;
    setMainData(slice);
    redrawIndicators(slice);
  }, [setMainData, redrawIndicators]);

  const startReplay = () => {
    const len = candlesRef.current.length;
    if (len < 80) return;
    const idx = Math.max(40, len - 150);
    setReplayOn(true);
    setReplayPlaying(false);
    setReplayIdx(idx);
    applyReplay(idx);
  };

  const exitReplay = () => {
    setReplayOn(false);
    setReplayPlaying(false);
    setMainData(candlesRef.current);
    redrawIndicators();
    chartRef.current?.timeScale().scrollToRealTime();
  };

  useEffect(() => {
    if (!replayOn || !replayPlaying) return;
    const t = setInterval(() => {
      setReplayIdx((i) => {
        const next = i + 1;
        if (next >= candlesRef.current.length) {
          setReplayPlaying(false);
          return i;
        }
        applyReplay(next);
        return next;
      });
    }, Math.max(60, 1000 / replaySpeed));
    return () => clearInterval(t);
  }, [replayOn, replayPlaying, replaySpeed, applyReplay]);

  const stepReplay = (dir: 1 | -1) => {
    setReplayIdx((i) => {
      const next = Math.min(candlesRef.current.length, Math.max(40, i + dir));
      applyReplay(next);
      return next;
    });
  };

  // ----- right-click deletes the drawing under the cursor -----
  useEffect(() => {
    const wrap = wrapperRef.current;
    const engine = engineRef.current;
    const overlay = overlayRef.current;
    if (!wrap || !engine || !overlay) return;
    const onCtx = (e: MouseEvent) => {
      const r = overlay.getBoundingClientRect();
      const id = engine.hitAny(e.clientX - r.left, e.clientY - r.top);
      if (id) {
        e.preventDefault();
        engine.drawings = engine.drawings.filter((d) => d.id !== id);
        saveDrawings(symbol, engine.drawings);
        engine.render();
      }
    };
    wrap.addEventListener("contextmenu", onCtx);
    return () => wrap.removeEventListener("contextmenu", onCtx);
  }, [symbol, source]);

  const fullscreen = () => {
    const el = wrapperRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  const Btn = ({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) => (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`rounded-lg px-2.5 py-1 text-xs font-mono transition border active:scale-95
        ${active ? "bg-ai/15 text-ai border-ai/40 shadow-[0_0_10px_rgba(34,211,238,0.15)]" : "border-transparent text-muted hover:text-slate-200 hover:border-edge"}`}
    >
      {children}
    </button>
  );

  return (
    <div ref={wrapperRef} className="bg-ink/0 [&:fullscreen]:bg-ink [&:fullscreen]:p-6">
      {/* toolbar row 1: intervals + chart type + actions */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <div className="flex gap-1 flex-wrap">
          {INTERVALS.map((k) => (
            <Btn key={k} active={interval === k} onClick={() => setIntervalKey(k)}>{k.toUpperCase()}</Btn>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Btn active={chartType === "candles"} onClick={() => setChartType("candles")} title="Candlesticks"><CandlestickChart className="h-3.5 w-3.5" /></Btn>
          <Btn active={chartType === "line"} onClick={() => setChartType("line")} title="Line"><LineChart className="h-3.5 w-3.5" /></Btn>
          <Btn active={chartType === "area"} onClick={() => setChartType("area")} title="Area"><Waves className="h-3.5 w-3.5" /></Btn>
          <span className="w-px h-4 bg-edge mx-1" />
          <Btn active={replayOn} onClick={() => (replayOn ? exitReplay() : startReplay())} title="Bar replay">replay</Btn>
          <Btn active={logScale} onClick={() => setLogScale(!logScale)} title="Logarithmic scale">log</Btn>
          <Btn onClick={() => zoom(0.7)} title="Zoom in"><ZoomIn className="h-3.5 w-3.5" /></Btn>
          <Btn onClick={() => zoom(1.4)} title="Zoom out"><ZoomOut className="h-3.5 w-3.5" /></Btn>
          <Btn onClick={screenshot} title="Export chart as PNG"><Camera className="h-3.5 w-3.5" /></Btn>
          <Btn onClick={fullscreen} title="Fullscreen"><Maximize2 className="h-3.5 w-3.5" /></Btn>
        </div>
      </div>
      {/* toolbar row 2: indicators */}
      <div className="flex items-center gap-1 flex-wrap mb-3">
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted font-mono mr-1 inline-flex items-center gap-1">
          <BarChart3 className="h-3 w-3" /> Indicators
        </span>
        {OVERLAYS.map((o) => (
          <Btn
            key={o.id}
            active={overlays.has(o.id)}
            onClick={() => setOverlays((prev) => {
              const next = new Set(prev);
              if (next.has(o.id)) next.delete(o.id); else next.add(o.id);
              return next;
            })}
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded" style={{ background: o.color }} />{o.label}
            </span>
          </Btn>
        ))}
        <Btn active={showBB} onClick={() => setShowBB(!showBB)}>BB (20,2)</Btn>
        <Btn active={showVWAP} onClick={() => setShowVWAP(!showVWAP)}>VWAP</Btn>
        <Btn active={showST} onClick={() => setShowST(!showST)}>Supertrend</Btn>
        <Btn active={showVolume} onClick={() => setShowVolume(!showVolume)}>Volume</Btn>
        <Btn active={showLevels} onClick={() => setShowLevels(!showLevels)}>S/R levels</Btn>
        {source === "demo" && <span className="ml-auto text-[11px] font-mono text-warn">DEMO DATA</span>}
        {source === "live" && <span className="ml-auto text-[11px] font-mono text-bull">● streaming</span>}
      </div>
      {replayOn && (
        <div className="flex items-center gap-2 flex-wrap mb-2 rounded-xl border border-gold/30 bg-gold/5 px-3 py-2">
          <span className="text-[10px] uppercase tracking-[0.16em] text-gold font-mono">Replay</span>
          <button onClick={() => stepReplay(-1)} className="rounded border border-edgesoft px-2 py-0.5 text-xs font-mono text-muted hover:text-gold transition">‹</button>
          <button onClick={() => setReplayPlaying((p) => !p)} className="rounded border border-gold/40 bg-gold/10 px-3 py-0.5 text-xs font-mono text-gold hover:bg-gold/20 transition">
            {replayPlaying ? "pause" : "play"}
          </button>
          <button onClick={() => stepReplay(1)} className="rounded border border-edgesoft px-2 py-0.5 text-xs font-mono text-muted hover:text-gold transition">›</button>
          {[1, 3, 10].map((sp) => (
            <button key={sp} onClick={() => setReplaySpeed(sp)} className={`rounded px-2 py-0.5 text-[10px] font-mono transition ${replaySpeed === sp ? "text-gold" : "text-dim hover:text-muted"}`}>{sp}x</button>
          ))}
          <input
            type="range"
            min={40}
            max={Math.max(41, candlesRef.current.length)}
            value={replayIdx}
            onChange={(e) => { const v = parseInt(e.target.value, 10); setReplayIdx(v); applyReplay(v); }}
            className="flex-1 min-w-[120px] accent-[#22E565]"
            aria-label="Replay position"
          />
          <span className="text-[10px] font-mono text-dim">{replayIdx}/{candlesRef.current.length}</span>
          <button onClick={exitReplay} className="text-[10px] font-mono text-dim hover:text-bear transition">exit</button>
        </div>
      )}
      {error ? (
        <div className="h-[560px] grid place-items-center text-sm text-muted">{error}</div>
      ) : (
        <div className="relative h-[560px] w-full" style={{ cursor: activeTool === "cursor" ? "default" : "crosshair" }}>
          <div ref={containerRef} className="absolute inset-0" />
          <canvas
            ref={overlayRef}
            className="absolute inset-0 h-full w-full"
            style={{ pointerEvents: activeTool === "cursor" ? "none" : "auto", zIndex: 3 }}
          />
        </div>
      )}
      {/* Lightweight Charts license requires visible attribution where the chart is used */}
      <p className="mt-1 text-right text-[10px] font-mono text-dim">
        Charts by{" "}
        <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer" className="hover:text-muted underline decoration-dotted">
          TradingView
        </a>
      </p>
    </div>
  );
}
