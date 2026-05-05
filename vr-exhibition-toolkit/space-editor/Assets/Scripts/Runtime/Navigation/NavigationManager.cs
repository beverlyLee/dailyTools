using UnityEngine;
using System;
using System.Collections.Generic;

public class NavigationManager : MonoBehaviour
{
    public static NavigationManager Instance { get; private set; }
    
    [Header("路径设置")]
    public float defaultSpeed = 2f;
    public float rotationSpeed = 5f;
    public float waypointThreshold = 0.5f;
    public bool autoStartDefaultPath = false;
    
    [Header("当前状态")]
    [SerializeField] private NavigationPath currentPath;
    [SerializeField] private int currentWaypointIndex;
    [SerializeField] private bool isMoving;
    [SerializeField] private Transform followTarget;
    
    public event Action<NavigationPath> OnPathStarted;
    public event Action<NavigationPath> OnPathCompleted;
    public event Action<int> OnWaypointReached;
    public event Action OnNavigationStopped;
    
    public NavigationPath CurrentPath => currentPath;
    public int CurrentWaypointIndex => currentWaypointIndex;
    public bool IsMoving => isMoving;
    public bool HasActivePath => currentPath != null;
    
    private List<NavigationPath> navigationPaths = new List<NavigationPath>();
    
    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }
    
    private void Start()
    {
        if (ExhibitionManager.Instance != null)
        {
            ExhibitionManager.Instance.OnExhibitionLoaded += OnExhibitionLoaded;
        }
    }
    
    private void OnExhibitionLoaded(ExhibitionData exhibition)
    {
        ClearAllPaths();
        
        if (exhibition.paths != null)
        {
            foreach (var pathData in exhibition.paths)
            {
                navigationPaths.Add(pathData);
            }
        }
        
        if (autoStartDefaultPath)
        {
            var defaultPath = GetDefaultPath();
            if (defaultPath != null)
            {
                StartPath(defaultPath);
            }
        }
    }
    
    private void Update()
    {
        if (isMoving && followTarget != null && currentPath != null)
        {
            MoveAlongPath();
        }
    }
    
    public void AddPath(NavigationPath path)
    {
        if (path == null) return;
        
        navigationPaths.Add(path);
        
        if (ExhibitionManager.Instance != null && ExhibitionManager.Instance.currentExhibition != null)
        {
            ExhibitionManager.Instance.currentExhibition.paths.Add(path);
        }
    }
    
    public void RemovePath(string pathId)
    {
        var path = navigationPaths.Find(p => p.id == pathId);
        if (path != null)
        {
            navigationPaths.Remove(path);
            
            if (ExhibitionManager.Instance != null && ExhibitionManager.Instance.currentExhibition != null)
            {
                ExhibitionManager.Instance.currentExhibition.paths.RemoveAll(p => p.id == pathId);
            }
            
            if (currentPath?.id == pathId)
            {
                StopNavigation();
            }
        }
    }
    
    public List<NavigationPath> GetAllPaths()
    {
        return new List<NavigationPath>(navigationPaths);
    }
    
    public NavigationPath GetPath(string pathId)
    {
        return navigationPaths.Find(p => p.id == pathId);
    }
    
    public NavigationPath GetDefaultPath()
    {
        return navigationPaths.Find(p => p.isDefault);
    }
    
    public void SetDefaultPath(string pathId)
    {
        foreach (var path in navigationPaths)
        {
            path.isDefault = path.id == pathId;
        }
    }
    
    public void StartPath(NavigationPath path, Transform target = null)
    {
        if (path == null || path.waypoints == null || path.waypoints.Count == 0)
        {
            Debug.LogWarning("无效的路径");
            return;
        }
        
        currentPath = path;
        currentWaypointIndex = 0;
        isMoving = true;
        
        if (target != null)
        {
            followTarget = target;
        }
        
        OnPathStarted?.Invoke(path);
    }
    
    public void StartPath(string pathId, Transform target = null)
    {
        var path = GetPath(pathId);
        if (path != null)
        {
            StartPath(path, target);
        }
    }
    
    public void StopNavigation()
    {
        if (!isMoving) return;
        
        isMoving = false;
        currentPath = null;
        currentWaypointIndex = 0;
        followTarget = null;
        
        OnNavigationStopped?.Invoke();
    }
    
    public void PauseNavigation()
    {
        isMoving = false;
    }
    
    public void ResumeNavigation()
    {
        if (currentPath != null && followTarget != null)
        {
            isMoving = true;
        }
    }
    
    private void MoveAlongPath()
    {
        if (currentWaypointIndex >= currentPath.waypoints.Count)
        {
            if (currentPath.isLoop)
            {
                currentWaypointIndex = 0;
            }
            else
            {
                OnPathCompleted?.Invoke(currentPath);
                StopNavigation();
                return;
            }
        }
        
        Vector3 targetWaypoint = currentPath.waypoints[currentWaypointIndex];
        float speed = currentPath.speed > 0 ? currentPath.speed : defaultSpeed;
        
        Vector3 direction = targetWaypoint - followTarget.position;
        direction.y = 0;
        
        if (direction.magnitude < waypointThreshold)
        {
            currentWaypointIndex++;
            OnWaypointReached?.Invoke(currentWaypointIndex - 1);
            return;
        }
        
        Vector3 moveDirection = direction.normalized * speed * Time.deltaTime;
        followTarget.position += moveDirection;
        
        if (direction.magnitude > 0.1f)
        {
            Quaternion targetRotation = Quaternion.LookRotation(direction);
            followTarget.rotation = Quaternion.Slerp(
                followTarget.rotation,
                targetRotation,
                rotationSpeed * Time.deltaTime
            );
        }
    }
    
    public void ClearAllPaths()
    {
        StopNavigation();
        navigationPaths.Clear();
    }
    
    public NavigationPath CreatePath(List<Vector3> waypoints, string name = "新路径", bool isDefault = false)
    {
        var newPath = new NavigationPath
        {
            id = Guid.NewGuid().ToString(),
            name = name,
            waypoints = new List<Vector3>(waypoints),
            isLoop = false,
            speed = defaultSpeed,
            isDefault = isDefault,
            createdAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            updatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };
        
        if (isDefault)
        {
            SetDefaultPath(newPath.id);
        }
        
        AddPath(newPath);
        
        return newPath;
    }
    
    public void UpdatePath(string pathId, List<Vector3> waypoints = null, string name = null, bool? isLoop = null, float? speed = null)
    {
        var path = GetPath(pathId);
        if (path == null) return;
        
        if (waypoints != null) path.waypoints = new List<Vector3>(waypoints);
        if (name != null) path.name = name;
        if (isLoop.HasValue) path.isLoop = isLoop.Value;
        if (speed.HasValue) path.speed = speed.Value;
        
        path.updatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    }
}
