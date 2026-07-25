export type BoundingBox = { xMin: number; yMin: number; xMax: number; yMax: number };
export type CropResult = { crop: BoundingBox | null };

const PADDING_RATIO = 0.08;
const MIN_AREA_RATIO = 0.002; // below this fraction of page area, treat as degenerate
const MAX_AREA_RATIO = 0.92; // above this fraction of page area, just use the whole page

function isValidBox(box: BoundingBox): boolean {
  return (
    Number.isFinite(box.xMin) &&
    Number.isFinite(box.yMin) &&
    Number.isFinite(box.xMax) &&
    Number.isFinite(box.yMax) &&
    box.xMax > box.xMin &&
    box.yMax > box.yMin
  );
}

export function resolveDiagramCrop(
  box: BoundingBox | null,
  pageWidth: number,
  pageHeight: number
): CropResult {
  if (!Number.isFinite(pageWidth) || !Number.isFinite(pageHeight) || pageWidth <= 0 || pageHeight <= 0) return { crop: null };
  if (!box || !isValidBox(box)) return { crop: null };

  const boxWidth = box.xMax - box.xMin;
  const boxHeight = box.yMax - box.yMin;
  const areaRatio = (boxWidth * boxHeight) / (pageWidth * pageHeight);

  if (areaRatio < MIN_AREA_RATIO || areaRatio > MAX_AREA_RATIO) {
    return { crop: null };
  }

  const xPadding = boxWidth * PADDING_RATIO;
  const yPadding = boxHeight * PADDING_RATIO;

  return {
    crop: {
      xMin: Math.max(0, box.xMin - xPadding),
      yMin: Math.max(0, box.yMin - yPadding),
      xMax: Math.min(pageWidth, box.xMax + xPadding),
      yMax: Math.min(pageHeight, box.yMax + yPadding),
    },
  };
}

export function extractJson<T>(raw: string, shape: "array" | "object"): T {
  const pattern = shape === "array" ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const match = raw.match(pattern);
  if (!match) {
    throw new Error(
      `Could not find a JSON ${shape} in the model response`
    );
  }
  return JSON.parse(match[0]) as T;
}
