<?php

namespace App\Jobs;

use App\Models\Feedback;
use App\Models\NlpAnalysis;
use App\Services\ComprehendService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class AnalyzeSentimentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        private string $feedbackId
    ) {}

    public function handle(ComprehendService $comprehendService): void
    {
        try {
            $feedback = Feedback::with('messages')->findOrFail($this->feedbackId);

            // Collect all text for analysis
            $description = $feedback->description;
            $messages = $feedback->messages->pluck('content')->toArray();

            // Analyze
            $analysis = $comprehendService->analyzeFeedback($description, $messages);

            // Store results
            NlpAnalysis::create([
                'analysis_id' => (string) \Illuminate\Support\Str::uuid(),
                'feedback_id' => $this->feedbackId,
                'sentiment' => $analysis['sentiment'],
                'sentiment_score' => $analysis['sentiment_score'],
                'pii_entities' => $analysis['pii_entities'],
                'raw_response' => $analysis,
                'analyzed_at' => now(),
            ]);

            Log::info('Sentiment analysis completed', ['feedback_id' => $this->feedbackId]);
        } catch (\Exception $e) {
            Log::error('Sentiment analysis failed', [
                'feedback_id' => $this->feedbackId,
                'error' => $e->getMessage(),
            ]);

            // Don't throw - allow job to complete even if sentiment analysis fails
            // This prevents the entire API request from failing
            // You can check logs to see why sentiment analysis didn't work
            Log::warning('Sentiment analysis job completed with errors', [
                'feedback_id' => $this->feedbackId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}

