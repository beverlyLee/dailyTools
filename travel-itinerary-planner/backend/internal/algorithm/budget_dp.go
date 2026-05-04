package algorithm

import (
	"sort"
)

type BudgetItem struct {
	ID       string
	Cost     float64
	Value    float64
	Duration int
	Name     string
}

type BudgetResult struct {
	SelectedItems []*BudgetItem
	TotalCost     float64
	TotalValue    float64
	TotalDuration int
}

func MaximizeCoverageWithBudget(items []*BudgetItem, budget float64, maxDuration int) *BudgetResult {
	if len(items) == 0 || budget <= 0 {
		return &BudgetResult{}
	}

	items = filterItems(items, budget, maxDuration)
	if len(items) == 0 {
		return &BudgetResult{}
	}

	sort.Slice(items, func(i, j int) bool {
		ratioI := items[i].Value / items[i].Cost
		ratioJ := items[j].Value / items[j].Cost
		return ratioI > ratioJ
	})

	result := &BudgetResult{}
	remainingBudget := budget
	remainingDuration := maxDuration

	for _, item := range items {
		if item.Cost <= remainingBudget && item.Duration <= remainingDuration {
			result.SelectedItems = append(result.SelectedItems, item)
			result.TotalCost += item.Cost
			result.TotalValue += item.Value
			result.TotalDuration += item.Duration
			remainingBudget -= item.Cost
			remainingDuration -= item.Duration
		}
	}

	optimizedResult := optimizeWithDP(items, budget, maxDuration)
	if optimizedResult.TotalValue > result.TotalValue {
		return optimizedResult
	}

	return result
}

func optimizeWithDP(items []*BudgetItem, budget float64, maxDuration int) *BudgetResult {
	n := len(items)
	if n == 0 {
		return &BudgetResult{}
	}

	budgetInt := int(budget * 100)
	scaleFactor := 100

	dp := make([][]float64, n+1)
	keep := make([][]bool, n+1)

	for i := range dp {
		dp[i] = make([]float64, budgetInt+1)
		keep[i] = make([]bool, budgetInt+1)
	}

	for i := 1; i <= n; i++ {
		item := items[i-1]
		itemCost := int(item.Cost * float64(scaleFactor))

		for b := 0; b <= budgetInt; b++ {
			if itemCost <= b {
				if dp[i-1][b] < dp[i-1][b-itemCost]+item.Value {
					dp[i][b] = dp[i-1][b-itemCost] + item.Value
					keep[i][b] = true
				} else {
					dp[i][b] = dp[i-1][b]
					keep[i][b] = false
				}
			} else {
				dp[i][b] = dp[i-1][b]
				keep[i][b] = false
			}
		}
	}

	result := &BudgetResult{}
	b := budgetInt

	for i := n; i > 0; i-- {
		if keep[i][b] {
			item := items[i-1]
			result.SelectedItems = append(result.SelectedItems, item)
			result.TotalCost += item.Cost
			result.TotalValue += item.Value
			result.TotalDuration += item.Duration
			b -= int(item.Cost * float64(scaleFactor))
		}
	}

	for i, j := 0, len(result.SelectedItems)-1; i < j; i, j = i+1, j-1 {
		result.SelectedItems[i], result.SelectedItems[j] = result.SelectedItems[j], result.SelectedItems[i]
	}

	return result
}

func filterItems(items []*BudgetItem, budget float64, maxDuration int) []*BudgetItem {
	var filtered []*BudgetItem
	for _, item := range items {
		if item.Cost <= budget && item.Cost > 0 {
			if maxDuration <= 0 || item.Duration <= maxDuration {
				filtered = append(filtered, item)
			}
		}
	}
	return filtered
}

func OptimizeItineraryWithConstraints(items []*BudgetItem, dailyBudget float64, days int, dailyHours int) []*BudgetResult {
	maxDailyDuration := dailyHours * 60
	dailyResults := make([]*BudgetResult, 0, days)

	sort.Slice(items, func(i, j int) bool {
		if items[i].Value != items[j].Value {
			return items[i].Value > items[j].Value
		}
		return items[i].Cost < items[j].Cost
	})

	remainingItems := make([]*BudgetItem, len(items))
	copy(remainingItems, items)

	for day := 0; day < days; day++ {
		if len(remainingItems) == 0 {
			break
		}

		dayResult := MaximizeCoverageWithBudget(remainingItems, dailyBudget, maxDailyDuration)

		if len(dayResult.SelectedItems) == 0 {
			dayResult.SelectedItems = []*BudgetItem{}
		}

		dailyResults = append(dailyResults, dayResult)

		selectedMap := make(map[string]bool)
		for _, item := range dayResult.SelectedItems {
			selectedMap[item.ID] = true
		}

		var newRemaining []*BudgetItem
		for _, item := range remainingItems {
			if !selectedMap[item.ID] {
				newRemaining = append(newRemaining, item)
			}
		}
		remainingItems = newRemaining
	}

	for len(dailyResults) < days {
		dailyResults = append(dailyResults, &BudgetResult{
			SelectedItems: []*BudgetItem{},
		})
	}

	return dailyResults
}

func CalculateItemValue(attraction interface{}) float64 {
	switch v := attraction.(type) {
	case map[string]interface{}:
		rating, _ := v["rating"].(float64)
		duration, _ := v["visit_duration"].(int)
		if rating > 0 {
			return rating * 10 + float64(duration)/60
		}
		return 5.0
	default:
		return 5.0
	}
}
