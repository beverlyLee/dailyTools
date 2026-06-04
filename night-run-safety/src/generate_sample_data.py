import os
import json
import random
import math
from datetime import datetime

random.seed(42)

CENTER_LNG = 121.4737
CENTER_LAT = 31.2304


def generate_ring_road(center_lng, center_lat, radius_km, num_points, start_angle=0):
    points = []
    for i in range(num_points):
        angle = start_angle + (2 * math.pi * i / num_points)
        lng = center_lng + (radius_km * math.cos(angle)) / 111
        lat = center_lat + (radius_km * math.sin(angle)) / (111 * math.cos(center_lat * math.pi / 180))
        points.append([round(lng, 6), round(lat, 6)])
    return points


def generate_radial_road(center_lng, center_lat, angle, length_km, num_points):
    points = []
    for i in range(num_points + 1):
        dist = (length_km * i) / num_points
        lng = center_lng + (dist * math.cos(angle)) / 111
        lat = center_lat + (dist * math.sin(angle)) / (111 * math.cos(center_lat * math.pi / 180))
        points.append([round(lng, 6), round(lat, 6)])
    return points


def generate_riverside_road():
    points = []
    for i in range(20):
        t = i / 19
        lng = CENTER_LNG - 0.02 + t * 0.04
        lat = CENTER_LAT + 0.01 + 0.005 * math.sin(t * math.pi * 2)
        points.append([round(lng, 6), round(lat, 6)])
    return points


def generate_alley(center_lng, center_lat, length):
    points = []
    angle = random.uniform(0, 2 * math.pi)
    for i in range(5):
        dist = (length * i) / 4
        lng = center_lng + (dist * math.cos(angle)) / 111
        lat = center_lat + (dist * math.sin(angle)) / (111 * math.cos(center_lat * math.pi / 180))
        points.append([round(lng, 6), round(lat, 6)])
    return points


road_names = {
    "primary": ["南京东路", "延安中路", "淮海中路", "西藏中路", "北京东路", "四川北路", "河南中路", "浙江中路"],
    "secondary": ["福州路", "汉口路", "九江路", "宁波路", "天津路", "广东路", "广西北路", "云南南路"],
    "residential": ["新昌路", "长沙路", "厦门路", "温州路", "金华路", "牯岭路", "桃源路", "巨鹿路"],
    "footway": ["人民广场步道", "外滩观光步道", "南京路步行街", "豫园步道", "古城公园步道"],
    "riverside": ["黄浦江滨江步道", "苏州河滨水绿道", "外滩滨江大道", "陆家嘴滨江步道"],
    "alley": ["弄堂小巷", "石库门里弄", "老弄堂", "小胡同", "僻静小路"],
}

highway_types = ["primary", "secondary", "tertiary", "residential", "footway", "path", "pedestrian", "cycleway"]

segments = []
segment_id = 1

inner_ring = generate_ring_road(CENTER_LNG, CENTER_LAT, 0.8, 24)
for i in range(len(inner_ring)):
    start = inner_ring[i]
    end = inner_ring[(i + 1) % len(inner_ring)]
    name = random.choice(road_names["secondary"])
    lit = True
    width = random.uniform(8, 15)
    length = 200 + random.uniform(-50, 50)

    segments.append({
        "segment_id": f"way_{segment_id}",
        "coordinates": [start, end],
        "highway": "secondary",
        "lit": lit,
        "width": width,
        "surface": "asphalt",
        "length": length,
        "name": name,
    })
    segment_id += 1

outer_ring = generate_ring_road(CENTER_LNG, CENTER_LAT, 2.0, 32, math.pi / 32)
for i in range(len(outer_ring)):
    start = outer_ring[i]
    end = outer_ring[(i + 1) % len(outer_ring)]
    name = random.choice(road_names["primary"])
    lit = True
    width = random.uniform(15, 25)
    length = 350 + random.uniform(-80, 80)

    segments.append({
        "segment_id": f"way_{segment_id}",
        "coordinates": [start, end],
        "highway": "primary",
        "lit": lit,
        "width": width,
        "surface": "asphalt",
        "length": length,
        "name": name,
    })
    segment_id += 1

for i in range(12):
    angle = (2 * math.pi * i) / 12
    radial = generate_radial_road(CENTER_LNG, CENTER_LAT, angle, 2.5, 10)

    for j in range(len(radial) - 1):
        start = radial[j]
        end = radial[j + 1]
        dist_from_center = math.sqrt(
            ((start[0] + end[0]) / 2 - CENTER_LNG) ** 2 +
            ((start[1] + end[1]) / 2 - CENTER_LAT) ** 2
        ) * 111

        if dist_from_center < 1.0:
            highway = "tertiary"
            name = random.choice(road_names["secondary"])
            width = random.uniform(6, 10)
        else:
            highway = "residential"
            name = random.choice(road_names["residential"])
            width = random.uniform(4, 7)

        lit = dist_from_center < 1.8 or random.random() > 0.3

        segments.append({
            "segment_id": f"way_{segment_id}",
            "coordinates": [start, end],
            "highway": highway,
            "lit": lit,
            "width": width,
            "surface": "asphalt" if random.random() > 0.1 else "unpaved",
            "length": 250 + random.uniform(-50, 50),
            "name": name,
        })
        segment_id += 1

riverside = generate_riverside_road()
for i in range(len(riverside) - 1):
    start = riverside[i]
    end = riverside[i + 1]

    segments.append({
        "segment_id": f"way_{segment_id}",
        "coordinates": [start, end],
        "highway": "pedestrian",
        "lit": True,
        "width": 5.0,
        "surface": "paved",
        "length": 100 + random.uniform(-20, 20),
        "name": road_names["riverside"][i % len(road_names["riverside"])],
    })
    segment_id += 1

for i in range(8):
    points = generate_radial_road(CENTER_LNG, CENTER_LAT, (2 * math.pi * i) / 8 + 0.2, 1.0, 5)
    for j in range(len(points) - 1):
        start = points[j]
        end = points[j + 1]

        segments.append({
            "segment_id": f"way_{segment_id}",
            "coordinates": [start, end],
            "highway": "footway",
            "lit": random.random() > 0.5,
            "width": 3.0,
            "surface": "paved",
            "length": 150 + random.uniform(-30, 30),
            "name": road_names["footway"][i % len(road_names["footway"])],
        })
        segment_id += 1

for i in range(15):
    offset_lng = random.uniform(-0.03, 0.03)
    offset_lat = random.uniform(-0.03, 0.03)
    alley = generate_alley(
        CENTER_LNG + offset_lng,
        CENTER_LAT + offset_lat,
        random.uniform(0.2, 0.5)
    )

    for j in range(len(alley) - 1):
        segments.append({
            "segment_id": f"way_{segment_id}",
            "coordinates": [alley[j], alley[j + 1]],
            "highway": "path",
            "lit": random.random() > 0.7,
            "width": random.uniform(1.5, 3),
            "surface": random.choice(["unpaved", "gravel", "dirt", "ground"]),
            "length": random.uniform(50, 120),
            "name": random.choice(road_names["alley"]),
        })
        segment_id += 1

for i in range(10):
    offset_lng = random.uniform(-0.025, 0.025)
    offset_lat = random.uniform(-0.025, 0.025)
    angle = random.uniform(0, 2 * math.pi)
    length = random.uniform(0.3, 0.6)

    points = []
    for j in range(6):
        dist = (length * j) / 5
        lng = CENTER_LNG + offset_lng + (dist * math.cos(angle)) / 111
        lat = CENTER_LAT + offset_lat + (dist * math.sin(angle)) / (111 * math.cos(CENTER_LAT * math.pi / 180))
        points.append([round(lng, 6), round(lat, 6)])

    for j in range(len(points) - 1):
        dist_from_center = math.sqrt(
            ((points[j][0] + points[j + 1][0]) / 2 - CENTER_LNG) ** 2 +
            ((points[j][1] + points[j + 1][1]) / 2 - CENTER_LAT) ** 2
        ) * 111

        lit = dist_from_center < 1.5

        segments.append({
            "segment_id": f"way_{segment_id}",
            "coordinates": [points[j], points[j + 1]],
            "highway": random.choice(["residential", "tertiary"]),
            "lit": lit,
            "width": random.uniform(5, 9),
            "surface": "asphalt",
            "length": random.uniform(80, 150),
            "name": random.choice(road_names["residential"]),
        })
        segment_id += 1

print(f"Generated {len(segments)} segments")

lit_count = sum(1 for s in segments if s.get("lit"))
dark_count = len(segments) - lit_count
print(f"  Lit: {lit_count}, Dark: {dark_count}")

surface_counts = {}
for s in segments:
    surf = s.get("surface", "unknown")
    surface_counts[surf] = surface_counts.get(surf, 0) + 1
print(f"  Surfaces: {surface_counts}")

highway_counts = {}
for s in segments:
    hw = s.get("highway", "unknown")
    highway_counts[hw] = highway_counts.get(hw, 0) + 1
print(f"  Highways: {highway_counts}")

data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(data_dir, exist_ok=True)

with open(os.path.join(data_dir, "segments.json"), "w", encoding="utf-8") as f:
    json.dump(segments, f, ensure_ascii=False, indent=2)

print(f"\nSaved to {os.path.join(data_dir, 'segments.json')}")

grid_size = 0.001
min_lng = CENTER_LNG - 0.03
max_lng = CENTER_LNG + 0.03
min_lat = CENTER_LAT - 0.03
max_lat = CENTER_LAT + 0.03

lng_steps = int((max_lng - min_lng) / grid_size) + 1
lat_steps = int((max_lat - min_lat) / grid_size) + 1

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

if HAS_NUMPY:
    matrix = np.zeros((lat_steps, lng_steps), dtype=bool)

    for seg in segments:
        if seg.get("lit"):
            for coord in seg["coordinates"]:
                lng_idx = int((coord[0] - min_lng) / grid_size)
                lat_idx = int((coord[1] - min_lat) / grid_size)
                if 0 <= lng_idx < lng_steps and 0 <= lat_idx < lat_steps:
                    for di in range(-1, 2):
                        for dj in range(-1, 2):
                            ni, nj = lat_idx + di, lng_idx + dj
                            if 0 <= ni < lat_steps and 0 <= nj < lng_steps:
                                matrix[ni, nj] = True

    np.save(os.path.join(data_dir, "lighting_matrix.npy"), matrix)
    print(f"Saved lighting matrix: {matrix.shape}, lit cells: {matrix.sum()}")
else:
    matrix = [[False] * lng_steps for _ in range(lat_steps)]

    for seg in segments:
        if seg.get("lit"):
            for coord in seg["coordinates"]:
                lng_idx = int((coord[0] - min_lng) / grid_size)
                lat_idx = int((coord[1] - min_lat) / grid_size)
                if 0 <= lng_idx < lng_steps and 0 <= lat_idx < lat_steps:
                    for di in range(-1, 2):
                        for dj in range(-1, 2):
                            ni, nj = lat_idx + di, lng_idx + dj
                            if 0 <= ni < lat_steps and 0 <= nj < lng_steps:
                                matrix[ni][nj] = True

    with open(os.path.join(data_dir, "lighting_matrix.json"), "w") as f:
        json.dump([[bool(cell) for cell in row] for row in matrix], f)
    lit_count = sum(sum(row) for row in matrix)
    print(f"Saved lighting matrix: ({lat_steps},{lng_steps}), lit cells: {lit_count}")

metadata = {
    "grid_size": grid_size,
    "min_lng": min_lng,
    "max_lng": max_lng,
    "min_lat": min_lat,
    "max_lat": max_lat,
    "lng_steps": lng_steps,
    "lat_steps": lat_steps,
    "generated_at": datetime.now().isoformat(),
}

with open(os.path.join(data_dir, "lighting_metadata.json"), "w") as f:
    json.dump(metadata, f, indent=2)
