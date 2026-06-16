package auth

import (
	"net/http"
)

// RequireAdmin is a middleware that allows only users whose GoTrue
// app_metadata contains "role":"admin".
// Must be used after Require (claims must already be in context).
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := ClaimsFrom(r.Context())
		if claims == nil {
			http.Error(w, `{"error":"authentication required"}`, http.StatusUnauthorized)
			return
		}
		role, _ := claims.AppMetadata["role"].(string)
		if role != "admin" {
			http.Error(w, `{"error":"admin access required"}`, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
