import asyncio
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv
import time

from crawler import get_trending_repos
from ai_service import translate_and_summarize
from storage import save_trending_data, load_trending_data, get_available_dates

load_dotenv()

app = FastAPI(title="GitHub Trending 中文")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

CACHE_DURATION = 3600
_cached_data = None
_cache_time = 0

async def get_trending_with_translation():
    global _cached_data, _cache_time
    
    current_time = time.time()
    if _cached_data and (current_time - _cache_time) < CACHE_DURATION:
        return _cached_data
    
    saved_data = load_trending_data()
    if saved_data and 'repos' in saved_data and len(saved_data['repos']) > 0:
        if saved_data['repos'][0].get('translated_description'):
            _cached_data = saved_data
            _cache_time = current_time
            return saved_data
    
    repos = get_trending_repos()
    
    tasks = [
        translate_and_summarize(repo.get('description', ''), repo.get('repo_name', ''))
        for repo in repos
    ]
    
    translated_descriptions = await asyncio.gather(*tasks)
    
    for i, repo in enumerate(repos):
        repo['translated_description'] = translated_descriptions[i]
    
    data = {
        "date": saved_data.get('date') if saved_data else '',
        "fetched_at": '',
        "repos": repos
    }
    
    save_trending_data(repos)
    
    _cached_data = data
    _cache_time = current_time
    
    return data

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    start_time = time.time()
    
    data = await get_trending_with_translation()
    
    load_time = round((time.time() - start_time) * 1000, 2)
    
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "repos": data['repos'],
            "available_dates": get_available_dates(),
            "load_time": load_time
        }
    )

@app.get("/history/{date_str}", response_class=HTMLResponse)
async def read_history(request: Request, date_str: str):
    start_time = time.time()
    
    data = load_trending_data(date_str)
    
    if not data:
        data = await get_trending_with_translation()
    
    load_time = round((time.time() - start_time) * 1000, 2)
    
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "repos": data['repos'],
            "available_dates": get_available_dates(),
            "selected_date": date_str,
            "load_time": load_time
        }
    )

@app.get("/refresh")
async def refresh_data():
    global _cached_data, _cache_time
    _cached_data = None
    _cache_time = 0
    return {"status": "success", "message": "Cache cleared"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "GitHub Trending 中文服务运行正常"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
