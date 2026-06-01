from sanic import Sanic, response
from sanic_cors import CORS
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.mock_data import generate_social_media_data, generate_hospital_data, CITIES
from src.nlp.breed_extractor import batch_extract_breeds
from src.analysis.breed_cluster import calculate_city_breed_rank, calculate_region_breed_rank, build_chord_data, get_owner_profile

app = Sanic("DogBreedMap")
CORS(app)

social_media_data = generate_social_media_data()
hospital_data = generate_hospital_data()
extracted_posts = batch_extract_breeds(social_media_data)

@app.route("/api/cities", methods=["GET"])
async def get_cities(request):
    return response.json(CITIES)

@app.route("/api/city-breed-rank", methods=["GET"])
async def get_city_breed_rank(request):
    result = calculate_city_breed_rank(extracted_posts, top_n=3)
    return response.json(result)

@app.route("/api/region-breed-rank", methods=["GET"])
async def get_region_breed_rank(request):
    result = calculate_region_breed_rank(CITIES, extracted_posts, top_n=3)
    return response.json(result)

@app.route("/api/chord-data", methods=["GET"])
async def get_chord_data(request):
    result = build_chord_data(CITIES, extracted_posts)
    return response.json(result)

@app.route("/api/owner-profile/<city>", methods=["GET"])
async def get_owner_profile_by_city(request, city):
    city_rank = calculate_city_breed_rank(extracted_posts, top_n=3)
    breed_rank = city_rank.get(city, [])
    profile = get_owner_profile(city, breed_rank)
    return response.json({
        "city": city,
        "top_breed": breed_rank[0]["breed"] if breed_rank else None,
        "profile": profile
    })

@app.route("/api/hospital-data", methods=["GET"])
async def get_hospital_data(request):
    return response.json(hospital_data)

@app.route("/", methods=["GET"])
async def index(request):
    return await response.file("static/index.html")

if __name__ == "__main__":
    app.static("/static", "./static")
    app.run(host="0.0.0.0", port=8080, debug=True)