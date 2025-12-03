package clients

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ses"
	"github.com/aws/aws-sdk-go-v2/service/ses/types"
	"log/slog"
)

// SESEmailSender sends emails via AWS SES
type SESEmailSender struct {
	client *ses.Client
	sender string
	region string
}

// NewSESEmailSender creates a new SES email sender
func NewSESEmailSender(ctx context.Context, region, sender string) (*SESEmailSender, error) {
	if sender == "" {
		return nil, fmt.Errorf("SES sender email is required")
	}
	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(region))
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}
	return &SESEmailSender{
		client: ses.NewFromConfig(cfg),
		sender: sender,
		region: region,
	}, nil
}

// SendEventEmail sends an event announcement email to recipients
func (s *SESEmailSender) SendEventEmail(ctx context.Context, subject, bodyHTML, bodyText string, recipients []string) error {
	if len(recipients) == 0 {
		return fmt.Errorf("no recipients provided")
	}

	// Test mode: Only send to verified emails when in SES sandbox
	testMode := os.Getenv("EVENTS_EMAIL_TEST_MODE") == "true"
	if testMode {
		// Only send to the two verified emails in sandbox
		recipients = []string{
			"sathija.d@eyepax.com",
			"sathija2000@gmail.com",
		}
		log.Printf("ses.send_email TEST MODE: limiting recipients to verified emails only")
	}

	log.Printf("ses.send_email sender=%s recipients=%d list=%v", s.sender, len(recipients), recipients)

	// For now, send to all recipients in one email (can be optimized later)
	// SES allows up to 50 recipients per email
	if len(recipients) > 50 {
		// Split into batches if needed
		for i := 0; i < len(recipients); i += 50 {
			end := i + 50
			if end > len(recipients) {
				end = len(recipients)
			}
			if err := s.sendBatch(ctx, subject, bodyHTML, bodyText, recipients[i:end]); err != nil {
				return err
			}
		}
		return nil
	}

	return s.sendBatch(ctx, subject, bodyHTML, bodyText, recipients)
}

func (s *SESEmailSender) sendBatch(ctx context.Context, subject, bodyHTML, bodyText string, recipients []string) error {
	// Build email message
	message := &types.Message{
		Subject: &types.Content{
			Data:    aws.String(subject),
			Charset: aws.String("UTF-8"),
		},
		Body: &types.Body{},
	}

	if bodyHTML != "" {
		message.Body.Html = &types.Content{
			Data:    aws.String(bodyHTML),
			Charset: aws.String("UTF-8"),
		}
	}

	if bodyText != "" {
		message.Body.Text = &types.Content{
			Data:    aws.String(bodyText),
			Charset: aws.String("UTF-8"),
		}
	}

	// Convert recipients to destination format
	dest := &types.Destination{
		ToAddresses: recipients,
	}

	input := &ses.SendEmailInput{
		Source:      aws.String(s.sender),
		Destination: dest,
		Message:     message,
	}

	slog.InfoContext(ctx, "ses.send_email", "sender", s.sender, "recipients", len(recipients))

	result, err := s.client.SendEmail(ctx, input)
	if err != nil {
		slog.ErrorContext(ctx, "ses.send_email.failed", "err", err, "recipients", len(recipients))
		return fmt.Errorf("failed to send email: %w", err)
	}

	slog.InfoContext(ctx, "ses.send_email.success", "message_id", result.MessageId, "recipients", len(recipients))
	return nil
}

