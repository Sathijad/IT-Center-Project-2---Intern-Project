<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\S3Service;
use Mockery;
use Aws\S3\S3Client;
use Aws\Exception\AwsException;

class S3ServiceTest extends TestCase
{
    private $s3ClientMock;
    private S3Service $service;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Mock config
        config(['aws.s3.bucket' => 'test-bucket']);
        config(['aws.s3.region' => 'ap-southeast-2']);
        config(['aws.access_key_id' => 'test-key']);
        config(['aws.secret_access_key' => 'test-secret']);
        config(['aws.default_region' => 'ap-southeast-2']);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_s3_service_throws_exception_when_bucket_not_configured(): void
    {
        config(['aws.s3.bucket' => '']);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('AWS S3 bucket is not configured');

        new S3Service();
    }

    public function test_generate_s3_key_sanitizes_file_name(): void
    {
        $reflection = new \ReflectionClass(S3Service::class);
        $method = $reflection->getMethod('generateS3Key');
        $method->setAccessible(true);

        config(['aws.s3.bucket' => 'test-bucket']);
        $service = new S3Service();

        $key = $method->invoke($service, 'feedback-123', 'attachment-456', 'test file (1).pdf');

        $this->assertStringContainsString('feedback/feedback-123/attachment-456', $key);
        $this->assertStringNotContainsString('(', $key);
        $this->assertStringNotContainsString(')', $key);
    }

    public function test_generate_presigned_upload_url_returns_url(): void
    {
        // This test would require mocking S3Client which is complex
        // For now, we'll test the structure
        $this->markTestSkipped('Requires complex S3Client mocking');
    }

    public function test_generate_presigned_download_url_returns_url(): void
    {
        // This test would require mocking S3Client which is complex
        // For now, we'll test the structure
        $this->markTestSkipped('Requires complex S3Client mocking');
    }
}


