package models

type User struct {
	ID           string `json:"id"`
	Email        string `json:"email"`
	Username     string `json:"username"`
	PasswordHash string `json:"-"`
	UserType     string `json:"user_type"` // "job_seeker" or "employer"
	CreatedAt    int64  `json:"created_at"`
	UpdatedAt    int64  `json:"updated_at"`
}

type Profile struct {
	UserID      string   `json:"user_id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	PhotoURL    string   `json:"photo_url"`
	Location    string   `json:"location"`
	Skills      []string `json:"skills"`
	DeviceToken string   `json:"-"` // never expose in API responses
	UpdatedAt   int64    `json:"updated_at"`
}

type Job struct {
	ID          string `json:"id"`
	EmployerID  string `json:"employer_id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Salary      string `json:"salary"`
	Location    string `json:"location"`
	CreatedAt   int64  `json:"created_at"`
}

type Swipe struct {
	ID        string `json:"id"`
	UserID    string `json:"user_id"`
	TargetID  string `json:"target_id"`
	Direction string `json:"direction"` // "right" or "left"
	CreatedAt int64  `json:"created_at"`
}

type Match struct {
	ID        string `json:"id"`
	UserID1   string `json:"user_id_1"`
	UserID2   string `json:"user_id_2"`
	CreatedAt int64  `json:"created_at"`
}

type Message struct {
	ID        string `json:"id"`
	MatchID   string `json:"match_id"`
	SenderID  string `json:"sender_id"`
	Content   string `json:"content"`
	CreatedAt int64  `json:"created_at"`
}
