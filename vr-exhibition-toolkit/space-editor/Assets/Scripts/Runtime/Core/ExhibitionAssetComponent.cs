using UnityEngine;
using System;

public class ExhibitionAssetComponent : MonoBehaviour
{
    public string AssetInstanceId { get; private set; }
    public string AssetId { get; private set; }
    public string AssetName { get; private set; }
    public string AssetType { get; private set; }
    
    public event Action<ExhibitionAssetComponent> OnSelected;
    public event Action<ExhibitionAssetComponent> OnDeselected;
    public event Action<ExhibitionAssetComponent> OnTransformChanged;
    
    [SerializeField] private bool isSelected;
    [SerializeField] private Renderer mainRenderer;
    [SerializeField] private Collider mainCollider;
    
    private Material originalMaterial;
    private Material selectedMaterial;
    
    public void Initialize(ExhibitionAsset assetData)
    {
        AssetInstanceId = assetData.id;
        AssetId = assetData.assetId;
        AssetName = assetData.name;
        AssetType = assetData.type;
        
        if (mainCollider == null)
        {
            mainCollider = GetComponent<Collider>();
        }
        
        if (mainRenderer == null)
        {
            mainRenderer = GetComponent<Renderer>();
        }
        
        if (mainRenderer != null)
        {
            originalMaterial = mainRenderer.material;
        }
        
        UpdateVisibility(assetData.isVisible);
        UpdateCollider(assetData.isCollidable);
    }
    
    public void Select()
    {
        if (isSelected) return;
        
        isSelected = true;
        ApplySelectedVisual();
        OnSelected?.Invoke(this);
    }
    
    public void Deselect()
    {
        if (!isSelected) return;
        
        isSelected = false;
        ApplyOriginalVisual();
        OnDeselected?.Invoke(this);
    }
    
    private void ApplySelectedVisual()
    {
        if (mainRenderer != null)
        {
            if (selectedMaterial == null)
            {
                selectedMaterial = new Material(Shader.Find("Standard"));
                selectedMaterial.color = Color.cyan;
                selectedMaterial.SetFloat("_Mode", 3);
                selectedMaterial.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
                selectedMaterial.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
                selectedMaterial.SetInt("_ZWrite", 0);
                selectedMaterial.DisableKeyword("_ALPHATEST_ON");
                selectedMaterial.EnableKeyword("_ALPHABLEND_ON");
                selectedMaterial.DisableKeyword("_ALPHAPREMULTIPLY_ON");
                selectedMaterial.renderQueue = 3000;
                selectedMaterial.color = new Color(0, 1, 1, 0.5f);
            }
            
            mainRenderer.material = selectedMaterial;
        }
    }
    
    private void ApplyOriginalVisual()
    {
        if (mainRenderer != null && originalMaterial != null)
        {
            mainRenderer.material = originalMaterial;
        }
    }
    
    public void UpdateVisibility(bool isVisible)
    {
        if (mainRenderer != null)
        {
            mainRenderer.enabled = isVisible;
        }
    }
    
    public void UpdateCollider(bool isCollidable)
    {
        if (mainCollider != null)
        {
            mainCollider.enabled = isCollidable;
        }
    }
    
    public void UpdateFromData(ExhibitionAsset assetData)
    {
        transform.position = assetData.position;
        transform.rotation = Quaternion.Euler(assetData.rotation);
        transform.localScale = assetData.scale;
        
        UpdateVisibility(assetData.isVisible);
        UpdateCollider(assetData.isCollidable);
        
        OnTransformChanged?.Invoke(this);
    }
    
    public ExhibitionAsset ToData()
    {
        return new ExhibitionAsset
        {
            id = AssetInstanceId,
            assetId = AssetId,
            name = AssetName,
            type = AssetType,
            position = transform.position,
            rotation = transform.rotation.eulerAngles,
            scale = transform.localScale,
            isVisible = mainRenderer != null ? mainRenderer.enabled : true,
            isCollidable = mainCollider != null ? mainCollider.enabled : true,
            updatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };
    }
}
