
import { ModelsExplorer } from "@/components/models/ModelsExplorer";

export const metadata = {
    title: "Model Registry — Yapapa",
    description: "Browse 100+ AI models with transparent per-token pricing. Compare capabilities, context windows, and costs.",
};

export default function ModelsPage() {
    return (
        <div className="flex flex-col items-center w-full overflow-hidden bg-[#000000] text-foreground selection:bg-primary/30 selection:text-white">
            <ModelsExplorer />
        </div>
    );
}
