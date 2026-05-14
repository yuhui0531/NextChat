"use client";

import { getClientConfig } from "@/app/config/client";
import {
  ApiPath,
  IMAGE_BASE_URL,
  OpenaiPath,
  REQUEST_TIMEOUT_MS,
  ServiceProvider,
} from "@/app/constant";
import {
  ChatOptions,
  getBearerToken,
  LLMApi,
  LLMModel,
  LLMUsage,
  SpeechOptions,
} from "../api";
import { base64Image2Blob, uploadImage } from "@/app/utils/chat";
import { fetch } from "@/app/utils/stream";
import { getMessageTextContent } from "@/app/utils";
import { useAccessStore } from "@/app/store";
import { cloudflareAIGatewayUrl } from "@/app/utils/cloudflare";
import { DalleRequestPayload, OpenAIListModelResponse } from "./openai";

export class ImageApi implements LLMApi {
  path(path: string): string {
    const accessStore = useAccessStore.getState();
    let baseUrl = "";

    if (accessStore.useCustomConfig) {
      baseUrl = accessStore.imageUrl;
    }

    if (baseUrl.length === 0) {
      const isApp = !!getClientConfig()?.isApp;
      baseUrl = isApp ? IMAGE_BASE_URL : ApiPath.OpenAI;
    }

    if (baseUrl.endsWith("/")) {
      baseUrl = baseUrl.slice(0, baseUrl.length - 1);
    }

    if (!baseUrl.startsWith("http") && !baseUrl.startsWith(ApiPath.OpenAI)) {
      baseUrl = "https://" + baseUrl;
    }

    return cloudflareAIGatewayUrl([baseUrl, path].join("/"));
  }

  private getHeaders() {
    const apiKey = useAccessStore.getState().imageApiKey;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    const bearerToken = getBearerToken(apiKey);
    if (bearerToken) {
      headers.Authorization = bearerToken;
    }
    return headers;
  }

  async extractMessage(res: any) {
    if (res.error) {
      return "```\n" + JSON.stringify(res, null, 4) + "\n```";
    }

    const images = await Promise.all(
      (res.data ?? []).map(
        async (item: { url?: string; b64_json?: string }) => {
          let url = item?.url ?? "";
          if (!url && item?.b64_json) {
            url = await uploadImage(
              base64Image2Blob(item.b64_json, "image/png"),
            );
          }
          return url;
        },
      ),
    );

    return images.filter(Boolean).map((url) => ({
      type: "image_url" as const,
      image_url: { url },
    }));
  }

  speech(_options: SpeechOptions): Promise<ArrayBuffer> {
    throw new Error("Method not implemented.");
  }

  async chat(options: ChatOptions): Promise<void> {
    const prompt = getMessageTextContent(
      options.messages.slice(-1)?.pop() as any,
    );
    const requestPayload: DalleRequestPayload = {
      model: options.config.model,
      prompt,
      response_format: "b64_json",
      n: 1,
      size: options.config?.size ?? "1024x1024",
      quality: options.config?.quality ?? "standard",
      style: options.config?.style ?? "vivid",
    };

    const controller = new AbortController();
    options.onController?.(controller);

    try {
      const res = await fetch(this.path(OpenaiPath.ImagePath), {
        method: "POST",
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        headers: this.getHeaders(),
      });

      const requestTimeoutId = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
      );
      const resJson = await res.json();
      clearTimeout(requestTimeoutId);
      const message = await this.extractMessage(resJson);
      options.onFinish(message as any, res);
    } catch (e) {
      options.onError?.(e as Error);
    }
  }

  async usage(): Promise<LLMUsage> {
    return { used: 0, total: 0 };
  }

  async models(): Promise<LLMModel[]> {
    const res = await fetch(this.path(OpenaiPath.ListModelPath), {
      method: "GET",
      headers: this.getHeaders(),
    });

    const resJson = (await res.json()) as OpenAIListModelResponse;
    let seq = 1000;

    return (resJson.data ?? []).map((m) => ({
      name: m.id,
      available: true,
      sorted: seq++,
      provider: {
        id: "image",
        providerName: ServiceProvider.Image,
        providerType: "image",
        sorted: 2,
      },
    }));
  }
}
