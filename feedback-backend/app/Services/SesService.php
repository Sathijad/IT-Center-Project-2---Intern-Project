<?php

namespace App\Services;

use Aws\Ses\SesClient;
use Aws\Exception\AwsException;
use Illuminate\Support\Facades\Log;

class SesService
{
    private SesClient $sesClient;
    private string $fromEmail;
    private string $fromName;

    public function __construct()
    {
        $this->sesClient = new SesClient([
            'version' => 'latest',
            'region' => config('aws.default_region'),
            'credentials' => [
                'key' => config('aws.access_key_id'),
                'secret' => config('aws.secret_access_key'),
            ],
        ]);

        $this->fromEmail = config('mail.from.address');
        $this->fromName = config('mail.from.name');
    }

    public function sendFeedbackNotification(string $toEmail, string $toName, array $feedbackData, string $eventType = 'created'): bool
    {
        $subject = $this->getSubject($feedbackData, $eventType);
        $body = $this->getBody($feedbackData, $eventType);

        try {
            $result = $this->sesClient->sendEmail([
                'Source' => "{$this->fromName} <{$this->fromEmail}>",
                'Destination' => [
                    'ToAddresses' => [$toEmail],
                ],
                'Message' => [
                    'Subject' => [
                        'Data' => $subject,
                        'Charset' => 'UTF-8',
                    ],
                    'Body' => [
                        'Text' => [
                            'Data' => strip_tags($body),
                            'Charset' => 'UTF-8',
                        ],
                        'Html' => [
                            'Data' => $body,
                            'Charset' => 'UTF-8',
                        ],
                    ],
                ],
            ]);

            return true;
        } catch (AwsException $e) {
            Log::error('SES email send failed', ['error' => $e->getMessage(), 'to' => $toEmail]);
            return false;
        }
    }

    private function getSubject(array $feedbackData, string $eventType): string
    {
        $feedbackId = $feedbackData['feedback_id'] ?? 'N/A';
        $title = $feedbackData['title'] ?? 'Feedback';

        return match($eventType) {
            'created' => "New Feedback: {$title} (#{$feedbackId})",
            'updated' => "Feedback Updated: {$title} (#{$feedbackId})",
            'assigned' => "Feedback Assigned: {$title} (#{$feedbackId})",
            'resolved' => "Feedback Resolved: {$title} (#{$feedbackId})",
            default => "Feedback Notification: {$title} (#{$feedbackId})",
        };
    }

    private function getBody(array $feedbackData, string $eventType): string
    {
        $feedbackId = $feedbackData['feedback_id'] ?? 'N/A';
        $title = $feedbackData['title'] ?? 'Feedback';
        $description = $feedbackData['description'] ?? '';
        $status = $feedbackData['status'] ?? 'OPEN';
        $priority = $feedbackData['priority'] ?? 'MEDIUM';
        $category = $feedbackData['category'] ?? 'N/A';

        $html = "<html><body>";
        $html .= "<h2>{$title}</h2>";
        $html .= "<p><strong>Feedback ID:</strong> {$feedbackId}</p>";
        $html .= "<p><strong>Status:</strong> {$status}</p>";
        $html .= "<p><strong>Priority:</strong> {$priority}</p>";
        $html .= "<p><strong>Category:</strong> {$category}</p>";
        $html .= "<hr>";
        $html .= "<p>" . nl2br(htmlspecialchars($description)) . "</p>";
        $html .= "<hr>";
        $html .= "<p><a href=\"" . config('app.url') . "/feedback/{$feedbackId}\">View Feedback</a></p>";
        $html .= "</body></html>";

        return $html;
    }
}

