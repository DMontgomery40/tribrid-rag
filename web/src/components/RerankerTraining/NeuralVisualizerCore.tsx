import { type MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';
import { NeuralVisualizerCanvas2D } from './NeuralVisualizerCanvas2D';
import { NeuralVisualizerWebGL2, type NeuralRenderPoint } from './NeuralVisualizerWebGL2';
import { NeuralVisualizerWebGPU } from './NeuralVisualizerWebGPU';

export type TelemetryPoint = {
  x: number;
  y: number;
  step: number;
  loss: number;
  lr: number;
  gradNorm: number;
  ts: string;
};

type Quality = 'balanced' | 'cinematic' | 'ultra';
type RendererPreference = 'auto' | 'webgpu' | 'webgl2' | 'canvas2d';

type Props = {
  pointsRef: MutableRefObject<TelemetryPoint[]>;
  pointCount: number;
  rendererPreference?: RendererPreference;
  quality?: Quality;
  targetFps?: number;
  tailSeconds?: number;
  motionIntensity?: number;
  reduceMotion?: boolean;
  showVectorField?: boolean;
};

type Vec2 = { x: number; y: number };

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function projectPoints(points: TelemetryPoint[], zoom: number, pan: Vec2): NeuralRenderPoint[] {
  if (!points.length) return [];

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let minLoss = Number.POSITIVE_INFINITY;
  let maxLoss = Number.NEGATIVE_INFINITY;
  let minGrad = Number.POSITIVE_INFINITY;
  let maxGrad = Number.NEGATIVE_INFINITY;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
    minLoss = Math.min(minLoss, p.loss);
    maxLoss = Math.max(maxLoss, p.loss);
    minGrad = Math.min(minGrad, p.gradNorm);
    maxGrad = Math.max(maxGrad, p.gradNorm);
  }

  const padX = (maxX - minX) * 0.1 || 1.0;
  const padY = (maxY - minY) * 0.1 || 1.0;
  minX -= padX;
  maxX += padX;
  minY -= padY;
  maxY += padY;

  const rangeX = Math.max(1e-9, maxX - minX);
  const rangeY = Math.max(1e-9, maxY - minY);
  const rangeLoss = Math.max(1e-9, maxLoss - minLoss);
  const rangeGrad = Math.max(1e-9, maxGrad - minGrad);

  return points.map((p) => {
    const nx = ((p.x - minX) / rangeX) * 2.0 - 1.0;
    const ny = ((p.y - minY) / rangeY) * 2.0 - 1.0;
    const lossNorm = clamp((p.loss - minLoss) / rangeLoss, 0.0, 1.0);
    const gradNorm = clamp((p.gradNorm - minGrad) / rangeGrad, 0.0, 1.0);
    const intensity = clamp((1.0 - lossNorm) * 0.45 + gradNorm * 0.55, 0.0, 1.0);

    return {
      x: (nx + pan.x) * zoom,
      y: (ny + pan.y) * zoom,
      intensity,
    };
  });
}

function chooseRendererMode({
  preference,
  webgpuAvailable,
  webgl2Available,
  webgpuFailed,
}: {
  preference: RendererPreference;
  webgpuAvailable: boolean;
  webgl2Available: boolean;
  webgpuFailed: boolean;
}): 'webgpu' | 'webgl2' | 'canvas2d' {
  if (preference === 'canvas2d') return 'canvas2d';

  const gpuEligible = webgpuAvailable && !webgpuFailed;

  if (preference === 'webgpu') {
    if (gpuEligible) return 'webgpu';
    if (webgl2Available) return 'webgl2';
    return 'canvas2d';
  }

  if (preference === 'webgl2') {
    if (webgl2Available) return 'webgl2';
    return 'canvas2d';
  }

  if (gpuEligible) return 'webgpu';
  if (webgl2Available) return 'webgl2';
  return 'canvas2d';
}

export function NeuralVisualizerCore({
  pointsRef,
  pointCount,
  rendererPreference = 'auto',
  quality = 'cinematic',
  targetFps = 60,
  tailSeconds = 8,
  motionIntensity = 1,
  reduceMotion = false,
  showVectorField = true,
}: Props) {
  const [live, setLive] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [scrubIndex, setScrubIndex] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<Vec2>({ x: 0, y: 0 });

  const [webgl2Available, setWebgl2Available] = useState<boolean>(rendererPreference !== 'canvas2d');
  const [webgpuAvailable, setWebgpuAvailable] = useState<boolean>(Boolean((globalThis as any)?.navigator?.gpu));
  const [webgpuFailed, setWebgpuFailed] = useState<boolean>(false);

  const draggingRef = useRef(false);
  const dragStartRef = useRef<Vec2>({ x: 0, y: 0 });
  const panStartRef = useRef<Vec2>({ x: 0, y: 0 });

  const maxIndex = Math.max(0, pointCount - 1);
  const visibleIndex = live ? maxIndex : clamp(scrubIndex, 0, maxIndex);

  useEffect(() => {
    if (rendererPreference === 'canvas2d') {
      setWebgl2Available(false);
      return;
    }

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: true });
    setWebgl2Available(Boolean(gl));
  }, [rendererPreference]);

  useEffect(() => {
    setWebgpuAvailable(Boolean((globalThis as any)?.navigator?.gpu));
  }, []);

  useEffect(() => {
    if (!live) return;
    setScrubIndex(maxIndex);
  }, [live, maxIndex]);

  useEffect(() => {
    if (!isPlaying || live || maxIndex <= 0) return;

    let raf = 0;
    let last = performance.now();
    const rate = clamp(Number(targetFps || 60), 30, 144);

    const tick = (now: number) => {
      const dt = Math.max(0, now - last);
      last = now;
      const advance = Math.max(1, Math.floor((dt / 1000) * rate));
      setScrubIndex((prev) => {
        const next = prev + advance;
        if (next >= maxIndex) {
          setIsPlaying(false);
          return maxIndex;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, live, maxIndex, targetFps]);

  const visiblePoints = useMemo(() => {
    const raw = pointsRef.current;
    if (!raw.length) return [];

    const upto = raw.slice(0, clamp(visibleIndex, 0, raw.length - 1) + 1);
    const projected = projectPoints(upto, zoom, pan);

    if (tailSeconds <= 0 || projected.length < 2) return projected;

    const tailCount = clamp(Math.floor(tailSeconds * 14), 60, projected.length);
    return projected.slice(-tailCount);
  }, [pointsRef, visibleIndex, zoom, pan, tailSeconds]);

  const latest = useMemo(() => {
    const items = pointsRef.current;
    return items.length ? items[items.length - 1] : null;
  }, [pointCount, pointsRef]);

  const activeRenderer = useMemo(
    () =>
      chooseRendererMode({
        preference: rendererPreference,
        webgpuAvailable,
        webgl2Available,
        webgpuFailed,
      }),
    [rendererPreference, webgpuAvailable, webgl2Available, webgpuFailed]
  );

  return (
    <section className="studio-panel studio-visualizer-panel" data-testid="neural-visualizer">
      <header className="studio-panel-header">
        <div>
          <h3 className="studio-panel-title">Neural Visualizer</h3>
          <p className="studio-panel-subtitle">Cinematic optimization trajectory from live training telemetry.</p>
        </div>
        <div className="studio-chip-row">
          <span className="studio-chip">points={pointCount}</span>
          {latest ? <span className="studio-chip">step={latest.step}</span> : null}
          <span className="studio-chip">quality={quality}</span>
          <span className="studio-chip">renderer={activeRenderer}</span>
          {rendererPreference === 'webgpu' && activeRenderer !== 'webgpu' ? (
            <span className="studio-chip studio-chip-warn">WebGPU fallback</span>
          ) : null}
        </div>
      </header>

      <div
        className="neural-canvas-wrap"
        onMouseDown={(e) => {
          draggingRef.current = true;
          dragStartRef.current = { x: e.clientX, y: e.clientY };
          panStartRef.current = { ...pan };
        }}
        onMouseMove={(e) => {
          if (!draggingRef.current) return;
          const dx = (e.clientX - dragStartRef.current.x) / 260;
          const dy = (e.clientY - dragStartRef.current.y) / 260;
          setPan({ x: panStartRef.current.x + dx, y: panStartRef.current.y - dy });
        }}
        onMouseUp={() => {
          draggingRef.current = false;
        }}
        onMouseLeave={() => {
          draggingRef.current = false;
        }}
        onWheel={(e) => {
          e.preventDefault();
          const dir = e.deltaY > 0 ? -0.08 : 0.08;
          setZoom((z) => clamp(z + dir, 0.25, 4.0));
        }}
      >
        {activeRenderer === 'webgpu' ? (
          <NeuralVisualizerWebGPU
            points={visiblePoints}
            quality={quality}
            motionIntensity={motionIntensity}
            reduceMotion={reduceMotion}
            showVectorField={showVectorField}
            onFallback={() => setWebgpuFailed(true)}
          />
        ) : null}

        {activeRenderer === 'webgl2' ? (
          <NeuralVisualizerWebGL2
            points={visiblePoints}
            quality={quality}
            motionIntensity={motionIntensity}
            reduceMotion={reduceMotion}
            showVectorField={showVectorField}
          />
        ) : null}

        {activeRenderer === 'canvas2d' ? (
          <NeuralVisualizerCanvas2D points={visiblePoints} targetFps={Number(targetFps || 60)} />
        ) : null}

        {pointCount === 0 ? (
          <div className="neural-overlay" data-testid="neural-awaiting-telemetry">
            Awaiting telemetry...
          </div>
        ) : null}
      </div>

      <div className="neural-controls">
        <label className="studio-checkbox-inline">
          <input
            type="checkbox"
            checked={live}
            onChange={(e) => {
              setLive(e.target.checked);
              if (e.target.checked) setIsPlaying(false);
            }}
          />
          Live
        </label>

        <button
          className="small-button"
          onClick={() => setIsPlaying((v) => !v)}
          disabled={live || maxIndex <= 0}
          data-testid="neural-play-pause"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        <label className="neural-zoom">
          Zoom
          <input
            type="range"
            min={0.25}
            max={4}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            data-testid="neural-zoom-slider"
          />
        </label>

        <button
          className="small-button"
          onClick={() => {
            setPan({ x: 0, y: 0 });
            setZoom(1.0);
          }}
          data-testid="neural-reset-view"
        >
          Reset View
        </button>
      </div>

      <div className="neural-scrub-row">
        <input
          type="range"
          min={0}
          max={maxIndex}
          step={1}
          value={visibleIndex}
          disabled={maxIndex <= 0}
          onChange={(e) => {
            setLive(false);
            setScrubIndex(Number(e.target.value));
          }}
          data-testid="neural-scrub-slider"
        />
        <span className="studio-mono">{maxIndex <= 0 ? '0/0' : `${visibleIndex + 1}/${maxIndex + 1}`}</span>
      </div>
    </section>
  );
}
