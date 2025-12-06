<?php

namespace App\Services;

use Aws\S3\S3Client;
use Aws\Exception\AwsException;
use Illuminate\Support\Facades\Log;

class S3Service
{
    private S3Client $s3Client;
    private string $bucket;
    private string $region;

    public function __construct()
    {
        $this->bucket = config('aws.s3.bucket') ?? '';
        $this->region = config('aws.s3.region') ?? config('aws.default_region') ?? 'ap-southeast-2';

        // Validate required configuration
        if (empty($this->bucket)) {
            throw new \RuntimeException('AWS S3 bucket is not configured. Please set AWS_S3_BUCKET environment variable.');
        }

        $this->s3Client = new S3Client([
            'version' => 'latest',
            'region' => $this->region,
            'credentials' => [
                'key' => config('aws.access_key_id'),
                'secret' => config('aws.secret_access_key'),
            ],
        ]);
    }

    public function generatePresignedUploadUrl(string $feedbackId, string $attachmentId, string $fileName, string $mimeType, int $expirationMinutes = 60): string
    {
        $key = $this->generateS3Key($feedbackId, $attachmentId, $fileName);

        $cmd = $this->s3Client->getCommand('PutObject', [
            'Bucket' => $this->bucket,
            'Key' => $key,
            'ContentType' => $mimeType,
        ]);

        $request = $this->s3Client->createPresignedRequest($cmd, "+{$expirationMinutes} minutes");

        return (string) $request->getUri();
    }

    public function generatePresignedDownloadUrl(string $s3Key, int $expirationMinutes = 60): string
    {
        $cmd = $this->s3Client->getCommand('GetObject', [
            'Bucket' => $this->bucket,
            'Key' => $s3Key,
        ]);

        $request = $this->s3Client->createPresignedRequest($cmd, "+{$expirationMinutes} minutes");

        return (string) $request->getUri();
    }

    public function uploadFile(string $feedbackId, string $attachmentId, string $fileName, $fileContent, string $mimeType): string
    {
        $key = $this->generateS3Key($feedbackId, $attachmentId, $fileName);

        try {
            $result = $this->s3Client->putObject([
                'Bucket' => $this->bucket,
                'Key' => $key,
                'Body' => $fileContent,
                'ContentType' => $mimeType,
            ]);

            return $key;
        } catch (AwsException $e) {
            Log::error('S3 upload failed', ['error' => $e->getMessage(), 'key' => $key]);
            throw new \Exception('Failed to upload file to S3: ' . $e->getMessage());
        }
    }

    public function deleteFile(string $s3Key): bool
    {
        try {
            $this->s3Client->deleteObject([
                'Bucket' => $this->bucket,
                'Key' => $s3Key,
            ]);

            return true;
        } catch (AwsException $e) {
            Log::error('S3 delete failed', ['error' => $e->getMessage(), 'key' => $s3Key]);
            return false;
        }
    }

    private function generateS3Key(string $feedbackId, string $attachmentId, string $fileName): string
    {
        $sanitizedFileName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $fileName);
        return "feedback/{$feedbackId}/{$attachmentId}/{$sanitizedFileName}";
    }
}

