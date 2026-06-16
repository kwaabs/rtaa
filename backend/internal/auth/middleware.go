package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"go.uber.org/zap"
)

type contextKey string

const (
	claimsKey contextKey = "claims"
)

// Claims holds the JWT payload issued by GoTrue.
type Claims struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
	Role  string `json:"role"`
	Exp   int64  `json:"exp"`
	Iat   int64  `json:"iat"`
	Aud   string `json:"aud"`
	// App-level metadata forwarded by GoTrue
	AppMetadata  map[string]any `json:"app_metadata"`
	UserMetadata map[string]any `json:"user_metadata"`
}

// Middleware validates the Bearer JWT against GoTrue's /user endpoint.
// For performance the result is cached in the Valkey client via the token's
// expiry; the cache layer is optional (pass nil to skip).
type Middleware struct {
	goTrueURL string
	logger    *zap.Logger
	httpClient *http.Client
}

func NewMiddleware(goTrueURL string, logger *zap.Logger) *Middleware {
	return &Middleware{
		goTrueURL: strings.TrimRight(goTrueURL, "/"),
		logger:    logger,
		httpClient: &http.Client{Timeout: 5 * time.Second},
	}
}

// Require rejects requests without a valid token (401).
func (m *Middleware) Require(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, err := m.extractClaims(r)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), claimsKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// Optional attaches claims to the context when a token is present but does
// NOT reject unauthenticated requests.
func (m *Middleware) Optional(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if claims, err := m.extractClaims(r); err == nil {
			ctx := context.WithValue(r.Context(), claimsKey, claims)
			r = r.WithContext(ctx)
		}
		next.ServeHTTP(w, r)
	})
}

// RequireRole rejects requests where the JWT role does not match.
func (m *Middleware) RequireRole(role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			c := ClaimsFrom(r.Context())
			if c == nil || c.Role != role {
				http.Error(w, "forbidden", http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// ClaimsFrom returns the Claims stored in a request context, or nil.
func ClaimsFrom(ctx context.Context) *Claims {
	c, _ := ctx.Value(claimsKey).(*Claims)
	return c
}

// extractClaims calls GoTrue's /user endpoint to verify the Bearer token.
func (m *Middleware) extractClaims(r *http.Request) (*Claims, error) {
	token := bearerToken(r)
	if token == "" {
		return nil, fmt.Errorf("no bearer token")
	}

	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, m.goTrueURL+"/user", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := m.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("gotrue request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("gotrue returned %d", resp.StatusCode)
	}

	var payload struct {
		ID           string         `json:"id"`
		Email        string         `json:"email"`
		Role         string         `json:"role"`
		AppMetadata  map[string]any `json:"app_metadata"`
		UserMetadata map[string]any `json:"user_metadata"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}

	return &Claims{
		Sub:          payload.ID,
		Email:        payload.Email,
		Role:         payload.Role,
		AppMetadata:  payload.AppMetadata,
		UserMetadata: payload.UserMetadata,
	}, nil
}

func bearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if after, ok := strings.CutPrefix(h, "Bearer "); ok {
		return strings.TrimSpace(after)
	}
	// Also accept token in query param for map tile / SSE endpoints
	return r.URL.Query().Get("access_token")
}
