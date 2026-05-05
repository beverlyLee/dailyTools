package cert

import (
	"crypto/x509/pkix"
	"time"
)

type CertificateType string

const (
	CACert        CertificateType = "ca"
	ServerCert    CertificateType = "server"
	ClientCert    CertificateType = "client"
)

type CertConfig struct {
	Type           CertificateType
	Subject        pkix.Name
	DNSNames       []string
	IPAddresses    []string
	ValidFrom      time.Time
	ValidFor       time.Duration
	KeyBits        int
	IsCA           bool
	ParentCert     *CertBundle
	ParentKey      interface{}
}

type CertBundle struct {
	Cert    []byte
	Key     []byte
	CertObj interface{}
	KeyObj  interface{}
}

type OutputFormat string

const (
	PEMFormat OutputFormat = "pem"
	PFXFormat OutputFormat = "pfx"
)
