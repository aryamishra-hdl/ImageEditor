/**
 * src/utils/removeBackground.js
 *
 * Fixes: removeBackground failed: TypeError: Failed to fetch
 *        at _$initInterceptor.s.fetch (requests.js)
 *
 * Two root causes fixed here:
 *
 * 1. The library fetches its WASM + ONNX model files from a relative path
 *    that doesn't exist in your Vite dev/prod server.
 *    Fix: point `publicPath` to the official unpkg CDN.
 *
 * 2. When the Fabric image src is a blob:// or data: URL, the library
 *    tries to fetch it again via XHR which fails (blob URLs can't be
 *    re-fetched cross-context, data URLs can exceed fetch limits).
 *    Fix: pre-convert the image to a canvas Blob before passing it in.
 */

const IMGLY_CDN =
  "https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/";

/**
 * Draws the image onto a hidden canvas and returns it as a PNG Blob.
 * Works for any src: blob://, data:, https://, etc.
 */
function srcToBlob(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas.toBlob() returned null"));
      }, "image/png");
    };

    img.onerror = () =>
      reject(new Error("Could not load image from src: " + src.slice(0, 80)));

    img.src = src;
  });
}

const QUALITY_MODELS = {
  low:    "small",
  medium: "medium",
  high:   "large",
};

/**
 * Removes the background from a Fabric.js image object.
 *
 * @param   {fabric.Image} fabricImageObj  The selected Fabric image object
 * @param   {"low"|"medium"|"high"} [quality="medium"]  Removal quality preset
 * @returns {Promise<string>}              Object URL of the result PNG
 */
export async function removeBackgroundFromFabricImage(fabricImageObj, quality = "medium") {
  if (!fabricImageObj || fabricImageObj.type !== "image") {
    throw new Error("removeBackground: argument must be a fabric Image object");
  }

  // Get the source URL from the Fabric image
  const src =
    fabricImageObj.getSrc?.() ??
    fabricImageObj._element?.src ??
    fabricImageObj._originalElement?.src ??
    "";

  if (!src) {
    throw new Error("removeBackground: could not resolve image src");
  }

  // Dynamically import to avoid loading WASM at startup
  const { removeBackground } = await import("@imgly/background-removal");

  // Convert to Blob to avoid re-fetch issues with blob:// / data: URLs
  const inputBlob = await srcToBlob(src);

  // Run inference — publicPath points to CDN so WASM loads correctly
  const model = QUALITY_MODELS[quality] || "medium";
  const resultBlob = await removeBackground(inputBlob, {
    publicPath: IMGLY_CDN,
    model,
    device: "gpu",
    output: {
      format: "image/png",
      quality: 0.9,
    },
  });

  return URL.createObjectURL(resultBlob);
}
