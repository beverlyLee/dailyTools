import json
from datetime import datetime, timedelta
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from .models import (
    Product, Order, ResourceType, Resource, Mold, Material,
    ProductMaterialRequirement, Inventory, Employee, WorkCenter,
    ProcessRoute, ProcessStep, ScheduleRun, ScheduleJob,
    ResourceAllocation, MaterialCheckResult
)
from .serializers import (
    ProductSerializer, OrderSerializer, ResourceTypeSerializer, ResourceSerializer,
    MoldSerializer, MaterialSerializer, ProductMaterialRequirementSerializer,
    InventorySerializer, EmployeeSerializer, WorkCenterSerializer,
    ProcessRouteSerializer, ProcessStepSerializer, ScheduleRunSerializer,
    ScheduleJobSerializer, ResourceAllocationSerializer, MaterialCheckResultSerializer
)
from .genetic_algorithm import GeneticAlgorithmScheduler


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    search_fields = ['product_id', 'product_name']


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    filterset_fields = ['product', 'status', 'priority']
    search_fields = ['order_id', 'product__product_name']

    @action(detail=False, methods=['get'])
    def pending(self, request):
        pending_orders = Order.objects.filter(status='pending').order_by('priority', 'due_date')
        serializer = self.get_serializer(pending_orders, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def scheduled(self, request):
        scheduled_orders = Order.objects.filter(status__in=['scheduled', 'in_progress']).order_by('priority', 'due_date')
        serializer = self.get_serializer(scheduled_orders, many=True)
        return Response(serializer.data)


class ResourceTypeViewSet(viewsets.ModelViewSet):
    queryset = ResourceType.objects.all()
    serializer_class = ResourceTypeSerializer
    search_fields = ['name']


class ResourceViewSet(viewsets.ModelViewSet):
    queryset = Resource.objects.all()
    serializer_class = ResourceSerializer
    filterset_fields = ['resource_type', 'status']
    search_fields = ['resource_id', 'resource_name']

    @action(detail=False, methods=['get'])
    def available(self, request):
        available_resources = Resource.objects.filter(status='available')
        serializer = self.get_serializer(available_resources, many=True)
        return Response(serializer.data)


class MoldViewSet(viewsets.ModelViewSet):
    queryset = Mold.objects.all()
    serializer_class = MoldSerializer
    filterset_fields = ['product', 'status']
    search_fields = ['mold_id', 'mold_name']

    @action(detail=False, methods=['get'])
    def available(self, request):
        product_id = request.query_params.get('product_id')
        molds = Mold.objects.filter(status='available')
        if product_id:
            molds = molds.filter(product__product_id=product_id)
        serializer = self.get_serializer(molds, many=True)
        return Response(serializer.data)


class MaterialViewSet(viewsets.ModelViewSet):
    queryset = Material.objects.all()
    serializer_class = MaterialSerializer
    search_fields = ['material_id', 'material_name']


class ProductMaterialRequirementViewSet(viewsets.ModelViewSet):
    queryset = ProductMaterialRequirement.objects.all()
    serializer_class = ProductMaterialRequirementSerializer
    filterset_fields = ['product', 'material']


class InventoryViewSet(viewsets.ModelViewSet):
    queryset = Inventory.objects.all()
    serializer_class = InventorySerializer
    filterset_fields = ['material']
    search_fields = ['material__material_name', 'material__material_id']

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        low_stock_items = []
        for inventory in Inventory.objects.select_related('material').all():
            if inventory.quantity < inventory.material.safety_stock:
                low_stock_items.append(inventory)
        serializer = self.get_serializer(low_stock_items, many=True)
        return Response(serializer.data)


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    filterset_fields = ['status', 'skill_level']
    search_fields = ['employee_id', 'name']

    @action(detail=False, methods=['get'])
    def available(self, request):
        available_employees = Employee.objects.filter(status='available')
        serializer = self.get_serializer(available_employees, many=True)
        return Response(serializer.data)


class WorkCenterViewSet(viewsets.ModelViewSet):
    queryset = WorkCenter.objects.all()
    serializer_class = WorkCenterSerializer
    filterset_fields = ['production_line']
    search_fields = ['work_center_id', 'work_center_name']


class ProcessRouteViewSet(viewsets.ModelViewSet):
    queryset = ProcessRoute.objects.all()
    serializer_class = ProcessRouteSerializer
    filterset_fields = ['product', 'is_primary']
    search_fields = ['route_name']

    @action(detail=True, methods=['get'])
    def steps(self, request, pk=None):
        process_route = self.get_object()
        steps = ProcessStep.objects.filter(process_route=process_route).order_by('step_number')
        serializer = ProcessStepSerializer(steps, many=True)
        return Response(serializer.data)


class ProcessStepViewSet(viewsets.ModelViewSet):
    queryset = ProcessStep.objects.all()
    serializer_class = ProcessStepSerializer
    filterset_fields = ['process_route', 'work_center']
    search_fields = ['step_name']


class ScheduleRunViewSet(viewsets.ModelViewSet):
    queryset = ScheduleRun.objects.all()
    serializer_class = ScheduleRunSerializer
    filterset_fields = ['status', 'algorithm_name']
    search_fields = ['run_id', 'run_name']
    ordering = ['-created_at']

    @action(detail=True, methods=['get'])
    def jobs(self, request, pk=None):
        schedule_run = self.get_object()
        jobs = ScheduleJob.objects.filter(schedule_run=schedule_run).order_by('planned_start_time')
        serializer = ScheduleJobSerializer(jobs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def gantt_data(self, request, pk=None):
        schedule_run = self.get_object()
        jobs = ScheduleJob.objects.filter(schedule_run=schedule_run).order_by('planned_start_time')
        
        gantt_data = {
            'tasks': [],
            'work_centers': {}
        }
        
        for job in jobs:
            task = {
                'id': f"{job.job_id}",
                'name': f"{job.order.order_id} - {job.process_step.step_name}",
                'resource': job.work_center.work_center_id,
                'resource_name': job.work_center.work_center_name,
                'start': job.planned_start_time.isoformat() if job.planned_start_time else None,
                'end': job.planned_end_time.isoformat() if job.planned_end_time else None,
                'duration': job.cycle_time_used + job.setup_time_used,
                'status': job.status,
                'priority': job.priority,
                'order_id': job.order.order_id,
                'is_late': job.is_late
            }
            gantt_data['tasks'].append(task)
            
            wc_id = job.work_center.work_center_id
            if wc_id not in gantt_data['work_centers']:
                gantt_data['work_centers'][wc_id] = {
                    'id': wc_id,
                    'name': job.work_center.work_center_name,
                    'jobs': []
                }
            gantt_data['work_centers'][wc_id]['jobs'].append(task)
        
        return Response(gantt_data)

    @action(detail=True, methods=['get'])
    def resource_load(self, request, pk=None):
        schedule_run = self.get_object()
        jobs = ScheduleJob.objects.filter(schedule_run=schedule_run)
        
        time_interval = int(request.query_params.get('interval', 60))
        
        if not jobs:
            return Response({'work_centers': {}, 'time_slots': []})
        
        min_time = min(job.planned_start_time for job in jobs if job.planned_start_time)
        max_time = max(job.planned_end_time for job in jobs if job.planned_end_time)
        
        time_slots = []
        current_time = min_time
        while current_time < max_time:
            time_slots.append(current_time)
            current_time += timedelta(minutes=time_interval)
        
        work_centers_data = {}
        work_centers = WorkCenter.objects.filter(schedule_jobs__in=jobs).distinct()
        
        for wc in work_centers:
            wc_jobs = jobs.filter(work_center=wc)
            load_percent = []
            
            for slot_start in time_slots:
                slot_end = slot_start + timedelta(minutes=time_interval)
                slot_duration = time_interval
                
                busy_time = 0
                for job in wc_jobs:
                    if job.planned_start_time and job.planned_end_time:
                        job_start = job.planned_start_time
                        job_end = job.planned_end_time
                        
                        overlap_start = max(slot_start, job_start)
                        overlap_end = min(slot_end, job_end)
                        
                        if overlap_start < overlap_end:
                            overlap_duration = (overlap_end - overlap_start).total_seconds() / 60
                            busy_time += overlap_duration
                
                if slot_duration > 0 and wc.capacity > 0:
                    load = (busy_time / (slot_duration * wc.capacity)) * 100
                else:
                    load = 0
                
                load_percent.append(min(100, load))
            
            work_centers_data[wc.work_center_id] = {
                'id': wc.work_center_id,
                'name': wc.work_center_name,
                'capacity': wc.capacity,
                'load_percent': load_percent
            }
        
        return Response({
            'time_slots': [slot.isoformat() for slot in time_slots],
            'work_centers': work_centers_data
        })


class ScheduleJobViewSet(viewsets.ModelViewSet):
    queryset = ScheduleJob.objects.all()
    serializer_class = ScheduleJobSerializer
    filterset_fields = ['schedule_run', 'order', 'work_center', 'status']
    search_fields = ['job_id', 'order__order_id']


class SchedulerViewSet(viewsets.ViewSet):
    
    @action(detail=False, methods=['post'])
    def run_schedule(self, request):
        run_name = request.data.get('run_name', f"Schedule_{timezone.now().strftime('%Y%m%d_%H%M%S')}")
        algorithm_name = request.data.get('algorithm_name', 'genetic_algorithm')
        objective_function = request.data.get('objective_function', 'minimize_makespan')
        
        config = {
            'population_size': request.data.get('population_size', 100),
            'generations': request.data.get('generations', 50),
            'mutation_prob': request.data.get('mutation_prob', 0.2),
            'crossover_prob': request.data.get('crossover_prob', 0.7),
            'elitism_size': request.data.get('elitism_size', 5),
        }
        
        schedule_run = ScheduleRun.objects.create(
            run_id=f"RUN_{timezone.now().strftime('%Y%m%d%H%M%S')}",
            run_name=run_name,
            status='running',
            algorithm_name=algorithm_name,
            objective_function=objective_function,
            parameters=json.dumps(config),
            start_time=timezone.now()
        )
        
        try:
            orders = Order.objects.filter(status='pending').order_by('priority', 'due_date')
            work_centers = WorkCenter.objects.all()
            resources = Resource.objects.filter(status='available')
            molds = Mold.objects.filter(status='available')
            employees = Employee.objects.filter(status='available')
            
            orders_data = []
            for order in orders:
                process_routes = ProcessRoute.objects.filter(product=order.product, is_primary=True)
                process_steps = []
                
                if process_routes.exists():
                    route = process_routes.first()
                    steps = ProcessStep.objects.filter(process_route=route).order_by('step_number')
                    for step in steps:
                        process_steps.append({
                            'step_number': step.step_number,
                            'step_name': step.step_name,
                            'work_center_id': step.work_center.work_center_id,
                            'cycle_time': step.cycle_time,
                            'setup_time': step.setup_time,
                            'employee_count': step.employee_count,
                            'required_mold': step.required_mold,
                            'resource_type': step.resource_type.name if step.resource_type else None,
                            'resource_count': step.resource_count
                        })
                
                material_requirements = {}
                requirements = ProductMaterialRequirement.objects.filter(product=order.product)
                for req in requirements:
                    material_requirements[req.material.material_id] = req.quantity_per_unit
                
                orders_data.append({
                    'order_id': order.order_id,
                    'product_id': order.product.product_id,
                    'quantity': order.quantity,
                    'priority': order.priority,
                    'due_date': order.due_date,
                    'process_steps': process_steps,
                    'material_requirements': material_requirements
                })
            
            work_centers_data = [{
                'work_center_id': wc.work_center_id,
                'work_center_name': wc.work_center_name,
                'capacity': wc.capacity
            } for wc in work_centers]
            
            resources_data = [{
                'resource_id': res.resource_id,
                'resource_name': res.resource_name,
                'resource_type': res.resource_type.name,
                'capacity': res.capacity
            } for res in resources]
            
            molds_data = [{
                'mold_id': mold.mold_id,
                'mold_name': mold.mold_name,
                'product_id': mold.product.product_id,
                'status': mold.status,
                'remaining_life': mold.remaining_life
            } for mold in molds]
            
            employees_data = [{
                'employee_id': emp.employee_id,
                'name': emp.name,
                'skill_level': emp.skill_level,
                'status': emp.status,
                'cost_per_hour': emp.cost_per_hour
            } for emp in employees]
            
            inventory_data = {}
            for inv in Inventory.objects.select_related('material').all():
                inventory_data[inv.material.material_id] = inv.quantity
            
            scheduler = GeneticAlgorithmScheduler(config)
            scheduler.load_data(
                orders=orders_data,
                work_centers=work_centers_data,
                resources=resources_data,
                molds=molds_data,
                employees=employees_data,
                inventory=inventory_data
            )
            
            result = scheduler.run()
            
            if not result['success']:
                schedule_run.status = 'failed'
                schedule_run.end_time = timezone.now()
                schedule_run.save()
                return Response({'error': result['message']}, status=status.HTTP_400_BAD_REQUEST)
            
            schedule = result['schedule']
            metrics = result['metrics']
            
            with transaction.atomic():
                for job_info in schedule['jobs']:
                    try:
                        order = Order.objects.get(order_id=job_info['order_id'])
                        work_center = WorkCenter.objects.get(work_center_id=job_info['work_center_id'])
                        
                        process_step = None
                        process_routes = ProcessRoute.objects.filter(product=order.product, is_primary=True)
                        if process_routes.exists():
                            steps = ProcessStep.objects.filter(
                                process_route=process_routes.first(),
                                step_number=job_info['step_number']
                            )
                            if steps.exists():
                                process_step = steps.first()
                        
                        mold = None
                        if job_info.get('mold'):
                            try:
                                mold = Mold.objects.get(mold_id=job_info['mold'])
                            except Mold.DoesNotExist:
                                pass
                        
                        schedule_job = ScheduleJob.objects.create(
                            schedule_run=schedule_run,
                            order=order,
                            process_step=process_step,
                            job_id=job_info['job_id'],
                            work_center=work_center,
                            mold=mold,
                            status='scheduled',
                            planned_start_time=job_info['start_time'],
                            planned_end_time=job_info['end_time'],
                            setup_time_used=job_info.get('duration', 0) - (process_step.cycle_time * order.quantity if process_step else 0),
                            cycle_time_used=process_step.cycle_time * order.quantity if process_step else 0,
                            quantity=job_info.get('quantity', order.quantity),
                            priority=job_info.get('priority', order.priority)
                        )
                        
                        for emp_id in job_info.get('employees', []):
                            try:
                                emp = Employee.objects.get(employee_id=emp_id)
                                schedule_job.employees.add(emp)
                            except Employee.DoesNotExist:
                                pass
                        
                        for res_id in job_info.get('resources', []):
                            try:
                                res = Resource.objects.get(resource_id=res_id)
                                ResourceAllocation.objects.create(
                                    schedule_job=schedule_job,
                                    resource=res,
                                    start_time=job_info['start_time'],
                                    end_time=job_info['end_time'],
                                    quantity_used=1.0
                                )
                            except Resource.DoesNotExist:
                                pass
                                
                    except Exception as e:
                        print(f"Error creating job: {e}")
                        continue
                
                material_results = scheduler.check_material_availability(orders_data)
                for order_id, check_result in material_results.items():
                    try:
                        order = Order.objects.get(order_id=order_id)
                        for material_check in check_result['materials']:
                            try:
                                material = Material.objects.get(material_id=material_check['material_id'])
                                MaterialCheckResult.objects.create(
                                    schedule_run=schedule_run,
                                    order=order,
                                    material=material,
                                    required_quantity=material_check['required'],
                                    available_quantity=material_check['available'],
                                    status=material_check['status']
                                )
                            except Material.DoesNotExist:
                                continue
                    except Order.DoesNotExist:
                        continue
                
                schedule_run.status = 'completed'
                schedule_run.end_time = timezone.now()
                schedule_run.result_makespan = metrics.get('makespan_minutes', 0)
                schedule_run.result_total_cost = metrics.get('total_cost', 0)
                schedule_run.result_late_orders = metrics.get('late_orders', 0)
                schedule_run.result_resource_utilization = metrics.get('resource_utilization_percent', 0)
                schedule_run.save()
            
            return Response({
                'success': True,
                'schedule_run_id': schedule_run.run_id,
                'metrics': metrics,
                'message': '排程完成'
            })
            
        except Exception as e:
            schedule_run.status = 'failed'
            schedule_run.end_time = timezone.now()
            schedule_run.save()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def check_materials(self, request):
        order_ids = request.data.get('order_ids', [])
        
        if not order_ids:
            orders = Order.objects.filter(status='pending')
        else:
            orders = Order.objects.filter(order_id__in=order_ids)
        
        results = []
        for order in orders:
            order_result = {
                'order_id': order.order_id,
                'product_name': order.product.product_name,
                'quantity': order.quantity,
                'materials': [],
                'status': 'sufficient'
            }
            
            requirements = ProductMaterialRequirement.objects.filter(product=order.product)
            for req in requirements:
                inventory = Inventory.objects.filter(material=req.material).first()
                available = inventory.quantity if inventory else 0
                required = req.quantity_per_unit * order.quantity
                
                if available >= required:
                    status = 'sufficient'
                elif available > 0:
                    status = 'partial'
                    order_result['status'] = 'partial'
                else:
                    status = 'insufficient'
                    order_result['status'] = 'insufficient'
                
                order_result['materials'].append({
                    'material_id': req.material.material_id,
                    'material_name': req.material.material_name,
                    'unit': req.material.unit,
                    'required': required,
                    'available': available,
                    'status': status
                })
            
            results.append(order_result)
        
        return Response({'results': results})


class ResourceAllocationViewSet(viewsets.ModelViewSet):
    queryset = ResourceAllocation.objects.all()
    serializer_class = ResourceAllocationSerializer
    filterset_fields = ['schedule_job', 'resource']


class MaterialCheckResultViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MaterialCheckResult.objects.all()
    serializer_class = MaterialCheckResultSerializer
    filterset_fields = ['schedule_run', 'order', 'material', 'status']
