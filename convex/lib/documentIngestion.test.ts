import { resolveDiagramCrop, extractJson } from "./documentIngestion";

describe("resolveDiagramCrop", () => {
  const pageWidth = 1000;
  const pageHeight = 1400;

  it("pads a valid, reasonably-sized box by ~8%", () => {
    const box = { xMin: 100, yMin: 100, xMax: 300, yMax: 300 }; // 200x200, 4% of page area
    const result = resolveDiagramCrop(box, pageWidth, pageHeight);
    expect(result.crop).not.toBeNull();
    const padding = 200 * 0.08; // 8% of the box's width
    expect(result.crop!.xMin).toBeCloseTo(100 - padding, 0);
    expect(result.crop!.xMax).toBeCloseTo(300 + padding, 0);
  });

  it("clamps the padded box to page bounds", () => {
    const box = { xMin: 5, yMin: 5, xMax: 995, yMax: 200 };
    const result = resolveDiagramCrop(box, pageWidth, pageHeight);
    expect(result.crop!.xMin).toBeGreaterThanOrEqual(0);
    expect(result.crop!.xMax).toBeLessThanOrEqual(pageWidth);
  });

  it("falls back to the whole page when the box is degenerate (near-zero area)", () => {
    const box = { xMin: 500, yMin: 500, xMax: 501, yMax: 500.5 };
    const result = resolveDiagramCrop(box, pageWidth, pageHeight);
    expect(result.crop).toBeNull();
  });

  it("falls back to the whole page when the box covers almost the entire page", () => {
    const box = { xMin: 5, yMin: 5, xMax: 995, yMax: 1395 }; // ~99% of page area
    const result = resolveDiagramCrop(box, pageWidth, pageHeight);
    expect(result.crop).toBeNull();
  });

  it("falls back to the whole page when the box is null", () => {
    const result = resolveDiagramCrop(null, pageWidth, pageHeight);
    expect(result.crop).toBeNull();
  });

  it("falls back to the whole page when the box has invalid coordinates (xMax < xMin)", () => {
    const box = { xMin: 300, yMin: 100, xMax: 100, yMax: 300 };
    const result = resolveDiagramCrop(box, pageWidth, pageHeight);
    expect(result.crop).toBeNull();
  });

  it("falls back to the whole page when page dimensions are negative", () => {
    const box = { xMin: 100, yMin: 100, xMax: 300, yMax: 300 };
    const result = resolveDiagramCrop(box, -1000, -1400);
    expect(result.crop).toBeNull();
  });

  it("falls back to the whole page when page dimensions are NaN", () => {
    const box = { xMin: 100, yMin: 100, xMax: 300, yMax: 300 };
    const result = resolveDiagramCrop(box, NaN, 1400);
    expect(result.crop).toBeNull();
  });
});

describe("extractJson", () => {
  it("extracts a JSON array from surrounding prose", () => {
    const raw = 'Here is the output:\n[{"question": "What is a PK?"}]\nDone.';
    const result = extractJson<{ question: string }[]>(raw, "array");
    expect(result).toEqual([{ question: "What is a PK?" }]);
  });

  it("extracts a JSON object from surrounding prose", () => {
    const raw = 'Sure!\n{"title": "Chapter 1", "text": "Notes here"}\nEnjoy.';
    const result = extractJson<{ title: string; text: string }>(raw, "object");
    expect(result).toEqual({ title: "Chapter 1", text: "Notes here" });
  });

  it("throws a descriptive error when no array is found for shape=array", () => {
    expect(() => extractJson("no json here", "array")).toThrow(
      "Could not find a JSON array in the model response"
    );
  });

  it("throws a descriptive error when no object is found for shape=object", () => {
    expect(() => extractJson("no json here", "object")).toThrow(
      "Could not find a JSON object in the model response"
    );
  });

  it("throws when the matched text is not valid JSON", () => {
    expect(() => extractJson("[not valid json]", "array")).toThrow();
  });
});
