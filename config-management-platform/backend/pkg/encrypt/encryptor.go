package encrypt

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"regexp"
	"strings"

	"golang.org/x/crypto/pbkdf2"
)

const (
	EncryptedPrefix = "ENC("
	EncryptedSuffix = ")"
	KeySize         = 32
	SaltSize        = 16
	NonceSize       = 12
	Iterations      = 100000
)

type Encryptor struct {
	masterKey []byte
}

type EncryptionResult struct {
	Ciphertext string `json:"ciphertext"`
	Salt       string `json:"salt"`
	Nonce      string `json:"nonce"`
}

func NewEncryptor(masterPassword string) (*Encryptor, error) {
	if masterPassword == "" {
		return nil, errors.New("主密码不能为空")
	}

	hasher := sha256.New()
	hasher.Write([]byte(masterPassword))
	masterKey := hasher.Sum(nil)

	return &Encryptor{
		masterKey: masterKey,
	}, nil
}

func NewEncryptorFromHexKey(hexKey string) (*Encryptor, error) {
	key, err := hex.DecodeString(hexKey)
	if err != nil {
		return nil, fmt.Errorf("无效的密钥格式: %w", err)
	}

	if len(key) != KeySize {
		return nil, fmt.Errorf("密钥长度无效，需要 %d 字节", KeySize)
	}

	return &Encryptor{
		masterKey: key,
	}, nil
}

func (e *Encryptor) Encrypt(plaintext string) (string, error) {
	salt := make([]byte, SaltSize)
	if _, err := io.ReadFull(rand.Reader, salt); err != nil {
		return "", fmt.Errorf("生成盐失败: %w", err)
	}

	key := pbkdf2.Key(e.masterKey, salt, Iterations, KeySize, sha256.New)

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("创建 AES 密码器失败: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("创建 GCM 模式失败: %w", err)
	}

	nonce := make([]byte, NonceSize)
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("生成 nonce 失败: %w", err)
	}

	ciphertext := gcm.Seal(nil, nonce, []byte(plaintext), nil)

	result := EncryptionResult{
		Ciphertext: base64.StdEncoding.EncodeToString(ciphertext),
		Salt:       base64.StdEncoding.EncodeToString(salt),
		Nonce:      base64.StdEncoding.EncodeToString(nonce),
	}

	encoded, err := encodeResult(result)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s%s%s", EncryptedPrefix, encoded, EncryptedSuffix), nil
}

func (e *Encryptor) Decrypt(encryptedText string) (string, error) {
	if !strings.HasPrefix(encryptedText, EncryptedPrefix) ||
		!strings.HasSuffix(encryptedText, EncryptedSuffix) {
		return "", errors.New("无效的加密格式")
	}

	encoded := strings.TrimPrefix(strings.TrimSuffix(encryptedText, EncryptedSuffix), EncryptedPrefix)

	result, err := decodeResult(encoded)
	if err != nil {
		return "", err
	}

	salt, err := base64.StdEncoding.DecodeString(result.Salt)
	if err != nil {
		return "", fmt.Errorf("解码盐失败: %w", err)
	}

	nonce, err := base64.StdEncoding.DecodeString(result.Nonce)
	if err != nil {
		return "", fmt.Errorf("解码 nonce 失败: %w", err)
	}

	ciphertext, err := base64.StdEncoding.DecodeString(result.Ciphertext)
	if err != nil {
		return "", fmt.Errorf("解码密文失败: %w", err)
	}

	key := pbkdf2.Key(e.masterKey, salt, Iterations, KeySize, sha256.New)

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("创建 AES 密码器失败: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("创建 GCM 模式失败: %w", err)
	}

	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("解密失败: %w", err)
	}

	return string(plaintext), nil
}

func (e *Encryptor) IsEncrypted(text string) bool {
	return strings.HasPrefix(text, EncryptedPrefix) && strings.HasSuffix(text, EncryptedSuffix)
}

func (e *Encryptor) EncryptIfNeeded(text string) (string, error) {
	if e.IsEncrypted(text) {
		return text, nil
	}
	return e.Encrypt(text)
}

func (e *Encryptor) DecryptIfNeeded(text string) (string, error) {
	if !e.IsEncrypted(text) {
		return text, nil
	}
	return e.Decrypt(text)
}

func (e *Encryptor) EncryptSensitiveFields(content string, format string) (string, error) {
	sensitivePatterns := getSensitivePatterns(format)

	switch format {
	case "json":
		return e.encryptSensitiveInJSON(content, sensitivePatterns)
	case "yaml", "yml":
		return e.encryptSensitiveInYAML(content, sensitivePatterns)
	case "keyvalue", "env", "properties":
		return e.encryptSensitiveInKeyValue(content, sensitivePatterns)
	default:
		return content, nil
	}
}

func (e *Encryptor) encryptSensitiveInJSON(content string, patterns []*regexp.Regexp) (string, error) {
	for _, pattern := range patterns {
		matches := pattern.FindAllStringSubmatch(content, -1)
		for _, match := range matches {
			if len(match) >= 3 {
				fullMatch := match[0]
				key := match[1]
				value := match[2]

				if e.IsEncrypted(value) {
					continue
				}

				encryptedValue, err := e.Encrypt(value)
				if err != nil {
					return "", err
				}

				replacement := fmt.Sprintf(`"%s": "%s"`, key, encryptedValue)
				content = strings.ReplaceAll(content, fullMatch, replacement)
			}
		}
	}
	return content, nil
}

func (e *Encryptor) encryptSensitiveInYAML(content string, patterns []*regexp.Regexp) (string, error) {
	lines := strings.Split(content, "\n")
	result := make([]string, len(lines))

	for i, line := range lines {
		trimmedLine := strings.TrimSpace(line)

		for _, pattern := range patterns {
			matches := pattern.FindStringSubmatch(trimmedLine)
			if len(matches) >= 3 {
				key := matches[1]
				value := matches[2]

				if e.IsEncrypted(value) {
					continue
				}

				encryptedValue, err := e.Encrypt(value)
				if err != nil {
					return "", err
				}

				indent := getIndentation(line)
				result[i] = fmt.Sprintf("%s%s: %s", indent, key, encryptedValue)
				goto nextLine
			}
		}
		result[i] = line
	nextLine:
	}

	return strings.Join(result, "\n"), nil
}

func (e *Encryptor) encryptSensitiveInKeyValue(content string, patterns []*regexp.Regexp) (string, error) {
	lines := strings.Split(content, "\n")
	result := make([]string, len(lines))

	for i, line := range lines {
		trimmedLine := strings.TrimSpace(line)

		if trimmedLine == "" || strings.HasPrefix(trimmedLine, "#") || strings.HasPrefix(trimmedLine, "//") {
			result[i] = line
			continue
		}

		for _, pattern := range patterns {
			matches := pattern.FindStringSubmatch(trimmedLine)
			if len(matches) >= 3 {
				value := matches[2]
				value = strings.Trim(value, `"'`)

				if e.IsEncrypted(value) {
					result[i] = line
					goto nextLine
				}

				encryptedValue, err := e.Encrypt(value)
				if err != nil {
					return "", err
				}

				if strings.Contains(line, "=") {
					equalIndex := strings.Index(line, "=")
					result[i] = fmt.Sprintf("%s=%s", line[:equalIndex], encryptedValue)
				} else {
					result[i] = line
				}
				goto nextLine
			}
		}
		result[i] = line
	nextLine:
	}

	return strings.Join(result, "\n"), nil
}

func (e *Encryptor) DecryptAllEncryptedFields(content string) (string, error) {
	re := regexp.MustCompile(regexp.QuoteMeta(EncryptedPrefix) + `([^)]+)` + regexp.QuoteMeta(EncryptedSuffix))

	matches := re.FindAllString(content, -1)
	for _, match := range matches {
		decrypted, err := e.Decrypt(match)
		if err != nil {
			continue
		}
		content = strings.ReplaceAll(content, match, decrypted)
	}

	return content, nil
}

func GenerateMasterKey() (string, error) {
	key := make([]byte, KeySize)
	if _, err := io.ReadFull(rand.Reader, key); err != nil {
		return "", fmt.Errorf("生成密钥失败: %w", err)
	}
	return hex.EncodeToString(key), nil
}

func HashPassword(password string, salt []byte) (string, []byte, error) {
	if salt == nil {
		salt = make([]byte, SaltSize)
		if _, err := io.ReadFull(rand.Reader, salt); err != nil {
			return "", nil, fmt.Errorf("生成盐失败: %w", err)
		}
	}

	hash := pbkdf2.Key([]byte(password), salt, Iterations, KeySize, sha256.New)
	return hex.EncodeToString(hash), salt, nil
}

func VerifyPassword(password string, hash string, salt []byte) bool {
	computedHash := pbkdf2.Key([]byte(password), salt, Iterations, KeySize, sha256.New)
	return hex.EncodeToString(computedHash) == hash
}

func encodeResult(result EncryptionResult) (string, error) {
	jsonBytes, err := json.Marshal(result)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(jsonBytes), nil
}

func decodeResult(encoded string) (EncryptionResult, error) {
	jsonBytes, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return EncryptionResult{}, fmt.Errorf("解码失败: %w", err)
	}

	var result EncryptionResult
	if err := json.Unmarshal(jsonBytes, &result); err != nil {
		return EncryptionResult{}, fmt.Errorf("解析 JSON 失败: %w", err)
	}

	return result, nil
}

func getSensitivePatterns(format string) []*regexp.Regexp {
	sensitiveKeys := []string{
		`password`, `passwd`, `pwd`,
		`secret`, `api[_-]?key`, `apikey`,
		`private[_-]?key`, `privatekey`,
		`token`, `auth[_-]?token`, `authtoken`,
		`credential`, `cred`,
		`passphrase`, `pin`,
		`secret[_-]?key`, `secretkey`,
		`access[_-]?key`, `accesskey`,
		`access[_-]?token`, `accesstoken`,
		`refresh[_-]?token`, `refreshtoken`,
		`client[_-]?secret`, `clientsecret`,
		`db[_-]?password`, `dbpassword`,
		`database[_-]?password`, `databasepassword`,
	}

	var patterns []*regexp.Regexp

	switch format {
	case "json":
		for _, key := range sensitiveKeys {
			pattern := fmt.Sprintf(`"%s"\s*:\s*"([^"]+)"`, key)
			patterns = append(patterns, regexp.MustCompile(`(?i)`+pattern))
		}
	case "yaml", "yml":
		for _, key := range sensitiveKeys {
			pattern := fmt.Sprintf(`%s\s*:\s*([^\n]+)`, key)
			patterns = append(patterns, regexp.MustCompile(`(?i)`+pattern))
		}
	case "keyvalue", "env", "properties":
		for _, key := range sensitiveKeys {
			pattern := fmt.Sprintf(`^%s\s*[=:]\s*(.+)$`, key)
			patterns = append(patterns, regexp.MustCompile(`(?im)`+pattern))
		}
	}

	return patterns
}

func getIndentation(line string) string {
	for i, c := range line {
		if c != ' ' && c != '\t' {
			return line[:i]
		}
	}
	return ""
}
