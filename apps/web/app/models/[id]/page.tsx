import modelData from "../openrouter-models-2026.json";
import { ModelDetailClient } from "@/components/models/detail/ModelDetailClient";
import type { OpenRouterModelData } from "@/types/model";
import { getProviderId } from "@/lib/model-utils";

export async function generateStaticParams() {
    const models = modelData as OpenRouterModelData[];
    return models.map((m) => ({ id: m.id }));
}

export default function ModelDetailPage({ params }: { params: { id: string } }) {
    const modelId = decodeURIComponent(params.id);
    const model = (modelData as OpenRouterModelData[]).find((m) => m.id === modelId) ?? null;
    const providerId = model ? getProviderId(model.id) : null;

    return <ModelDetailClient model={model} providerId={providerId} />;
}
