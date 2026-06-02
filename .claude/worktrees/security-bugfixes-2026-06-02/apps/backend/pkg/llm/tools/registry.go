package tools

import (
	"context"
	"encoding/json"
	"sort"
	"sync"

	"dra-platform/backend/pkg/llm"
)

// ToolHandler is the function signature for executing a tool.
type ToolHandler func(ctx context.Context, arguments json.RawMessage) (interface{}, error)

// ToolMetadata describes a registered tool.
type ToolMetadata struct {
	Name        string
	Description string
	Parameters  json.RawMessage
}

// Tool is a registered tool with metadata and a handler.
type Tool struct {
	Metadata ToolMetadata
	Handler  ToolHandler
}

// Registry manages tool registration and lookup.
type Registry struct {
	mu    sync.RWMutex
	tools map[string]Tool
}

// NewRegistry creates a new tool registry.
func NewRegistry() *Registry {
	return &Registry{
		tools: make(map[string]Tool),
	}
}

// Register adds a tool to the registry. Overwrites if the name already exists.
func (r *Registry) Register(tool Tool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.tools[tool.Metadata.Name] = tool
}

// Get retrieves a tool by name.
func (r *Registry) Get(name string) (Tool, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	t, ok := r.tools[name]
	return t, ok
}

// Exists reports whether a tool with the given name is registered.
func (r *Registry) Exists(name string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	_, ok := r.tools[name]
	return ok
}

// Remove deletes a tool from the registry.
func (r *Registry) Remove(name string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.tools, name)
}

// List returns all registered tools sorted by name.
func (r *Registry) List() []Tool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]Tool, 0, len(r.tools))
	for _, t := range r.tools {
		result = append(result, t)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Metadata.Name < result[j].Metadata.Name
	})

	return result
}

// Len returns the number of registered tools.
func (r *Registry) Len() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.tools)
}

// ToToolDefinitions converts all registered tools to llm.ToolDefinition format.
func (r *Registry) ToToolDefinitions() []llm.ToolDefinition {
	tools := r.List()
	defs := make([]llm.ToolDefinition, len(tools))
	for i, t := range tools {
		defs[i] = llm.ToolDefinition{
			Type: "function",
			Function: llm.ToolFunction{
				Name:        t.Metadata.Name,
				Description: t.Metadata.Description,
				Parameters:  t.Metadata.Parameters,
			},
		}
	}
	return defs
}
