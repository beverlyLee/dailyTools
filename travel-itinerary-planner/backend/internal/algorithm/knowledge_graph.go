package algorithm

import (
	"sort"
	"sync"
)

type NodeType string

const (
	NodeTypeCity       NodeType = "city"
	NodeTypeAttraction NodeType = "attraction"
	NodeTypeRestaurant NodeType = "restaurant"
)

type RelationType string

const (
	RelationLocatedIn   RelationType = "located_in"
	RelationNearby      RelationType = "nearby"
	RelationPopularWith RelationType = "popular_with"
	RelationSimilarTo   RelationType = "similar_to"
	RelationOpenTime    RelationType = "open_time"
)

type GraphNode struct {
	ID       string
	Type     NodeType
	Label    string
	Data     map[string]interface{}
	Edges    map[string]*GraphEdge
	mu       sync.RWMutex
}

type GraphEdge struct {
	From         string
	To           string
	RelationType RelationType
	Weight       float64
	Properties   map[string]interface{}
}

type KnowledgeGraph struct {
	Nodes map[string]*GraphNode
	mu    sync.RWMutex
}

func NewKnowledgeGraph() *KnowledgeGraph {
	return &KnowledgeGraph{
		Nodes: make(map[string]*GraphNode),
	}
}

func (kg *KnowledgeGraph) AddNode(id string, nodeType NodeType, label string, data map[string]interface{}) {
	kg.mu.Lock()
	defer kg.mu.Unlock()

	if kg.Nodes[id] == nil {
		kg.Nodes[id] = &GraphNode{
			ID:    id,
			Type:  nodeType,
			Label: label,
			Data:  data,
			Edges: make(map[string]*GraphEdge),
		}
	} else {
		kg.Nodes[id].Label = label
		kg.Nodes[id].Data = data
	}
}

func (kg *KnowledgeGraph) GetNode(id string) *GraphNode {
	kg.mu.RLock()
	defer kg.mu.RUnlock()
	return kg.Nodes[id]
}

func (kg *KnowledgeGraph) AddEdge(fromID, toID string, relType RelationType, weight float64, properties map[string]interface{}) {
	kg.mu.Lock()
	defer kg.mu.Unlock()

	fromNode := kg.Nodes[fromID]
	toNode := kg.Nodes[toID]

	if fromNode == nil || toNode == nil {
		return
	}

	edgeKey := fromID + "|" + toID + "|" + string(relType)
	fromNode.mu.Lock()
	fromNode.Edges[edgeKey] = &GraphEdge{
		From:         fromID,
		To:           toID,
		RelationType: relType,
		Weight:       weight,
		Properties:   properties,
	}
	fromNode.mu.Unlock()
}

func (kg *KnowledgeGraph) FindNeighbors(nodeID string, relType RelationType) []*GraphNode {
	kg.mu.RLock()
	node := kg.Nodes[nodeID]
	kg.mu.RUnlock()

	if node == nil {
		return nil
	}

	node.mu.RLock()
	defer node.mu.RUnlock()

	var neighbors []*GraphNode
	for _, edge := range node.Edges {
		if relType == "" || edge.RelationType == relType {
			kg.mu.RLock()
			neighbor := kg.Nodes[edge.To]
			kg.mu.RUnlock()
			if neighbor != nil {
				neighbors = append(neighbors, neighbor)
			}
		}
	}
	return neighbors
}

func (kg *KnowledgeGraph) FindNearbyAttractions(cityID string, maxDistance float64) []*GraphNode {
	return kg.findNearbyByType(cityID, maxDistance, NodeTypeAttraction)
}

func (kg *KnowledgeGraph) FindNearbyRestaurants(cityID string, maxDistance float64) []*GraphNode {
	return kg.findNearbyByType(cityID, maxDistance, NodeTypeRestaurant)
}

func (kg *KnowledgeGraph) findNearbyByType(cityID string, maxDistance float64, nodeType NodeType) []*GraphNode {
	cityNode := kg.GetNode(cityID)
	if cityNode == nil || cityNode.Type != NodeTypeCity {
		return nil
	}

	cityLat, _ := cityNode.Data["latitude"].(float64)
	cityLon, _ := cityNode.Data["longitude"].(float64)

	var results []*GraphNode
	kg.mu.RLock()
	for _, node := range kg.Nodes {
		if node.Type == nodeType {
			nodeLat, _ := node.Data["latitude"].(float64)
			nodeLon, _ := node.Data["longitude"].(float64)
			distance := HaversineDistance(cityLat, cityLon, nodeLat, nodeLon)
			if distance <= maxDistance {
				results = append(results, node)
			}
		}
	}
	kg.mu.RUnlock()

	sort.Slice(results, func(i, j int) bool {
		lat1, _ := results[i].Data["latitude"].(float64)
		lon1, _ := results[i].Data["longitude"].(float64)
		dist1 := HaversineDistance(cityLat, cityLon, lat1, lon1)

		lat2, _ := results[j].Data["latitude"].(float64)
		lon2, _ := results[j].Data["longitude"].(float64)
		dist2 := HaversineDistance(cityLat, cityLon, lat2, lon2)

		return dist1 < dist2
	})

	return results
}

func (kg *KnowledgeGraph) RecommendByBudget(cityID string, budget float64) []*GraphNode {
	cityNode := kg.GetNode(cityID)
	if cityNode == nil || cityNode.Type != NodeTypeCity {
		return nil
	}

	var affordable []*GraphNode
	kg.mu.RLock()
	for _, node := range kg.Nodes {
		if node.Type == NodeTypeAttraction {
			cost, _ := node.Data["entry_fee"].(float64)
			if cost <= budget {
				affordable = append(affordable, node)
			}
		}
	}
	kg.mu.RUnlock()

	sort.Slice(affordable, func(i, j int) bool {
		ratingI, _ := affordable[i].Data["rating"].(float64)
		ratingJ, _ := affordable[j].Data["rating"].(float64)
		return ratingI > ratingJ
	})

	return affordable
}

func (kg *KnowledgeGraph) FindSimilarAttractions(attractionID string) []*GraphNode {
	return kg.FindNeighbors(attractionID, RelationSimilarTo)
}

func (kg *KnowledgeGraph) GetAllCities() []*GraphNode {
	var cities []*GraphNode
	kg.mu.RLock()
	defer kg.mu.RUnlock()

	for _, node := range kg.Nodes {
		if node.Type == NodeTypeCity {
			cities = append(cities, node)
		}
	}
	return cities
}

func (kg *KnowledgeGraph) GetAttractionsInCity(cityID string) []*GraphNode {
	return kg.FindNeighbors(cityID, RelationLocatedIn)
}

func (kg *KnowledgeGraph) GetRestaurantsInCity(cityID string) []*GraphNode {
	var restaurants []*GraphNode
	kg.mu.RLock()
	defer kg.mu.RUnlock()

	for _, node := range kg.Nodes {
		if node.Type == NodeTypeRestaurant {
			if city, ok := node.Data["city_id"].(string); ok && city == cityID {
				restaurants = append(restaurants, node)
			}
		}
	}
	return restaurants
}
