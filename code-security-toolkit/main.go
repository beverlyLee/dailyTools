package main

import (
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"code-security-toolkit/internal/cert"
	"code-security-toolkit/internal/complexity"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := os.Args[1]

	switch command {
	case "complexity":
		handleComplexityCommand()
	case "cert":
		handleCertCommand()
	default:
		fmt.Printf("Unknown command: %s\n", command)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("Code Security Toolkit")
	fmt.Println("Usage: code-security-toolkit <command> [options]")
	fmt.Println()
	fmt.Println("Commands:")
	fmt.Println("  complexity  Analyze code complexity")
	fmt.Println("  cert        Generate SSL certificates")
	fmt.Println()
	fmt.Println("Use 'code-security-toolkit <command> -h' for more information about a command.")
}

func handleComplexityCommand() {
	fs := flag.NewFlagSet("complexity", flag.ExitOnError)

	var (
		targetPath    string
		outputFormat  string
		outputPath    string
		ccThreshold   int
		cogThreshold  int
		ignorePattern string
	)

	fs.StringVar(&targetPath, "path", ".", "Target directory or file to analyze")
	fs.StringVar(&outputFormat, "format", "json", "Output format: json or html")
	fs.StringVar(&outputPath, "output", "", "Output file path (default: stdout)")
	fs.IntVar(&ccThreshold, "cc-threshold", 10, "Cyclomatic complexity threshold (0 to disable)")
	fs.IntVar(&cogThreshold, "cog-threshold", 15, "Cognitive complexity threshold (0 to disable)")
	fs.StringVar(&ignorePattern, "ignore", "", "Comma-separated ignore patterns (regex)")

	fs.Parse(os.Args[2:])

	var ignorePatterns []string
	if ignorePattern != "" {
		ignorePatterns = strings.Split(ignorePattern, ",")
		for i, p := range ignorePatterns {
			ignorePatterns[i] = strings.TrimSpace(p)
		}
	}

	config := complexity.Config{
		CyclomaticThreshold: ccThreshold,
		CognitiveThreshold:  cogThreshold,
		IgnorePatterns:      ignorePatterns,
	}

	analyzer := complexity.NewAnalyzer(config)
	generator := complexity.NewReportGenerator()

	var report *complexity.Report
	var err error

	info, err := os.Stat(targetPath)
	if err != nil {
		fmt.Printf("Error accessing target: %v\n", err)
		os.Exit(1)
	}

	if info.IsDir() {
		report, err = analyzer.AnalyzeDirectory(targetPath)
	} else {
		report, err = analyzer.AnalyzeFile(targetPath)
	}

	if err != nil {
		fmt.Printf("Error analyzing code: %v\n", err)
		os.Exit(1)
	}

	switch strings.ToLower(outputFormat) {
	case "json":
		err = generator.GenerateJSON(report, outputPath)
	case "html":
		err = generator.GenerateHTML(report, outputPath, "")
	default:
		fmt.Printf("Unknown output format: %s\n", outputFormat)
		os.Exit(1)
	}

	if err != nil {
		fmt.Printf("Error generating report: %v\n", err)
		os.Exit(1)
	}

	if report.ThresholdBreached {
		fmt.Println("Warning: Complexity threshold breached!")
		os.Exit(1)
	}
}

func handleCertCommand() {
	if len(os.Args) < 3 {
		printCertUsage()
		os.Exit(1)
	}

	subCommand := os.Args[2]

	switch subCommand {
	case "ca":
		handleCACertCommand()
	case "server":
		handleServerCertCommand()
	case "client":
		handleClientCertCommand()
	default:
		fmt.Printf("Unknown cert subcommand: %s\n", subCommand)
		printCertUsage()
		os.Exit(1)
	}
}

func printCertUsage() {
	fmt.Println("Certificate Generator")
	fmt.Println("Usage: code-security-toolkit cert <subcommand> [options]")
	fmt.Println()
	fmt.Println("Subcommands:")
	fmt.Println("  ca        Generate CA root certificate")
	fmt.Println("  server    Generate server certificate (signed by CA)")
	fmt.Println("  client    Generate client certificate (signed by CA)")
	fmt.Println()
	fmt.Println("Use 'code-security-toolkit cert <subcommand> -h' for more information.")
}

func handleCACertCommand() {
	fs := flag.NewFlagSet("ca", flag.ExitOnError)

	var (
		outputPath  string
		format      string
		password    string
		commonName  string
		organization string
		country     string
		validDays   int
		keyBits     int
	)

	fs.StringVar(&outputPath, "output", "ca", "Output file base path")
	fs.StringVar(&format, "format", "pem", "Output format: pem or pfx")
	fs.StringVar(&password, "password", "", "Password for PFX format")
	fs.StringVar(&commonName, "cn", "Local Root CA", "Common Name")
	fs.StringVar(&organization, "org", "Local CA", "Organization")
	fs.StringVar(&country, "country", "US", "Country code")
	fs.IntVar(&validDays, "days", 3650, "Validity in days")
	fs.IntVar(&keyBits, "bits", 2048, "Key size in bits")

	fs.Parse(os.Args[3:])

	subject := cert.DefaultCASubject()
	subject.CommonName = commonName
	subject.Organization = []string{organization}
	subject.Country = []string{country}

	config := cert.CertConfig{
		Subject:  subject,
		ValidFor: time.Duration(validDays) * 24 * time.Hour,
		KeyBits:  keyBits,
	}

	generator := cert.NewGenerator()
	bundle, err := generator.GenerateCA(config)
	if err != nil {
		fmt.Printf("Error generating CA certificate: %v\n", err)
		os.Exit(1)
	}

	var outputFormat cert.OutputFormat
	switch strings.ToLower(format) {
	case "pem":
		outputFormat = cert.PEMFormat
	case "pfx":
		outputFormat = cert.PFXFormat
	default:
		fmt.Printf("Unknown format: %s\n", format)
		os.Exit(1)
	}

	err = generator.SaveToFile(bundle, outputPath, outputFormat, password)
	if err != nil {
		fmt.Printf("Error saving certificate: %v\n", err)
		os.Exit(1)
	}
}

func handleServerCertCommand() {
	fs := flag.NewFlagSet("server", flag.ExitOnError)

	var (
		outputPath   string
		format       string
		password     string
		commonName   string
		organization string
		country      string
		validDays    int
		keyBits      int
		caCertPath   string
		caKeyPath    string
		dnsNames     string
		ipAddresses  string
	)

	fs.StringVar(&outputPath, "output", "server", "Output file base path")
	fs.StringVar(&format, "format", "pem", "Output format: pem or pfx")
	fs.StringVar(&password, "password", "", "Password for PFX format")
	fs.StringVar(&commonName, "cn", "localhost", "Common Name")
	fs.StringVar(&organization, "org", "Local Server", "Organization")
	fs.StringVar(&country, "country", "US", "Country code")
	fs.IntVar(&validDays, "days", 365, "Validity in days")
	fs.IntVar(&keyBits, "bits", 2048, "Key size in bits")
	fs.StringVar(&caCertPath, "ca-cert", "ca.pem", "CA certificate path")
	fs.StringVar(&caKeyPath, "ca-key", "ca-key.pem", "CA private key path")
	fs.StringVar(&dnsNames, "dns", "", "Comma-separated DNS names (SAN)")
	fs.StringVar(&ipAddresses, "ip", "", "Comma-separated IP addresses (SAN)")

	fs.Parse(os.Args[3:])

	generator := cert.NewGenerator()

	caBundle, err := generator.LoadCAFromFiles(caCertPath, caKeyPath)
	if err != nil {
		fmt.Printf("Error loading CA: %v\n", err)
		os.Exit(1)
	}

	subject := cert.DefaultServerSubject()
	subject.CommonName = commonName
	subject.Organization = []string{organization}
	subject.Country = []string{country}

	var dnsList []string
	if dnsNames != "" {
		dnsList = strings.Split(dnsNames, ",")
		for i, d := range dnsList {
			dnsList[i] = strings.TrimSpace(d)
		}
	}
	dnsList = append(dnsList, commonName)

	var ipList []string
	if ipAddresses != "" {
		ipList = strings.Split(ipAddresses, ",")
		for i, ip := range ipList {
			ipList[i] = strings.TrimSpace(ip)
		}
	}

	config := cert.CertConfig{
		Subject:     subject,
		DNSNames:    dnsList,
		IPAddresses: ipList,
		ValidFor:    time.Duration(validDays) * 24 * time.Hour,
		KeyBits:     keyBits,
	}

	bundle, err := generator.GenerateServerCert(config, caBundle)
	if err != nil {
		fmt.Printf("Error generating server certificate: %v\n", err)
		os.Exit(1)
	}

	var outputFormat cert.OutputFormat
	switch strings.ToLower(format) {
	case "pem":
		outputFormat = cert.PEMFormat
	case "pfx":
		outputFormat = cert.PFXFormat
	default:
		fmt.Printf("Unknown format: %s\n", format)
		os.Exit(1)
	}

	err = generator.SaveToFile(bundle, outputPath, outputFormat, password)
	if err != nil {
		fmt.Printf("Error saving certificate: %v\n", err)
		os.Exit(1)
	}
}

func handleClientCertCommand() {
	fs := flag.NewFlagSet("client", flag.ExitOnError)

	var (
		outputPath   string
		format       string
		password     string
		commonName   string
		organization string
		country      string
		validDays    int
		keyBits      int
		caCertPath   string
		caKeyPath    string
	)

	fs.StringVar(&outputPath, "output", "client", "Output file base path")
	fs.StringVar(&format, "format", "pem", "Output format: pem or pfx")
	fs.StringVar(&password, "password", "", "Password for PFX format")
	fs.StringVar(&commonName, "cn", "client", "Common Name")
	fs.StringVar(&organization, "org", "Local Client", "Organization")
	fs.StringVar(&country, "country", "US", "Country code")
	fs.IntVar(&validDays, "days", 365, "Validity in days")
	fs.IntVar(&keyBits, "bits", 2048, "Key size in bits")
	fs.StringVar(&caCertPath, "ca-cert", "ca.pem", "CA certificate path")
	fs.StringVar(&caKeyPath, "ca-key", "ca-key.pem", "CA private key path")

	fs.Parse(os.Args[3:])

	generator := cert.NewGenerator()

	caBundle, err := generator.LoadCAFromFiles(caCertPath, caKeyPath)
	if err != nil {
		fmt.Printf("Error loading CA: %v\n", err)
		os.Exit(1)
	}

	subject := cert.DefaultClientSubject()
	subject.CommonName = commonName
	subject.Organization = []string{organization}
	subject.Country = []string{country}

	config := cert.CertConfig{
		Subject:  subject,
		ValidFor: time.Duration(validDays) * 24 * time.Hour,
		KeyBits:  keyBits,
	}

	bundle, err := generator.GenerateClientCert(config, caBundle)
	if err != nil {
		fmt.Printf("Error generating client certificate: %v\n", err)
		os.Exit(1)
	}

	var outputFormat cert.OutputFormat
	switch strings.ToLower(format) {
	case "pem":
		outputFormat = cert.PEMFormat
	case "pfx":
		outputFormat = cert.PFXFormat
	default:
		fmt.Printf("Unknown format: %s\n", format)
		os.Exit(1)
	}

	err = generator.SaveToFile(bundle, outputPath, outputFormat, password)
	if err != nil {
		fmt.Printf("Error saving certificate: %v\n", err)
		os.Exit(1)
	}
}
