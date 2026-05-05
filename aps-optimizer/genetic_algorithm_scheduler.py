"""
APS 排程优化器核心模块
基于遗传算法优化生产排程，考虑模具、人力、物料齐套约束
"""

import random
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import copy
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class JobStatus(Enum):
    PENDING = "pending"
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DELAYED = "delayed"


class ConstraintType(Enum):
    PRECEDENCE = "precedence"
    RESOURCE_CAPACITY = "resource_capacity"
    MOLD_AVAILABILITY = "mold_availability"
    MATERIAL_KITTING = "material_kitting"
    EMPLOYEE_AVAILABILITY = "employee_availability"
    DUE_DATE = "due_date"


@dataclass
class TimeSlot:
    start: datetime
    end: datetime
    
    @property
    def duration(self) -> float:
        return (self.end - self.start).total_seconds() / 60
    
    def overlaps_with(self, other: 'TimeSlot') -> bool:
        return self.start < other.end and other.start < self.end
    
    def get_overlap_duration(self, other: 'TimeSlot') -> float:
        if not self.overlaps_with(other):
            return 0.0
        overlap_start = max(self.start, other.start)
        overlap_end = min(self.end, other.end)
        return (overlap_end - overlap_start).total_seconds() / 60


@dataclass
class Resource:
    resource_id: str
    resource_name: str
    resource_type: str
    capacity: float = 1.0
    cost_per_hour: float = 0.0
    status: str = "available"
    allocations: List[Tuple[TimeSlot, float]] = field(default_factory=list)
    
    def get_available_capacity(self, slot: TimeSlot) -> float:
        used_capacity = 0.0
        for allocated_slot, quantity in self.allocations:
            if allocated_slot.overlaps_with(slot):
                used_capacity += quantity
        
        return self.capacity - used_capacity
    
    def can_allocate(self, slot: TimeSlot, quantity: float = 1.0) -> bool:
        return self.get_available_capacity(slot) >= quantity
    
    def allocate(self, slot: TimeSlot, quantity: float = 1.0) -> bool:
        if not self.can_allocate(slot, quantity):
            return False
        self.allocations.append((slot, quantity))
        return True
    
    def get_utilization(self, total_time: float) -> float:
        if total_time <= 0:
            return 0.0
        total_used = 0.0
        for slot, quantity in self.allocations:
            total_used += slot.duration * quantity
        return total_used / (total_time * self.capacity) * 100


@dataclass
class Mold(Resource):
    product_id: Optional[str] = None
    remaining_life: float = 10000.0
    total_life: float = 10000.0
    
    @property
    def life_percentage(self) -> float:
        return self.remaining_life / self.total_life * 100


@dataclass
class Employee(Resource):
    skill_level: int = 1


@dataclass
class WorkCenter:
    work_center_id: str
    work_center_name: str
    capacity: int = 1
    devices: List[str] = field(default_factory=list)
    employees: List[str] = field(default_factory=list)
    scheduled_jobs: List = field(default_factory=list)


@dataclass
class Material:
    material_id: str
    material_name: str
    unit: str = "件"
    available_quantity: float = 0.0
    safety_stock: float = 0.0
    
    @property
    def is_low_stock(self) -> bool:
        return self.available_quantity < self.safety_stock
    
    def can_fulfill(self, required_quantity: float) -> bool:
        return self.available_quantity >= required_quantity


@dataclass
class ProcessStep:
    step_number: int
    step_name: str
    work_center_id: str
    cycle_time: float = 1.0
    setup_time: float = 0.0
    employee_count: int = 1
    required_mold: bool = False
    resource_type: Optional[str] = None
    resource_count: int = 0
    predecessors: List[int] = field(default_factory=list)
    
    @property
    def total_time(self) -> float:
        return self.setup_time + self.cycle_time


@dataclass
class Product:
    product_id: str
    product_name: str
    standard_cycle_time: float = 1.0
    process_steps: List[ProcessStep] = field(default_factory=list)
    material_requirements: Dict[str, float] = field(default_factory=dict)


@dataclass
class Order:
    order_id: str
    product: Product
    quantity: int
    priority: int = 5
    due_date: datetime = None
    order_date: datetime = None
    status: JobStatus = JobStatus.PENDING
    notes: str = ""
    
    def get_total_processing_time(self) -> float:
        total = 0.0
        for step in self.product.process_steps:
            total += step.setup_time + (step.cycle_time * self.quantity)
        return total


@dataclass
class ScheduledJob:
    job_id: str
    order: Order
    process_step: ProcessStep
    work_center_id: str
    time_slot: TimeSlot
    mold: Optional[Mold] = None
    employees: List[Employee] = field(default_factory=list)
    resources: List[Resource] = field(default_factory=list)
    status: JobStatus = JobStatus.SCHEDULED
    is_late: bool = False
    
    @property
    def duration(self) -> float:
        return self.time_slot.duration


class ConstraintManager:
    def __init__(self):
        self.constraints: List[Dict] = []
        self.violations: List[Dict] = []
        
    def add_constraint(self, constraint_type: ConstraintType, parameters: Dict, 
                       hard: bool = True, weight: float = 1.0):
        self.constraints.append({
            'type': constraint_type,
            'parameters': parameters,
            'hard': hard,
            'weight': weight
        })
        
    def check_all_constraints(self, schedule: Dict) -> Tuple[bool, List[Dict]]:
        self.violations = []
        all_satisfied = True
        
        for constraint in self.constraints:
            satisfied, violation = self._check_constraint(constraint, schedule)
            if not satisfied:
                self.violations.append({
                    'constraint': constraint,
                    'violation': violation
                })
                if constraint['hard']:
                    all_satisfied = False
                    
        return all_satisfied, self.violations
    
    def _check_constraint(self, constraint: Dict, schedule: Dict) -> Tuple[bool, Optional[Dict]]:
        constraint_type = constraint['type']
        parameters = constraint['parameters']
        
        if constraint_type == ConstraintType.PRECEDENCE:
            return self._check_precedence_constraint(schedule, parameters)
        elif constraint_type == ConstraintType.RESOURCE_CAPACITY:
            return self._check_resource_capacity_constraint(schedule, parameters)
        elif constraint_type == ConstraintType.MOLD_AVAILABILITY:
            return self._check_mold_availability_constraint(schedule, parameters)
        elif constraint_type == ConstraintType.MATERIAL_KITTING:
            return self._check_material_kitting_constraint(schedule, parameters)
        elif constraint_type == ConstraintType.EMPLOYEE_AVAILABILITY:
            return self._check_employee_availability_constraint(schedule, parameters)
        elif constraint_type == ConstraintType.DUE_DATE:
            return self._check_due_date_constraint(schedule, parameters)
        else:
            return True, None
    
    def _check_precedence_constraint(self, schedule: Dict, parameters: Dict) -> Tuple[bool, Optional[Dict]]:
        jobs = schedule.get('jobs', [])
        violations = []
        
        for job in jobs:
            step = job.process_step
            for pred_step_num in step.predecessors:
                pred_job = None
                for j in jobs:
                    if (j.order.order_id == job.order.order_id and 
                        j.process_step.step_number == pred_step_num):
                        pred_job = j
                        break
                
                if pred_job and job.time_slot.start < pred_job.time_slot.end:
                    violations.append({
                        'job': job.job_id,
                        'predecessor': pred_job.job_id,
                        'message': f"步骤 {step.step_number} 在其前驱步骤 {pred_step_num} 完成前开始"
                    })
        
        if violations:
            return False, {'violations': violations}
        return True, None
    
    def _check_resource_capacity_constraint(self, schedule: Dict, parameters: Dict) -> Tuple[bool, Optional[Dict]]:
        resource_id = parameters.get('resource_id')
        max_capacity = parameters.get('max_capacity', 1.0)
        time_interval = parameters.get('time_interval', 60.0)
        
        jobs = schedule.get('jobs', [])
        resource_jobs = [j for j in jobs if resource_id in [r.resource_id for r in j.resources]]
        
        resource_jobs.sort(key=lambda j: j.time_slot.start)
        
        violations = []
        current_time = resource_jobs[0].time_slot.start if resource_jobs else datetime.now()
        
        while True:
            slot_end = current_time + timedelta(minutes=time_interval)
            slot = TimeSlot(start=current_time, end=slot_end)
            
            overlapping = [j for j in resource_jobs if j.time_slot.overlaps_with(slot)]
            if len(overlapping) > max_capacity:
                violations.append({
                    'time_slot': f"{slot.start} - {slot.end}",
                    'concurrent_jobs': len(overlapping),
                    'max_allowed': max_capacity,
                    'message': f"在时间槽内有 {len(overlapping)} 个作业同时使用资源，超过最大容量 {max_capacity}"
                })
            
            if not resource_jobs or slot_end > resource_jobs[-1].time_slot.end:
                break
            current_time = slot_end
        
        if violations:
            return False, {'violations': violations}
        return True, None
    
    def _check_mold_availability_constraint(self, schedule: Dict, parameters: Dict) -> Tuple[bool, Optional[Dict]]:
        jobs = schedule.get('jobs', [])
        mold_jobs = [j for j in jobs if j.mold is not None]
        
        mold_groups = {}
        for job in mold_jobs:
            mold_id = job.mold.resource_id
            if mold_id not in mold_groups:
                mold_groups[mold_id] = []
            mold_groups[mold_id].append(job)
        
        violations = []
        for mold_id, jobs_list in mold_groups.items():
            jobs_list.sort(key=lambda j: j.time_slot.start)
            
            for i in range(len(jobs_list) - 1):
                if jobs_list[i].time_slot.overlaps_with(jobs_list[i + 1].time_slot):
                    violations.append({
                        'mold_id': mold_id,
                        'job1': jobs_list[i].job_id,
                        'job2': jobs_list[i + 1].job_id,
                        'message': f"模具 {mold_id} 被两个作业同时使用"
                    })
        
        if violations:
            return False, {'violations': violations}
        return True, None
    
    def _check_material_kitting_constraint(self, schedule: Dict, parameters: Dict) -> Tuple[bool, Optional[Dict]]:
        jobs = schedule.get('jobs', [])
        materials = parameters.get('materials', {})
        
        violations = []
        
        order_materials = {}
        for job in jobs:
            order_id = job.order.order_id
            if order_id not in order_materials:
                order_materials[order_id] = {
                    'order': job.order,
                    'first_step_time': job.time_slot.start
                }
            else:
                if job.time_slot.start < order_materials[order_id]['first_step_time']:
                    order_materials[order_id]['first_step_time'] = job.time_slot.start
        
        for order_id, info in order_materials.items():
            order = info['order']
            start_time = info['first_step_time']
            
            for material_id, req_per_unit in order.product.material_requirements.items():
                required = req_per_unit * order.quantity
                available = materials.get(material_id, 0)
                
                if available < required:
                    violations.append({
                        'order_id': order_id,
                        'material_id': material_id,
                        'required': required,
                        'available': available,
                        'first_step_time': start_time,
                        'message': f"订单 {order_id} 需要 {required} 单位物料 {material_id}，但只有 {available} 单位可用"
                    })
        
        if violations:
            return False, {'violations': violations}
        return True, None
    
    def _check_employee_availability_constraint(self, schedule: Dict, parameters: Dict) -> Tuple[bool, Optional[Dict]]:
        jobs = schedule.get('jobs', [])
        
        employee_groups = {}
        for job in jobs:
            for emp in job.employees:
                emp_id = emp.resource_id
                if emp_id not in employee_groups:
                    employee_groups[emp_id] = []
                employee_groups[emp_id].append(job)
        
        violations = []
        for emp_id, jobs_list in employee_groups.items():
            jobs_list.sort(key=lambda j: j.time_slot.start)
            
            for i in range(len(jobs_list) - 1):
                if jobs_list[i].time_slot.overlaps_with(jobs_list[i + 1].time_slot):
                    violations.append({
                        'employee_id': emp_id,
                        'job1': jobs_list[i].job_id,
                        'job2': jobs_list[i + 1].job_id,
                        'message': f"员工 {emp_id} 被分配到两个重叠的作业"
                    })
        
        if violations:
            return False, {'violations': violations}
        return True, None
    
    def _check_due_date_constraint(self, schedule: Dict, parameters: Dict) -> Tuple[bool, Optional[Dict]]:
        jobs = schedule.get('jobs', [])
        
        order_end_times = {}
        for job in jobs:
            order_id = job.order.order_id
            if order_id not in order_end_times:
                order_end_times[order_id] = {
                    'order': job.order,
                    'end_time': job.time_slot.end
                }
            else:
                if job.time_slot.end > order_end_times[order_id]['end_time']:
                    order_end_times[order_id]['end_time'] = job.time_slot.end
        
        violations = []
        for order_id, info in order_end_times.items():
            order = info['order']
            end_time = info['end_time']
            
            if end_time > order.due_date:
                delay_minutes = (end_time - order.due_date).total_seconds() / 60
                violations.append({
                    'order_id': order_id,
                    'due_date': order.due_date,
                    'actual_end': end_time,
                    'delay_minutes': delay_minutes,
                    'priority': order.priority,
                    'message': f"订单 {order_id} 延期 {delay_minutes:.1f} 分钟"
                })
        
        if violations:
            return False, {'violations': violations}
        return True, None
    
    def calculate_violation_penalty(self) -> float:
        penalty = 0.0
        for violation in self.violations:
            constraint = violation['constraint']
            weight = constraint.get('weight', 1.0)
            hard = constraint.get('hard', True)
            
            if hard:
                penalty += 1000.0 * weight
            else:
                penalty += 10.0 * weight
        
        return penalty


class GeneticAlgorithmScheduler:
    def __init__(self, config: Dict = None):
        self.config = config or {}
        self.population_size = self.config.get('population_size', 100)
        self.generations = self.config.get('generations', 50)
        self.mutation_prob = self.config.get('mutation_prob', 0.2)
        self.crossover_prob = self.config.get('crossover_prob', 0.7)
        self.elitism_size = self.config.get('elitism_size', 5)
        self.tournament_size = self.config.get('tournament_size', 3)
        
        self.orders: List[Order] = []
        self.work_centers: Dict[str, WorkCenter] = {}
        self.resources: Dict[str, Resource] = {}
        self.molds: Dict[str, Mold] = {}
        self.employees: Dict[str, Employee] = {}
        self.materials: Dict[str, Material] = {}
        
        self.constraint_manager = ConstraintManager()
        self.best_schedule: Optional[Dict] = None
        self.best_fitness: Optional[Tuple] = None
        
    def set_orders(self, orders: List[Order]):
        self.orders = orders
        
    def set_work_centers(self, work_centers: Dict[str, WorkCenter]):
        self.work_centers = work_centers
        
    def set_resources(self, resources: Dict[str, Resource]):
        self.resources = resources
        
    def set_molds(self, molds: Dict[str, Mold]):
        self.molds = molds
        
    def set_employees(self, employees: Dict[str, Employee]):
        self.employees = employees
        
    def set_materials(self, materials: Dict[str, Material]):
        self.materials = materials
        
    def setup_default_constraints(self):
        self.constraint_manager.add_constraint(
            ConstraintType.PRECEDENCE,
            {},
            hard=True,
            weight=10.0
        )
        
        self.constraint_manager.add_constraint(
            ConstraintType.MOLD_AVAILABILITY,
            {},
            hard=True,
            weight=10.0
        )
        
        self.constraint_manager.add_constraint(
            ConstraintType.EMPLOYEE_AVAILABILITY,
            {},
            hard=True,
            weight=10.0
        )
        
        self.constraint_manager.add_constraint(
            ConstraintType.MATERIAL_KITTING,
            {'materials': {mid: m.available_quantity for mid, m in self.materials.items()}},
            hard=True,
            weight=10.0
        )
        
        self.constraint_manager.add_constraint(
            ConstraintType.DUE_DATE,
            {},
            hard=False,
            weight=5.0
        )
        
    def create_random_schedule(self) -> Dict:
        jobs = []
        base_time = datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)
        
        total_steps = sum(len(order.product.process_steps) for order in self.orders)
        step_sequence = list(range(total_steps))
        random.shuffle(step_sequence)
        
        step_index = 0
        for order in self.orders:
            for step in order.product.process_steps:
                jobs.append({
                    'order': order,
                    'step': step,
                    'sequence': step_sequence[step_index]
                })
                step_index += 1
        
        jobs.sort(key=lambda j: j['sequence'])
        
        scheduled_jobs = []
        work_center_available_time = {wc_id: base_time for wc_id in self.work_centers}
        order_step_complete_time = {}
        
        for job_info in jobs:
            order = job_info['order']
            step = job_info['step']
            wc_id = step.work_center_id
            
            if wc_id not in work_center_available_time:
                available_work_centers = list(self.work_centers.keys())
                if available_work_centers:
                    wc_id = random.choice(available_work_centers)
                else:
                    continue
            
            earliest_start = work_center_available_time[wc_id]
            
            for pred_step_num in step.predecessors:
                key = (order.order_id, pred_step_num)
                if key in order_step_complete_time:
                    pred_end = order_step_complete_time[key]
                    if pred_end > earliest_start:
                        earliest_start = pred_end
            
            setup_time = step.setup_time
            cycle_time = step.cycle_time * order.quantity
            total_duration = setup_time + cycle_time
            
            end_time = earliest_start + timedelta(minutes=total_duration)
            
            selected_mold = None
            if step.required_mold:
                available_molds = [
                    m for m in self.molds.values()
                    if m.product_id == order.product.product_id and m.status == 'available'
                ]
                if available_molds:
                    selected_mold = random.choice(available_molds)
            
            selected_employees = []
            if step.employee_count > 0:
                available_employees = [
                    e for e in self.employees.values()
                    if e.status == 'available'
                ]
                if available_employees:
                    selected_employees = random.sample(
                        available_employees,
                        min(step.employee_count, len(available_employees))
                    )
            
            scheduled_job = ScheduledJob(
                job_id=f"J_{order.order_id}_{step.step_number}",
                order=order,
                process_step=step,
                work_center_id=wc_id,
                time_slot=TimeSlot(start=earliest_start, end=end_time),
                mold=selected_mold,
                employees=selected_employees
            )
            
            scheduled_jobs.append(scheduled_job)
            work_center_available_time[wc_id] = end_time
            order_step_complete_time[(order.order_id, step.step_number)] = end_time
        
        makespan = 0.0
        if scheduled_jobs:
            min_start = min(j.time_slot.start for j in scheduled_jobs)
            max_end = max(j.time_slot.end for j in scheduled_jobs)
            makespan = (max_end - min_start).total_seconds() / 60
        
        return {
            'jobs': scheduled_jobs,
            'makespan': makespan,
            'base_time': base_time
        }
    
    def decode_schedule(self, individual: List) -> Dict:
        if not self.orders:
            return {'jobs': [], 'makespan': 0.0}
        
        total_steps = sum(len(order.product.process_steps) for order in self.orders)
        if total_steps == 0:
            return {'jobs': [], 'makespan': 0.0}
        
        all_jobs = []
        for order in self.orders:
            for step in order.product.process_steps:
                all_jobs.append({'order': order, 'step': step})
        
        if len(individual) != len(all_jobs):
            return self.create_random_schedule()
        
        sorted_indices = sorted(range(len(individual)), key=lambda i: individual[i])
        sorted_jobs = [all_jobs[i] for i in sorted_indices]
        
        base_time = datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)
        scheduled_jobs = []
        work_center_available_time = {wc_id: base_time for wc_id in self.work_centers}
        order_step_complete_time = {}
        
        for job_info in sorted_jobs:
            order = job_info['order']
            step = job_info['step']
            wc_id = step.work_center_id
            
            if wc_id not in work_center_available_time and self.work_centers:
                wc_id = next(iter(self.work_centers.keys()))
            
            earliest_start = work_center_available_time.get(wc_id, base_time)
            
            for pred_step_num in step.predecessors:
                key = (order.order_id, pred_step_num)
                if key in order_step_complete_time:
                    pred_end = order_step_complete_time[key]
                    if pred_end > earliest_start:
                        earliest_start = pred_end
            
            setup_time = step.setup_time
            cycle_time = step.cycle_time * order.quantity
            total_duration = setup_time + cycle_time
            
            end_time = earliest_start + timedelta(minutes=total_duration)
            
            selected_mold = None
            if step.required_mold:
                available_molds = [
                    m for m in self.molds.values()
                    if m.product_id == order.product.product_id and m.status == 'available'
                ]
                if available_molds:
                    selected_mold = available_molds[0]
            
            selected_employees = []
            if step.employee_count > 0:
                available_employees = [
                    e for e in self.employees.values()
                    if e.status == 'available'
                ]
                if available_employees:
                    selected_employees = available_employees[:step.employee_count]
            
            scheduled_job = ScheduledJob(
                job_id=f"J_{order.order_id}_{step.step_number}",
                order=order,
                process_step=step,
                work_center_id=wc_id,
                time_slot=TimeSlot(start=earliest_start, end=end_time),
                mold=selected_mold,
                employees=selected_employees
            )
            
            scheduled_jobs.append(scheduled_job)
            work_center_available_time[wc_id] = end_time
            order_step_complete_time[(order.order_id, step.step_number)] = end_time
        
        makespan = 0.0
        if scheduled_jobs:
            min_start = min(j.time_slot.start for j in scheduled_jobs)
            max_end = max(j.time_slot.end for j in scheduled_jobs)
            makespan = (max_end - min_start).total_seconds() / 60
        
        return {
            'jobs': scheduled_jobs,
            'makespan': makespan,
            'base_time': base_time
        }
    
    def evaluate_fitness(self, individual: List) -> Tuple:
        schedule = self.decode_schedule(individual)
        
        makespan = schedule.get('makespan', 0.0)
        
        total_cost = 0.0
        for job in schedule.get('jobs', []):
            duration_hours = job.duration / 60
            
            if job.employees:
                for emp in job.employees:
                    total_cost += emp.cost_per_hour * duration_hours
            
            if job.mold:
                total_cost += 0.1 * duration_hours
        
        resource_utilization = 0.0
        if makespan > 0 and self.work_centers:
            total_wc_time = 0.0
            for wc_id, wc in self.work_centers.items():
                wc_jobs = [j for j in schedule.get('jobs', []) if j.work_center_id == wc_id]
                wc_busy_time = sum(j.duration for j in wc_jobs)
                total_wc_time += wc_busy_time / wc.capacity
            
            resource_utilization = (total_wc_time / (makespan * len(self.work_centers))) * 100
        
        constraints_satisfied, violations = self.constraint_manager.check_all_constraints(schedule)
        constraint_penalty = self.constraint_manager.calculate_violation_penalty()
        
        late_orders = 0
        for job in schedule.get('jobs', []):
            if job.time_slot.end > job.order.due_date:
                late_orders += 1
                break
        
        effective_makespan = makespan + constraint_penalty
        effective_cost = total_cost + constraint_penalty
        
        return (effective_makespan, effective_cost, resource_utilization, late_orders)
    
    def tournament_selection(self, population: List, fitnesses: List, k: int = 3) -> List:
        selected = []
        for _ in range(len(population)):
            candidates = random.sample(list(zip(population, fitnesses)), k)
            candidates.sort(key=lambda x: x[1])
            selected.append(copy.deepcopy(candidates[0][0]))
        return selected
    
    def ordered_crossover(self, parent1: List, parent2: List) -> Tuple[List, List]:
        if len(parent1) < 2:
            return parent1, parent2
        
        size = len(parent1)
        point1, point2 = sorted(random.sample(range(size), 2))
        
        child1 = [None] * size
        child2 = [None] * size
        
        child1[point1:point2] = parent1[point1:point2]
        child2[point1:point2] = parent2[point1:point2]
        
        def fill_child(child: List, parent: List, point1: int, point2: int):
            ptr = point2 % len(child)
            for gene in parent:
                if gene not in child:
                    while child[ptr] is not None:
                        ptr = (ptr + 1) % len(child)
                    child[ptr] = gene
                    ptr = (ptr + 1) % len(child)
        
        fill_child(child1, parent2, point1, point2)
        fill_child(child2, parent1, point1, point2)
        
        for i in range(size):
            if child1[i] is None:
                child1[i] = random.random()
            if child2[i] is None:
                child2[i] = random.random()
        
        return child1, child2
    
    def swap_mutation(self, individual: List) -> List:
        if len(individual) < 2:
            return individual
        
        idx1, idx2 = random.sample(range(len(individual)), 2)
        individual[idx1], individual[idx2] = individual[idx2], individual[idx1]
        
        return individual
    
    def run(self) -> Dict:
        if not self.orders:
            return {
                'success': False,
                'message': 'No orders to schedule'
            }
        
        self.setup_default_constraints()
        
        total_steps = sum(len(order.product.process_steps) for order in self.orders)
        
        population = []
        for _ in range(self.population_size):
            individual = [random.random() for _ in range(total_steps)]
            population.append(individual)
        
        best_individual = None
        best_fitness = None
        
        for gen in range(self.generations):
            fitnesses = [self.evaluate_fitness(ind) for ind in population]
            
            sorted_population = sorted(zip(population, fitnesses), key=lambda x: x[1])
            
            if best_fitness is None or sorted_population[0][1] < best_fitness:
                best_fitness = sorted_population[0][1]
                best_individual = copy.deepcopy(sorted_population[0][0])
            
            elites = [copy.deepcopy(ind) for ind, fit in sorted_population[:self.elitism_size]]
            
            selected = self.tournament_selection(population, fitnesses, self.tournament_size)
            
            offspring = []
            for i in range(0, len(selected) - 1, 2):
                parent1, parent2 = selected[i], selected[i + 1]
                
                if random.random() < self.crossover_prob:
                    child1, child2 = self.ordered_crossover(parent1, parent2)
                    offspring.append(child1)
                    offspring.append(child2)
                else:
                    offspring.append(copy.deepcopy(parent1))
                    offspring.append(copy.deepcopy(parent2))
            
            for i in range(len(offspring)):
                if random.random() < self.mutation_prob:
                    offspring[i] = self.swap_mutation(offspring[i])
            
            population = elites + offspring[:self.population_size - self.elitism_size]
            
            if (gen + 1) % 10 == 0:
                logger.info(f"Generation {gen + 1}: Best fitness = {best_fitness}")
        
        self.best_individual = best_individual
        self.best_fitness = best_fitness
        self.best_schedule = self.decode_schedule(best_individual)
        
        return {
            'success': True,
            'schedule': self.best_schedule,
            'best_fitness': best_fitness,
            'generations': self.generations,
            'population_size': self.population_size
        }
    
    def get_gantt_data(self) -> Dict:
        if not self.best_schedule:
            return {'tasks': [], 'resources': {}}
        
        jobs = self.best_schedule.get('jobs', [])
        
        tasks = []
        resources = {}
        
        for job in jobs:
            task = {
                'id': job.job_id,
                'name': f"{job.order.order_id} - {job.process_step.step_name}",
                'resource': job.work_center_id,
                'start': job.time_slot.start.isoformat(),
                'end': job.time_slot.end.isoformat(),
                'duration': job.duration,
                'order_id': job.order.order_id,
                'product_name': job.order.product.product_name,
                'quantity': job.order.quantity,
                'priority': job.order.priority,
                'is_late': job.is_late or (job.time_slot.end > job.order.due_date),
                'mold': job.mold.resource_id if job.mold else None,
                'employees': [e.resource_id for e in job.employees]
            }
            tasks.append(task)
            
            wc_id = job.work_center_id
            if wc_id not in resources:
                resources[wc_id] = {
                    'id': wc_id,
                    'name': self.work_centers.get(wc_id, WorkCenter(wc_id, wc_id)).work_center_name,
                    'jobs': [],
                    'total_busy_time': 0.0
                }
            resources[wc_id]['jobs'].append(task)
            resources[wc_id]['total_busy_time'] += job.duration
        
        tasks.sort(key=lambda x: x['start'])
        
        return {
            'tasks': tasks,
            'resources': resources,
            'makespan': self.best_schedule.get('makespan', 0.0)
        }
    
    def get_resource_load_data(self, time_interval: int = 60) -> Dict:
        if not self.best_schedule:
            return {'time_slots': [], 'work_centers': {}}
        
        jobs = self.best_schedule.get('jobs', [])
        
        if not jobs:
            return {'time_slots': [], 'work_centers': {}}
        
        min_time = min(j.time_slot.start for j in jobs)
        max_time = max(j.time_slot.end for j in jobs)
        
        time_slots = []
        current_time = min_time
        while current_time < max_time:
            time_slots.append({
                'start': current_time,
                'end': current_time + timedelta(minutes=time_interval)
            })
            current_time += timedelta(minutes=time_interval)
        
        work_centers_data = {}
        
        for wc_id, wc in self.work_centers.items():
            wc_jobs = [j for j in jobs if j.work_center_id == wc_id]
            
            load_percent = []
            for slot in time_slots:
                slot_duration = time_interval
                
                busy_time = 0.0
                for job in wc_jobs:
                    overlap = job.time_slot.get_overlap_duration(
                        TimeSlot(start=slot['start'], end=slot['end'])
                    )
                    busy_time += overlap
                
                if slot_duration > 0 and wc.capacity > 0:
                    load = (busy_time / (slot_duration * wc.capacity)) * 100
                else:
                    load = 0.0
                
                load_percent.append(min(100.0, load))
            
            work_centers_data[wc_id] = {
                'id': wc_id,
                'name': wc.work_center_name,
                'capacity': wc.capacity,
                'load_percent': load_percent
            }
        
        return {
            'time_slots': [s['start'].isoformat() for s in time_slots],
            'work_centers': work_centers_data
        }
    
    def get_schedule_metrics(self) -> Dict:
        if not self.best_schedule:
            return {}
        
        jobs = self.best_schedule.get('jobs', [])
        
        makespan = self.best_schedule.get('makespan', 0.0)
        
        late_orders = set()
        for job in jobs:
            if job.time_slot.end > job.order.due_date:
                late_orders.add(job.order.order_id)
        
        total_orders = len(set(job.order.order_id for job in jobs))
        on_time_orders = total_orders - len(late_orders)
        on_time_rate = (on_time_orders / total_orders * 100) if total_orders > 0 else 100.0
        
        resource_utilization = 0.0
        if makespan > 0 and self.work_centers:
            total_wc_time = 0.0
            for wc_id, wc in self.work_centers.items():
                wc_jobs = [j for j in jobs if j.work_center_id == wc_id]
                wc_busy_time = sum(j.duration for j in wc_jobs)
                total_wc_time += wc_busy_time / wc.capacity
            
            resource_utilization = (total_wc_time / (makespan * len(self.work_centers))) * 100
        
        total_cost = 0.0
        for job in jobs:
            duration_hours = job.duration / 60
            
            for emp in job.employees:
                total_cost += emp.cost_per_hour * duration_hours
            
            if job.mold:
                total_cost += 0.1 * duration_hours
        
        return {
            'makespan_minutes': makespan,
            'makespan_hours': makespan / 60,
            'total_orders': total_orders,
            'late_orders': len(late_orders),
            'on_time_orders': on_time_orders,
            'on_time_rate_percent': on_time_rate,
            'resource_utilization_percent': resource_utilization,
            'total_cost': total_cost,
            'total_jobs': len(jobs)
        }
