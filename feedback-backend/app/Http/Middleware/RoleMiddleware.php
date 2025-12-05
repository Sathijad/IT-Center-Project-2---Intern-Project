<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized', 'message' => 'User not authenticated'], 401);
        }

        $userRoles = $user->roles ?? [];

        // Check if user has any of the required roles
        $hasRole = false;
        foreach ($roles as $role) {
            if (in_array(strtoupper($role), array_map('strtoupper', $userRoles))) {
                $hasRole = true;
                break;
            }
        }

        if (!$hasRole) {
            return response()->json(['error' => 'Forbidden', 'message' => 'Insufficient permissions'], 403);
        }

        return $next($request);
    }
}

