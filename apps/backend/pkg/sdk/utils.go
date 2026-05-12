package sdk

import (
	"encoding/json"
	"io"
)

type envelope struct {
	Success   bool            `json:"success"`
	Data      json.RawMessage `json:"data,omitempty"`
	Error     string          `json:"error,omitempty"`
	Meta      *PaginatedMeta  `json:"meta,omitempty"`
	RequestID string          `json:"requestId,omitempty"`
}

type PaginatedMeta struct {
	Total      int `json:"total"`
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	TotalPages int `json:"totalPages"`
}

func unmarshalData(raw json.RawMessage, v interface{}) error {
	if len(raw) == 0 {
		return nil
	}
	return json.Unmarshal(raw, v)
}

func paginatedResult[T any](e *envelope) (*PaginatedResult[T], error) {
	var items []T
	if err := unmarshalData(e.Data, &items); err != nil {
		return nil, err
	}
	pr := &PaginatedResult[T]{
		Data: items,
		Page: 1,
		Limit: 20,
	}
	if e.Meta != nil {
		pr.Total = e.Meta.Total
		pr.Page = e.Meta.Page
		pr.Limit = e.Meta.Limit
		pr.TotalPages = e.Meta.TotalPages
	}
	return pr, nil
}

// ReadSSE reads server-sent events from a reader and yields data lines.
func ReadSSE(r io.Reader, yield func(string) bool) {
	buf := make([]byte, 4096)
	var line []byte
	for {
		n, err := r.Read(buf)
		if n > 0 {
			for i := 0; i < n; i++ {
				b := buf[i]
				if b == '\n' {
					if len(line) > 0 {
						if !yield(string(line)) {
							return
						}
					}
					line = line[:0]
				} else if b != '\r' {
					line = append(line, b)
				}
			}
		}
		if err != nil {
			if len(line) > 0 {
				yield(string(line))
			}
			return
		}
	}
}
