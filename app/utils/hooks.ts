import { useMemo } from "react";
import { ServiceProvider } from "../constant";
import { useAccessStore, useAppConfig } from "../store";
import { collectModelsWithDefaultModel } from "./model";

export function useAllModels() {
  const accessStore = useAccessStore();
  const configStore = useAppConfig();
  const models = useMemo(() => {
    const customModels = [configStore.customModels, accessStore.customModels]
      .filter(Boolean)
      .join(",");
    // 默认禁用所有内置模型，仅显示用户自定义模型；如果用户显式写了 +all，则尊重之
    const effectiveCustomModels = /(^|,)\s*\+?all\s*(,|$)/.test(customModels)
      ? customModels
      : ["-all", customModels].filter(Boolean).join(",");
    return collectModelsWithDefaultModel(
      configStore.models,
      effectiveCustomModels,
      accessStore.defaultModel,
    ).filter((model) => model.provider?.providerName !== ServiceProvider.Image);
  }, [
    accessStore.customModels,
    accessStore.defaultModel,
    configStore.customModels,
    configStore.models,
  ]);

  return models;
}

export function useImageModels() {
  const accessStore = useAccessStore();
  const configStore = useAppConfig();
  const models = useMemo(() => {
    const configuredImageModels = accessStore.imageCustomModels
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => (item.includes("@") ? item : `${item}@Image`))
      .join(",");

    return collectModelsWithDefaultModel(
      configStore.models.filter(
        (model) => model.provider?.providerName === ServiceProvider.Image,
      ),
      configuredImageModels,
      "",
    ).filter((model) => model.available);
  }, [accessStore.imageCustomModels, configStore.models]);

  return models;
}
