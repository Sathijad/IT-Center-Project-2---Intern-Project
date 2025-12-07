<?php

namespace Database\Factories;

use App\Models\Feedback;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class FeedbackFactory extends Factory
{
    protected $model = Feedback::class;

    public function definition(): array
    {
        return [
            'feedback_id' => (string) Str::uuid(),
            'title' => $this->faker->sentence(),
            'description' => $this->faker->paragraph(),
            'category' => $this->faker->randomElement(['BUG', 'FEATURE', 'IMPROVEMENT', 'QUESTION']),
            'priority' => $this->faker->randomElement(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
            'status' => $this->faker->randomElement(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
            'created_by' => $this->faker->numberBetween(1, 100),
            'assigned_to' => $this->faker->optional()->numberBetween(1, 100),
            'labels' => '{}',
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}


