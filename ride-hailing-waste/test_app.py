import sys
sys.path.insert(0, 'src')

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

print("Testing API endpoints...")
print()

resp = client.get('/api/health')
print(f'Health: {resp.status_code}')
print(f'  {resp.json()}')
print()

resp = client.get('/api/areas')
data = resp.json()
print(f'Areas: {resp.status_code}, count={data["count"]}')
for name, info in list(data['areas'].items())[:3]:
    print(f'  - {name}: type={info["type"]}, center={info["center"]}')
print()

resp = client.get('/api/waste?num_vehicles=100&vehicle_type=gasoline')
data = resp.json()
print(f'Waste metrics: {resp.status_code}')
print(f'  Vehicle type: {data["vehicle_type"]}')
print(f'  Empty ratio: {data["waste_metrics"]["empty_ratio_percent"]}%')
print(f'  Empty carbon: {data["waste_metrics"]["carbon_emission"]["empty_kg"]} kg')
print()

resp = client.get('/api/visualization?num_vehicles=100')
data = resp.json()
print(f'Visualization: {resp.status_code}')
print(f'  Empty segments: {len(data["empty_segments"])}')
print(f'  Occupied segments: {len(data["occupied_segments"])}')
print(f'  Density heatmap points: {len(data["density_heatmap"])}')
print()

resp = client.get('/')
print(f'Root page: {resp.status_code}')
print(f'  Content length: {len(resp.content)} bytes')
print()

print('All tests passed!')
