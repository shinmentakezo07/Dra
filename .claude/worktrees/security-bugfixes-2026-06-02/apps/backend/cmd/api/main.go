package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"dra-platform/backend/internal/config"
	"dra-platform/backend/internal/db"
	"dra-platform/backend/internal/pkg/logger"
	"dra-platform/backend/internal/repository"
	appredis "dra-platform/backend/internal/redis"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "config load failed: %v\n", err)
		os.Exit(1)
	}

	if cfg.IsDevelopment() {
		logger.SetLevel(slog.LevelDebug)
	}
	logger.Info("starting server", "env", cfg.Env, "port", cfg.Port)

	database, err := db.NewFromConfig(cfg)
	if err != nil {
		logger.Error("database connection failed", "error", err.Error())
		os.Exit(1)
	}
	defer database.Close()

	ctx := context.Background()
	if err := db.AutoMigrate(ctx, database); err != nil {
		logger.Error("auto_migrate_failed", "error", err.Error())
		os.Exit(1)
	}
	if err := db.AutoSeed(ctx, database); err != nil {
		logger.Error("auto_seed_failed", "error", err.Error())
		os.Exit(1)
	}

	// Redis
	var redisClient redis.Cmdable
	if cfg.RedisURL != "" {
		c, err := appredis.New(cfg.RedisURL)
		if err != nil {
			logger.Error("redis_connection_failed", "error", err.Error())
		} else {
			redisClient = c.Client
			logger.Info("redis_connected", "url", cfg.RedisURL)
		}
	}

	// Wire services and handler
	h, _, _, _ := initServices(ctx, cfg, database, redisClient)

	// Router
	r := chi.NewRouter()
	adminUserRepo := repository.NewAdminUserRepo(database)
	registerRoutes(r, h, cfg, database, redisClient, h.UserService(), adminUserRepo)

	// Metrics server
	if cfg.EnableMetrics {
		go func() {
			mux := http.NewServeMux()
			mux.Handle("/metrics", promhttp.Handler())
			addr := ":" + cfg.MetricsPort
			logger.Info("metrics server starting", "addr", addr)
			handler := cors.Handler(cors.Options{
				AllowedOrigins:   cfg.AllowedOrigins,
				AllowedMethods:   []string{"GET", "OPTIONS"},
				AllowedHeaders:   []string{"Accept", "Authorization"},
				AllowCredentials: true,
				MaxAge:           300,
			})(mux)
			if err := http.ListenAndServe(addr, handler); err != nil {
				logger.Error("metrics server failed", "error", err.Error())
			}
		}()
	}

	// Main server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 120 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	idleConnsClosed := make(chan struct{})
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
		sig := <-sigCh
		logger.Info("shutdown signal received", "signal", sig.String())

		shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
		defer cancel()

		if err := srv.Shutdown(shutdownCtx); err != nil {
			logger.Error("server shutdown error", "error", err.Error())
		}
		close(idleConnsClosed)
	}()

	logger.Info("server listening", "addr", srv.Addr)
	if err := srv.ListenAndServe(); err != http.ErrServerClosed {
		logger.Error("server failed", "error", err.Error())
		os.Exit(1)
	}

	<-idleConnsClosed
	logger.Info("server stopped gracefully")
}
