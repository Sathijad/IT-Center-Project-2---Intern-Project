<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Firebase\JWT\JWT;
use Firebase\JWT\JWK;
use Firebase\JWT\Key;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateJwt
{
    private $jwksCache = null;
    private $jwksCacheTime = null;
    private const JWKS_CACHE_TTL = 3600; // 1 hour

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['error' => 'Unauthorized', 'message' => 'Missing authentication token'], 401);
        }

        try {
            $decoded = $this->validateToken($token);
            $user = $this->getUserFromToken($decoded);

            if (!$user) {
                return response()->json(['error' => 'Unauthorized', 'message' => 'User not found'], 401);
            }

            // Attach user to request
            $request->merge(['user' => $user]);
            $request->setUserResolver(function () use ($user) {
                return $user;
            });

            return $next($request);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Unauthorized', 'message' => $e->getMessage()], 401);
        }
    }

    private function validateToken(string $token): object
    {
        // Get JWKS from Cognito
        $jwks = $this->getJwks();
        
        // Decode token header to get kid
        $tks = explode('.', $token);
        if (count($tks) !== 3) {
            throw new \Exception('Invalid token format');
        }

        $header = json_decode(JWT::urlSafeB64Decode($tks[0]), true);
        $kid = $header['kid'] ?? null;

        if (!$kid) {
            throw new \Exception('Token missing kid');
        }

        // Find matching key
        $key = null;
        foreach ($jwks['keys'] as $jwk) {
            if ($jwk['kid'] === $kid) {
                $key = new Key(JWK::parseKey($jwk), 'RS256');
                break;
            }
        }

        if (!$key) {
            throw new \Exception('No matching key found');
        }

        // Verify and decode token
        $decoded = JWT::decode($token, $key);

        // Verify issuer
        $issuer = config('services.cognito.issuer_uri');
        if ($decoded->iss !== $issuer) {
            throw new \Exception('Invalid issuer');
        }

        // Verify audience/client ID
        $clientId = config('services.cognito.client_id');
        if (isset($decoded->aud) && $decoded->aud !== $clientId) {
            throw new \Exception('Invalid audience');
        }

        // Check expiration
        if (isset($decoded->exp) && $decoded->exp < time()) {
            throw new \Exception('Token expired');
        }

        return $decoded;
    }

    private function getJwks(): array
    {
        // Simple cache implementation
        if ($this->jwksCache && $this->jwksCacheTime && (time() - $this->jwksCacheTime) < self::JWKS_CACHE_TTL) {
            return $this->jwksCache;
        }

        $jwksUrl = config('services.cognito.jwk_set_uri');
        $response = file_get_contents($jwksUrl);
        
        if (!$response) {
            throw new \Exception('Failed to fetch JWKS');
        }

        $jwks = json_decode($response, true);
        $this->jwksCache = $jwks;
        $this->jwksCacheTime = time();

        return $jwks;
    }

    private function getUserFromToken(object $decoded): ?object
    {
        $sub = $decoded->sub ?? null;
        
        if (!$sub) {
            return null;
        }

        // Lookup user in app_users table
        $user = DB::table('app_users')
            ->where('cognito_sub', $sub)
            ->where('is_active', true)
            ->first();

        if (!$user) {
            return null;
        }

        // Load user roles
        $roles = DB::table('user_roles')
            ->join('roles', 'user_roles.role_id', '=', 'roles.id')
            ->where('user_roles.user_id', $user->id)
            ->pluck('roles.name')
            ->toArray();

        $user->roles = $roles;

        return $user;
    }
}

