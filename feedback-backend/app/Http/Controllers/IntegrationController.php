<?php

namespace App\Http\Controllers;

use App\Jobs\AnalyzeSentimentJob;
use App\Jobs\SendTeamsNotificationJob;
use App\Models\Feedback;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IntegrationController extends Controller
{
    public function analyzeFeedback(string $id): JsonResponse
    {
        $feedback = Feedback::findOrFail($id);

        // Queue sentiment analysis job
        AnalyzeSentimentJob::dispatch($feedback->feedback_id);

        return response()->json([
            'message' => 'Sentiment analysis queued',
            'feedback_id' => $feedback->feedback_id,
        ]);
    }

    public function sendTeamsNotification(Request $request): JsonResponse
    {
        $request->validate([
            'feedback_id' => 'required|string|exists:feedback,feedback_id',
            'channel_id' => 'nullable|string',
        ]);

        $feedbackId = $request->input('feedback_id');
        $channelId = $request->input('channel_id');

        // Queue Teams notification job
        SendTeamsNotificationJob::dispatch($feedbackId, $channelId);

        return response()->json([
            'message' => 'Teams notification queued',
            'feedback_id' => $feedbackId,
        ]);
    }
}

