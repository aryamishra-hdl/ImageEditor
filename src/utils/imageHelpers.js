import { filters as fabricFilters } from "fabric";

/** Applies a quick auto-retouch to a fabric image object. */
export const retouchImage = (image) => {
  if (!image || image.type !== "image") return;
  image.filters = [
    new fabricFilters.Brightness({ brightness: 0.05 }),
    new fabricFilters.Contrast({ contrast: 0.15 }),
    new fabricFilters.Saturation({ saturation: 0.1 }),
  ];
  image.applyFilters();
};

export const resetFilters = (image) => {
  if (!image) return;
  image.filters = [];
  image.applyFilters();
};

export const DEFAULT_OBJECT_STATE = {
  x: 0, y: 0,
  angle: 0,
  scaleX: 1, scaleY: 1,
  width: 0, height: 0,
  fill: "#5366ff",
  opacity: 1,
  fontFamily: "Inter",
  flipX: false, flipY: false,
};

export const DEFAULT_EFFECTS = {
  shadow: false,
  outline: false,
  outlineColor: "#ffffff",
  blendMode: "source-over",
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  hue: 0,
  vibrance: 0,
  blur: 0,
  noise: 0,
  preset: "none",
};

export const FONTS = [
  "Inter", "Arial", "Verdana", "Georgia", "Times New Roman",
  "Courier New", "Impact", "Trebuchet MS", "Comic Sans MS",
  "Palatino", "Garamond", "Bookman", "Tahoma",
];
