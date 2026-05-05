using System;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using DigitalFactoryTwin.Models;
using DigitalFactoryTwin.Services;

namespace DigitalFactoryTwin.ViewModels
{
    public class ProductionLineMonitorViewModel : ViewModelBase
    {
        private ProductionLine _selectedProductionLine;
        private Device _selectedDevice;
        private bool _isRealTimeMonitoring;
        private int _currentDisassemblyStep;
        private bool _isDisassembling;

        public ObservableCollection<ProductionLine> ProductionLines { get; } = new ObservableCollection<ProductionLine>();
        public ObservableCollection<Device> ProductionLineDevices { get; } = new ObservableCollection<Device>();
        public ObservableCollection<PLCData> RealTimePLCData { get; } = new ObservableCollection<PLCData>();
        public ObservableCollection<DeviceComponent> DeviceComponents { get; } = new ObservableCollection<DeviceComponent>();
        public ObservableCollection<DisassemblyStep> DisassemblySteps { get; } = new ObservableCollection<DisassemblyStep>();

        public ProductionLine SelectedProductionLine
        {
            get => _selectedProductionLine;
            set
            {
                SetProperty(ref _selectedProductionLine, value);
                _ = LoadProductionLineDevicesAsync();
            }
        }

        public Device SelectedDevice
        {
            get => _selectedDevice;
            set
            {
                SetProperty(ref _selectedDevice, value);
                _ = LoadDeviceDetailsAsync();
            }
        }

        public bool IsRealTimeMonitoring
        {
            get => _isRealTimeMonitoring;
            set
            {
                SetProperty(ref _isRealTimeMonitoring, value);
                if (value)
                {
                    _ = StartRealTimeMonitoringAsync();
                }
            }
        }

        public int CurrentDisassemblyStep
        {
            get => _currentDisassemblyStep;
            set => SetProperty(ref _currentDisassemblyStep, value);
        }

        public bool IsDisassembling
        {
            get => _isDisassembling;
            set => SetProperty(ref _isDisassembling, value);
        }

        public ICommand RefreshCommand { get; }
        public ICommand StartDisassemblyCommand { get; }
        public ICommand NextDisassemblyStepCommand { get; }
        public ICommand PreviousDisassemblyStepCommand { get; }
        public ICommand ResetDisassemblyCommand { get; }
        public ICommand ToggleRealTimeMonitoringCommand { get; }

        public ProductionLineMonitorViewModel()
        {
            RefreshCommand = new RelayCommand(async () => await LoadDataAsync());
            StartDisassemblyCommand = new RelayCommand(StartDisassembly, CanStartDisassembly);
            NextDisassemblyStepCommand = new RelayCommand(NextDisassemblyStep, CanGoToNextStep);
            PreviousDisassemblyStepCommand = new RelayCommand(PreviousDisassemblyStep, CanGoToPreviousStep);
            ResetDisassemblyCommand = new RelayCommand(ResetDisassembly);
            ToggleRealTimeMonitoringCommand = new RelayCommand(ToggleRealTimeMonitoring);
            
            _ = LoadDataAsync();
        }

        private async Task LoadDataAsync()
        {
            try
            {
                var productionLines = await ApiService.Instance.GetAsync<ObservableCollection<ProductionLine>>("/production-line/lines/");
                if (productionLines != null)
                {
                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        ProductionLines.Clear();
                        foreach (var line in productionLines)
                        {
                            ProductionLines.Add(line);
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading production lines: {ex.Message}");
            }
        }

        private async Task LoadProductionLineDevicesAsync()
        {
            if (SelectedProductionLine == null)
                return;

            try
            {
                var devices = await ApiService.Instance.GetAsync<ObservableCollection<Device>>(
                    $"/production-line/lines/{SelectedProductionLine.Id}/device-positions/");
                if (devices != null)
                {
                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        ProductionLineDevices.Clear();
                        foreach (var device in devices)
                        {
                            ProductionLineDevices.Add(device);
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading production line devices: {ex.Message}");
            }
        }

        private async Task LoadDeviceDetailsAsync()
        {
            if (SelectedDevice == null)
                return;

            try
            {
                var plcData = await ApiService.Instance.GetAsync<ObservableCollection<PLCData>>(
                    $"/iot/devices/{SelectedDevice.Id}/real_time_data/");
                if (plcData != null)
                {
                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        RealTimePLCData.Clear();
                        foreach (var data in plcData)
                        {
                            RealTimePLCData.Add(data);
                        }
                    });
                }

                var components = await ApiService.Instance.GetAsync<ObservableCollection<DeviceComponent>>(
                    $"/production-line/models-3d/{SelectedDevice.Id}/");
                if (components != null)
                {
                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        DeviceComponents.Clear();
                        foreach (var component in components)
                        {
                            DeviceComponents.Add(component);
                        }
                    });
                }

                var steps = await ApiService.Instance.GetAsync<ObservableCollection<DisassemblyStep>>(
                    $"/production-line/models-3d/{SelectedDevice.Id}/disassembly_steps/");
                if (steps != null)
                {
                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        DisassemblySteps.Clear();
                        foreach (var step in steps)
                        {
                            DisassemblySteps.Add(step);
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading device details: {ex.Message}");
            }
        }

        private async Task StartRealTimeMonitoringAsync()
        {
            if (!IsRealTimeMonitoring)
                return;

            while (IsRealTimeMonitoring)
            {
                await Task.Delay(1000);
                if (SelectedDevice != null)
                {
                    await LoadDeviceDetailsAsync();
                }
            }
        }

        private void ToggleRealTimeMonitoring()
        {
            IsRealTimeMonitoring = !IsRealTimeMonitoring;
        }

        private bool CanStartDisassembly()
        {
            return SelectedDevice != null && DisassemblySteps.Count > 0;
        }

        private void StartDisassembly()
        {
            if (!CanStartDisassembly())
                return;

            IsDisassembling = true;
            CurrentDisassemblyStep = 0;
        }

        private bool CanGoToNextStep()
        {
            return IsDisassembling && CurrentDisassemblyStep < DisassemblySteps.Count - 1;
        }

        private void NextDisassemblyStep()
        {
            if (CanGoToNextStep())
            {
                CurrentDisassemblyStep++;
            }
        }

        private bool CanGoToPreviousStep()
        {
            return IsDisassembling && CurrentDisassemblyStep > 0;
        }

        private void PreviousDisassemblyStep()
        {
            if (CanGoToPreviousStep())
            {
                CurrentDisassemblyStep--;
            }
        }

        private void ResetDisassembly()
        {
            IsDisassembling = false;
            CurrentDisassemblyStep = 0;
        }
    }
}
