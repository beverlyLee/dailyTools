using UnityEngine;
using System;
using System.Collections.Generic;

public class ExhibitionManager : MonoBehaviour
{
    public static ExhibitionManager Instance { get; private set; }
    
    [Header("展览设置")]
    public ExhibitionData currentExhibition;
    public string exhibitionId;
    
    [Header("引用")]
    public Transform floorTransform;
    public Transform assetsContainer;
    public Transform hotspotsContainer;
    
    [Header("预制体")]
    public GameObject floorPrefab;
    public GameObject hotspotPrefab;
    public GameObject defaultModelPrefab;
    
    private Dictionary<string, GameObject> assetObjects = new Dictionary<string, GameObject>();
    private Dictionary<string, GameObject> hotspotObjects = new Dictionary<string, GameObject>();
    
    public event Action<ExhibitionData> OnExhibitionLoaded;
    public event Action<ExhibitionData> OnExhibitionSaved;
    public event Action<ExhibitionAsset> OnAssetAdded;
    public event Action<ExhibitionAsset> OnAssetRemoved;
    public event Action<HotspotData> OnHotspotAdded;
    public event Action<HotspotData> OnHotspotRemoved;
    
    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }
    
    public void CreateNewExhibition(string name = "新展览")
    {
        currentExhibition = new ExhibitionData
        {
            id = Guid.NewGuid().ToString(),
            name = name,
            description = "",
            isPublic = false,
            createdBy = "local",
            createdAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            updatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            isPublished = false,
            settings = new ExhibitionSettings(),
            assets = new List<ExhibitionAsset>(),
            hotspots = new List<HotspotData>(),
            paths = new List<NavigationPath>()
        };
        
        InitializeExhibition();
        OnExhibitionLoaded?.Invoke(currentExhibition);
    }
    
    public void LoadExhibition(ExhibitionData exhibition)
    {
        ClearCurrentExhibition();
        
        currentExhibition = exhibition;
        InitializeExhibition();
        
        OnExhibitionLoaded?.Invoke(currentExhibition);
    }
    
    private void InitializeExhibition()
    {
        SetupFloor();
        
        foreach (var assetData in currentExhibition.assets)
        {
            CreateAssetObject(assetData);
        }
        
        foreach (var hotspotData in currentExhibition.hotspots)
        {
            CreateHotspotObject(hotspotData);
        }
    }
    
    private void SetupFloor()
    {
        if (floorTransform == null)
        {
            if (floorPrefab != null)
            {
                GameObject floor = Instantiate(floorPrefab, Vector3.zero, Quaternion.identity);
                floorTransform = floor.transform;
            }
            else
            {
                GameObject floor = GameObject.CreatePrimitive(PrimitiveType.Plane);
                floor.name = "Floor";
                floorTransform = floor.transform;
            }
        }
        
        if (currentExhibition != null)
        {
            floorTransform.localScale = new Vector3(
                currentExhibition.settings.floorSize.x / 10f,
                1f,
                currentExhibition.settings.floorSize.y / 10f
            );
        }
    }
    
    private void ClearCurrentExhibition()
    {
        foreach (var kvp in assetObjects)
        {
            if (kvp.Value != null)
            {
                Destroy(kvp.Value);
            }
        }
        assetObjects.Clear();
        
        foreach (var kvp in hotspotObjects)
        {
            if (kvp.Value != null)
            {
                Destroy(kvp.Value);
            }
        }
        hotspotObjects.Clear();
        
        currentExhibition = null;
    }
    
    public ExhibitionAsset AddAsset(string assetId, string name, Vector3 position, string type = "model")
    {
        if (currentExhibition == null)
        {
            Debug.LogError("没有加载的展览");
            return null;
        }
        
        var asset = new ExhibitionAsset
        {
            id = Guid.NewGuid().ToString(),
            assetId = assetId,
            name = name,
            type = type,
            position = position,
            rotation = Vector3.zero,
            scale = Vector3.one,
            isVisible = true,
            isCollidable = true,
            createdAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            updatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };
        
        currentExhibition.assets.Add(asset);
        currentExhibition.updatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        
        CreateAssetObject(asset);
        
        OnAssetAdded?.Invoke(asset);
        
        return asset;
    }
    
    public void RemoveAsset(string assetInstanceId)
    {
        if (currentExhibition == null) return;
        
        var asset = currentExhibition.assets.Find(a => a.id == assetInstanceId);
        if (asset == null) return;
        
        currentExhibition.assets.Remove(asset);
        currentExhibition.updatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        
        if (assetObjects.TryGetValue(assetInstanceId, out GameObject obj))
        {
            Destroy(obj);
            assetObjects.Remove(assetInstanceId);
        }
        
        OnAssetRemoved?.Invoke(asset);
    }
    
    public void UpdateAssetTransform(string assetInstanceId, Vector3? position = null, Vector3? rotation = null, Vector3? scale = null)
    {
        if (currentExhibition == null) return;
        
        var asset = currentExhibition.assets.Find(a => a.id == assetInstanceId);
        if (asset == null) return;
        
        if (position.HasValue) asset.position = position.Value;
        if (rotation.HasValue) asset.rotation = rotation.Value;
        if (scale.HasValue) asset.scale = scale.Value;
        
        asset.updatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        currentExhibition.updatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        
        if (assetObjects.TryGetValue(assetInstanceId, out GameObject obj))
        {
            if (position.HasValue) obj.transform.position = position.Value;
            if (rotation.HasValue) obj.transform.rotation = Quaternion.Euler(rotation.Value);
            if (scale.HasValue) obj.transform.localScale = scale.Value;
        }
    }
    
    public HotspotData AddHotspot(Vector3 position, HotspotType type = HotspotType.Info)
    {
        if (currentExhibition == null)
        {
            Debug.LogError("没有加载的展览");
            return null;
        }
        
        var hotspot = new HotspotData
        {
            id = Guid.NewGuid().ToString(),
            position = position,
            rotation = Vector3.zero,
            type = type,
            content = new HotspotContent(),
            triggerRadius = 1.5f,
            isVisible = true,
            createdAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            updatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };
        
        currentExhibition.hotspots.Add(hotspot);
        currentExhibition.updatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        
        CreateHotspotObject(hotspot);
        
        OnHotspotAdded?.Invoke(hotspot);
        
        return hotspot;
    }
    
    public void RemoveHotspot(string hotspotId)
    {
        if (currentExhibition == null) return;
        
        var hotspot = currentExhibition.hotspots.Find(h => h.id == hotspotId);
        if (hotspot == null) return;
        
        currentExhibition.hotspots.Remove(hotspot);
        currentExhibition.updatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        
        if (hotspotObjects.TryGetValue(hotspotId, out GameObject obj))
        {
            Destroy(obj);
            hotspotObjects.Remove(hotspotId);
        }
        
        OnHotspotRemoved?.Invoke(hotspot);
    }
    
    public void UpdateHotspot(string hotspotId, Vector3? position = null, HotspotContent content = null, float? triggerRadius = null)
    {
        if (currentExhibition == null) return;
        
        var hotspot = currentExhibition.hotspots.Find(h => h.id == hotspotId);
        if (hotspot == null) return;
        
        if (position.HasValue) hotspot.position = position.Value;
        if (content != null) hotspot.content = content;
        if (triggerRadius.HasValue) hotspot.triggerRadius = triggerRadius.Value;
        
        hotspot.updatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        currentExhibition.updatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        
        if (hotspotObjects.TryGetValue(hotspotId, out GameObject obj))
        {
            if (position.HasValue) obj.transform.position = position.Value;
        }
    }
    
    private void CreateAssetObject(ExhibitionAsset assetData)
    {
        GameObject assetObj = null;
        
        if (defaultModelPrefab != null)
        {
            assetObj = Instantiate(defaultModelPrefab, assetData.position, Quaternion.Euler(assetData.rotation));
        }
        else
        {
            assetObj = GameObject.CreatePrimitive(PrimitiveType.Cube);
            assetObj.transform.position = assetData.position;
            assetObj.transform.rotation = Quaternion.Euler(assetData.rotation);
        }
        
        assetObj.transform.localScale = assetData.scale;
        assetObj.name = $"Asset_{assetData.name}_{assetData.id}";
        
        if (assetsContainer != null)
        {
            assetObj.transform.SetParent(assetsContainer);
        }
        
        var assetComponent = assetObj.AddComponent<ExhibitionAssetComponent>();
        assetComponent.Initialize(assetData);
        
        assetObjects[assetData.id] = assetObj;
    }
    
    private void CreateHotspotObject(HotspotData hotspotData)
    {
        GameObject hotspotObj = null;
        
        if (hotspotPrefab != null)
        {
            hotspotObj = Instantiate(hotspotPrefab, hotspotData.position, Quaternion.Euler(hotspotData.rotation));
        }
        else
        {
            hotspotObj = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            hotspotObj.transform.position = hotspotData.position;
            hotspotObj.transform.rotation = Quaternion.Euler(hotspotData.rotation);
            hotspotObj.transform.localScale = Vector3.one * 0.3f;
        }
        
        hotspotObj.name = $"Hotspot_{hotspotData.type}_{hotspotData.id}";
        
        if (hotspotsContainer != null)
        {
            hotspotObj.transform.SetParent(hotspotsContainer);
        }
        
        var hotspotComponent = hotspotObj.AddComponent<HotspotComponent>();
        hotspotComponent.Initialize(hotspotData);
        
        hotspotObjects[hotspotData.id] = hotspotObj;
    }
    
    public void SaveExhibition()
    {
        if (currentExhibition == null) return;
        
        currentExhibition.updatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        OnExhibitionSaved?.Invoke(currentExhibition);
    }
    
    public GameObject GetAssetObject(string assetInstanceId)
    {
        assetObjects.TryGetValue(assetInstanceId, out GameObject obj);
        return obj;
    }
    
    public GameObject GetHotspotObject(string hotspotId)
    {
        hotspotObjects.TryGetValue(hotspotId, out GameObject obj);
        return obj;
    }
}
