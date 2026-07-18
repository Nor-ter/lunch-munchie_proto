import { describe, expect, it } from "vitest";
import {
  getContainedImageBounds,
  getCropViewportImageBounds,
  updateCropArea,
} from "./imageUtils";

describe("getContainedImageBounds", () => {
  it("가로 사진을 stage 가운데에 맞춘다", () => {
    expect(
      getContainedImageBounds(
        { width: 1200, height: 600 },
        { width: 400, height: 400 },
      ),
    ).toEqual({
      x: 0,
      y: 100,
      width: 400,
      height: 200,
    });
  });

  it("세로 사진을 stage 가운데에 맞춘다", () => {
    expect(
      getContainedImageBounds(
        { width: 600, height: 1200 },
        { width: 400, height: 300 },
      ),
    ).toEqual({
      x: 125,
      y: 0,
      width: 150,
      height: 300,
    });
  });
});

describe("updateCropArea", () => {
  const crop = { x: 0.1, y: 0.2, width: 0.6, height: 0.5 };
  const minimum = { width: 0.1, height: 0.1 };

  it("crop 박스를 이미지 경계 안에서 이동한다", () => {
    expect(updateCropArea(crop, "move", { x: 0.5, y: -0.5 }, minimum)).toEqual({
      x: 0.4,
      y: 0,
      width: 0.6,
      height: 0.5,
    });
  });

  it("오른쪽 아래 핸들로 가로세로 비율을 자유롭게 바꾼다", () => {
    const result = updateCropArea(crop, "se", { x: 0.2, y: 0.1 }, minimum);
    expect(result.x).toBeCloseTo(0.1);
    expect(result.y).toBeCloseTo(0.2);
    expect(result.width).toBeCloseTo(0.8);
    expect(result.height).toBeCloseTo(0.6);
  });

  it("왼쪽 위 핸들을 움직여도 반대편 모서리를 고정한다", () => {
    const result = updateCropArea(crop, "nw", { x: 0.2, y: 0.1 }, minimum);
    expect(result.x).toBeCloseTo(0.3);
    expect(result.y).toBeCloseTo(0.3);
    expect(result.width).toBeCloseTo(0.4);
    expect(result.height).toBeCloseTo(0.4);
  });

  it("최소 크기보다 작아지지 않게 제한한다", () => {
    const result = updateCropArea(crop, "w", { x: 1, y: 0 }, minimum);
    expect(result.x).toBeCloseTo(0.6);
    expect(result.y).toBeCloseTo(0.2);
    expect(result.width).toBeCloseTo(0.1);
    expect(result.height).toBeCloseTo(0.5);
  });
});

describe("getCropViewportImageBounds", () => {
  it("원본 전체를 여백 안에 맞춰 보여준다", () => {
    expect(
      getCropViewportImageBounds(
        { width: 1200, height: 600 },
        { width: 400, height: 400 },
        { x: 0, y: 0, width: 1, height: 1 },
        20,
      ),
    ).toEqual({
      x: 20,
      y: 110,
      width: 360,
      height: 180,
    });
  });

  it("선택 영역을 중앙으로 확대하면서 원본 좌표를 유지한다", () => {
    expect(
      getCropViewportImageBounds(
        { width: 1200, height: 600 },
        { width: 400, height: 400 },
        { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
        20,
      ),
    ).toEqual({
      x: -160,
      y: 20,
      width: 720,
      height: 360,
    });
  });
});
