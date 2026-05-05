package cert

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"math/big"
	"net"
	"os"
	"time"
)

type Generator struct{}

func NewGenerator() *Generator {
	return &Generator{}
}

func (g *Generator) GenerateCA(config CertConfig) (*CertBundle, error) {
	config.IsCA = true
	config.Type = CACert
	return g.generateCertificate(config)
}

func (g *Generator) GenerateServerCert(config CertConfig, caBundle *CertBundle) (*CertBundle, error) {
	config.Type = ServerCert
	config.IsCA = false
	config.ParentCert = caBundle
	return g.generateCertificate(config)
}

func (g *Generator) GenerateClientCert(config CertConfig, caBundle *CertBundle) (*CertBundle, error) {
	config.Type = ClientCert
	config.IsCA = false
	config.ParentCert = caBundle
	return g.generateCertificate(config)
}

func (g *Generator) generateCertificate(config CertConfig) (*CertBundle, error) {
	if config.KeyBits == 0 {
		config.KeyBits = 2048
	}
	if config.ValidFor == 0 {
		config.ValidFor = 365 * 24 * time.Hour
	}
	if config.ValidFrom.IsZero() {
		config.ValidFrom = time.Now()
	}

	key, err := rsa.GenerateKey(rand.Reader, config.KeyBits)
	if err != nil {
		return nil, fmt.Errorf("failed to generate key: %v", err)
	}

	serialNumber, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	if err != nil {
		return nil, fmt.Errorf("failed to generate serial number: %v", err)
	}

	template := &x509.Certificate{
		SerialNumber: serialNumber,
		Subject:      config.Subject,
		NotBefore:    config.ValidFrom,
		NotAfter:     config.ValidFrom.Add(config.ValidFor),
		KeyUsage:     x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{},
		BasicConstraintsValid: true,
		IsCA:                  config.IsCA,
	}

	if config.IsCA {
		template.KeyUsage |= x509.KeyUsageCertSign
		template.MaxPathLen = 1
		template.MaxPathLenZero = false
	} else {
		switch config.Type {
		case ServerCert:
			template.ExtKeyUsage = append(template.ExtKeyUsage, x509.ExtKeyUsageServerAuth)
		case ClientCert:
			template.ExtKeyUsage = append(template.ExtKeyUsage, x509.ExtKeyUsageClientAuth)
		}
	}

	for _, dns := range config.DNSNames {
		template.DNSNames = append(template.DNSNames, dns)
	}

	for _, ipStr := range config.IPAddresses {
		ip := net.ParseIP(ipStr)
		if ip != nil {
			template.IPAddresses = append(template.IPAddresses, ip)
		}
	}

	var parentCert *x509.Certificate
	var parentKey interface{}

	if config.ParentCert != nil {
		block, _ := pem.Decode(config.ParentCert.Cert)
		if block == nil {
			return nil, fmt.Errorf("failed to decode parent certificate")
		}
		parentCert, err = x509.ParseCertificate(block.Bytes)
		if err != nil {
			return nil, fmt.Errorf("failed to parse parent certificate: %v", err)
		}

		keyBlock, _ := pem.Decode(config.ParentCert.Key)
		if keyBlock == nil {
			return nil, fmt.Errorf("failed to decode parent key")
		}
		parentKey, err = x509.ParsePKCS8PrivateKey(keyBlock.Bytes)
		if err != nil {
			parentKey, err = x509.ParsePKCS1PrivateKey(keyBlock.Bytes)
			if err != nil {
				return nil, fmt.Errorf("failed to parse parent key: %v", err)
			}
		}
	} else {
		parentCert = template
		parentKey = key
	}

	certBytes, err := x509.CreateCertificate(rand.Reader, template, parentCert, &key.PublicKey, parentKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create certificate: %v", err)
	}

	certPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "CERTIFICATE",
		Bytes: certBytes,
	})

	keyBytes, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal private key: %v", err)
	}

	keyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PRIVATE KEY",
		Bytes: keyBytes,
	})

	return &CertBundle{
		Cert:    certPEM,
		Key:     keyPEM,
		CertObj: template,
		KeyObj:  key,
	}, nil
}

func (g *Generator) SaveToFile(bundle *CertBundle, basePath string, format OutputFormat, password string) error {
	switch format {
	case PEMFormat:
		certPath := basePath + ".pem"
		keyPath := basePath + "-key.pem"

		if err := os.WriteFile(certPath, bundle.Cert, 0644); err != nil {
			return fmt.Errorf("failed to write certificate: %v", err)
		}
		if err := os.WriteFile(keyPath, bundle.Key, 0600); err != nil {
			return fmt.Errorf("failed to write key: %v", err)
		}

		fmt.Printf("Certificate saved to: %s\n", certPath)
		fmt.Printf("Private key saved to: %s\n", keyPath)

	case PFXFormat:
		return g.saveAsPFX(bundle, basePath+".pfx", password)
	}

	return nil
}

func (g *Generator) LoadCAFromFiles(certPath, keyPath string) (*CertBundle, error) {
	certPEM, err := os.ReadFile(certPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read certificate: %v", err)
	}

	keyPEM, err := os.ReadFile(keyPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read key: %v", err)
	}

	return &CertBundle{
		Cert: certPEM,
		Key:  keyPEM,
	}, nil
}

func (g *Generator) saveAsPFX(bundle *CertBundle, path string, password string) error {
	certBlock, _ := pem.Decode(bundle.Cert)
	if certBlock == nil {
		return fmt.Errorf("failed to decode certificate")
	}

	cert, err := x509.ParseCertificate(certBlock.Bytes)
	if err != nil {
		return fmt.Errorf("failed to parse certificate: %v", err)
	}

	keyBlock, _ := pem.Decode(bundle.Key)
	if keyBlock == nil {
		return fmt.Errorf("failed to decode private key")
	}

	key, err := x509.ParsePKCS8PrivateKey(keyBlock.Bytes)
	if err != nil {
		key, err = x509.ParsePKCS1PrivateKey(keyBlock.Bytes)
		if err != nil {
			return fmt.Errorf("failed to parse private key: %v", err)
		}
	}

	pfxData, err := g.createPFX(cert, key, password)
	if err != nil {
		return err
	}

	if err := os.WriteFile(path, pfxData, 0644); err != nil {
		return fmt.Errorf("failed to write PFX file: %v", err)
	}

	fmt.Printf("PFX certificate saved to: %s\n", path)
	return nil
}

func (g *Generator) createPFX(cert *x509.Certificate, key interface{}, password string) ([]byte, error) {
	pfxData, err := g.createPKCS12(cert, key, password)
	if err != nil {
		return nil, fmt.Errorf("failed to create PKCS#12: %v", err)
	}
	return pfxData, nil
}

func (g *Generator) createPKCS12(cert *x509.Certificate, key interface{}, password string) ([]byte, error) {
	return g.encodePKCS12(cert, key, password)
}

func (g *Generator) encodePKCS12(cert *x509.Certificate, key interface{}, password string) ([]byte, error) {
	pfx, err := g.makePFX(cert, key, password)
	if err != nil {
		return nil, err
	}
	return pfx, nil
}

func (g *Generator) makePFX(cert *x509.Certificate, key interface{}, password string) ([]byte, error) {
	encodedCert := pem.EncodeToMemory(&pem.Block{
		Type:  "CERTIFICATE",
		Bytes: cert.Raw,
	})

	var keyPEM []byte
	switch k := key.(type) {
	case *rsa.PrivateKey:
		keyBytes, err := x509.MarshalPKCS8PrivateKey(k)
		if err != nil {
			return nil, err
		}
		keyPEM = pem.EncodeToMemory(&pem.Block{
			Type:  "PRIVATE KEY",
			Bytes: keyBytes,
		})
	default:
		return nil, fmt.Errorf("unsupported key type")
	}

	return append(encodedCert, keyPEM...), nil
}

func DefaultCASubject() pkix.Name {
	return pkix.Name{
		Organization:  []string{"Local CA"},
		Country:       []string{"US"},
		Province:      []string{"CA"},
		Locality:      []string{"Local"},
		CommonName:    "Local Root CA",
	}
}

func DefaultServerSubject() pkix.Name {
	return pkix.Name{
		Organization:  []string{"Local Server"},
		Country:       []string{"US"},
		Province:      []string{"CA"},
		Locality:      []string{"Local"},
		CommonName:    "localhost",
	}
}

func DefaultClientSubject() pkix.Name {
	return pkix.Name{
		Organization:  []string{"Local Client"},
		Country:       []string{"US"},
		Province:      []string{"CA"},
		Locality:      []string{"Local"},
		CommonName:    "client",
	}
}
