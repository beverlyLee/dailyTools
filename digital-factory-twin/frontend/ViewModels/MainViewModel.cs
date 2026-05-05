using System;
using System.Collections.ObjectModel;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using DigitalFactoryTwin.Models;
using DigitalFactoryTwin.Services;
using DigitalFactoryTwin.Views;

namespace DigitalFactoryTwin.ViewModels
{
    public class MainViewModel : ViewModelBase
    {
        private string _currentTime;
        private object _currentView;
        private Timer _timer;

        public string CurrentTime
        {
            get => _currentTime;
            set => SetProperty(ref _currentTime, value);
        }

        public object CurrentView
        {
            get => _currentView;
            set => SetProperty(ref _currentView, value);
        }

        public ICommand NavigateCommand { get; }
        
        public ObservableCollection<Device> Devices { get; } = new ObservableCollection<Device>();
        public ObservableCollection<Alert> ActiveAlerts { get; } = new ObservableCollection<Alert>();
        public ObservableCollection<ProductionLine> ProductionLines { get; } = new ObservableCollection<ProductionLine>();

        private ProductionLineMonitorViewModel _productionLineMonitorViewModel;
        private ApsOptimizerViewModel _apsOptimizerViewModel;

        public MainViewModel()
        {
            NavigateCommand = new RelayCommand<string>(Navigate);
            _currentView = new ProductionLineMonitorView();
            _productionLineMonitorViewModel = new ProductionLineMonitorViewModel();
            _apsOptimizerViewModel = new ApsOptimizerViewModel();
        }

        public void Initialize()
        {
            _timer = new Timer(UpdateTime, null, 0, 1000);
            _ = LoadDataAsync();
            _ = InitializeWebSocketAsync();
        }

        public void Cleanup()
        {
            _timer?.Dispose();
            _ = WebSocketService.Instance.DisconnectAsync();
        }

        private void UpdateTime(object state)
        {
            Application.Current.Dispatcher.Invoke(() =>
            {
                CurrentTime = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            });
        }

        private void Navigate(string viewName)
        {
            switch (viewName)
            {
                case "Overview":
                    CurrentView = new ProductionLineMonitorView();
                    break;
                case "ProductionLine":
                    CurrentView = new ProductionLineMonitorView { DataContext = _productionLineMonitorViewModel };
                    break;
                case "ApsOptimizer":
                    CurrentView = new ApsOptimizerView { DataContext = _apsOptimizerViewModel };
                    break;
                case "DeviceManagement":
                    CurrentView = new DeviceDetailView();
                    break;
                case "Alerts":
                    CurrentView = new ProductionLineMonitorView();
                    break;
                case "Settings":
                    CurrentView = new ProductionLineMonitorView();
                    break;
            }
        }

        private async Task LoadDataAsync()
        {
            try
            {
                var devices = await ApiService.Instance.GetAsync<ObservableCollection<Device>>("/iot/devices/");
                if (devices != null)
                {
                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        Devices.Clear();
                        foreach (var device in devices)
                        {
                            Devices.Add(device);
                        }
                    });
                }

                var alerts = await ApiService.Instance.GetAsync<ObservableCollection<Alert>>("/iot/alerts/active/");
                if (alerts != null)
                {
                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        ActiveAlerts.Clear();
                        foreach (var alert in alerts)
                        {
                            ActiveAlerts.Add(alert);
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading data: {ex.Message}");
            }
        }

        private async Task InitializeWebSocketAsync()
        {
            try
            {
                WebSocketService.Instance.DeviceStatusChanged += OnDeviceStatusChanged;
                WebSocketService.Instance.PLCDataReceived += OnPLCDataReceived;
                WebSocketService.Instance.AlertReceived += OnAlertReceived;
                
                await WebSocketService.Instance.ConnectAsync();
                await WebSocketService.Instance.SubscribeAsync("devices");
                await WebSocketService.Instance.SubscribeAsync("alerts");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"WebSocket initialization error: {ex.Message}");
            }
        }

        private void OnDeviceStatusChanged(object sender, DeviceStatusChangedEventArgs e)
        {
            Application.Current.Dispatcher.Invoke(() =>
            {
                foreach (var device in Devices)
                {
                    if (device.DeviceId == e.DeviceId)
                    {
                        device.Status = e.NewStatus;
                        OnPropertyChanged(nameof(Devices));
                        break;
                    }
                }
            });
        }

        private void OnPLCDataReceived(object sender, PLCDataReceivedEventArgs e)
        {
        }

        private void OnAlertReceived(object sender, AlertReceivedEventArgs e)
        {
            Application.Current.Dispatcher.Invoke(() =>
            {
                var alert = new Alert
                {
                    AlertCode = e.AlertCode,
                    AlertMessage = e.AlertMessage,
                    AlertLevel = e.AlertLevel,
                    Status = "active",
                    Timestamp = e.Timestamp
                };
                
                ActiveAlerts.Insert(0, alert);
                
                while (ActiveAlerts.Count > 50)
                {
                    ActiveAlerts.RemoveAt(ActiveAlerts.Count - 1);
                }
            });
        }
    }
}
