using UnityEngine;
using System;
using System.Collections.Generic;

public class SelectionManager : MonoBehaviour
{
    public static SelectionManager Instance { get; private set; }
    
    [Header("设置")]
    public LayerMask selectableLayer;
    public KeyCode multiSelectKey = KeyCode.LeftControl;
    
    [Header("当前选择")]
    [SerializeField] private List<GameObject> selectedObjects = new List<GameObject>();
    [SerializeField] private GameObject lastSelectedObject;
    
    public event Action<GameObject> OnObjectSelected;
    public event Action<GameObject> OnObjectDeselected;
    public event Action OnSelectionCleared;
    public event Action<List<GameObject>> OnSelectionChanged;
    
    public GameObject LastSelected => lastSelectedObject;
    public IReadOnlyList<GameObject> SelectedObjects => selectedObjects;
    public int SelectedCount => selectedObjects.Count;
    public bool HasSelection => selectedObjects.Count > 0;
    
    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }
    
    public void Select(GameObject obj, bool addToSelection = false)
    {
        if (obj == null) return;
        
        if (!addToSelection)
        {
            ClearSelection();
        }
        
        if (!selectedObjects.Contains(obj))
        {
            selectedObjects.Add(obj);
            lastSelectedObject = obj;
            
            var assetComponent = obj.GetComponent<ExhibitionAssetComponent>();
            if (assetComponent != null)
            {
                assetComponent.Select();
            }
            
            var hotspotComponent = obj.GetComponent<HotspotComponent>();
            if (hotspotComponent != null)
            {
                hotspotComponent.Select();
            }
            
            OnObjectSelected?.Invoke(obj);
            OnSelectionChanged?.Invoke(selectedObjects);
        }
    }
    
    public void Deselect(GameObject obj)
    {
        if (obj == null) return;
        
        if (selectedObjects.Contains(obj))
        {
            selectedObjects.Remove(obj);
            
            var assetComponent = obj.GetComponent<ExhibitionAssetComponent>();
            if (assetComponent != null)
            {
                assetComponent.Deselect();
            }
            
            var hotspotComponent = obj.GetComponent<HotspotComponent>();
            if (hotspotComponent != null)
            {
                hotspotComponent.Deselect();
            }
            
            OnObjectDeselected?.Invoke(obj);
            
            if (lastSelectedObject == obj)
            {
                lastSelectedObject = selectedObjects.Count > 0 ? selectedObjects[selectedObjects.Count - 1] : null;
            }
            
            OnSelectionChanged?.Invoke(selectedObjects);
        }
    }
    
    public void ClearSelection()
    {
        foreach (var obj in selectedObjects)
        {
            if (obj != null)
            {
                var assetComponent = obj.GetComponent<ExhibitionAssetComponent>();
                if (assetComponent != null)
                {
                    assetComponent.Deselect();
                }
                
                var hotspotComponent = obj.GetComponent<HotspotComponent>();
                if (hotspotComponent != null)
                {
                    hotspotComponent.Deselect();
                }
            }
        }
        
        selectedObjects.Clear();
        lastSelectedObject = null;
        
        OnSelectionCleared?.Invoke();
        OnSelectionChanged?.Invoke(selectedObjects);
    }
    
    public bool IsSelected(GameObject obj)
    {
        return selectedObjects.Contains(obj);
    }
    
    public void ToggleSelection(GameObject obj)
    {
        if (IsSelected(obj))
        {
            Deselect(obj);
        }
        else
        {
            Select(obj, true);
        }
    }
    
    public T GetSelectedComponent<T>() where T : Component
    {
        if (lastSelectedObject != null)
        {
            return lastSelectedObject.GetComponent<T>();
        }
        return null;
    }
    
    public List<T> GetSelectedComponents<T>() where T : Component
    {
        var components = new List<T>();
        foreach (var obj in selectedObjects)
        {
            if (obj != null)
            {
                var component = obj.GetComponent<T>();
                if (component != null)
                {
                    components.Add(component);
                }
            }
        }
        return components;
    }
    
    public void DeleteSelected()
    {
        var objectsToDelete = new List<GameObject>(selectedObjects);
        
        foreach (var obj in objectsToDelete)
        {
            if (obj != null)
            {
                var assetComponent = obj.GetComponent<ExhibitionAssetComponent>();
                if (assetComponent != null && ExhibitionManager.Instance != null)
                {
                    ExhibitionManager.Instance.RemoveAsset(assetComponent.AssetInstanceId);
                }
                
                var hotspotComponent = obj.GetComponent<HotspotComponent>();
                if (hotspotComponent != null && ExhibitionManager.Instance != null)
                {
                    ExhibitionManager.Instance.RemoveHotspot(hotspotComponent.HotspotId);
                }
            }
        }
        
        ClearSelection();
    }
    
    public void DuplicateSelected()
    {
        if (ExhibitionManager.Instance == null) return;
        
        var originalObjects = new List<GameObject>(selectedObjects);
        ClearSelection();
        
        foreach (var obj in originalObjects)
        {
            if (obj != null)
            {
                var assetComponent = obj.GetComponent<ExhibitionAssetComponent>();
                if (assetComponent != null)
                {
                    Vector3 offset = new Vector3(1, 0, 1);
                    var newAsset = ExhibitionManager.Instance.AddAsset(
                        assetComponent.AssetId,
                        $"{assetComponent.AssetName} (副本)",
                        obj.transform.position + offset
                    );
                    
                    var newObj = ExhibitionManager.Instance.GetAssetObject(newAsset.id);
                    if (newObj != null)
                    {
                        Select(newObj, true);
                    }
                }
            }
        }
    }
}
