package settlement

import (
	"math"
)

type Balance struct {
	UserID uint    `json:"user_id"`
	Amount float64 `json:"amount"`
}

type Transfer struct {
	FromUserID uint    `json:"from_user_id"`
	ToUserID   uint    `json:"to_user_id"`
	Amount     float64 `json:"amount"`
}

type MinCashFlowCalculator struct{}

func NewMinCashFlowCalculator() *MinCashFlowCalculator {
	return &MinCashFlowCalculator{}
}

func (c *MinCashFlowCalculator) CalculateBalances(balances map[uint]float64) []Balance {
	var result []Balance
	for userID, amount := range balances {
		if math.Abs(amount) > 0.01 {
			result = append(result, Balance{
				UserID: userID,
				Amount: amount,
			})
		}
	}
	return result
}

func (c *MinCashFlowCalculator) CalculateTransfers(balances map[uint]float64) []Transfer {
	positiveBalances := make(map[uint]float64)
	negativeBalances := make(map[uint]float64)

	for userID, amount := range balances {
		if amount > 0.01 {
			positiveBalances[userID] = amount
		} else if amount < -0.01 {
			negativeBalances[userID] = -amount
		}
	}

	var transfers []Transfer

	for len(positiveBalances) > 0 && len(negativeBalances) > 0 {
		var maxPositiveID uint
		maxPositiveAmount := 0.0
		for id, amount := range positiveBalances {
			if amount > maxPositiveAmount {
				maxPositiveAmount = amount
				maxPositiveID = id
			}
		}

		var maxNegativeID uint
		maxNegativeAmount := 0.0
		for id, amount := range negativeBalances {
			if amount > maxNegativeAmount {
				maxNegativeAmount = amount
				maxNegativeID = id
			}
		}

		if maxPositiveAmount <= 0.01 || maxNegativeAmount <= 0.01 {
			break
		}

		var transferAmount float64
		if maxPositiveAmount <= maxNegativeAmount {
			transferAmount = maxPositiveAmount
			transfers = append(transfers, Transfer{
				FromUserID: maxNegativeID,
				ToUserID:   maxPositiveID,
				Amount:     transferAmount,
			})
			delete(positiveBalances, maxPositiveID)
			remaining := maxNegativeAmount - maxPositiveAmount
			if remaining > 0.01 {
				negativeBalances[maxNegativeID] = remaining
			} else {
				delete(negativeBalances, maxNegativeID)
			}
		} else {
			transferAmount = maxNegativeAmount
			transfers = append(transfers, Transfer{
				FromUserID: maxNegativeID,
				ToUserID:   maxPositiveID,
				Amount:     transferAmount,
			})
			delete(negativeBalances, maxNegativeID)
			remaining := maxPositiveAmount - maxNegativeAmount
			if remaining > 0.01 {
				positiveBalances[maxPositiveID] = remaining
			} else {
				delete(positiveBalances, maxPositiveID)
			}
		}
	}

	return transfers
}

func (c *MinCashFlowCalculator) CalculateFromSplitResults(
	splitResults map[uint]float64,
	payerID uint,
	totalAmount float64,
) ([]Transfer, error) {
	balances := make(map[uint]float64)

	balances[payerID] = totalAmount

	for userID, amount := range splitResults {
		balances[userID] -= amount
	}

	return c.CalculateTransfers(balances), nil
}

func (c *MinCashFlowCalculator) CalculateMultipleBills(
	bills []map[string]interface{},
) ([]Transfer, error) {
	balances := make(map[uint]float64)

	for _, bill := range bills {
		payerID, ok := bill["payer_id"].(uint)
		if !ok {
			payerIDFloat, ok := bill["payer_id"].(float64)
			if ok {
				payerID = uint(payerIDFloat)
			}
		}

		totalAmount, ok := bill["total_amount"].(float64)
		if !ok {
			continue
		}

		splitResults, ok := bill["split_results"].(map[uint]float64)
		if !ok {
			splitResultsFloat, ok := bill["split_results"].(map[interface{}]interface{})
			if ok {
				splitResults = make(map[uint]float64)
				for k, v := range splitResultsFloat {
					if userID, ok := k.(uint); ok {
						if amount, ok := v.(float64); ok {
							splitResults[userID] = amount
						}
					}
				}
			} else {
				continue
			}
		}

		balances[payerID] += totalAmount

		for userID, amount := range splitResults {
			balances[userID] -= amount
		}
	}

	return c.CalculateTransfers(balances), nil
}
