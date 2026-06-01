import sys
print("Testing Dash API compatibility...")

try:
    import dash
    print(f"Dash version: {dash.__version__}")
except Exception as e:
    print(f"Dash import error: {e}")
    sys.exit(1)

try:
    import plotly.express as px
    print(f"Plotly version: {px.__version__ if hasattr(px, '__version__') else 'N/A'}")
    
    if hasattr(px, 'scatter_map'):
        print("✓ px.scatter_map is available (new API)")
    elif hasattr(px, 'scatter_mapbox'):
        print("✓ px.scatter_mapbox is available (old API)")
    else:
        print("✗ No map scatter function found")
except Exception as e:
    print(f"Plotly import error: {e}")

try:
    from dash import Dash
    app = Dash(__name__)
    
    if hasattr(app, 'run'):
        print("✓ app.run() is available (new API)")
    elif hasattr(app, 'run_server'):
        print("✓ app.run_server() is available (old API)")
    else:
        print("✗ No run method found")
except Exception as e:
    print(f"App test error: {e}")

print("\nAll API checks completed!")
