import random
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
from deap import base, creator, tools, algorithms
import json


@dataclass
class JobInfo:
    job_id: str
    order_id: str
    product_id: str
    quantity: int
    priority: int
    due_date: datetime
    process_steps: List[Dict] = field(default_factory=list)
    resource_requirements: Dict = field(default_factory=dict)


@dataclass
class WorkCenterInfo:
    work_center_id: str
    work_center_name: str
    capacity: int
    available_time: float = 0.0
    scheduled_jobs: List = field(default_factory=list)


@dataclass
class ResourceInfo:
    resource_id: str
    resource_name: str
    resource_type: str
    capacity: float
    availability: List[Tuple[datetime, datetime, float]] = field(default_factory=list)


@dataclass
class ScheduledJob:
    job_id: str
    order_id: str
    work_center_id: str
    step_number: int
    step_name: str
    start_time: datetime
    end_time: datetime
    duration: float
    resources: List[str] = field(default_factory=list)
    employees: List[str] = field(default_factory=list)
    mold: Optional[str] = None


class GeneticAlgorithmScheduler:
    def __init__(self, config: Dict = None):
        self.config = config or {}
        self.population_size = self.config.get('population_size', 100)
        self.generations = self.config.get('generations', 50)
        self.mutation_prob = self.config.get('mutation_prob', 0.2)
        self.crossover_prob = self.config.get('crossover_prob', 0.7)
        self.elitism_size = self.config.get('elitism_size', 5)
        
        self.jobs: List[JobInfo] = []
        self.work_centers: Dict[str, WorkCenterInfo] = {}
        self.resources: Dict[str, ResourceInfo] = {}
        self.molds: Dict[str, Dict] = {}
        self.employees: Dict[str, Dict] = {}
        self.inventory: Dict[str, float] = {}
        
        self._setup_deap()

    def _setup_deap(self):
        if not hasattr(creator, "FitnessMin"):
            creator.create("FitnessMin", base.Fitness, weights=(-1.0, -1.0, 1.0, -1.0))
        
        if not hasattr(creator, "Individual"):
            creator.create("Individual", list, fitness=creator.FitnessMin)
        
        self.toolbox = base.Toolbox()

    def load_data(self, 
                  orders: List[Dict],
                  work_centers: List[Dict],
                  resources: List[Dict] = None,
                  molds: List[Dict] = None,
                  employees: List[Dict] = None,
                  inventory: Dict[str, float] = None):
        
        for order in orders:
            job = JobInfo(
                job_id=f"JOB_{order['order_id']}",
                order_id=order['order_id'],
                product_id=order.get('product_id', ''),
                quantity=order['quantity'],
                priority=order['priority'],
                due_date=order['due_date'],
                process_steps=order.get('process_steps', []),
                resource_requirements=order.get('resource_requirements', {})
            )
            self.jobs.append(job)
        
        for wc in work_centers:
            self.work_centers[wc['work_center_id']] = WorkCenterInfo(
                work_center_id=wc['work_center_id'],
                work_center_name=wc.get('work_center_name', wc['work_center_id']),
                capacity=wc.get('capacity', 1)
            )
        
        if resources:
            for res in resources:
                self.resources[res['resource_id']] = ResourceInfo(
                    resource_id=res['resource_id'],
                    resource_name=res.get('resource_name', res['resource_id']),
                    resource_type=res.get('resource_type', ''),
                    capacity=res.get('capacity', 1.0)
                )
        
        if molds:
            for mold in molds:
                self.molds[mold['mold_id']] = {
                    'mold_id': mold['mold_id'],
                    'mold_name': mold.get('mold_name', mold['mold_id']),
                    'product_id': mold.get('product_id'),
                    'status': mold.get('status', 'available'),
                    'remaining_life': mold.get('remaining_life', 10000)
                }
        
        if employees:
            for emp in employees:
                self.employees[emp['employee_id']] = {
                    'employee_id': emp['employee_id'],
                    'name': emp.get('name', emp['employee_id']),
                    'skill_level': emp.get('skill_level', 1),
                    'status': emp.get('status', 'available'),
                    'cost_per_hour': emp.get('cost_per_hour', 0.0)
                }
        
        if inventory:
            self.inventory = inventory
        
        self._initialize_toolbox()

    def _initialize_toolbox(self):
        n_jobs = len(self.jobs)
        n_steps = sum(len(job.process_steps) for job in self.jobs)
        
        self.toolbox.register(
            "indices", random.sample, 
            range(n_jobs), n_jobs
        )
        
        self.toolbox.register(
            "individual", tools.initIterate, 
            creator.Individual, self.toolbox.indices
        )
        
        self.toolbox.register(
            "population", tools.initRepeat, 
            list, self.toolbox.individual
        )
        
        self.toolbox.register("evaluate", self._evaluate_fitness)
        self.toolbox.register("mate", tools.cxPartialyMatched)
        self.toolbox.register("mutate", tools.mutShuffleIndexes, indpb=0.2)
        self.toolbox.register("select", tools.selTournament, tournsize=3)

    def _decode_individual(self, individual: List[int]) -> Dict:
        scheduled_jobs = {}
        work_center_schedule = {wc_id: [] for wc_id in self.work_centers}
        resource_schedule = {res_id: [] for res_id in self.resources}
        employee_schedule = {emp_id: [] for emp_id in self.employees}
        mold_schedule = {mold_id: [] for mold_id in self.molds}
        
        base_time = datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)
        if base_time.hour < 8:
            base_time = base_time - timedelta(days=1)
        
        for job_idx in individual:
            job = self.jobs[job_idx]
            
            prev_step_end = base_time
            
            for step in job.process_steps:
                work_center_id = step.get('work_center_id')
                if not work_center_id or work_center_id not in self.work_centers:
                    continue
                
                cycle_time = step.get('cycle_time', 1.0)
                setup_time = step.get('setup_time', 0.0)
                total_time = cycle_time * job.quantity + setup_time
                
                wc_schedule = work_center_schedule[work_center_id]
                earliest_start = prev_step_end
                
                if wc_schedule:
                    last_job = wc_schedule[-1]
                    wc_available = last_job['end_time']
                    earliest_start = max(earliest_start, wc_available)
                
                assigned_resources = []
                required_resources = step.get('resource_type')
                if required_resources:
                    for res_id, res_info in self.resources.items():
                        if res_info.resource_type == required_resources:
                            res_available = self._get_resource_availability(
                                resource_schedule[res_id],
                                earliest_start,
                                total_time
                            )
                            if res_available:
                                assigned_resources.append(res_id)
                                earliest_start = max(earliest_start, res_available)
                                break
                
                assigned_employees = []
                required_employee_count = step.get('employee_count', 1)
                available_employees = [
                    emp_id for emp_id, emp_info in self.employees.items()
                    if emp_info.get('status') == 'available'
                ]
                
                for emp_id in available_employees[:required_employee_count]:
                    emp_available = self._get_resource_availability(
                        employee_schedule[emp_id],
                        earliest_start,
                        total_time
                    )
                    if emp_available:
                        assigned_employees.append(emp_id)
                        earliest_start = max(earliest_start, emp_available)
                
                assigned_mold = None
                if step.get('required_mold', False):
                    for mold_id, mold_info in self.molds.items():
                        if mold_info.get('product_id') == job.product_id and mold_info.get('status') == 'available':
                            mold_available = self._get_resource_availability(
                                mold_schedule[mold_id],
                                earliest_start,
                                total_time
                            )
                            if mold_available:
                                assigned_mold = mold_id
                                earliest_start = max(earliest_start, mold_available)
                                break
                
                start_time = earliest_start
                end_time = start_time + timedelta(minutes=total_time)
                
                scheduled_job = {
                    'job_id': job.job_id,
                    'order_id': job.order_id,
                    'work_center_id': work_center_id,
                    'step_number': step.get('step_number', 0),
                    'step_name': step.get('step_name', ''),
                    'start_time': start_time,
                    'end_time': end_time,
                    'duration': total_time,
                    'resources': assigned_resources,
                    'employees': assigned_employees,
                    'mold': assigned_mold,
                    'quantity': job.quantity,
                    'priority': job.priority
                }
                
                if job.job_id not in scheduled_jobs:
                    scheduled_jobs[job.job_id] = []
                scheduled_jobs[job.job_id].append(scheduled_job)
                
                work_center_schedule[work_center_id].append(scheduled_job)
                
                for res_id in assigned_resources:
                    resource_schedule[res_id].append(scheduled_job)
                
                for emp_id in assigned_employees:
                    employee_schedule[emp_id].append(scheduled_job)
                
                if assigned_mold:
                    mold_schedule[assigned_mold].append(scheduled_job)
                
                prev_step_end = end_time
        
        return {
            'scheduled_jobs': scheduled_jobs,
            'work_center_schedule': work_center_schedule,
            'resource_schedule': resource_schedule,
            'employee_schedule': employee_schedule,
            'mold_schedule': mold_schedule
        }

    def _get_resource_availability(self, schedule: List, earliest_start: datetime, duration: float) -> Optional[datetime]:
        if not schedule:
            return earliest_start
        
        schedule_sorted = sorted(schedule, key=lambda x: x['start_time'])
        
        for i, booked in enumerate(schedule_sorted):
            booked_end = booked['end_time']
            
            if booked_end <= earliest_start:
                if i == len(schedule_sorted) - 1:
                    return max(earliest_start, booked_end)
                else:
                    next_booked = schedule_sorted[i + 1]
                    gap_start = booked_end
                    gap_end = next_booked['start_time']
                    gap_duration = (gap_end - gap_start).total_seconds() / 60
                    
                    if gap_duration >= duration and gap_end >= earliest_start:
                        return max(earliest_start, gap_start)
        
        last_booked = schedule_sorted[-1]
        return max(earliest_start, last_booked['end_time'])

    def _evaluate_fitness(self, individual: List[int]) -> Tuple[float, float, float, float]:
        schedule = self._decode_individual(individual)
        
        makespan = 0.0
        total_cost = 0.0
        resource_utilization = 0.0
        late_penalty = 0.0
        
        all_end_times = []
        for wc_id, wc_schedule in schedule['work_center_schedule'].items():
            if wc_schedule:
                max_end = max(job['end_time'] for job in wc_schedule)
                all_end_times.append(max_end)
        
        if all_end_times:
            base_time = datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)
            makespan = max((end_time - base_time).total_seconds() / 60 for end_time in all_end_times)
        
        for job in self.jobs:
            if job.job_id in schedule['scheduled_jobs']:
                job_steps = schedule['scheduled_jobs'][job.job_id]
                if job_steps:
                    job_end_time = max(step['end_time'] for step in job_steps)
                    if job_end_time > job.due_date:
                        late_minutes = (job_end_time - job.due_date).total_seconds() / 60
                        late_penalty += late_minutes * (11 - job.priority)
        
        for wc_id, wc_schedule in schedule['work_center_schedule'].items():
            wc_info = self.work_centers.get(wc_id)
            if wc_info and wc_schedule:
                total_busy_time = sum(job['duration'] for job in wc_schedule)
                if makespan > 0:
                    utilization = (total_busy_time / (makespan * wc_info.capacity)) * 100
                    resource_utilization += utilization
        
        total_work_centers = len(self.work_centers)
        if total_work_centers > 0:
            resource_utilization = resource_utilization / total_work_centers
        else:
            resource_utilization = 0.0
        
        return (makespan, total_cost, resource_utilization, late_penalty)

    def run(self) -> Dict:
        if not self.jobs:
            return {
                'success': False,
                'message': 'No jobs to schedule'
            }
        
        population = self.toolbox.population(n=self.population_size)
        
        stats = tools.Statistics(lambda ind: ind.fitness.values)
        stats.register("avg", np.mean)
        stats.register("std", np.std)
        stats.register("min", np.min)
        stats.register("max", np.max)
        
        hof = tools.HallOfFame(self.elitism_size)
        
        population, logbook = algorithms.eaSimple(
            population,
            self.toolbox,
            cxpb=self.crossover_prob,
            mutpb=self.mutation_prob,
            ngen=self.generations,
            stats=stats,
            halloffame=hof,
            verbose=False
        )
        
        best_individual = hof[0]
        best_schedule = self._decode_individual(best_individual)
        
        all_jobs = []
        for job_steps in best_schedule['scheduled_jobs'].values():
            all_jobs.extend(job_steps)
        
        makespan = 0.0
        if all_jobs:
            base_time = min(job['start_time'] for job in all_jobs)
            makespan = max((job['end_time'] - base_time).total_seconds() / 60 for job in all_jobs)
        
        late_jobs = 0
        for job in self.jobs:
            if job.job_id in best_schedule['scheduled_jobs']:
                job_steps = best_schedule['scheduled_jobs'][job.job_id]
                if job_steps:
                    job_end_time = max(step['end_time'] for step in job_steps)
                    if job_end_time > job.due_date:
                        late_jobs += 1
        
        resource_utilization = 0.0
        total_wcs = len(self.work_centers)
        if total_wcs > 0 and makespan > 0:
            for wc_id, wc_schedule in best_schedule['work_center_schedule'].items():
                wc_info = self.work_centers.get(wc_id)
                if wc_info:
                    total_busy = sum(job['duration'] for job in wc_schedule)
                    utilization = (total_busy / (makespan * wc_info.capacity)) * 100
                    resource_utilization += utilization
            resource_utilization = resource_utilization / total_wcs
        
        return {
            'success': True,
            'schedule': {
                'jobs': all_jobs,
                'work_center_schedule': best_schedule['work_center_schedule'],
                'resource_schedule': best_schedule['resource_schedule'],
                'employee_schedule': best_schedule['employee_schedule'],
                'mold_schedule': best_schedule['mold_schedule']
            },
            'metrics': {
                'makespan_minutes': makespan,
                'total_cost': 0.0,
                'late_orders': late_jobs,
                'resource_utilization_percent': resource_utilization
            },
            'evolution': {
                'generations': self.generations,
                'population_size': self.population_size,
                'logbook': [str(record) for record in logbook]
            }
        }

    def check_material_availability(self, orders: List[Dict]) -> Dict:
        results = {}
        
        for order in orders:
            order_id = order['order_id']
            product_id = order.get('product_id')
            quantity = order['quantity']
            
            results[order_id] = {
                'order_id': order_id,
                'product_id': product_id,
                'quantity': quantity,
                'materials': [],
                'status': 'sufficient'
            }
            
            material_requirements = order.get('material_requirements', {})
            
            for material_id, required_per_unit in material_requirements.items():
                required_total = required_per_unit * quantity
                available = self.inventory.get(material_id, 0.0)
                
                if available >= required_total:
                    status = 'sufficient'
                elif available > 0:
                    status = 'partial'
                    results[order_id]['status'] = 'partial'
                else:
                    status = 'insufficient'
                    results[order_id]['status'] = 'insufficient'
                
                results[order_id]['materials'].append({
                    'material_id': material_id,
                    'required': required_total,
                    'available': available,
                    'status': status
                })
        
        return results

    def generate_gantt_data(self, schedule: Dict) -> Dict:
        jobs = schedule.get('jobs', [])
        
        gantt_data = {
            'tasks': [],
            'work_centers': {},
            'resources': {},
            'employees': {}
        }
        
        for job in jobs:
            task = {
                'id': f"{job['job_id']}_{job['step_number']}",
                'name': f"{job['order_id']} - {job['step_name']}",
                'resource': job['work_center_id'],
                'start': job['start_time'].isoformat(),
                'end': job['end_time'].isoformat(),
                'duration': job['duration'],
                'priority': job['priority'],
                'quantity': job['quantity'],
                'order_id': job['order_id'],
                'job_id': job['job_id'],
                'step_number': job['step_number']
            }
            gantt_data['tasks'].append(task)
            
            wc_id = job['work_center_id']
            if wc_id not in gantt_data['work_centers']:
                gantt_data['work_centers'][wc_id] = {
                    'id': wc_id,
                    'name': self.work_centers.get(wc_id, WorkCenterInfo(wc_id, wc_id, 1)).work_center_name,
                    'jobs': [],
                    'total_busy_time': 0
                }
            gantt_data['work_centers'][wc_id]['jobs'].append(task)
            gantt_data['work_centers'][wc_id]['total_busy_time'] += job['duration']
        
        return gantt_data

    def generate_resource_load_data(self, schedule: Dict, time_interval: int = 60) -> Dict:
        jobs = schedule.get('jobs', [])
        
        if not jobs:
            return {'work_centers': {}, 'resources': {}, 'employees': {}}
        
        min_time = min(job['start_time'] for job in jobs)
        max_time = max(job['end_time'] for job in jobs)
        
        time_slots = []
        current_time = min_time
        while current_time < max_time:
            time_slots.append({
                'start': current_time,
                'end': current_time + timedelta(minutes=time_interval)
            })
            current_time += timedelta(minutes=time_interval)
        
        load_data = {
            'time_slots': [slot['start'].isoformat() for slot in time_slots],
            'work_centers': {},
            'resources': {},
            'employees': {}
        }
        
        for wc_id, wc_info in self.work_centers.items():
            load_data['work_centers'][wc_id] = {
                'id': wc_id,
                'name': wc_info.work_center_name,
                'capacity': wc_info.capacity,
                'load_percent': []
            }
            
            for slot in time_slots:
                slot_start = slot['start']
                slot_end = slot['end']
                slot_duration = (slot_end - slot_start).total_seconds() / 60
                
                busy_time = 0
                for job in jobs:
                    if job['work_center_id'] == wc_id:
                        job_start = job['start_time']
                        job_end = job['end_time']
                        
                        overlap_start = max(slot_start, job_start)
                        overlap_end = min(slot_end, job_end)
                        
                        if overlap_start < overlap_end:
                            overlap_duration = (overlap_end - overlap_start).total_seconds() / 60
                            busy_time += overlap_duration
                
                if slot_duration > 0:
                    load_percent = (busy_time / (slot_duration * wc_info.capacity)) * 100
                else:
                    load_percent = 0
                
                load_data['work_centers'][wc_id]['load_percent'].append(min(100, load_percent))
        
        return load_data
