# DRA Platform Go SDK

Official Go client for the DRA Platform API.

## Installation

```go
import "dra-platform/backend/pkg/sdk"
```

## Usage

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "dra-platform/backend/pkg/sdk"
)

func main() {
    client := sdk.New(
        sdk.WithBaseURL("http://localhost:8080"),
        sdk.WithAPIKey("dra_your_api_key"),
        sdk.WithTimeout(30*time.Second),
        sdk.WithRetries(2),
    )

    // Health check
    health, err := client.Health(context.Background())
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println("Status:", health.Status)

    // Login
    auth, err := client.Login(context.Background(), "user@example.com", "password")
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println("Token:", auth.Token)

    // List models
    models, err := client.ListModels(context.Background())
    if err != nil {
        log.Fatal(err)
    }
    for _, m := range models {
        fmt.Println(m.ID, m.Name)
    }

    // Streaming chat
    contentCh, errCh := client.ChatStream(context.Background(), "nvidia/qwen3-coder-480b", []sdk.ChatMessage{
        {Role: "user", Content: "Hello!"},
    })

    for content := range contentCh {
        fmt.Print(content)
    }
    if err := <-errCh; err != nil {
        log.Fatal(err)
    }
}
```

## Error Handling

```go
_, err := client.Me(context.Background())
if apiErr, ok := err.(*sdk.APIError); ok {
    switch apiErr.Code {
    case sdk.ErrUnauthorized:
        // Handle 401
    case sdk.ErrRateLimited:
        // Handle 429
    case sdk.ErrPaymentRequired:
        // Handle 402
    }
}
```

## Features

- Authentication via API key or JWT session cookie
- Automatic retries with exponential backoff
- Request timeouts
- Streaming chat support
- Pagination helpers
- Comprehensive error types
