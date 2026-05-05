using UnityEngine;
using System;
using System.Collections.Generic;

[Serializable]
public class ExhibitionData
{
    public string id;
    public string name;
    public string description;
    public bool isPublic;
    public string createdBy;
    public long createdAt;
    public long updatedAt;
    public bool isPublished;
    public long publishedAt;
    
    public ExhibitionSettings settings;
    public List<ExhibitionAsset> assets;
    public List<HotspotData> hotspots;
    public List<NavigationPath> paths;
    public string thumbnail;
}

[Serializable]
public class ExhibitionSettings
{
    public Vector2 floorSize = new Vector2(20, 20);
    public bool defaultLighting = true;
    public Color background = Color.black;
    public float gravity = 9.8f;
    public float walkSpeed = 3f;
    public float runSpeed = 6f;
}

[Serializable]
public class ExhibitionAsset
{
    public string id;
    public string assetId;
    public string name;
    public string type;
    public Vector3 position;
    public Vector3 rotation;
    public Vector3 scale = Vector3.one;
    public bool isVisible = true;
    public bool isCollidable = true;
    public long createdAt;
    public long updatedAt;
}

[Serializable]
public class HotspotData
{
    public string id;
    public Vector3 position;
    public Vector3 rotation;
    public HotspotType type;
    public HotspotContent content;
    public float triggerRadius = 1.5f;
    public bool isVisible = true;
    public long createdAt;
    public long updatedAt;
}

public enum HotspotType
{
    Info,
    Teleport,
    Audio,
    Video,
    URL,
    Custom
}

[Serializable]
public class HotspotContent
{
    public string title;
    public string description;
    public string imageUrl;
    public string audioUrl;
    public string videoUrl;
    public string url;
    public string targetSceneId;
    public Vector3 targetPosition;
    public Dictionary<string, string> customData;
}

[Serializable]
public class NavigationPath
{
    public string id;
    public string name;
    public List<Vector3> waypoints;
    public bool isLoop;
    public float speed = 2f;
    public bool isDefault;
    public long createdAt;
    public long updatedAt;
}

[Serializable]
public class AssetData
{
    public string id;
    public string originalName;
    public string filename;
    public string path;
    public long size;
    public string mimetype;
    public string type;
    public string uploadedBy;
    public long uploadedAt;
    public string url;
    public string name;
    public string description;
    public List<string> tags;
}
