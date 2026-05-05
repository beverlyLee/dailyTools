package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"monitoring-probes/config"
	"monitoring-probes/pkg/blackbox"
	"monitoring-probes/pkg/exporter"
	prom "monitoring-probes/pkg/prometheus"

	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("加载配置失败: %s", err)
	}

	promCollector := prom.NewCollector(cfg.Prometheus)
	customExporter := exporter.NewCustomExporter(cfg.Exporter)
	blackboxProber := blackbox.NewProber(cfg.Blackbox)

	promCollector.Register()
	customExporter.Register()

	go promCollector.StartCollection()
	go customExporter.StartCollection()
	go blackboxProber.StartProbing()

	mux := http.NewServeMux()
	mux.Handle("/metrics", promhttp.Handler())
	mux.Handle("/health", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("healthy"))
	}))
	mux.Handle("/probe", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		target := r.URL.Query().Get("target")
		module := r.URL.Query().Get("module")
		if target == "" {
			http.Error(w, "missing target parameter", http.StatusBadRequest)
			return
		}
		if module == "" {
			module = "http_2xx"
		}
		result := blackboxProber.Probe(target, module)
		w.Header().Set("Content-Type", "application/json")
		w.Write(result)
	}))

	srv := &http.Server{
		Addr:    ":" + cfg.Server.Port,
		Handler: mux,
	}

	go func() {
		log.Printf("监控探针服务启动，监听端口: %s", srv.Addr)
		log.Printf("Prometheus 指标端点: http://localhost:%s/metrics", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("服务器启动失败: %s", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("正在关闭服务器...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("服务器强制关闭:", err)
	}

	promCollector.Stop()
	customExporter.Stop()
	blackboxProber.Stop()

	log.Println("服务器已关闭")
}
