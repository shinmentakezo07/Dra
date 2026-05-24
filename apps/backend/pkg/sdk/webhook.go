package sdk

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
)

// VerifyWebhookSignature validates a webhook payload against the signature
// sent in the X-Webhook-Signature header (HMAC-SHA256).
// The signature may be prefixed with "sha256=" as sent by the dispatcher.
func VerifyWebhookSignature(payload []byte, signature string, secret string) error {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expected := hex.EncodeToString(mac.Sum(nil))
	sig := strings.TrimPrefix(signature, "sha256=")
	if !hmac.Equal([]byte(sig), []byte(expected)) {
		return fmt.Errorf("webhook: invalid signature")
	}
	return nil
}
