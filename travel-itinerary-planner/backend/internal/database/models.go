package database

import (
	"time"
)

type City struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Country     string    `json:"country"`
	Latitude    float64   `json:"latitude"`
	Longitude   float64   `json:"longitude"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Attraction struct {
	ID            int       `json:"id"`
	CityID        int       `json:"city_id"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	Latitude      float64   `json:"latitude"`
	Longitude     float64   `json:"longitude"`
	EntryFee      float64   `json:"entry_fee"`
	VisitDuration int       `json:"visit_duration"`
	Rating        float64   `json:"rating"`
	OpenTime      string    `json:"open_time"`
	CloseTime     string    `json:"close_time"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type Restaurant struct {
	ID          int       `json:"id"`
	CityID      int       `json:"city_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Latitude    float64   `json:"latitude"`
	Longitude   float64   `json:"longitude"`
	CuisineType string    `json:"cuisine_type"`
	AvgPrice    float64   `json:"avg_price"`
	Rating      float64   `json:"rating"`
	OpenTime    string    `json:"open_time"`
	CloseTime   string    `json:"close_time"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Itinerary struct {
	ID         int       `json:"id"`
	UserID     string    `json:"user_id"`
	Title      string    `json:"title"`
	CityID     int       `json:"city_id"`
	StartDate  string    `json:"start_date"`
	EndDate    string    `json:"end_date"`
	TotalBudget float64   `json:"total_budget"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type ItineraryItem struct {
	ID            int       `json:"id"`
	ItineraryID   int       `json:"itinerary_id"`
	ItemType      string    `json:"item_type"`
	AttractionID  *int      `json:"attraction_id"`
	RestaurantID  *int      `json:"restaurant_id"`
	DayNumber     int       `json:"day_number"`
	StartTime     string    `json:"start_time"`
	EndTime       string    `json:"end_time"`
	Cost          float64   `json:"cost"`
	Notes         string    `json:"notes"`
	SequenceOrder int       `json:"sequence_order"`
	CreatedAt     time.Time `json:"created_at"`
}

type Location struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type TimeWindow struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}
