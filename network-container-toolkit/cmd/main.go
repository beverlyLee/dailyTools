package main

import (
	"log"
	"os"

	"network-container-toolkit/pkg/dnsserver"
	"network-container-toolkit/pkg/imageanalyzer"
	"network-container-toolkit/pkg/webui"

	"github.com/spf13/cobra"
)

func main() {
	var rootCmd = &cobra.Command{
		Use:   "nct",
		Short: "Network & Container Toolkit",
		Long:  `A comprehensive toolkit for container image optimization and DNS management`,
	}

	rootCmd.AddCommand(imageAnalyzerCommand())
	rootCmd.AddCommand(dnsServerCommand())

	if err := rootCmd.Execute(); err != nil {
		log.Fatal(err)
		os.Exit(1)
	}
}

func imageAnalyzerCommand() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "analyze [image]",
		Short: "Analyze container images for optimization opportunities",
		Long:  `Analyze Docker images to identify redundant files, duplicate files, and optimization opportunities`,
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			imageName := args[0]
			report, err := imageanalyzer.AnalyzeImage(imageName)
			if err != nil {
				log.Fatalf("Failed to analyze image: %v", err)
			}
			
			imageanalyzer.PrintReport(report)
		},
	}
	
	cmd.Flags().StringP("output", "o", "", "Output report to file")
	return cmd
}

func dnsServerCommand() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "dns",
		Short: "Start local DNS server",
		Long:  `Start a local DNS server with recursive query, caching, and optional DoT/DoH support`,
		Run: func(cmd *cobra.Command, args []string) {
			config := &dnsserver.DNSConfig{
				Port:      53,
				EnableTLS: true,
				EnableHTTPS: true,
				HostsFile: "/etc/hosts",
			}
			
			server := dnsserver.NewServer(config)
			
			// Start web UI
			go func() {
				webui.Start(":8080", server)
			}()
			
			log.Println("Starting DNS server on port 53...")
			if err := server.Start(); err != nil {
				log.Fatalf("Failed to start DNS server: %v", err)
			}
		},
	}
	
	cmd.Flags().IntP("port", "p", 53, "DNS server port")
	cmd.Flags().BoolP("dot", "t", true, "Enable DNS over TLS")
	cmd.Flags().BoolP("doh", "H", true, "Enable DNS over HTTPS")
	cmd.Flags().StringP("hosts", "f", "/etc/hosts", "Hosts file path")
	return cmd
}