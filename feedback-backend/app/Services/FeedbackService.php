<?php

namespace App\Services;

use App\Models\Feedback;
use App\Models\FeedbackMessage;
use App\Models\FeedbackAttachment;
use App\Models\FeedbackAudit;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FeedbackService
{
    public function __construct(
        private S3Service $s3Service
    ) {}

    public function createFeedback(array $data, object $user, array $attachments = []): Feedback
    {
        return DB::transaction(function () use ($data, $user, $attachments) {
            $feedback = Feedback::create([
                'feedback_id' => (string) Str::uuid(),
                'title' => $data['title'],
                'description' => $data['description'],
                'category' => $data['category'],
                'priority' => $data['priority'] ?? 'MEDIUM',
                'status' => 'OPEN',
                'created_by' => $user->id,
                'labels' => $data['labels'] ?? [],
            ]);

            // Create audit log
            FeedbackAudit::create([
                'feedback_id' => $feedback->feedback_id,
                'user_id' => $user->id,
                'action' => 'CREATED',
                'new_value' => $feedback->toArray(),
            ]);

            // Handle attachments if provided
            if (!empty($attachments)) {
                foreach ($attachments as $attachment) {
                    $this->createAttachment($feedback->feedback_id, $attachment, $user->id);
                }
            }

            return $feedback->load(['attachments', 'messages']);
        });
    }

    public function getFeedbackList(array $filters = [], int $page = 1, int $size = 20, ?object $user = null): array
    {
        $query = Feedback::query();

        // Apply filters
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['assignee'])) {
            $query->where('assigned_to', $filters['assignee']);
        }

        if (isset($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        if (isset($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        // EMPLOYEE can only see their own feedback
        if ($user && !$this->isAdmin($user)) {
            $query->where('created_by', $user->id);
        }

        // Pagination
        $total = $query->count();
        $items = $query->orderBy('created_at', 'desc')
            ->skip(($page - 1) * $size)
            ->take($size)
            ->with(['attachments', 'messages'])
            ->get();

        return [
            'items' => $items,
            'page' => $page,
            'size' => $size,
            'total_count' => $total,
            'total_pages' => ceil($total / $size),
        ];
    }

    public function getFeedbackById(string $feedbackId, ?object $user = null): ?Feedback
    {
        $feedback = Feedback::with(['messages.attachments', 'attachments', 'auditLogs', 'nlpAnalysis'])
            ->where('feedback_id', $feedbackId)
            ->first();

        if (!$feedback) {
            return null;
        }

        // EMPLOYEE can only see their own feedback
        if ($user && !$this->isAdmin($user) && $feedback->created_by != $user->id) {
            return null;
        }

        return $feedback;
    }

    public function addMessage(string $feedbackId, string $content, object $user, array $attachments = []): FeedbackMessage
    {
        $feedback = Feedback::findOrFail($feedbackId);

        // Check permissions
        if (!$this->isAdmin($user) && $feedback->created_by != $user->id) {
            throw new \Exception('You do not have permission to add messages to this feedback');
        }

        return DB::transaction(function () use ($feedbackId, $content, $user, $attachments) {
            $message = FeedbackMessage::create([
                'message_id' => (string) Str::uuid(),
                'feedback_id' => $feedbackId,
                'user_id' => $user->id,
                'content' => $content,
            ]);

            // Handle attachments
            if (!empty($attachments)) {
                foreach ($attachments as $attachment) {
                    $this->createAttachment($feedbackId, $attachment, $user->id, $message->message_id);
                }
            }

            return $message->load('attachments');
        });
    }

    public function updateFeedback(string $feedbackId, array $updates, object $user): Feedback
    {
        $feedback = Feedback::findOrFail($feedbackId);

        // Only ADMIN can update
        if (!$this->isAdmin($user)) {
            throw new \Exception('Only administrators can update feedback');
        }

        return DB::transaction(function () use ($feedback, $updates, $user) {
            $oldValue = $feedback->toArray();

            // Update fields
            if (isset($updates['status'])) {
                $feedback->status = $updates['status'];
            }

            if (isset($updates['assignee_id'])) {
                $feedback->assigned_to = $updates['assignee_id'];
            }

            if (isset($updates['priority'])) {
                $feedback->priority = $updates['priority'];
            }

            if (isset($updates['labels'])) {
                $feedback->labels = $updates['labels'];
            }

            $feedback->save();
            $newValue = $feedback->toArray();

            // Create audit log
            FeedbackAudit::create([
                'feedback_id' => $feedback->feedback_id,
                'user_id' => $user->id,
                'action' => 'UPDATED',
                'old_value' => $oldValue,
                'new_value' => $newValue,
                'metadata' => ['changed_fields' => array_keys($updates)],
            ]);

            return $feedback->load(['attachments', 'messages', 'auditLogs']);
        });
    }

    public function createAttachment(string $feedbackId, array $attachmentData, int $userId, ?string $messageId = null): FeedbackAttachment
    {
        $attachment = FeedbackAttachment::create([
            'attachment_id' => (string) Str::uuid(),
            'feedback_id' => $feedbackId,
            'message_id' => $messageId,
            's3_key' => $attachmentData['s3_key'],
            'file_name' => $attachmentData['file_name'],
            'file_size' => $attachmentData['file_size'] ?? null,
            'mime_type' => $attachmentData['mime_type'] ?? null,
            'uploaded_by' => $userId,
        ]);

        return $attachment;
    }

    public function exportFeedbackCsv(array $filters = []): string
    {
        $query = Feedback::query();

        // Apply filters
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        if (isset($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        // Date range
        if (isset($filters['start_date'])) {
            $query->where('created_at', '>=', $filters['start_date']);
        }

        if (isset($filters['end_date'])) {
            $query->where('created_at', '<=', $filters['end_date']);
        }

        $feedbacks = $query->orderBy('created_at', 'desc')->get();

        // Generate CSV
        $csv = "Feedback ID,Title,Category,Priority,Status,Created By,Assigned To,Created At,Updated At\n";

        foreach ($feedbacks as $feedback) {
            $csv .= sprintf(
                '"%s","%s","%s","%s","%s","%s","%s","%s","%s"' . "\n",
                $feedback->feedback_id,
                str_replace('"', '""', $feedback->title),
                $feedback->category,
                $feedback->priority,
                $feedback->status,
                $feedback->created_by,
                $feedback->assigned_to ?? '',
                $feedback->created_at,
                $feedback->updated_at
            );
        }

        return $csv;
    }

    private function isAdmin(object $user): bool
    {
        $roles = $user->roles ?? [];
        return in_array('ADMIN', array_map('strtoupper', $roles));
    }
}

