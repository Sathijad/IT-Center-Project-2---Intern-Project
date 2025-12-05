<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TeamsService
{
    private ?string $webhookUrl;
    private ?string $botToken;

    public function __construct()
    {
        $this->webhookUrl = config('services.teams.webhook_url');
        $this->botToken = config('services.teams.bot_token');
    }

    public function sendNotification(string $feedbackId, array $feedbackData, ?string $channelId = null): bool
    {
        if (!$this->webhookUrl && !$this->botToken) {
            Log::warning('Teams notification skipped: no webhook URL or bot token configured');
            return false;
        }

        $card = $this->buildCard($feedbackId, $feedbackData);

        if ($this->webhookUrl) {
            return $this->sendViaWebhook($card);
        } elseif ($this->botToken && $channelId) {
            return $this->sendViaBot($channelId, $card);
        }

        return false;
    }

    private function buildCard(string $feedbackId, array $feedbackData): array
    {
        $statusColor = match($feedbackData['status'] ?? 'OPEN') {
            'OPEN' => '#FFA500',
            'IN_PROGRESS' => '#0078D4',
            'RESOLVED' => '#28A745',
            'CLOSED' => '#6C757D',
            'REJECTED' => '#DC3545',
            default => '#808080',
        };

        return [
            '@type' => 'MessageCard',
            '@context' => 'https://schema.org/extensions',
            'summary' => "Feedback #{$feedbackId}",
            'themeColor' => $statusColor,
            'title' => $feedbackData['title'] ?? 'New Feedback',
            'text' => substr($feedbackData['description'] ?? '', 0, 500),
            'sections' => [
                [
                    'activityTitle' => "Feedback #{$feedbackId}",
                    'facts' => [
                        [
                            'name' => 'Category',
                            'value' => $feedbackData['category'] ?? 'N/A',
                        ],
                        [
                            'name' => 'Priority',
                            'value' => $feedbackData['priority'] ?? 'MEDIUM',
                        ],
                        [
                            'name' => 'Status',
                            'value' => $feedbackData['status'] ?? 'OPEN',
                        ],
                        [
                            'name' => 'Created By',
                            'value' => $feedbackData['created_by_name'] ?? 'Unknown',
                        ],
                    ],
                ],
            ],
            'potentialAction' => [
                [
                    '@type' => 'OpenUri',
                    'name' => 'View Feedback',
                    'targets' => [
                        [
                            'os' => 'default',
                            'uri' => config('app.url') . "/feedback/{$feedbackId}",
                        ],
                    ],
                ],
            ],
        ];
    }

    private function sendViaWebhook(array $card): bool
    {
        try {
            $response = Http::post($this->webhookUrl, $card);

            if ($response->successful()) {
                return true;
            }

            Log::error('Teams webhook failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return false;
        } catch (\Exception $e) {
            Log::error('Teams webhook exception', ['error' => $e->getMessage()]);
            return false;
        }
    }

    private function sendViaBot(string $channelId, array $card): bool
    {
        // Microsoft Graph API implementation would go here
        // For now, return false if only bot token is configured
        Log::warning('Teams bot API not fully implemented');
        return false;
    }
}

