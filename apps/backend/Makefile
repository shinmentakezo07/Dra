.PHONY: build run dev test test-race test-integration test-unit test-coverage coverage-html vet fmt clean docker lint

export PATH := $(HOME)/.local/go/bin:$(PATH)

build:
	go build -o api ./cmd/api

dev:
	go run ./cmd/api

run: build
	./api

test:
	go test -race -cover ./...

test-race:
	go test -race -v ./...

test-unit:
	go test -v -short ./...

test-integration:
	@if [ -z "$(TEST_DATABASE_URL)" ]; then \
		echo "TEST_DATABASE_URL not set. Integration tests skipped."; \
		echo "Set it with: export TEST_DATABASE_URL=postgresql://..."; \
		exit 0; \
	fi
	go test -v -race ./internal/handler/... ./tests/integration/...

test-coverage:
	go test -race -coverprofile=coverage.out ./...
	go tool cover -func=coverage.out
	@echo ""
	@echo "HTML report: go tool cover -html=coverage.out"

coverage-html: test-coverage
	go tool cover -html=coverage.out -o coverage.html

vet:
	go vet ./...

lint: vet
	@if command -v staticcheck >/dev/null 2>&1; then \
		staticcheck ./...; \
	else \
		echo "staticcheck not installed. Run: go install honnef.co/go/tools/cmd/staticcheck@latest"; \
	fi

fmt:
	go fmt ./...
	@if command -v goimports >/dev/null 2>&1; then \
		goimports -w .; \
	fi

clean:
	rm -f api coverage.out coverage.html

docker:
	docker build -t dra-backend .
