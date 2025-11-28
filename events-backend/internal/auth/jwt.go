package auth

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Verifier validates Cognito JWTs using JWKS cache.
type Verifier struct {
	jwksURL  string
	issuer   string
	audience string

	client    *http.Client
	mu        sync.RWMutex
	keys      map[string]*rsa.PublicKey
	refreshed time.Time
	ttl       time.Duration
}

type Claims struct {
	jwt.RegisteredClaims
	Email string `json:"email"`
}

func NewVerifier(jwksURL, issuer, audience string) *Verifier {
	return &Verifier{
		jwksURL:  jwksURL,
		issuer:   issuer,
		audience: audience,
		client:   &http.Client{Timeout: 5 * time.Second},
		keys:     map[string]*rsa.PublicKey{},
		ttl:      6 * time.Hour,
	}
}

// Verify parses and validates the JWT returning Cognito claims.
func (v *Verifier) Verify(ctx context.Context, tokenString string) (*Claims, error) {
	tokenString = strings.TrimSpace(tokenString)
	if tokenString == "" {
		return nil, errors.New("missing token")
	}

	claims := &Claims{}
	parser := jwt.NewParser(jwt.WithAudience(v.audience), jwt.WithIssuedAt())

	token, err := parser.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (any, error) {
		kid, _ := token.Header["kid"].(string)
		if kid == "" {
			return nil, errors.New("token missing kid")
		}
		key, err := v.keyFor(ctx, kid)
		if err != nil {
			return nil, err
		}
		return key, nil
	})
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, errors.New("invalid token")
	}
	if v.issuer != "" && claims.Issuer != v.issuer {
		return nil, errors.New("issuer mismatch")
	}
	return claims, nil
}

func (v *Verifier) keyFor(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	v.mu.RLock()
	key := v.keys[kid]
	expired := time.Since(v.refreshed) > v.ttl
	v.mu.RUnlock()
	if key != nil && !expired {
		return key, nil
	}
	if err := v.fetchKeys(ctx); err != nil {
		return nil, err
	}
	v.mu.RLock()
	defer v.mu.RUnlock()
	key = v.keys[kid]
	if key == nil {
		return nil, errors.New("kid not found")
	}
	return key, nil
}

func (v *Verifier) fetchKeys(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.jwksURL, nil)
	if err != nil {
		return err
	}
	resp, err := v.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	var set jwks
	if err := json.NewDecoder(resp.Body).Decode(&set); err != nil {
		return err
	}
	keys := make(map[string]*rsa.PublicKey, len(set.Keys))
	for _, k := range set.Keys {
		if k.Kty != "RSA" {
			continue
		}
		pub, err := toPublicKey(k.N, k.E)
		if err != nil {
			continue
		}
		keys[k.Kid] = pub
	}
	if len(keys) == 0 {
		return errors.New("jwks empty")
	}
	v.mu.Lock()
	defer v.mu.Unlock()
	v.keys = keys
	v.refreshed = time.Now()
	return nil
}

type jwks struct {
	Keys []struct {
		Kid string `json:"kid"`
		Kty string `json:"kty"`
		N   string `json:"n"`
		E   string `json:"e"`
	} `json:"keys"`
}

func toPublicKey(rawN, rawE string) (*rsa.PublicKey, error) {
	nb, err := base64.RawURLEncoding.DecodeString(rawN)
	if err != nil {
		return nil, err
	}
	eb, err := base64.RawURLEncoding.DecodeString(rawE)
	if err != nil {
		return nil, err
	}
	e := int(binary.BigEndian.Uint32(append(make([]byte, 4-len(eb)), eb...)))
	n := new(big.Int).SetBytes(nb)
	return &rsa.PublicKey{N: n, E: e}, nil
}

