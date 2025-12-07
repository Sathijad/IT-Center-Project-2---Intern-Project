<?php

namespace Tests\Unit\Middleware;

use Tests\TestCase;
use App\Http\Middleware\RoleMiddleware;
use Illuminate\Http\Request;
use Mockery;

class RoleMiddlewareTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_role_middleware_allows_user_with_required_role(): void
    {
        $user = (object) ['roles' => ['ADMIN']];
        $request = Request::create('/test', 'GET');
        $request->setUserResolver(fn() => $user);

        $middleware = new RoleMiddleware();
        $next = function ($req) {
            return response()->json(['success' => true]);
        };

        $response = $middleware->handle($request, $next, 'ADMIN');

        $this->assertEquals(200, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertTrue($data['success']);
    }

    public function test_role_middleware_denies_user_without_required_role(): void
    {
        $user = (object) ['roles' => ['EMPLOYEE']];
        $request = Request::create('/test', 'GET');
        $request->setUserResolver(fn() => $user);

        $middleware = new RoleMiddleware();
        $next = function ($req) {
            return response()->json(['success' => true]);
        };

        $response = $middleware->handle($request, $next, 'ADMIN');

        $this->assertEquals(403, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertArrayHasKey('error', $data);
    }

    public function test_role_middleware_denies_unauthenticated_user(): void
    {
        $request = Request::create('/test', 'GET');
        $request->setUserResolver(fn() => null);

        $middleware = new RoleMiddleware();
        $next = function ($req) {
            return response()->json(['success' => true]);
        };

        $response = $middleware->handle($request, $next, 'ADMIN');

        $this->assertEquals(401, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertArrayHasKey('error', $data);
    }

    public function test_role_middleware_handles_case_insensitive_roles(): void
    {
        $user = (object) ['roles' => ['admin']]; // lowercase
        $request = Request::create('/test', 'GET');
        $request->setUserResolver(fn() => $user);

        $middleware = new RoleMiddleware();
        $next = function ($req) {
            return response()->json(['success' => true]);
        };

        $response = $middleware->handle($request, $next, 'ADMIN');

        $this->assertEquals(200, $response->getStatusCode());
    }

    public function test_role_middleware_handles_multiple_roles(): void
    {
        $user = (object) ['roles' => ['EMPLOYEE', 'ADMIN']];
        $request = Request::create('/test', 'GET');
        $request->setUserResolver(fn() => $user);

        $middleware = new RoleMiddleware();
        $next = function ($req) {
            return response()->json(['success' => true]);
        };

        $response = $middleware->handle($request, $next, 'ADMIN', 'MANAGER');

        $this->assertEquals(200, $response->getStatusCode());
    }
}


