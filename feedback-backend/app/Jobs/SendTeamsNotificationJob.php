<?php

namespace App\Jobs;

use App\Models\Feedback;
use App\Services\TeamsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendTeamsNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        private string $feedbackId,
        private ?string $channelId = null
    ) {}

    public function handle(TeamsService $teamsService): void
    {
        try {
            $feedback = Feedback::findOrFail($this->feedbackId);

            // Get user names for display
            $createdByName = $this->getUserName($feedback->created_by);
            $assignedToName = $feedback->assigned_to ? $this->getUserName($feedback->assigned_to) : null;

            $feedbackData = [
                'feedback_id' => $feedback->feedback_id,
                'title' => $feedback->title,
                'description' => $feedback->description,
                'category' => $feedback->category,
                'priority' => $feedback->priority,
                'status' => $feedback->status,
                'created_by_name' => $createdByName,
                'assigned_to_name' => $assignedToName,
            ];

            $teamsService->sendNotification($this->feedbackId, $feedbackData, $this->channelId);

            Log::info('Teams notification sent', ['feedback_id' => $this->feedbackId]);
        } catch (\Exception $e) {
            Log::error('Teams notification failed', [
                'feedback_id' => $this->feedbackId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    private function getUserName(int $userId): string
    {
        $user = \Illuminate\Support\Facades\DB::table('app_users')
            ->where('id', $userId)
            ->first();

        return $user->display_name ?? $user->email ?? 'Unknown';
    }
}

