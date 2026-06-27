import modelData from "../openrouter-models-2026.json";
import { ModelDetailClient } from "@/components/models/detail/ModelDetailClient";
import type { OpenRouterModelData } from "@/types/model";
import { getProviderId } from "@/lib/model-utils";
import { use } from "react";

export async function generateStaticParams() {
  const models = modelData as OpenRouterModelData[];
  return models.map((m) => ({ id: m.id }));
}

export default function ModelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const modelId = decodeURIComponent(id);
  const model =
    (modelData as OpenRouterModelData[]).find((m) => m.id === modelId) ?? null;
  const providerId = model ? getProviderId(model.id) : null;

  return <ModelDetailClient model={model} providerId={providerId} />;
}
