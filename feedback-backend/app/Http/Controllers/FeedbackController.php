<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreateFeedbackRequest;
use App\Http\Requests\UpdateFeedbackRequest;
use App\Http\Requests\AddMessageRequest;
use App\Services\FeedbackService;
use App\Services\S3Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeedbackController extends Controller
{
    public function __construct(
        private FeedbackService $feedbackService,
        private S3Service $s3Service
    ) {}

    public function create(CreateFeedbackRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();
        $attachments = $data['attachments'] ?? [];

        $feedback = $this->feedbackService->createFeedback($data, $user, $attachments);

        return response()->json($feedback, 201);
    }

    public function list(Request $request): JsonResponse
    {
        $filters = $request->only(['status', 'assignee', 'category', 'priority']);
        $page = (int) $request->get('page', 1);
        $size = (int) $request->get('size', 20);
        $user = $request->user();

        $result = $this->feedbackService->getFeedbackList($filters, $page, $size, $user);

        return response()->json($result);
    }

    public function show(string $id, Request $request): JsonResponse
    {
        $user = $request->user();
        $feedback = $this->feedbackService->getFeedbackById($id, $user);

        if (!$feedback) {
            return response()->json(['error' => 'Feedback not found'], 404);
        }

        // Generate presigned URLs for attachments
        foreach ($feedback->attachments as $attachment) {
            $attachment->download_url = $this->s3Service->generatePresignedDownloadUrl($attachment->s3_key);
        }

        return response()->json($feedback);
    }

    public function addMessage(string $id, AddMessageRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();
        $attachments = $data['attachments'] ?? [];

        try {
            $message = $this->feedbackService->addMessage($id, $data['content'], $user, $attachments);
            return response()->json($message, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 403);
        }
    }

    public function update(string $id, UpdateFeedbackRequest $request): JsonResponse
    {
        $user = $request->user();
        $updates = $request->validated();

        try {
            $feedback = $this->feedbackService->updateFeedback($id, $updates, $user);
            return response()->json($feedback);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 403);
        }
    }
}

