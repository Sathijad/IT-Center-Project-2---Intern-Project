<?php

namespace Tests\Feature\Controllers;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

class HealthControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_healthz_endpoint_returns_ok(): void
    {
        $response = $this->getJson('/api/v1/healthz');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'database',
                'timestamp',
            ])
            ->assertJson([
                'status' => 'ok',
            ]);
    }

    public function test_healthz_endpoint_checks_database_connection(): void
    {
        $response = $this->getJson('/api/v1/healthz');

        $response->assertStatus(200);
        $data = $response->json();
        $this->assertArrayHasKey('database', $data);
        $this->assertContains($data['database'], ['connected', 'disconnected']);
    }
}


