using UnityEngine;
using System;

public class DragManager : MonoBehaviour
{
    public static DragManager Instance { get; private set; }
    
    [Header("设置")]
    public Camera editorCamera;
    public LayerMask draggableLayer;
    public LayerMask groundLayer;
    public float rotationSpeed = 100f;
    public float scaleSpeed = 0.1f;
    public KeyCode rotateKey = KeyCode.R;
    public KeyCode scaleKey = KeyCode.S;
    public KeyCode snapKey = KeyCode.LeftControl;
    
    [Header("吸附设置")]
    public bool enableSnap = true;
    public float positionSnap = 0.5f;
    public float rotationSnap = 15f;
    public float scaleSnap = 0.1f;
    
    [Header("当前状态")]
    [SerializeField] private bool isDragging;
    [SerializeField] private bool isRotating;
    [SerializeField] private bool isScaling;
    [SerializeField] private Transform draggingObject;
    [SerializeField] private Vector3 dragStartPosition;
    [SerializeField] private Vector3 dragStartOffset;
    [SerializeField] private float dragStartRotationY;
    [SerializeField] private Vector3 dragStartScale;
    [SerializeField] private Plane dragPlane;
    
    public event Action<Transform> OnDragStart;
    public event Action<Transform> OnDragEnd;
    public event Action<Transform> OnTransformChanged;
    
    public bool IsDragging => isDragging;
    public bool IsRotating => isRotating;
    public bool IsScaling => isScaling;
    public Transform DraggingObject => draggingObject;
    
    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
        
        if (editorCamera == null)
        {
            editorCamera = Camera.main;
        }
    }
    
    private void Update()
    {
        HandleSelection();
        
        if (draggingObject != null)
        {
            if (Input.GetKey(rotateKey))
            {
                HandleRotation();
            }
            else if (Input.GetKey(scaleKey))
            {
                HandleScaling();
            }
            else if (isDragging)
            {
                HandlePositionDrag();
            }
        }
        
        HandleKeyInput();
    }
    
    private void HandleSelection()
    {
        if (Input.GetMouseButtonDown(0))
        {
            Ray ray = editorCamera.ScreenPointToRay(Input.mousePosition);
            RaycastHit hit;
            
            if (Physics.Raycast(ray, out hit, Mathf.Infinity, draggableLayer))
            {
                Transform hitTransform = hit.transform;
                
                if (SelectionManager.Instance != null)
                {
                    bool multiSelect = Input.GetKey(SelectionManager.Instance.multiSelectKey);
                    SelectionManager.Instance.Select(hitTransform.gameObject, multiSelect);
                }
                
                StartDrag(hitTransform);
            }
            else
            {
                if (SelectionManager.Instance != null)
                {
                    SelectionManager.Instance.ClearSelection();
                }
            }
        }
        
        if (Input.GetMouseButtonUp(0))
        {
            EndDrag();
        }
    }
    
    private void StartDrag(Transform target)
    {
        draggingObject = target;
        isDragging = true;
        
        dragStartPosition = target.position;
        dragStartRotationY = target.rotation.eulerAngles.y;
        dragStartScale = target.localScale;
        
        dragPlane = new Plane(Vector3.up, target.position);
        
        Ray ray = editorCamera.ScreenPointToRay(Input.mousePosition);
        float enter;
        if (dragPlane.Raycast(ray, out enter))
        {
            Vector3 hitPoint = ray.GetPoint(enter);
            dragStartOffset = target.position - hitPoint;
        }
        
        OnDragStart?.Invoke(target);
    }
    
    private void EndDrag()
    {
        if (draggingObject != null)
        {
            if (ExhibitionManager.Instance != null)
            {
                var assetComponent = draggingObject.GetComponent<ExhibitionAssetComponent>();
                if (assetComponent != null)
                {
                    ExhibitionManager.Instance.UpdateAssetTransform(
                        assetComponent.AssetInstanceId,
                        draggingObject.position,
                        draggingObject.rotation.eulerAngles,
                        draggingObject.localScale
                    );
                }
            }
            
            OnTransformChanged?.Invoke(draggingObject);
            OnDragEnd?.Invoke(draggingObject);
        }
        
        isDragging = false;
        isRotating = false;
        isScaling = false;
        draggingObject = null;
    }
    
    private void HandlePositionDrag()
    {
        if (Input.GetKey(rotateKey) || Input.GetKey(scaleKey)) return;
        
        Ray ray = editorCamera.ScreenPointToRay(Input.mousePosition);
        float enter;
        
        if (dragPlane.Raycast(ray, out enter))
        {
            Vector3 hitPoint = ray.GetPoint(enter);
            Vector3 newPosition = hitPoint + dragStartOffset;
            
            if (enableSnap && Input.GetKey(snapKey))
            {
                newPosition.x = Mathf.Round(newPosition.x / positionSnap) * positionSnap;
                newPosition.z = Mathf.Round(newPosition.z / positionSnap) * positionSnap;
            }
            
            draggingObject.position = newPosition;
        }
    }
    
    private void HandleRotation()
    {
        if (!isRotating)
        {
            isRotating = true;
        }
        
        float mouseX = Input.GetAxis("Mouse X");
        float newRotationY = dragStartRotationY + mouseX * rotationSpeed * Time.deltaTime;
        
        if (enableSnap && Input.GetKey(snapKey))
        {
            newRotationY = Mathf.Round(newRotationY / rotationSnap) * rotationSnap;
        }
        
        draggingObject.rotation = Quaternion.Euler(
            draggingObject.rotation.eulerAngles.x,
            newRotationY,
            draggingObject.rotation.eulerAngles.z
        );
    }
    
    private void HandleScaling()
    {
        if (!isScaling)
        {
            isScaling = true;
        }
        
        float mouseY = Input.GetAxis("Mouse Y");
        float scaleDelta = mouseY * scaleSpeed;
        
        Vector3 newScale = dragStartScale + Vector3.one * scaleDelta;
        newScale = Vector3.Max(newScale, Vector3.one * 0.1f);
        
        if (enableSnap && Input.GetKey(snapKey))
        {
            newScale.x = Mathf.Round(newScale.x / scaleSnap) * scaleSnap;
            newScale.y = Mathf.Round(newScale.y / scaleSnap) * scaleSnap;
            newScale.z = Mathf.Round(newScale.z / scaleSnap) * scaleSnap;
        }
        
        draggingObject.localScale = newScale;
    }
    
    private void HandleKeyInput()
    {
        if (draggingObject == null) return;
        
        if (Input.GetKeyDown(KeyCode.Delete) || Input.GetKeyDown(KeyCode.Backspace))
        {
            if (SelectionManager.Instance != null)
            {
                SelectionManager.Instance.DeleteSelected();
            }
        }
        
        if (Input.GetKeyDown(KeyCode.D) && Input.GetKey(KeyCode.LeftControl))
        {
            if (SelectionManager.Instance != null)
            {
                SelectionManager.Instance.DuplicateSelected();
            }
        }
    }
    
    public void ForceEndDrag()
    {
        EndDrag();
    }
    
    public void SetDraggingObject(Transform target)
    {
        if (target != null)
        {
            StartDrag(target);
        }
        else
        {
            EndDrag();
        }
    }
}
