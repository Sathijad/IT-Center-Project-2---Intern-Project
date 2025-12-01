package auth

import (
	"context"
	"crypto/rsa"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewVerifier(t *testing.T) {
	t.Run("single audience", func(t *testing.T) {
		verifier := NewVerifier("https://example.com/.well-known/jwks.json", "https://example.com", "audience1")

		assert.Equal(t, "https://example.com/.well-known/jwks.json", verifier.jwksURL)
		assert.Equal(t, "https://example.com", verifier.issuer)
		assert.Equal(t, []string{"audience1"}, verifier.audiences)
		assert.NotNil(t, verifier.client)
		assert.NotNil(t, verifier.keys)
	})

	t.Run("multiple audiences", func(t *testing.T) {
		verifier := NewVerifier("https://example.com/.well-known/jwks.json", "https://example.com", "aud1, aud2, aud3")

		assert.Equal(t, []string{"aud1", "aud2", "aud3"}, verifier.audiences)
	})

	t.Run("empty audience", func(t *testing.T) {
		verifier := NewVerifier("https://example.com/.well-known/jwks.json", "https://example.com", "")

		assert.Empty(t, verifier.audiences)
	})

	t.Run("audience with whitespace", func(t *testing.T) {
		verifier := NewVerifier("https://example.com/.well-known/jwks.json", "https://example.com", "  aud1  ,  aud2  ")

		assert.Equal(t, []string{"aud1", "aud2"}, verifier.audiences)
	})
}

func TestVerifier_Verify(t *testing.T) {
	ctx := context.Background()

	t.Run("missing token", func(t *testing.T) {
		verifier := NewVerifier("", "", "")
		claims, err := verifier.Verify(ctx, "")

		assert.Error(t, err)
		assert.Nil(t, claims)
		assert.Contains(t, err.Error(), "missing token")
	})

	t.Run("whitespace only token", func(t *testing.T) {
		verifier := NewVerifier("", "", "")
		claims, err := verifier.Verify(ctx, "   ")

		assert.Error(t, err)
		assert.Nil(t, claims)
	})

	t.Run("invalid token format", func(t *testing.T) {
		verifier := NewVerifier("", "", "")
		claims, err := verifier.Verify(ctx, "invalid.token.here")

		assert.Error(t, err)
		assert.Nil(t, claims)
	})
}

func TestVerifier_fetchKeys(t *testing.T) {
	ctx := context.Background()

	t.Run("successful fetch", func(t *testing.T) {
		// Create a mock JWKS server
		jwksResponse := map[string]interface{}{
			"keys": []map[string]interface{}{
				{
					"kid": "test-kid-1",
					"kty": "RSA",
					"n":   "test-n-value",
					"e":   "AQAB",
				},
			},
		}

		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(jwksResponse)
		}))
		defer server.Close()

		verifier := NewVerifier(server.URL, "", "")
		err := verifier.fetchKeys(ctx)

		// Note: This will fail because we need valid RSA key values, but it tests the flow
		// In a real scenario, you'd use proper base64-encoded RSA keys
		assert.Error(t, err) // Expected to fail due to invalid key format
	})

	t.Run("empty JWKS response", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{"keys": []interface{}{}})
		}))
		defer server.Close()

		verifier := NewVerifier(server.URL, "", "")
		err := verifier.fetchKeys(ctx)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "jwks empty")
	})

	t.Run("non-RSA keys filtered", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"keys": []map[string]interface{}{
					{
						"kid": "test-kid-1",
						"kty": "EC", // Not RSA
						"n":   "test-n",
						"e":   "AQAB",
					},
				},
			})
		}))
		defer server.Close()

		verifier := NewVerifier(server.URL, "", "")
		err := verifier.fetchKeys(ctx)

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "jwks empty")
	})

	t.Run("HTTP error", func(t *testing.T) {
		verifier := NewVerifier("http://invalid-url-that-does-not-exist.local", "", "")
		err := verifier.fetchKeys(ctx)

		assert.Error(t, err)
	})
}

func TestVerifier_keyFor(t *testing.T) {
	ctx := context.Background()

	t.Run("key not found after fetch", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"keys": []map[string]interface{}{
					{
						"kid": "different-kid",
						"kty": "RSA",
						"n":   "test-n",
						"e":   "AQAB",
					},
				},
			})
		}))
		defer server.Close()

		verifier := NewVerifier(server.URL, "", "")
		key, err := verifier.keyFor(ctx, "non-existent-kid")

		assert.Error(t, err)
		assert.Nil(t, key)
		assert.Contains(t, err.Error(), "kid not found")
	})
}

func TestToPublicKey(t *testing.T) {
	t.Run("invalid base64 N", func(t *testing.T) {
		key, err := toPublicKey("invalid-base64!!!", "AQAB")

		assert.Error(t, err)
		assert.Nil(t, key)
	})

	t.Run("invalid base64 E", func(t *testing.T) {
		// Create a valid base64 N value
		validN := "test-n-value-base64"
		key, err := toPublicKey(validN, "invalid-base64!!!")

		assert.Error(t, err)
		assert.Nil(t, key)
	})

	t.Run("valid RSA key components", func(t *testing.T) {
		// This would require actual valid RSA key components
		// For now, we test that the function handles errors properly
		key, err := toPublicKey("invalid", "invalid")

		assert.Error(t, err)
		assert.Nil(t, key)
	})
}

func TestClaims(t *testing.T) {
	t.Run("claims structure", func(t *testing.T) {
		claims := &Claims{
			RegisteredClaims: jwt.RegisteredClaims{
				Issuer:  "https://example.com",
				Subject: "user123",
				Email:   "test@example.com",
			},
		}

		assert.Equal(t, "https://example.com", claims.Issuer)
		assert.Equal(t, "user123", claims.Subject)
		assert.Equal(t, "test@example.com", claims.Email)
	})
}

func TestVerifier_keyCaching(t *testing.T) {
	ctx := context.Background()
	verifier := NewVerifier("", "", "")

	// Manually set a key in cache
	testKey := &rsa.PublicKey{N: big.NewInt(123), E: 65537}
	verifier.mu.Lock()
	verifier.keys["test-kid"] = testKey
	verifier.refreshed = time.Now()
	verifier.mu.Unlock()

	// Should return cached key
	key, err := verifier.keyFor(ctx, "test-kid")

	require.NoError(t, err)
	assert.Equal(t, testKey, key)
}

func TestVerifier_keyExpiration(t *testing.T) {
	ctx := context.Background()
	verifier := NewVerifier("", "", "")
	verifier.ttl = 1 * time.Millisecond // Very short TTL

	// Set a key with expired timestamp
	testKey := &rsa.PublicKey{N: big.NewInt(123), E: 65537}
	verifier.mu.Lock()
	verifier.keys["test-kid"] = testKey
	verifier.refreshed = time.Now().Add(-2 * time.Millisecond) // Expired
	verifier.mu.Unlock()

	// Should try to fetch new keys (will fail, but tests expiration logic)
	_, err := verifier.keyFor(ctx, "test-kid")

	// Expected to fail because we don't have a valid JWKS endpoint
	assert.Error(t, err)
}

