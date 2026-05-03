package push

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const expoEndpoint = "https://exp.host/api/v2/push/send"

type Message struct {
	To    string `json:"to"`
	Title string `json:"title"`
	Body  string `json:"body"`
	Data  any    `json:"data,omitempty"`
}

type ticket struct {
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
}

type apiResponse struct {
	Data []ticket `json:"data"`
}

type Client struct {
	http *http.Client
}

func NewClient() *Client {
	return &Client{
		http: &http.Client{Timeout: 10 * time.Second},
	}
}

// Send delivers one or more push messages to Expo's push API.
// Empty or blank tokens are filtered out before sending.
func (c *Client) Send(msgs []Message) error {
	filtered := msgs[:0]
	for _, m := range msgs {
		if m.To != "" {
			filtered = append(filtered, m)
		}
	}
	if len(filtered) == 0 {
		return nil
	}

	payload, err := json.Marshal(filtered)
	if err != nil {
		return fmt.Errorf("push marshal: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, expoEndpoint, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("push build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("push http: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("expo push returned HTTP %d", resp.StatusCode)
	}

	var result apiResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("push decode response: %w", err)
	}

	for _, t := range result.Data {
		if t.Status == "error" {
			return fmt.Errorf("expo push error: %s", t.Message)
		}
	}

	return nil
}
