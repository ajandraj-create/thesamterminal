"use client";

/**
 * Drawing tools for lightweight-charts — custom canvas overlay.
 * Drawings are stored in market coordinates {time, price} so they stick to
 * candles while panning/zooming, and persist per symbol in localStorage.
 */

import { IChartApi, ISeriesApi, SeriesType, UTCTimestamp } from "lightweight-charts";

export type ToolId =
  | "cursor" | "trend" | "hline" | "vline" | "rect" | "fib"
  | "ruler" | "long" | "short" | "text";

export interface Pt { time: number; price: number }

export interface Drawing {
  id: string;
  tool: Exclude<ToolId, "cursor" | "ruler">;
  a: Pt;        // entry (position tools) / first anchor
  b?: Pt;       // target / second anchor
  c?: Pt;       // stop (position tools only) — independently draggable
  text?: string;
}

export type PositionLine = "entry" | "target" | "stop";

const GOLD = "#D4AF37";
const BULL = "rgba(46,189,133,";
const BEAR = "rgba(229,72,77,";
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

export function storageKey(symbol: string) {
  return `pulseterminal.drawings.${symbol}`;
}

export function loadDrawings(symbol: string): Drawing[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey(symbol)) ?? "[]");
  } catch {
    return [];
  }
}

export function saveDrawings(symbol: string, drawings: Drawing[]) {
  try {
    localStorage.setItem(storageKey(symbol), JSON.stringify(drawings));
  } catch {}
}

export class DrawingEngine {
  private ctx: CanvasRenderingContext2D;
  drawings: Drawing[] = [];
  pending: { tool: ToolId; a: Pt; b?: Pt } | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private chart: IChartApi,
    private series: () => ISeriesApi<SeriesType> | null
  ) {
    this.ctx = canvas.getContext("2d")!;
  }

  /** screen px -> market coords */
  toMarket(x: number, y: number): Pt | null {
    const s = this.series();
    if (!s) return null;
    const time = this.chart.timeScale().coordinateToTime(x);
    const price = s.coordinateToPrice(y);
    if (time == null || price == null) return null;
    return { time: time as number, price: price as number };
  }

  /** market coords -> screen px (null when off-screen in time) */
  private toScreen(p: Pt): { x: number; y: number } | null {
    const s = this.series();
    if (!s) return null;
    const x = this.chart.timeScale().timeToCoordinate(p.time as UTCTimestamp);
    const y = s.priceToCoordinate(p.price);
    if (y == null) return null;
    return { x: x ?? -10000, y };
  }

  /** Find a position-tool line near (x,y) so it can be dragged individually. */
  hitPositionLine(x: number, y: number): { id: string; line: PositionLine } | null {
    const s = this.series();
    if (!s) return null;
    for (const d of this.drawings) {
      if ((d.tool !== "long" && d.tool !== "short") || !d.b) continue;
      const A = this.toScreen(d.a);
      const B = this.toScreen(d.b);
      if (!A || !B) continue;
      const x1 = Math.min(A.x, B.x), x2 = Math.max(A.x, B.x, Math.min(A.x, B.x) + 60);
      if (x < x1 - 8 || x > x2 + 8) continue;
      const defaultRisk = Math.abs(d.b.price - d.a.price) / 2;
      const stop = d.c?.price ?? (d.tool === "long" ? d.a.price - defaultRisk : d.a.price + defaultRisk);
      const checks: [PositionLine, number | null][] = [
        ["entry", s.priceToCoordinate(d.a.price)],
        ["target", s.priceToCoordinate(d.b.price)],
        ["stop", s.priceToCoordinate(stop)],
      ];
      for (const [line, ly] of checks) {
        if (ly != null && Math.abs(y - ly) <= 7) return { id: d.id, line };
      }
    }
    return null;
  }

  /** Move one line of a position drawing to a new price. */
  setPositionLine(id: string, line: PositionLine, price: number) {
    const d = this.drawings.find((x) => x.id === id);
    if (!d || !d.b) return;
    if (line === "entry") d.a = { ...d.a, price };
    else if (line === "target") d.b = { ...d.b, price };
    else d.c = { time: d.a.time, price };
  }

  /** Topmost drawing near (x,y) — used for right-click delete. */
  hitAny(x: number, y: number): string | null {
    const s = this.series();
    if (!s) return null;
    const near = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const dx = b.x - a.x, dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      const t = len2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len2)) : 0;
      const px = a.x + t * dx, py = a.y + t * dy;
      return Math.hypot(x - px, y - py) <= 7;
    };
    for (let i = this.drawings.length - 1; i >= 0; i--) {
      const d = this.drawings[i];
      const A = this.toScreen(d.a);
      if (!A) continue;
      const B = d.b ? this.toScreen(d.b) : null;
      switch (d.tool) {
        case "hline": if (Math.abs(y - A.y) <= 6) return d.id; break;
        case "vline": if (Math.abs(x - A.x) <= 6) return d.id; break;
        case "text": if (x >= A.x - 4 && x <= A.x + 90 && Math.abs(y - A.y) <= 12) return d.id; break;
        case "trend": if (B && near(A, B)) return d.id; break;
        case "rect": {
          if (!B) break;
          const x1 = Math.min(A.x, B.x), x2 = Math.max(A.x, B.x);
          const y1 = Math.min(A.y, B.y), y2 = Math.max(A.y, B.y);
          const onEdge =
            (Math.abs(y - y1) <= 6 || Math.abs(y - y2) <= 6) && x >= x1 - 6 && x <= x2 + 6 ||
            (Math.abs(x - x1) <= 6 || Math.abs(x - x2) <= 6) && y >= y1 - 6 && y <= y2 + 6;
          if (onEdge) return d.id;
          break;
        }
        case "fib": {
          if (!B || !d.b) break;
          const x1 = Math.min(A.x, B.x), x2 = Math.max(A.x, B.x);
          if (x < x1 - 6 || x > x2 + 80) break;
          for (const lvl of FIB_LEVELS) {
            const ly = s.priceToCoordinate(d.a.price + (d.b.price - d.a.price) * lvl);
            if (ly != null && Math.abs(y - ly) <= 5) return d.id;
          }
          break;
        }
        case "long":
        case "short": {
          const hit = this.hitPositionLine(x, y);
          if (hit?.id === d.id) return d.id;
          break;
        }
      }
    }
    return null;
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const { clientWidth: w, clientHeight: h } = this.canvas;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  render() {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    this.ctx.clearRect(0, 0, w, h);
    for (const d of this.drawings) this.drawOne(d, false);
    if (this.pending?.b) this.drawOne(this.pending as Drawing, true);
  }

  private line(x1: number, y1: number, x2: number, y2: number, color: string, width = 1.4, dash: number[] = []) {
    const c = this.ctx;
    c.strokeStyle = color;
    c.lineWidth = width;
    c.setLineDash(dash);
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
    c.setLineDash([]);
  }

  private label(text: string, x: number, y: number, color = GOLD) {
    const c = this.ctx;
    c.font = "10px ui-monospace, monospace";
    const wd = c.measureText(text).width + 8;
    c.fillStyle = "rgba(11,11,15,0.85)";
    c.fillRect(x, y - 11, wd, 14);
    c.strokeStyle = color;
    c.lineWidth = 0.8;
    c.strokeRect(x, y - 11, wd, 14);
    c.fillStyle = color;
    c.fillText(text, x + 4, y);
  }

  private drawOne(d: { tool: ToolId; a: Pt; b?: Pt; c?: Pt; text?: string }, ghost: boolean) {
    const A = this.toScreen(d.a);
    if (!A) return;
    const c = this.ctx;
    const w = this.canvas.clientWidth;
    const alpha = ghost ? 0.65 : 1;
    c.globalAlpha = alpha;

    switch (d.tool) {
      case "hline": {
        this.line(0, A.y, w, A.y, GOLD, 1.2, [5, 4]);
        this.label(d.a.price >= 1000 ? d.a.price.toFixed(0) : d.a.price.toPrecision(5), 6, A.y - 4);
        break;
      }
      case "vline": {
        this.line(A.x, 0, A.x, this.canvas.clientHeight, GOLD, 1.2, [5, 4]);
        break;
      }
      case "text": {
        if (d.text) this.label(d.text, A.x, A.y, "#E6C76A");
        break;
      }
      case "trend": {
        const B = d.b && this.toScreen(d.b);
        if (!B) break;
        this.line(A.x, A.y, B.x, B.y, GOLD, 1.6);
        break;
      }
      case "rect": {
        const B = d.b && this.toScreen(d.b);
        if (!B) break;
        c.fillStyle = "rgba(212,175,55,0.10)";
        c.strokeStyle = "rgba(212,175,55,0.7)";
        c.lineWidth = 1;
        const x = Math.min(A.x, B.x), y = Math.min(A.y, B.y);
        c.fillRect(x, y, Math.abs(B.x - A.x), Math.abs(B.y - A.y));
        c.strokeRect(x, y, Math.abs(B.x - A.x), Math.abs(B.y - A.y));
        break;
      }
      case "fib": {
        const B = d.b && this.toScreen(d.b);
        if (!B || !d.b) break;
        const x1 = Math.min(A.x, B.x), x2 = Math.max(A.x, B.x);
        for (const lvl of FIB_LEVELS) {
          const price = d.a.price + (d.b.price - d.a.price) * lvl;
          const s = this.series();
          const y = s?.priceToCoordinate(price);
          if (y == null) continue;
          const shade = lvl === 0.5 ? GOLD : "rgba(230,199,106,0.7)";
          this.line(x1, y, x2, y, shade, lvl === 0 || lvl === 1 ? 1.4 : 1, [3, 3]);
          this.label(`${(lvl * 100).toFixed(1)}%  ${price >= 1000 ? price.toFixed(0) : price.toPrecision(5)}`, x2 + 4, y + 4, shade);
        }
        break;
      }
      case "ruler": {
        const B = d.b && this.toScreen(d.b);
        if (!B || !d.b) break;
        this.line(A.x, A.y, B.x, B.y, "#E6C76A", 1.2, [4, 3]);
        const dPrice = d.b.price - d.a.price;
        const pct = (dPrice / d.a.price) * 100;
        this.label(`${dPrice >= 0 ? "+" : ""}${dPrice.toFixed(2)}  (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%)`, (A.x + B.x) / 2, (A.y + B.y) / 2 - 6);
        break;
      }
      case "long":
      case "short": {
        const B = d.b && this.toScreen(d.b);
        if (!B || !d.b) break;
        const entry = d.a.price;
        const target = d.b.price;
        const defaultRisk = Math.abs(target - entry) / 2;
        const stop = d.c?.price ?? (d.tool === "long" ? entry - defaultRisk : entry + defaultRisk);
        const s = this.series();
        const yE = s?.priceToCoordinate(entry);
        const yT = s?.priceToCoordinate(target);
        const yS = s?.priceToCoordinate(stop);
        if (yE == null || yT == null || yS == null) break;
        const x1 = Math.min(A.x, B.x), x2 = Math.max(A.x, B.x, x1 + 60);
        // profit zone (entry -> target)
        c.fillStyle = `${BULL}0.14)`;
        c.fillRect(x1, Math.min(yE, yT), x2 - x1, Math.abs(yT - yE));
        // risk zone (entry -> stop)
        c.fillStyle = `${BEAR}0.14)`;
        c.fillRect(x1, Math.min(yE, yS), x2 - x1, Math.abs(yS - yE));
        this.line(x1, yE, x2, yE, GOLD, 1.4);
        this.line(x1, yT, x2, yT, "rgba(46,189,133,0.95)", 1.4);
        this.line(x1, yS, x2, yS, "rgba(229,72,77,0.95)", 1.4);
        // drag handles
        for (const [y, col] of [[yE, GOLD], [yT, "#2EBD85"], [yS, "#E5484D"]] as const) {
          c.fillStyle = col;
          c.beginPath();
          c.arc((x1 + x2) / 2, y, 3.2, 0, Math.PI * 2);
          c.fill();
        }
        const reward = d.tool === "long" ? target - entry : entry - target;
        const risk = d.tool === "long" ? entry - stop : stop - entry;
        const rr = risk > 0 ? reward / risk : 0;
        const fp = (n: number) => (n >= 1000 ? n.toFixed(0) : n.toPrecision(5));
        this.label(`${d.tool === "long" ? "LONG" : "SHORT"} ${rr > 0 ? rr.toFixed(2) : "?"}:1R  E ${fp(entry)}`, x1 + 4, yE - 5);
        this.label(`TP ${fp(target)}`, x2 - 70, yT - 5, "#2EBD85");
        this.label(`SL ${fp(stop)}`, x2 - 70, yS - 5, "#E5484D");
        break;
      }
    }
    c.globalAlpha = 1;
  }
}
