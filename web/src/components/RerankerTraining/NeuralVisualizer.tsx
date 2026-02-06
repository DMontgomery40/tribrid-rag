import { type MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';

export type TelemetryPoint = {
  x: number;
  y: number;
  step: number;
  loss: number;
  lr: number;
  gradNorm: number;
  ts: string;
};

type Props = {
  pointsRef: MutableRefObject<TelemetryPoint[]>;
  pointCount: number;
};

type Vec2 = { x: number; y: number };

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const err = gl.getShaderInfoLog(shader) || 'unknown';
    gl.deleteShader(shader);
    throw new Error(`Shader compile: ${err}`);
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vsSource: string, fsSource: string): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create program');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const err = gl.getProgramInfoLog(program) || 'unknown';
    gl.deleteProgram(program);
    throw new Error(`Program link: ${err}`);
  }
  return program;
}

/* ------------------------------------------------------------------ */
/*  Normalize telemetry points to clip-space with zoom/pan applied    */
/* ------------------------------------------------------------------ */

function normalizePoints(points: TelemetryPoint[], zoom: number, pan: Vec2): Float32Array {
  if (!points.length) return new Float32Array();

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minLoss = Infinity, maxLoss = -Infinity;
  let minGrad = Infinity, maxGrad = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    if (p.loss < minLoss) minLoss = p.loss;
    if (p.loss > maxLoss) maxLoss = p.loss;
    if (p.gradNorm < minGrad) minGrad = p.gradNorm;
    if (p.gradNorm > maxGrad) maxGrad = p.gradNorm;
  }

  const padX = (maxX - minX) * 0.12 || 1;
  const padY = (maxY - minY) * 0.12 || 1;
  minX -= padX; maxX += padX;
  minY -= padY; maxY += padY;

  const rangeX = Math.max(1e-9, maxX - minX);
  const rangeY = Math.max(1e-9, maxY - minY);
  const rangeLoss = Math.max(1e-9, maxLoss - minLoss);
  const rangeGrad = Math.max(1e-9, maxGrad - minGrad);

  // 4 floats per point: x, y, intensity, age (0..1 newest..oldest)
  const out = new Float32Array(points.length * 4);
  const last = points.length - 1;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const nx = ((p.x - minX) / rangeX) * 2 - 1;
    const ny = ((p.y - minY) / rangeY) * 2 - 1;

    const lossNorm = clamp((p.loss - minLoss) / rangeLoss, 0, 1);
    const gradNorm = clamp((p.gradNorm - minGrad) / rangeGrad, 0, 1);
    const intensity = clamp((1 - lossNorm) * 0.4 + gradNorm * 0.6, 0, 1);
    const age = last > 0 ? i / last : 1;

    out[i * 4 + 0] = (nx + pan.x) * zoom;
    out[i * 4 + 1] = (ny + pan.y) * zoom;
    out[i * 4 + 2] = intensity;
    out[i * 4 + 3] = age;
  }
  return out;
}

/* ================================================================== */
/*  GLSL Shaders                                                      */
/* ================================================================== */

// --- Background: dark gradient + animated flowing grid + vignette ---
const BG_VS = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const BG_FS = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 u_res;
uniform float u_time;

// Simplex-ish hash noise for flow
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.1;
    a *= 0.48;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;

  // Deep navy-to-black gradient
  vec3 bg = mix(
    vec3(0.012, 0.020, 0.045),
    vec3(0.030, 0.055, 0.095),
    uv.y * 0.7 + 0.15
  );

  // Subtle radial glow (warm center)
  float dist = length(uv - vec2(0.5));
  bg += vec3(0.015, 0.035, 0.065) * smoothstep(0.7, 0.0, dist);

  // Animated flowing grid
  float t = u_time * 0.15;
  vec2 gp = gl_FragCoord.xy;
  float flow = fbm(gp * 0.005 + vec2(t * 0.3, t * 0.2)) * 6.0;

  float gx = abs(fract((gp.x + flow) / 48.0) - 0.5);
  float gy = abs(fract((gp.y + flow * 0.7) / 48.0) - 0.5);
  float grid = smoothstep(0.490, 0.500, max(gx, gy));

  // Grid color - dim cyan with subtle pulse
  float pulse = 0.6 + 0.4 * sin(u_time * 0.8);
  vec3 gridCol = vec3(0.05, 0.18, 0.25) * (0.3 + 0.1 * pulse);
  bg += gridCol * grid;

  // Subtle noise texture for depth
  float n = fbm(gl_FragCoord.xy * 0.008 + u_time * 0.05);
  bg += vec3(0.008, 0.015, 0.025) * n;

  // Vignette
  float vig = 1.0 - 0.45 * dot(uv - 0.5, uv - 0.5) * 2.0;
  bg *= clamp(vig, 0.15, 1.0);

  outColor = vec4(bg, 1.0);
}
`;

// --- Trajectory line: glowing trail with fade ---
const LINE_VS = `#version 300 es
in vec2 a_pos;
in float a_age;
out float v_age;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
  v_age = a_age;
}
`;

const LINE_FS = `#version 300 es
precision highp float;
in float v_age;
out vec4 outColor;
void main() {
  // Trail fades from dim at old end to bright at newest
  float brightness = 0.15 + 0.85 * v_age;
  vec3 c = mix(
    vec3(0.05, 0.25, 0.40),   // dim teal (old)
    vec3(0.30, 0.95, 1.00),   // bright cyan (new)
    v_age
  );
  outColor = vec4(c * brightness, brightness * 0.9);
}
`;

// --- Points: glowing energy orbs ---
const POINT_VS = `#version 300 es
in vec2 a_pos;
in float a_intensity;
in float a_age;
out float v_i;
out float v_age;
uniform float u_time;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
  v_i = a_intensity;
  v_age = a_age;
  // Size scales with intensity and age, newest is biggest
  float ageFactor = 0.3 + 0.7 * a_age;
  float pulse = 1.0 + 0.15 * sin(u_time * 3.0 + a_age * 20.0);
  gl_PointSize = (3.0 + 14.0 * a_intensity) * ageFactor * pulse;
}
`;

const POINT_FS = `#version 300 es
precision highp float;
in float v_i;
in float v_age;
out vec4 outColor;
void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float d = length(p);

  // Soft radial falloff: bright core + diffuse halo
  float core = smoothstep(0.22, 0.0, d);
  float halo = smoothstep(0.50, 0.08, d);

  float a = clamp(core * 0.9 + halo * 0.45, 0.0, 1.0);

  // Color: cool blue -> hot cyan/white based on intensity
  vec3 cool = vec3(0.10, 0.50, 0.75);
  vec3 hot  = vec3(0.55, 1.00, 0.98);
  vec3 white = vec3(0.90, 1.00, 1.00);
  vec3 c = mix(cool, hot, clamp(v_i, 0.0, 1.0));
  // Brightest points get a white-hot core
  c = mix(c, white, core * v_i * 0.6);

  // Fade old points
  float ageFade = 0.15 + 0.85 * v_age;
  a *= ageFade;

  outColor = vec4(c, a);
}
`;

// --- Current point highlight: pulsing energy beacon ---
const BEACON_VS = `#version 300 es
in vec2 a_pos;
uniform float u_time;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
  float pulse = 1.0 + 0.25 * sin(u_time * 4.0);
  gl_PointSize = 28.0 * pulse;
}
`;

const BEACON_FS = `#version 300 es
precision highp float;
out vec4 outColor;
uniform float u_time;
void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float d = length(p);

  // Concentric rings effect
  float ring1 = smoothstep(0.24, 0.18, d) * smoothstep(0.12, 0.18, d);
  float ring2 = smoothstep(0.42, 0.36, d) * smoothstep(0.30, 0.36, d);
  float core = smoothstep(0.14, 0.0, d);
  float outerGlow = smoothstep(0.50, 0.10, d);

  float ringPulse = 0.3 + 0.7 * abs(sin(u_time * 2.5));

  vec3 c = vec3(0.35, 0.98, 1.00);
  float a = core * 0.95
          + ring1 * 0.35 * ringPulse
          + ring2 * 0.15 * (1.0 - ringPulse)
          + outerGlow * 0.25;

  outColor = vec4(c, clamp(a, 0.0, 1.0));
}
`;

/* ================================================================== */
/*  Component                                                         */
/* ================================================================== */

export function NeuralVisualizer({ pointsRef, pointCount }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fallbackRef = useRef<HTMLCanvasElement | null>(null);

  const [webglAvailable, setWebglAvailable] = useState(true);
  const [live, setLive] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrubIndex, setScrubIndex] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState<Vec2>({ x: 0, y: 0 });

  const draggingRef = useRef(false);
  const dragStartRef = useRef<Vec2>({ x: 0, y: 0 });
  const panStartRef = useRef<Vec2>({ x: 0, y: 0 });

  const maxIndex = Math.max(0, pointCount - 1);
  const visibleIndex = live ? maxIndex : clamp(scrubIndex, 0, maxIndex);
  const visibleIndexRef = useRef(visibleIndex);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);

  useEffect(() => { visibleIndexRef.current = visibleIndex; }, [visibleIndex]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);

  useEffect(() => {
    if (live) setScrubIndex(maxIndex);
  }, [live, maxIndex]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying || live || maxIndex <= 0) return;
    let raf = 0;
    let last = performance.now();
    const perSecond = 70;
    const tick = (now: number) => {
      const dt = Math.max(0, now - last);
      last = now;
      const advance = Math.max(1, Math.floor((dt / 1000) * perSecond));
      setScrubIndex((prev) => {
        const next = prev + advance;
        if (next >= maxIndex) { setIsPlaying(false); return maxIndex; }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, live, maxIndex]);

  // Check WebGL2 availability
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: true });
    if (!gl) setWebglAvailable(false);
    else setWebglAvailable(true);
  }, []);

  // ---- WebGL2 render loop ----
  useEffect(() => {
    if (!webglAvailable) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: true });
    if (!gl) { setWebglAvailable(false); return; }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    let bgProg: WebGLProgram, lineProg: WebGLProgram, pointProg: WebGLProgram, beaconProg: WebGLProgram;
    try {
      bgProg = createProgram(gl, BG_VS, BG_FS);
      lineProg = createProgram(gl, LINE_VS, LINE_FS);
      pointProg = createProgram(gl, POINT_VS, POINT_FS);
      beaconProg = createProgram(gl, BEACON_VS, BEACON_FS);
    } catch (_e) {
      setWebglAvailable(false);
      return;
    }

    const quad = new Float32Array([-1, -1, 3, -1, -1, 3]);
    const bgVbo = gl.createBuffer();
    const dataVbo = gl.createBuffer();
    const beaconVbo = gl.createBuffer();
    if (!bgVbo || !dataVbo || !beaconVbo) { setWebglAvailable(false); return; }

    gl.bindBuffer(gl.ARRAY_BUFFER, bgVbo);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    // Attribute locations
    const bgPosLoc = gl.getAttribLocation(bgProg, 'a_pos');
    const bgResLoc = gl.getUniformLocation(bgProg, 'u_res');
    const bgTimeLoc = gl.getUniformLocation(bgProg, 'u_time');

    const linePosLoc = gl.getAttribLocation(lineProg, 'a_pos');
    const lineAgeLoc = gl.getAttribLocation(lineProg, 'a_age');

    const ptPosLoc = gl.getAttribLocation(pointProg, 'a_pos');
    const ptILoc = gl.getAttribLocation(pointProg, 'a_intensity');
    const ptAgeLoc = gl.getAttribLocation(pointProg, 'a_age');
    const ptTimeLoc = gl.getUniformLocation(pointProg, 'u_time');

    const bcnPosLoc = gl.getAttribLocation(beaconProg, 'a_pos');
    const bcnTimeLoc = gl.getUniformLocation(beaconProg, 'u_time');

    let raf = 0;
    const started = performance.now();

    const draw = (now: number) => {
      resize();
      const t = (now - started) / 1000;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      // 1. Background
      gl.useProgram(bgProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, bgVbo);
      gl.enableVertexAttribArray(bgPosLoc);
      gl.vertexAttribPointer(bgPosLoc, 2, gl.FLOAT, false, 8, 0);
      if (bgResLoc) gl.uniform2f(bgResLoc, canvas.width, canvas.height);
      if (bgTimeLoc) gl.uniform1f(bgTimeLoc, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      const raw = pointsRef.current;
      const vi = visibleIndexRef.current;
      const upto = raw.slice(0, clamp(vi, 0, Math.max(0, raw.length - 1)) + 1);

      if (upto.length > 0) {
        const arr = normalizePoints(upto, zoomRef.current, panRef.current);
        gl.bindBuffer(gl.ARRAY_BUFFER, dataVbo);
        gl.bufferData(gl.ARRAY_BUFFER, arr, gl.DYNAMIC_DRAW);

        const stride = 16; // 4 floats * 4 bytes

        // 2. Trajectory line
        gl.useProgram(lineProg);
        gl.enableVertexAttribArray(linePosLoc);
        gl.vertexAttribPointer(linePosLoc, 2, gl.FLOAT, false, stride, 0);
        if (lineAgeLoc >= 0) {
          gl.enableVertexAttribArray(lineAgeLoc);
          gl.vertexAttribPointer(lineAgeLoc, 1, gl.FLOAT, false, stride, 12);
        }
        gl.lineWidth(1.0);
        gl.drawArrays(gl.LINE_STRIP, 0, upto.length);

        // 3. Points
        gl.useProgram(pointProg);
        gl.enableVertexAttribArray(ptPosLoc);
        gl.vertexAttribPointer(ptPosLoc, 2, gl.FLOAT, false, stride, 0);
        if (ptILoc >= 0) {
          gl.enableVertexAttribArray(ptILoc);
          gl.vertexAttribPointer(ptILoc, 1, gl.FLOAT, false, stride, 8);
        }
        if (ptAgeLoc >= 0) {
          gl.enableVertexAttribArray(ptAgeLoc);
          gl.vertexAttribPointer(ptAgeLoc, 1, gl.FLOAT, false, stride, 12);
        }
        if (ptTimeLoc) gl.uniform1f(ptTimeLoc, t);
        gl.drawArrays(gl.POINTS, 0, upto.length);

        // 4. Current-point beacon (last point only)
        const lastIdx = upto.length - 1;
        const beaconData = new Float32Array([arr[lastIdx * 4], arr[lastIdx * 4 + 1]]);
        gl.bindBuffer(gl.ARRAY_BUFFER, beaconVbo);
        gl.bufferData(gl.ARRAY_BUFFER, beaconData, gl.DYNAMIC_DRAW);

        gl.useProgram(beaconProg);
        gl.enableVertexAttribArray(bcnPosLoc);
        gl.vertexAttribPointer(bcnPosLoc, 2, gl.FLOAT, false, 8, 0);
        if (bcnTimeLoc) gl.uniform1f(bcnTimeLoc, t);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // additive for glow
        gl.drawArrays(gl.POINTS, 0, 1);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // restore
      }

      raf = requestAnimationFrame(draw);
    };

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteBuffer(bgVbo);
      gl.deleteBuffer(dataVbo);
      gl.deleteBuffer(beaconVbo);
      gl.deleteProgram(bgProg);
      gl.deleteProgram(lineProg);
      gl.deleteProgram(pointProg);
      gl.deleteProgram(beaconProg);
    };
  }, [webglAvailable, pointsRef]);

  // ---- Canvas2D fallback ----
  useEffect(() => {
    if (webglAvailable) return;
    const canvas = fallbackRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };

    let startTime = performance.now();

    const draw = (now: number) => {
      const points = pointsRef.current;
      const vi = visibleIndexRef.current;
      const upto = points.slice(0, clamp(vi, 0, Math.max(0, points.length - 1)) + 1);
      resize();
      const w = canvas.width;
      const h = canvas.height;
      const t = (now - startTime) / 1000;

      // Background gradient
      const grad = ctx.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, '#030812');
      grad.addColorStop(0.5, '#0a1830');
      grad.addColorStop(1, '#061020');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Animated grid
      const gridSize = Math.max(32, Math.floor(Math.min(w, h) / 12));
      const offset = (t * 8) % gridSize;
      ctx.strokeStyle = 'rgba(80,160,200,0.10)';
      ctx.lineWidth = 1;
      for (let x = -gridSize + offset; x < w + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = -gridSize + offset * 0.6; y < h + gridSize; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Vignette
      const vigGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.15, w / 2, h / 2, w * 0.65);
      vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vigGrad.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, w, h);

      if (!upto.length) {
        ctx.fillStyle = 'rgba(200,220,240,0.55)';
        ctx.font = `${Math.floor(13 * (window.devicePixelRatio || 1))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.fillText('Awaiting telemetry...', 20, 32);
        return;
      }

      const arr = normalizePoints(upto, zoomRef.current, panRef.current);
      const toPx = (nx: number, ny: number) => ({
        x: (nx * 0.5 + 0.5) * w,
        y: (1 - (ny * 0.5 + 0.5)) * h,
      });

      // Trail glow (thick, blurred)
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = 'rgba(50,200,255,0.6)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < upto.length; i++) {
        const p = toPx(arr[i * 4], arr[i * 4 + 1]);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.restore();

      // Trail sharp
      ctx.strokeStyle = 'rgba(80,240,255,0.85)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < upto.length; i++) {
        const p = toPx(arr[i * 4], arr[i * 4 + 1]);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      // Points
      for (let i = 0; i < upto.length; i++) {
        const p = toPx(arr[i * 4], arr[i * 4 + 1]);
        const intensity = arr[i * 4 + 2];
        const age = arr[i * 4 + 3];
        const r = 2 + 5 * intensity;
        const alpha = 0.2 + 0.8 * age;
        ctx.fillStyle = `rgba(${Math.floor(80 + 175 * intensity)},${Math.floor(200 + 55 * intensity)},255,${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Current point beacon
      const last = upto.length - 1;
      const lp = toPx(arr[last * 4], arr[last * 4 + 1]);
      const beaconPulse = 0.7 + 0.3 * Math.sin(t * 4);

      // Outer glow
      const glowGrad = ctx.createRadialGradient(lp.x, lp.y, 0, lp.x, lp.y, 16);
      glowGrad.addColorStop(0, `rgba(100,240,255,${(0.6 * beaconPulse).toFixed(2)})`);
      glowGrad.addColorStop(1, 'rgba(100,240,255,0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(lp.x - 16, lp.y - 16, 32, 32);

      // Core
      ctx.fillStyle = 'rgba(200,255,255,0.95)';
      ctx.beginPath();
      ctx.arc(lp.x, lp.y, 4.5 * beaconPulse, 0, Math.PI * 2);
      ctx.fill();
    };

    let raf = 0;
    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [webglAvailable, pointsRef]);

  const latest = useMemo(() => {
    const items = pointsRef.current;
    return items.length ? items[items.length - 1] : null;
  }, [pointCount, pointsRef]);

  return (
    <section className="studio-panel studio-visualizer-panel" data-testid="neural-visualizer">
      <header className="studio-panel-header">
        <div>
          <h3 className="studio-panel-title">Neural Visualizer</h3>
          <p className="studio-panel-subtitle">Real-time optimization trajectory from training telemetry.</p>
        </div>
        <div className="studio-chip-row">
          <span className="studio-chip">points={pointCount}</span>
          {latest ? <span className="studio-chip">step={latest.step}</span> : null}
          {!webglAvailable ? <span className="studio-chip studio-chip-warn">Canvas fallback</span> : null}
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
        onMouseUp={() => { draggingRef.current = false; }}
        onMouseLeave={() => { draggingRef.current = false; }}
        onWheel={(e) => {
          e.preventDefault();
          const dir = e.deltaY > 0 ? -0.08 : 0.08;
          setZoom((z) => clamp(z + dir, 0.25, 4.0));
        }}
      >
        <canvas ref={canvasRef} className={webglAvailable ? 'neural-canvas active' : 'neural-canvas'} />
        <canvas ref={fallbackRef} className={!webglAvailable ? 'neural-canvas active' : 'neural-canvas'} />

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
          onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1.0); }}
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
        <span className="studio-mono">
          {maxIndex <= 0 ? '0/0' : `${visibleIndex + 1}/${maxIndex + 1}`}
        </span>
      </div>
    </section>
  );
}
