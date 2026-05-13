package sdk

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

// VerifyWebhookSignature validates a webhook payload against the signature
// sent in the X-Webhook-Signature header (HMAC-SHA256).
func VerifyWebhookSignature(payload []byte, signature string, secret string) error {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expected := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(signature), []byte(expected)) {
		return fmt.Errorf("webhook: invalid signature")
	}
	return nil
}
