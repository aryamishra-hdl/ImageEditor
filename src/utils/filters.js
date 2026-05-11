import { filters as fabricFilters } from 'fabric';

/**
 * Build a Fabric.js filters array from adjustment values.
 * All user-facing values are in range -100 to 100 (or 0-100 for one-sided).
 */
export const buildFilters = ({
  brightness = 0,
  contrast = 0,
  saturation = 0,
  exposure = 0,
  hue = 0,
  vibrance = 0,
  blur = 0,
  noise = 0,
  preset = 'none',
} = {}) => {
  const filters = [];

  if (brightness !== 0)
    filters.push(new fabricFilters.Brightness({ brightness: brightness / 100 }));

  if (contrast !== 0)
    filters.push(new fabricFilters.Contrast({ contrast: contrast / 100 }));

  if (saturation !== 0)
    filters.push(new fabricFilters.Saturation({ saturation: saturation / 100 }));

  // Exposure: simulate with ColorMatrix channel scaling
  if (exposure !== 0) {
    const exp = Math.pow(2, exposure / 50); // -100→0.25x, 0→1x, 100→4x
    filters.push(new fabricFilters.ColorMatrix({
      matrix: [exp,0,0,0,0, 0,exp,0,0,0, 0,0,exp,0,0, 0,0,0,1,0],
    }));
  }

  // HueRotation expects -1 to 1 (fraction of 360°)
  if (hue !== 0)
    filters.push(new fabricFilters.HueRotation({ rotation: hue / 360 }));

  if (vibrance !== 0)
    filters.push(new fabricFilters.Vibrance({ vibrance: vibrance / 100 }));

  if (blur > 0)
    filters.push(new fabricFilters.Blur({ blur: blur / 100 }));

  if (noise > 0)
    filters.push(new fabricFilters.Noise({ noise }));

  // Presets
  switch (preset) {
    case 'grayscale': filters.push(new fabricFilters.Grayscale()); break;
    case 'sepia':     filters.push(new fabricFilters.Sepia()); break;
    case 'invert':    filters.push(new fabricFilters.Invert()); break;
    case 'vivid':
      filters.push(new fabricFilters.Saturation({ saturation: 0.4 }));
      filters.push(new fabricFilters.Contrast({ contrast: 0.15 }));
      break;
    case 'matte':
      filters.push(new fabricFilters.Brightness({ brightness: 0.06 }));
      filters.push(new fabricFilters.Saturation({ saturation: -0.25 }));
      break;
    case 'cool':
      filters.push(new fabricFilters.ColorMatrix({ matrix: [0.9,0,0.1,0,0, 0,0.95,0.05,0,0, 0,0,1.2,0,0, 0,0,0,1,0] }));
      break;
    case 'warm':
      filters.push(new fabricFilters.ColorMatrix({ matrix: [1.2,0,0,0,0, 0,1.05,0,0,0, 0,0,0.8,0,0, 0,0,0,1,0] }));
      break;
    default: break;
  }

  return filters;
};

export const PRESETS = [
  { value: 'none',      label: 'None' },
  { value: 'vivid',     label: 'Vivid' },
  { value: 'matte',     label: 'Matte' },
  { value: 'cool',      label: 'Cool' },
  { value: 'warm',      label: 'Warm' },
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
