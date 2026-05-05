from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import numpy as np
import ast
import traceback

from ..database import get_db
from ..schemas import (
    SolveODERequest,
    SolveODEResponse,
    PoincareSectionRequest,
    PoincareSectionResponse,
    ClassicExamplesResponse,
    ClassicExampleInfo,
)
from ..services.ode_solvers import ODESolver, SolverMethod, ClassicODEs
from ..services.poincare import PoincareAnalyzer

router = APIRouter(prefix="/api/ode", tags=["常微分方程求解"])


@router.get(
    "/examples",
    response_model=ClassicExamplesResponse,
    summary="获取经典方程列表",
    description="获取所有预定义的经典ODE方程示例信息"
)
async def get_classic_examples():
    examples = ClassicODEs.get_examples()
    examples_list = []
    
    for key, info in examples.items():
        examples_list.append(ClassicExampleInfo(
            key=key,
            name=info["name"],
            description=info["description"],
            dimension=info["dimension"],
            variables=info["variables"],
            default_initial=info["default_initial"],
            default_params=info["default_params"],
            param_ranges=info["param_ranges"],
            t_span=info["t_span"],
        ))
    
    return ClassicExamplesResponse(data=examples_list)


@router.get(
    "/examples/{equation_key}",
    summary="获取单个经典方程详情",
    description="根据键名获取指定经典方程的详细信息"
)
async def get_example_detail(equation_key: str):
    examples = ClassicODEs.get_examples()
    
    if equation_key not in examples:
        raise HTTPException(
            status_code=404,
            detail=f"未找到方程: {equation_key}"
        )
    
    info = examples[equation_key]
    
    return {
        "success": True,
        "data": {
            "key": equation_key,
            "name": info["name"],
            "description": info["description"],
            "dimension": info["dimension"],
            "variables": info["variables"],
            "default_initial": info["default_initial"],
            "default_params": info["default_params"],
            "param_ranges": info["param_ranges"],
            "t_span": info["t_span"],
        }
    }


@router.post(
    "/solve",
    response_model=SolveODEResponse,
    summary="求解常微分方程",
    description="使用指定的数值方法求解ODE方程"
)
async def solve_ode(request: SolveODERequest):
    try:
        examples = ClassicODEs.get_examples()
        
        if request.equation_key:
            if request.equation_key not in examples:
                raise HTTPException(
                    status_code=400,
                    detail=f"未知的方程键名: {request.equation_key}"
                )
            
            equation_info = examples[request.equation_key]
            ode_function = equation_info["function"]
            
            params = equation_info["default_params"].copy()
            params.update(request.parameters)
            
            y0 = np.array(request.initial_conditions)
            
            if len(y0) != equation_info["dimension"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"初始条件维度错误：期望 {equation_info['dimension']} 维，实际 {len(y0)} 维"
                )
            
            t_span = (request.t_start, request.t_end)
            
            method_map = {
                SolverMethod.euler: "euler",
                SolverMethod.rk4: "rk4",
                SolverMethod.rk45: "rk45",
            }
            
            t, y = ODESolver.solve(
                method=method_map[request.solver_method],
                f=ode_function,
                y0=y0,
                t_span=t_span,
                num_points=request.num_points,
                params=params
            )
            
            solution_data = {
                "equation_key": request.equation_key,
                "equation_name": equation_info["name"],
                "solver_method": request.solver_method.value,
                "time": t.tolist(),
                "states": y.tolist(),
                "variables": equation_info["variables"],
                "parameters": params,
                "initial_conditions": request.initial_conditions,
                "t_span": [request.t_start, request.t_end],
            }
            
            return SolveODEResponse(
                message=f"成功求解 {equation_info['name']}",
                data=solution_data
            )
        
        else:
            raise HTTPException(
                status_code=400,
                detail="自定义方程功能暂未实现，请使用经典方程"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"求解失败: {str(e)}"
        )


@router.post(
    "/poincare",
    response_model=PoincareSectionResponse,
    summary="计算庞加莱截面",
    description="计算动力系统的庞加莱截面，用于分析系统动力学行为"
)
async def compute_poincare_section(request: PoincareSectionRequest):
    try:
        examples = ClassicODEs.get_examples()
        
        if request.equation_key not in examples:
            raise HTTPException(
                status_code=400,
                detail=f"未知的方程键名: {request.equation_key}"
            )
        
        equation_info = examples[request.equation_key]
        ode_function = equation_info["function"]
        
        params = equation_info["default_params"].copy()
        params.update(request.parameters)
        
        y0 = np.array(request.initial_conditions)
        
        if len(y0) != equation_info["dimension"]:
            raise HTTPException(
                status_code=400,
                detail=f"初始条件维度错误"
            )
        
        if equation_info["dimension"] < 2:
            raise HTTPException(
                status_code=400,
                detail="庞加莱截面分析至少需要2维系统"
            )
        
        if request.plane_dimension >= equation_info["dimension"]:
            raise HTTPException(
                status_code=400,
                detail=f"截面维度 {request.plane_dimension} 超出系统维度 {equation_info['dimension']}"
            )
        
        t_span = (request.t_start, request.t_end)
        
        method_map = {
            SolverMethod.euler: "euler",
            SolverMethod.rk4: "rk4",
            SolverMethod.rk45: "rk45",
        }
        
        times, points = PoincareAnalyzer.compute_section(
            f=ode_function,
            y0=y0,
            t_span=t_span,
            plane_dimension=request.plane_dimension,
            plane_value=request.plane_value,
            direction=request.direction,
            method=method_map[request.solver_method],
            num_points=request.num_points,
            params=params
        )
        
        if len(points) == 0:
            return PoincareSectionResponse(
                success=False,
                message="未找到庞加莱截面穿越点，请尝试调整截面位置或增加时间步数",
                data={
                    "points": [],
                    "times": [],
                    "analysis": None
                }
            )
        
        analysis = PoincareAnalyzer.analyze_dynamics(points)
        
        other_dims = [j for j in range(equation_info["dimension"]) if j != request.plane_dimension]
        remaining_variables = [equation_info["variables"][j] for j in other_dims]
        
        return PoincareSectionResponse(
            data={
                "equation_key": request.equation_key,
                "equation_name": equation_info["name"],
                "plane_dimension": request.plane_dimension,
                "plane_variable": equation_info["variables"][request.plane_dimension],
                "plane_value": request.plane_value,
                "direction": request.direction,
                "remaining_variables": remaining_variables,
                "points": points.tolist(),
                "times": times.tolist(),
                "num_points": len(points),
                "analysis": analysis,
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"庞加莱截面计算失败: {str(e)}"
        )
