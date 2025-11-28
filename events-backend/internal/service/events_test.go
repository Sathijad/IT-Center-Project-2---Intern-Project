package service

import (
	"testing"
)

func TestNormaliseTags(t *testing.T) {
	input := []string{" HR ", "hr", "Culture", "  "}
	got := normaliseTags(input)
	if len(got) != 2 {
		t.Fatalf("expected 2 tags, got %v", got)
	}
	if got[0] != "hr" || got[1] != "culture" {
		t.Fatalf("unexpected tags order/content: %v", got)
	}
}

func TestStripHTML(t *testing.T) {
	result := stripHTML("<p>Hello <strong>World</strong></p>")
	if result != "Hello World" {
		t.Fatalf("unexpected text: %s", result)
	}
}

