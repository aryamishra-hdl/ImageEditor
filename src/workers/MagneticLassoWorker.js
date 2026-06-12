/**
 * MagneticLassoWorker.js
 * Runs Sobel edge detection and Dijkstra pathfinding off the main thread.
 * Messages IN:  { type: 'COMPUTE_EDGES', imageData, width, height }
 *               { type: 'FIND_PATH', fromX, fromY, toX, toY }
 * Messages OUT: { type: 'EDGES_READY' }
 *               { type: 'PATH_RESULT', path: [{x,y},...] }
 */

let gradientMap = null;
let mapWidth = 0;
let mapHeight = 0;

// ── Sobel edge detection ─────────────────────────────────────────────────────
function computeEdges(imageData, width, height) {
  const data = imageData.data;
  const gray = new Float32Array(width * height);

  // Convert to grayscale
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const gradient = new Float32Array(width * height);
  let maxG = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      // Sobel kernels
      const gx =
        -gray[(y - 1) * width + (x - 1)] + gray[(y - 1) * width + (x + 1)] +
        -2 * gray[y * width + (x - 1)] + 2 * gray[y * width + (x + 1)] +
        -gray[(y + 1) * width + (x - 1)] + gray[(y + 1) * width + (x + 1)];
      const gy =
        -gray[(y - 1) * width + (x - 1)] - 2 * gray[(y - 1) * width + x] - gray[(y - 1) * width + (x + 1)] +
        gray[(y + 1) * width + (x - 1)] + 2 * gray[(y + 1) * width + x] + gray[(y + 1) * width + (x + 1)];
      gradient[idx] = Math.sqrt(gx * gx + gy * gy);
      if (gradient[idx] > maxG) maxG = gradient[idx];
    }
  }

  // Normalize and invert so strong edges = low cost (Dijkstra finds cheapest path)
  if (maxG > 0) {
    for (let i = 0; i < gradient.length; i++) {
      gradient[i] = 1 - gradient[i] / maxG;
    }
  }

  return gradient;
}

// ── Dijkstra shortest path on gradient cost map ──────────────────────────────
function findPath(fromX, fromY, toX, toY) {
  if (!gradientMap) return [];

  const w = mapWidth;
  const h = mapHeight;
  const INF = Infinity;

  // Clamp coords
  fromX = Math.max(0, Math.min(w - 1, Math.round(fromX)));
  fromY = Math.max(0, Math.min(h - 1, Math.round(fromY)));
  toX   = Math.max(0, Math.min(w - 1, Math.round(toX)));
  toY   = Math.max(0, Math.min(h - 1, Math.round(toY)));

  const dist = new Float32Array(w * h).fill(INF);
  const prev = new Int32Array(w * h).fill(-1);
  const visited = new Uint8Array(w * h);

  const startIdx = fromY * w + fromX;
  dist[startIdx] = 0;

  // Simple priority queue using a sorted array (adequate for lasso region sizes)
  // For large images we work on a downsampled grid so this stays fast
  const heap = [[0, startIdx]];

  const neighbours = [
    [-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1],
    [-1, -1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [1, 1, Math.SQRT2],
  ];

  while (heap.length > 0) {
    // Pop minimum
    let minI = 0;
    for (let i = 1; i < heap.length; i++) {
      if (heap[i][0] < heap[minI][0]) minI = i;
    }
    const [d, idx] = heap[minI];
    heap.splice(minI, 1);

    if (visited[idx]) continue;
    visited[idx] = 1;

    if (idx === toY * w + toX) break;

    const x = idx % w;
    const y = (idx - x) / w;

    for (const [dx, dy, moveCost] of neighbours) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const nIdx = ny * w + nx;
      if (visited[nIdx]) continue;
      const cost = d + (gradientMap[nIdx] + 0.01) * moveCost;
      if (cost < dist[nIdx]) {
        dist[nIdx] = cost;
        prev[nIdx] = idx;
        heap.push([cost, nIdx]);
      }
    }
  }

  // Reconstruct path
  const path = [];
  let cur = toY * w + toX;
  let safety = w * h;
  while (cur !== -1 && safety-- > 0) {
    const x = cur % w;
    const y = (cur - x) / w;
    path.unshift({ x, y });
    if (cur === startIdx) break;
    cur = prev[cur];
  }

  return path;
}

// ── Message handler ──────────────────────────────────────────────────────────
self.onmessage = (e) => {
  const { type } = e.data;

  if (type === 'COMPUTE_EDGES') {
    const { imageData, width, height } = e.data;
    mapWidth  = width;
    mapHeight = height;
    gradientMap = computeEdges(imageData, width, height);
    self.postMessage({ type: 'EDGES_READY' });
  }

  if (type === 'FIND_PATH') {
    const { fromX, fromY, toX, toY } = e.data;
    const path = findPath(fromX, fromY, toX, toY);
    self.postMessage({ type: 'PATH_RESULT', path });
  }
};