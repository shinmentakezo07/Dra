"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, DollarSign, Clock, Database, Code, CheckCircle, Info } from "lucide-react";

interface ModelDetailModalProps {
    model: any;
    isOpen: boolean;
    onClose: () => void;
}

export default function ModelDetailModal({ model, isOpen, onClose }: ModelDetailModalProps) {
    if (!model) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-4xl md:max-h-[90vh] z-50"
                    >
                        <div className="h-full bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="relative p-6 border-b border-white/10 bg-gradient-to-br from-white/5 to-transparent">
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all group"
                                >
                                    <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                                </button>

                                <div className="flex items-start gap-4">
                                    <div className={`w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${model.color || 'text-primary'}`}>
                                        {model.icon ? <model.icon className="w-8 h-8" /> : <Zap className="w-8 h-8" />}
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-bold text-white mb-2">{model.name}</h2>
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="px-2 py-1 rounded bg-primary/20 border border-primary/30 text-primary font-mono font-bold">
                                                {model.id}
                                            </span>
                                            {model.created_date && (
                                                <span className="text-gray-500 font-mono">Released: {model.created_date}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 hero-scroll">
                                {/* Description */}
                                {model.description && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Info className="w-4 h-4 text-primary" />
                                            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">Description</h3>
                                        </div>
                                        <p className="text-gray-400 leading-relaxed">{model.description}</p>
                                    </div>
                                )}

                                {/* Pricing */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <DollarSign className="w-4 h-4 text-primary" />
                                        <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">Pricing</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                            <div className="text-xs text-gray-500 font-mono mb-1">Input (per 1M tokens)</div>
                                            <div className="text-2xl font-bold text-emerald-400 font-mono">
                                                ${model.pricing?.prompt ? (parseFloat(model.pricing.prompt) * 1000000).toFixed(2) : '0.00'}
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                            <div className="text-xs text-gray-500 font-mono mb-1">Output (per 1M tokens)</div>
                                            <div className="text-2xl font-bold text-cyan-400 font-mono">
                                                ${model.pricing?.completion ? (parseFloat(model.pricing.completion) * 1000000).toFixed(2) : '0.00'}
                                            </div>
                                        </div>
                                        {model.pricing?.input_cache_read && (
                                            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                                <div className="text-xs text-gray-500 font-mono mb-1">Cache Read (per 1M tokens)</div>
                                                <div className="text-2xl font-bold text-blue-400 font-mono">
                                                    ${(parseFloat(model.pricing.input_cache_read) * 1000000).toFixed(2)}
                                                </div>
                                            </div>
                                        )}
                                        {model.pricing?.input_cache_write && (
                                            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                                <div className="text-xs text-gray-500 font-mono mb-1">Cache Write (per 1M tokens)</div>
                                                <div className="text-2xl font-bold text-purple-400 font-mono">
                                                    ${(parseFloat(model.pricing.input_cache_write) * 1000000).toFixed(2)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Capabilities */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Database className="w-4 h-4 text-primary" />
                                        <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">Capabilities</h3>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                            <div className="text-xs text-gray-500 font-mono mb-1">Context Length</div>
                                            <div className="text-lg font-bold text-white font-mono">
                                                {model.context_length ? (model.context_length / 1000).toFixed(0) + 'K' : 'N/A'}
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                            <div className="text-xs text-gray-500 font-mono mb-1">Max Output</div>
                                            <div className="text-lg font-bold text-white font-mono">
                                                {model.top_provider?.max_completion_tokens ? (model.top_provider.max_completion_tokens / 1000).toFixed(0) + 'K' : 'N/A'}
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                            <div className="text-xs text-gray-500 font-mono mb-1">Modality</div>
                                            <div className="text-lg font-bold text-white font-mono">
                                                {model.architecture?.modality || 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Supported Parameters */}
                                {model.supported_parameters && model.supported_parameters.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Code className="w-4 h-4 text-primary" />
                                            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">Supported Parameters</h3>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {model.supported_parameters.map((param: string) => (
                                                <span
                                                    key={param}
                                                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-gray-300"
                                                >
                                                    {param}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Knowledge Cutoff */}
                                {model.knowledge_cutoff && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Clock className="w-4 h-4 text-primary" />
                                            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">Knowledge Cutoff</h3>
                                        </div>
                                        <p className="text-gray-400 font-mono">{model.knowledge_cutoff}</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-white/10 bg-gradient-to-br from-transparent to-white/5">
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 rounded-lg bg-primary hover:bg-primary/90 text-black font-mono font-bold transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
