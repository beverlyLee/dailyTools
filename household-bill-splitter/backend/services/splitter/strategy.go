package splitter

import (
	"encoding/json"
	"errors"
	"fmt"
	"household-bill-splitter/models"
)

type SplitStrategy interface {
	Name() string
	Calculate(totalAmount float64, users []models.User, params map[string]interface{}) ([]SplitShare, error)
}

type SplitShare struct {
	UserID uint    `json:"user_id"`
	Amount float64 `json:"amount"`
	Ratio  float64 `json:"ratio"`
}

type SplitContext struct {
	strategy SplitStrategy
}

func NewSplitContext() *SplitContext {
	return &SplitContext{}
}

func (c *SplitContext) SetStrategy(strategy SplitStrategy) {
	c.strategy = strategy
}

func (c *SplitContext) Calculate(totalAmount float64, users []models.User, params map[string]interface{}) ([]SplitShare, error) {
	if c.strategy == nil {
		return nil, errors.New("no strategy set")
	}
	return c.strategy.Calculate(totalAmount, users, params)
}

type EqualSplitStrategy struct{}

func (s *EqualSplitStrategy) Name() string {
	return "equal"
}

func (s *EqualSplitStrategy) Calculate(totalAmount float64, users []models.User, params map[string]interface{}) ([]SplitShare, error) {
	if len(users) == 0 {
		return nil, errors.New("no users to split")
	}

	perPerson := totalAmount / float64(len(users))
	ratio := 1.0 / float64(len(users))

	var shares []SplitShare
	for _, user := range users {
		shares = append(shares, SplitShare{
			UserID: user.ID,
			Amount: perPerson,
			Ratio:  ratio,
		})
	}

	return shares, nil
}

type RatioSplitStrategy struct{}

func (s *RatioSplitStrategy) Name() string {
	return "ratio"
}

func (s *RatioSplitStrategy) Calculate(totalAmount float64, users []models.User, params map[string]interface{}) ([]SplitShare, error) {
	if len(users) == 0 {
		return nil, errors.New("no users to split")
	}

	ratios, ok := params["ratios"].(map[uint]float64)
	if !ok {
		ratiosStr, ok := params["ratios_str"].(string)
		if !ok {
			return nil, errors.New("ratios parameter required")
		}

		var ratioMap map[uint]float64
		if err := json.Unmarshal([]byte(ratiosStr), &ratioMap); err != nil {
			return nil, fmt.Errorf("invalid ratios format: %v", err)
		}
		ratios = ratioMap
	}

	totalRatio := 0.0
	for _, ratio := range ratios {
		totalRatio += ratio
	}

	if totalRatio == 0 {
		return nil, errors.New("total ratio cannot be zero")
	}

	var shares []SplitShare
	for _, user := range users {
		ratio := ratios[user.ID] / totalRatio
		amount := totalAmount * ratio
		shares = append(shares, SplitShare{
			UserID: user.ID,
			Amount: amount,
			Ratio:  ratio,
		})
	}

	return shares, nil
}

type UsageSplitStrategy struct{}

func (s *UsageSplitStrategy) Name() string {
	return "usage"
}

func (s *UsageSplitStrategy) Calculate(totalAmount float64, users []models.User, params map[string]interface{}) ([]SplitShare, error) {
	if len(users) == 0 {
		return nil, errors.New("no users to split")
	}

	usages, ok := params["usages"].(map[uint]float64)
	if !ok {
		usagesStr, ok := params["usages_str"].(string)
		if !ok {
			return nil, errors.New("usages parameter required")
		}

		var usageMap map[uint]float64
		if err := json.Unmarshal([]byte(usagesStr), &usageMap); err != nil {
			return nil, fmt.Errorf("invalid usages format: %v", err)
		}
		usages = usageMap
	}

	totalUsage := 0.0
	for _, usage := range usages {
		totalUsage += usage
	}

	if totalUsage == 0 {
		return nil, errors.New("total usage cannot be zero")
	}

	var shares []SplitShare
	for _, user := range users {
		usageRatio := usages[user.ID] / totalUsage
		amount := totalAmount * usageRatio
		shares = append(shares, SplitShare{
			UserID: user.ID,
			Amount: amount,
			Ratio:  usageRatio,
		})
	}

	return shares, nil
}

type SplitManager struct {
	strategies map[string]SplitStrategy
}

func NewSplitManager() *SplitManager {
	return &SplitManager{
		strategies: map[string]SplitStrategy{
			"equal": &EqualSplitStrategy{},
			"ratio": &RatioSplitStrategy{},
			"usage": &UsageSplitStrategy{},
		},
	}
}

func (m *SplitManager) GetStrategy(name string) (SplitStrategy, bool) {
	strategy, ok := m.strategies[name]
	return strategy, ok
}

func (m *SplitManager) Split(totalAmount float64, users []models.User, strategy string, params map[string]interface{}) ([]SplitShare, error) {
	strat, ok := m.GetStrategy(strategy)
	if !ok {
		return nil, fmt.Errorf("unknown strategy: %s", strategy)
	}

	return strat.Calculate(totalAmount, users, params)
}
