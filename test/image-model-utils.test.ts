import { ServiceProvider } from "../app/constant";
import {
  getModelSizes,
  isImageGenerationModel,
  supportsCustomSize,
} from "../app/utils";

describe("image generation model helpers", () => {
  test("treats Image provider models as image generation models", () => {
    expect(isImageGenerationModel("gpt-image-1", ServiceProvider.Image)).toBe(
      true,
    );
  });

  test("treats dalle and cogview models as image generation models", () => {
    expect(isImageGenerationModel("dall-e-3", ServiceProvider.OpenAI)).toBe(
      true,
    );
    expect(isImageGenerationModel("cogview-3", ServiceProvider.ChatGLM)).toBe(
      true,
    );
  });

  test("does not treat normal chat models as image generation models", () => {
    expect(isImageGenerationModel("gpt-4o-mini", ServiceProvider.OpenAI)).toBe(
      false,
    );
  });

  test("returns image sizes for image generation models", () => {
    expect(getModelSizes("gpt-image-1", ServiceProvider.Image)).toEqual([
      "1024x1024",
      "1792x1024",
      "1024x1792",
    ]);
    expect(supportsCustomSize("gpt-image-1", ServiceProvider.Image)).toBe(
      true,
    );
  });
});
