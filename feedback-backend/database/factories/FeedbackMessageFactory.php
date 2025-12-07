<?php

namespace Database\Factories;

use App\Models\FeedbackMessage;
use App\Models\Feedback;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class FeedbackMessageFactory extends Factory
{
    protected $model = FeedbackMessage::class;

    public function definition(): array
    {
        return [
            'message_id' => (string) Str::uuid(),
            'feedback_id' => Feedback::factory(),
            'user_id' => $this->faker->numberBetween(1, 100),
            'content' => $this->faker->paragraph(),
            'created_at' => now(),
        ];
    }
}


