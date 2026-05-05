using System;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using DigitalFactoryTwin.Models;
using DigitalFactoryTwin.Services;

namespace DigitalFactoryTwin.ViewModels
{
    public class ApsOptimizerViewModel : ViewModelBase
    {
        private ScheduleRun _selectedScheduleRun;
        private Order _selectedOrder;
        private bool _isScheduling;
        private string _schedulingStatus;
        private int _populationSize;
        private int _generations;
        private double _mutationProb;
        private double _crossoverProb;
        private string _selectedObjective;

        public ObservableCollection<Order> PendingOrders { get; } = new ObservableCollection<Order>();
        public ObservableCollection<Order> ScheduledOrders { get; } = new ObservableCollection<Order>();
        public ObservableCollection<ScheduleRun> ScheduleRuns { get; } = new ObservableCollection<ScheduleRun>();
        public ObservableCollection<ScheduleJob> ScheduleJobs { get; } = new ObservableCollection<ScheduleJob>();
        public ObservableCollection<WorkCenter> WorkCenters { get; } = new ObservableCollection<WorkCenter>();
        public ObservableCollection<Resource> Resources { get; } = new ObservableCollection<Resource>();
        public ObservableCollection<Mold> Molds { get; } = new ObservableCollection<Mold>();
        public ObservableCollection<Employee> Employees { get; } = new ObservableCollection<Employee>();
        public ObservableCollection<MaterialCheckResult> MaterialCheckResults { get; } = new ObservableCollection<MaterialCheckResult>();

        public ScheduleRun SelectedScheduleRun
        {
            get => _selectedScheduleRun;
            set
            {
                SetProperty(ref _selectedScheduleRun, value);
                _ = LoadScheduleJobsAsync();
            }
        }

        public Order SelectedOrder
        {
            get => _selectedOrder;
            set => SetProperty(ref _selectedOrder, value);
        }

        public bool IsScheduling
        {
            get => _isScheduling;
            set => SetProperty(ref _isScheduling, value);
        }

        public string SchedulingStatus
        {
            get => _schedulingStatus;
            set => SetProperty(ref _schedulingStatus, value);
        }

        public int PopulationSize
        {
            get => _populationSize;
            set => SetProperty(ref _populationSize, value);
        }

        public int Generations
        {
            get => _generations;
            set => SetProperty(ref _generations, value);
        }

        public double MutationProb
        {
            get => _mutationProb;
            set => SetProperty(ref _mutationProb, value);
        }

        public double CrossoverProb
        {
            get => _crossoverProb;
            set => SetProperty(ref _crossoverProb, value);
        }

        public string SelectedObjective
        {
            get => _selectedObjective;
            set => SetProperty(ref _selectedObjective, value);
        }

        public ObservableCollection<string> Objectives { get; } = new ObservableCollection<string>
        {
            "minimize_makespan",
            "minimize_cost",
            "maximize_resource_utilization",
            "minimize_late_orders"
        };

        public ICommand RefreshCommand { get; }
        public ICommand RunSchedulingCommand { get; }
        public ICommand CheckMaterialsCommand { get; }
        public ICommand LoadScheduleRunsCommand { get; }
        public ICommand ViewGanttChartCommand { get; }
        public ICommand ViewResourceLoadCommand { get; }

        public ApsOptimizerViewModel()
        {
            _populationSize = 100;
            _generations = 50;
            _mutationProb = 0.2;
            _crossoverProb = 0.7;
            _selectedObjective = "minimize_makespan";
            _schedulingStatus = "就绪";

            RefreshCommand = new RelayCommand(async () => await LoadAllDataAsync());
            RunSchedulingCommand = new RelayCommand(async () => await RunSchedulingAsync(), () => !IsScheduling);
            CheckMaterialsCommand = new RelayCommand(async () => await CheckMaterialsAsync());
            LoadScheduleRunsCommand = new RelayCommand(async () => await LoadScheduleRunsAsync());
            ViewGanttChartCommand = new RelayCommand(ViewGanttChart, () => SelectedScheduleRun != null);
            ViewResourceLoadCommand = new RelayCommand(ViewResourceLoad, () => SelectedScheduleRun != null);
            
            _ = LoadAllDataAsync();
        }

        private async Task LoadAllDataAsync()
        {
            await LoadPendingOrdersAsync();
            await LoadScheduledOrdersAsync();
            await LoadScheduleRunsAsync();
            await LoadWorkCentersAsync();
            await LoadResourcesAsync();
            await LoadMoldsAsync();
            await LoadEmployeesAsync();
        }

        private async Task LoadPendingOrdersAsync()
        {
            try
            {
                var orders = await ApiService.Instance.GetAsync<ObservableCollection<Order>>("/aps/orders/pending/");
                if (orders != null)
                {
                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        PendingOrders.Clear();
                        foreach (var order in orders)
                        {
                            PendingOrders.Add(order);
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading pending orders: {ex.Message}");
            }
        }

        private async Task LoadScheduledOrdersAsync()
        {
            try
            {
                var orders = await ApiService.Instance.GetAsync<ObservableCollection<Order>>("/aps/orders/scheduled/");
                if (orders != null)
                {
                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        ScheduledOrders.Clear();
                        foreach (var order in orders)
                        {
                            ScheduledOrders.Add(order);
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading scheduled orders: {ex.Message}");
            }
        }

        private async Task LoadScheduleRunsAsync()
        {
            try
            {
                var runs = await ApiService.Instance.GetAsync<ObservableCollection<ScheduleRun>>("/aps/schedule-runs/");
                if (runs != null)
                {
                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        ScheduleRuns.Clear();
                        foreach (var run in runs)
                        {
                            ScheduleRuns.Add(run);
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading schedule runs: {ex.Message}");
            }
        }

        private async Task LoadScheduleJobsAsync()
        {
            if (SelectedScheduleRun == null)
                return;

            try
            {
                var jobs = await ApiService.Instance.GetAsync<ObservableCollection<ScheduleJob>>(
                    $"/aps/schedule-runs/{SelectedScheduleRun.Id}/jobs/");
                if (jobs != null)
                {
                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        ScheduleJobs.Clear();
                        foreach (var job in jobs)
                        {
                            ScheduleJobs.Add(job);
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading schedule jobs: {ex.Message}");
            }
        }

        private async Task LoadWorkCentersAsync()
        {
            try
            {
                var workCenters = await ApiService.Instance.GetAsync<ObservableCollection<WorkCenter>>("/aps/work-centers/");
                if (workCenters != null)
                {
                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        WorkCenters.Clear();
                        foreach (var wc in workCenters)
                        {
                            WorkCenters.Add(wc);
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading work centers: {ex.Message}");
            }
        }

        private async Task LoadResourcesAsync()
        {
            try
            {
                var resources = await ApiService.Instance.GetAsync<ObservableCollection<Resource>>("/aps/resources/");
                if (resources != null)
                {
                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        Resources.Clear();
                        foreach (var resource in resources)
                        {
                            Resources.Add(resource);
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading resources: {ex.Message}");
            }
        }

        private async Task LoadMoldsAsync()
        {
            try
            {
                var molds = await ApiService.Instance.GetAsync<ObservableCollection<Mold>>("/aps/molds/");
                if (molds != null)
                {
                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        Molds.Clear();
                        foreach (var mold in molds)
                        {
                            Molds.Add(mold);
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading molds: {ex.Message}");
            }
        }

        private async Task LoadEmployeesAsync()
        {
            try
            {
                var employees = await ApiService.Instance.GetAsync<ObservableCollection<Employee>>("/aps/employees/");
                if (employees != null)
                {
                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        Employees.Clear();
                        foreach (var emp in employees)
                        {
                            Employees.Add(emp);
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading employees: {ex.Message}");
            }
        }

        private async Task RunSchedulingAsync()
        {
            if (IsScheduling)
                return;

            IsScheduling = true;
            SchedulingStatus = "正在执行排程...";

            try
            {
                var parameters = new
                {
                    run_name = $"Schedule_{DateTime.Now:yyyyMMdd_HHmmss}",
                    algorithm_name = "genetic_algorithm",
                    objective_function = SelectedObjective,
                    population_size = PopulationSize,
                    generations = Generations,
                    mutation_prob = MutationProb,
                    crossover_prob = CrossoverProb
                };

                var result = await ApiService.Instance.PostAsync<Dictionary<string, object>>(
                    "/aps/scheduler/run/", parameters);

                if (result != null && result.ContainsKey("success") && (bool)result["success"])
                {
                    SchedulingStatus = "排程完成";
                    await LoadScheduleRunsAsync();
                }
                else
                {
                    SchedulingStatus = "排程失败";
                }
            }
            catch (Exception ex)
            {
                SchedulingStatus = $"排程错误: {ex.Message}";
                Console.WriteLine($"Scheduling error: {ex.Message}");
            }
            finally
            {
                IsScheduling = false;
            }
        }

        private async Task CheckMaterialsAsync()
        {
            try
            {
                var result = await ApiService.Instance.PostAsync<Dictionary<string, object>>(
                    "/aps/scheduler/check-materials/", new { });

                if (result != null && result.ContainsKey("results"))
                {
                    SchedulingStatus = "物料齐套检查完成";
                }
            }
            catch (Exception ex)
            {
                SchedulingStatus = $"物料检查错误: {ex.Message}";
                Console.WriteLine($"Material check error: {ex.Message}");
            }
        }

        private void ViewGanttChart()
        {
            if (SelectedScheduleRun == null)
                return;
            
            MessageBox.Show($"正在加载排程运行 {SelectedScheduleRun.RunId} 的甘特图...", "甘特图",
                MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void ViewResourceLoad()
        {
            if (SelectedScheduleRun == null)
                return;
            
            MessageBox.Show($"正在加载排程运行 {SelectedScheduleRun.RunId} 的资源负荷图...", "资源负荷",
                MessageBoxButton.OK, MessageBoxImage.Information);
        }
    }
}
