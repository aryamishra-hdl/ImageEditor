import { filters as fabricFilters } from 'fabric';

/**
 * Build a Fabric.js filters array from adjustment values.
 * All user-facing values are in range -100 to 100 (or 0-100 for one-sided).
 */
export const buildFilters = ({
  brightness = 0,
  contrast   = 0,
  saturation = 0,
  exposure   = 0,
  hue        = 0,
  vibrance   = 0,
  blur       = 0,
  noise      = 0,
  sharpen    = 0,
  temperature = 0,   // -100 (cool) to +100 (warm)
  levelsBlack = 0,   // 0–255
  levelsMid   = 1.0, // gamma 0.1–3.0
  levelsWhite = 255, // 0–255
  curveMidpoint = 0, // -100 to 100
  redMultiplier = 1,
  greenMultiplier = 1,
  blueMultiplier = 1,
  preset     = 'none',
} = {}) => {
  const f = [];

  // ── Levels & Tone Curve ────────────────────────────────────────────────
  // 1. Levels linear Black/White point mapping
  if (levelsBlack !== 0 || levelsWhite !== 255) {
    const bN = levelsBlack / 255;
    const wN = levelsWhite / 255;
    const range = Math.max(wN - bN, 0.001);
    const scale = 1 / range;
    const offset = -bN / range;
    
    f.push(new fabricFilters.ColorMatrix({
      matrix: [
        scale, 0, 0, 0, offset,
        0, scale, 0, 0, offset,
        0, 0, scale, 0, offset,
        0, 0, 0, 1, 0,
      ],
    }));
  }

  // 2. Non-linear Gamma mapping (Midtones & Tone Curve)
  const curveGamma = curveMidpoint > 0 
    ? 1 + (curveMidpoint / 100) * 2 // up to 3.0
    : 1 + (curveMidpoint / 100) * 0.9; // down to 0.1

  const effectiveGamma = levelsMid * curveGamma;

  if (effectiveGamma !== 1.0) {
    const clampedGamma = Math.max(0.01, Math.min(10.0, effectiveGamma));
    f.push(new fabricFilters.Gamma({
      gamma: [clampedGamma, clampedGamma, clampedGamma]
    }));
  }

  // ── RGB Channels ─────────────────────────────────────────────────────────
  if (redMultiplier !== 1 || greenMultiplier !== 1 || blueMultiplier !== 1) {
    f.push(new fabricFilters.ColorMatrix({
      matrix: [
        redMultiplier, 0, 0, 0, 0,
        0, greenMultiplier, 0, 0, 0,
        0, 0, blueMultiplier, 0, 0,
        0, 0, 0, 1, 0,
      ]
    }));
  }

  // ── Basic tonal adjustments ──────────────────────────────────────────────
  if (brightness !== 0)
    f.push(new fabricFilters.Brightness({ brightness: brightness / 100 }));

  if (contrast !== 0)
    f.push(new fabricFilters.Contrast({ contrast: contrast / 100 }));

  // ── Exposure ─────────────────────────────────────────────────────────────
  if (exposure !== 0) {
    const exp = Math.pow(2, exposure / 50);
    f.push(new fabricFilters.ColorMatrix({
      matrix: [exp,0,0,0,0, 0,exp,0,0,0, 0,0,exp,0,0, 0,0,0,1,0],
    }));
  }

  // ── Color ────────────────────────────────────────────────────────────────
  if (saturation !== 0)
    f.push(new fabricFilters.Saturation({ saturation: saturation / 100 }));

  if (hue !== 0)
    f.push(new fabricFilters.HueRotation({ rotation: hue / 360 }));

  if (vibrance !== 0)
    f.push(new fabricFilters.Vibrance({ vibrance: vibrance / 100 }));

  // ── Temperature (warm/cool) via ColorMatrix ───────────────────────────────
  if (temperature !== 0) {
    const t = temperature / 100; // -1 (cool) to +1 (warm)
    f.push(new fabricFilters.ColorMatrix({
      matrix: [
        1 + t * 0.2, 0,            0,             0, 0,
        0,           1,            0,             0, 0,
        0,           0,            1 - t * 0.2,   0, 0,
        0,           0,            0,             1, 0,
      ],
    }));
  }

  // ── Blur ─────────────────────────────────────────────────────────────────
  if (blur > 0)
    f.push(new fabricFilters.Blur({ blur: blur / 100 }));

  // ── Noise ─────────────────────────────────────────────────────────────────
  if (noise > 0)
    f.push(new fabricFilters.Noise({ noise }));

  // ── Sharpen via convolution ────────────────────────────────────────────────
  if (sharpen > 0) {
    const s = sharpen / 100; // 0–1
    f.push(new fabricFilters.Convolute({
      matrix: [
         0,      -s,       0,
        -s,  1 + 4*s,    -s,
         0,      -s,       0,
      ],
    }));
  }

  // ── Presets ───────────────────────────────────────────────────────────────
  switch (preset) {
    case 'grayscale': f.push(new fabricFilters.Grayscale()); break;
    case 'sepia':     f.push(new fabricFilters.Sepia()); break;
    case 'invert':    f.push(new fabricFilters.Invert()); break;
    case 'vivid':
      f.push(new fabricFilters.Saturation({ saturation: 0.4 }));
      f.push(new fabricFilters.Contrast({ contrast: 0.15 }));
      break;
    case 'matte':
      f.push(new fabricFilters.Brightness({ brightness: 0.06 }));
      f.push(new fabricFilters.Saturation({ saturation: -0.25 }));
      break;
    case 'cool':
      f.push(new fabricFilters.ColorMatrix({ matrix: [0.9,0,0.1,0,0, 0,0.95,0.05,0,0, 0,0,1.2,0,0, 0,0,0,1,0] }));
      break;
    case 'warm':
      f.push(new fabricFilters.ColorMatrix({ matrix: [1.2,0,0,0,0, 0,1.05,0,0,0, 0,0,0.8,0,0, 0,0,0,1,0] }));
      break;
    case 'cinematic':
      f.push(new fabricFilters.Contrast({ contrast: 0.2 }));
      f.push(new fabricFilters.Saturation({ saturation: -0.1 }));
      f.push(new fabricFilters.ColorMatrix({ matrix: [1.1,0,0,0,-0.05, 0,1,0,0,0, 0,0,0.9,0,0.05, 0,0,0,1,0] }));
      break;
    case 'faded':
      f.push(new fabricFilters.Brightness({ brightness: 0.08 }));
      f.push(new fabricFilters.Contrast({ contrast: -0.1 }));
      f.push(new fabricFilters.Saturation({ saturation: -0.3 }));
      break;
    default: break;
  }

  return f;
};

export const PRESETS = [
  { value: 'none',      label: 'None' },
  { value: 'vivid',     label: 'Vivid' },
  { value: 'matte',     label: 'Matte' },
  { value: 'cool',      label: 'Cool' },
  { value: 'warm',      label: 'Warm' },
  { value: 'cinematic', label: 'Cinema' },
  { value: 'faded',     label: 'Faded' },
  { value: 'grayscale', label: 'B&W' },
  { value: 'sepia',     label: 'Sepia' },
  { value: 'invert',    label: 'Invert' },
];

export const BLEND_MODES = [
  { value: 'source-over', label: 'Normal' },
  { value: 'multiply',    label: 'Multiply' },
  { value: 'screen',      label: 'Screen' },
  { value: 'overlay',     label: 'Overlay' },
  { value: 'darken',      label: 'Darken' },
  { value: 'lighten',     label: 'Lighten' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'color-burn',  label: 'Color Burn' },
  { value: 'hard-light',  label: 'Hard Light' },
  { value: 'soft-light',  label: 'Soft Light' },
  { value: 'difference',  label: 'Difference' },
  { value: 'exclusion',   label: 'Exclusion' },
];
