import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import TopologyGraph from '../views/TopologyGraph.vue'
import TopologyMetrics from '../views/TopologyMetrics.vue'
import TrafficCanary from '../views/TrafficCanary.vue'
import TrafficBlueGreen from '../views/TrafficBlueGreen.vue'
import TrafficCircuitBreaker from '../views/TrafficCircuitBreaker.vue'
import TrafficMirror from '../views/TrafficMirror.vue'
import TrafficFault from '../views/TrafficFault.vue'

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/topology-graph',
    name: 'TopologyGraph',
    component: TopologyGraph
  },
  {
    path: '/topology-metrics',
    name: 'TopologyMetrics',
    component: TopologyMetrics
  },
  {
    path: '/traffic-canary',
    name: 'TrafficCanary',
    component: TrafficCanary
  },
  {
    path: '/traffic-bluegreen',
    name: 'TrafficBlueGreen',
    component: TrafficBlueGreen
  },
  {
    path: '/traffic-circuitbreaker',
    name: 'TrafficCircuitBreaker',
    component: TrafficCircuitBreaker
  },
  {
    path: '/traffic-mirror',
    name: 'TrafficMirror',
    component: TrafficMirror
  },
  {
    path: '/traffic-fault',
    name: 'TrafficFault',
    component: TrafficFault
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
