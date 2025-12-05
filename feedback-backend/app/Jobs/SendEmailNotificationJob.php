<?php

namespace App\Jobs;

use App\Models\Feedback;
use App\Services\SesService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendEmailNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        private string $feedbackId,
        private string $eventType = 'created',
        private ?string $recipientEmail = null
    ) {}

    public function handle(SesService $sesService): void
    {
        try {
            $feedback = Feedback::findOrFail($this->feedbackId);

            // Determine recipient
            $recipientEmail = $this->recipientEmail;
            $recipientName = 'User';

            if (!$recipientEmail) {
                // Default to assigned user or creator
                $userId = $feedback->assigned_to ?? $feedback->created_by;
                $user = \Illuminate\Support\Facades\DB::table('app_users')
                    ->where('id', $userId)
                    ->first();

                if ($user) {
                    $recipientEmail = $user->email;
                    $recipientName = $user->display_name ?? $user->email;
                } else {
                    Log::warning('No recipient found for email notification', ['feedback_id' => $this->feedbackId]);
                    return;
                }
            }

            $feedbackData = [
                'feedback_id' => $feedback->feedback_id,
                'title' => $feedback->title,
                'description' => $feedback->description,
                'category' => $feedback->category,
                'priority' => $feedback->priority,
                'status' => $feedback->status,
            ];

            $sesService->sendFeedbackNotification($recipientEmail, $recipientName, $feedbackData, $this->eventType);

            Log::info('Email notification sent', [
                'feedback_id' => $this->feedbackId,
                'recipient' => $recipientEmail,
            ]);
        } catch (\Exception $e) {
            Log::error('Email notification failed', [
                'feedback_id' => $this->feedbackId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}

