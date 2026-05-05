from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import numpy as np
import traceback

from ..database import get_db
from ..models import ParameterScanRecord
from ..schemas import (
    ParameterScanRequest,
    ParameterScanResponse,
    ScanRecordsListResponse,
    ScanRecordResponse,
    SolverMethod,
)
from ..services.ode_solvers import ODESolver, ClassicODEs

router = APIRouter(prefix="/api/parameter-scan", tags=["参数扫描"])


@router.post(
    "/run",
    response_model=ParameterScanResponse,
    summary="执行参数扫描",
    description="扫描指定参数的不同取值，观察系统动力学行为变化"
)
async def run_parameter_scan(
    request: ParameterScanRequest,
    db: Session = Depends(get_db)
):
    try:
        examples = ClassicODEs.get_examples()
        
        if request.equation_key not in examples:
            raise HTTPException(
                status_code=400,
                detail=f"未知的方程键名: {request.equation_key}"
            )
        
        equation_info = examples[request.equation_key]
        ode_function = equation_info["function"]
        
        param_ranges = equation_info.get("param_ranges", {})
        if request.scan_parameter not in param_ranges:
            raise HTTPException(
                status_code=400,
                detail=f"参数 {request.scan_parameter} 不是方程 {equation_info['name']} 的有效参数"
            )
        
        param_values = np.linspace(
            request.param_start,
            request.param_end,
            request.param_steps
        )
        
        base_params = equation_info["default_params"].copy()
        base_params.update(request.parameters)
        
        y0 = np.array(request.initial_conditions)
        
        if len(y0) != equation_info["dimension"]:
            raise HTTPException(
                status_code=400,
                detail=f"初始条件维度错误"
            )
        
        t_span = (request.t_start, request.t_end)
        
        method_map = {
            SolverMethod.euler: "euler",
            SolverMethod.rk4: "rk4",
            SolverMethod.rk45: "rk45",
        }
        
        scan_results = []
        
        for param_val in param_values:
            current_params = base_params.copy()
            current_params[request.scan_parameter] = param_val
            
            try:
                t, y = ODESolver.solve(
                    method=method_map[request.solver_method],
                    f=ode_function,
                    y0=y0,
                    t_span=t_span,
                    num_points=request.num_points,
                    params=current_params
                )
                
                final_state = y[-1].tolist()
                max_values = np.max(y, axis=0).tolist()
                min_values = np.min(y, axis=0).tolist()
                mean_values = np.mean(y, axis=0).tolist()
                
                if len(y) > 100:
                    transient_cut = int(len(y) * 0.1)
                    steady_state = y[transient_cut:]
                    std_steady = np.std(steady_state, axis=0).tolist()
                else:
                    std_steady = np.std(y, axis=0).tolist()
                
                scan_results.append({
                    "parameter_value": float(param_val),
                    "final_state": final_state,
                    "max_values": max_values,
                    "min_values": min_values,
                    "mean_values": mean_values,
                    "std_steady_state": std_steady,
                    "success": True,
                })
                
            except Exception as e:
                scan_results.append({
                    "parameter_value": float(param_val),
                    "success": False,
                    "error": str(e),
                })
        
        if request.save_to_db:
            scan_record = ParameterScanRecord(
                equation_name=equation_info["name"],
                equation_expression=request.equation_key,
                parameter_name=request.scan_parameter,
                parameter_start=request.param_start,
                parameter_end=request.param_end,
                parameter_steps=request.param_steps,
                initial_conditions=request.initial_conditions,
                solver_method=request.solver_method.value,
                t_start=request.t_start,
                t_end=request.t_end,
                num_points=request.num_points,
                results_summary={
                    "num_successful": sum(1 for r in scan_results if r["success"]),
                    "num_failed": sum(1 for r in scan_results if not r["success"]),
                }
            )
            db.add(scan_record)
            db.commit()
            db.refresh(scan_record)
            record_id = scan_record.id
        else:
            record_id = None
        
        return ParameterScanResponse(
            message=f"参数扫描完成，共 {len(scan_results)} 个点",
            data={
                "record_id": record_id,
                "equation_key": request.equation_key,
                "equation_name": equation_info["name"],
                "scan_parameter": request.scan_parameter,
                "parameter_range": [request.param_start, request.param_end],
                "parameter_steps": request.param_steps,
                "parameter_values": param_values.tolist(),
                "results": scan_results,
                "variables": equation_info["variables"],
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"参数扫描失败: {str(e)}"
        )


@router.get(
    "/records",
    response_model=ScanRecordsListResponse,
    summary="获取参数扫描历史记录",
    description="获取所有保存的参数扫描历史记录列表"
)
async def get_scan_records(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    records = db.query(ParameterScanRecord).order_by(
        ParameterScanRecord.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    record_responses = []
    for record in records:
        record_responses.append(ScanRecordResponse(
            id=record.id,
            equation_name=record.equation_name,
            parameter_name=record.parameter_name,
            parameter_start=record.parameter_start,
            parameter_end=record.parameter_end,
            parameter_steps=record.parameter_steps,
            created_at=record.created_at.isoformat() if record.created_at else "",
        ))
    
    return ScanRecordsListResponse(data=record_responses)


@router.get(
    "/records/{record_id}",
    summary="获取单个参数扫描记录详情",
    description="根据ID获取参数扫描记录的详细信息"
)
async def get_scan_record_detail(
    record_id: int,
    db: Session = Depends(get_db)
):
    record = db.query(ParameterScanRecord).filter(
        ParameterScanRecord.id == record_id
    ).first()
    
    if not record:
        raise HTTPException(
            status_code=404,
            detail=f"未找到ID为 {record_id} 的扫描记录"
        )
    
    return {
        "success": True,
        "data": {
            "id": record.id,
            "equation_name": record.equation_name,
            "equation_expression": record.equation_expression,
            "parameter_name": record.parameter_name,
            "parameter_start": record.parameter_start,
            "parameter_end": record.parameter_end,
            "parameter_steps": record.parameter_steps,
            "initial_conditions": record.initial_conditions,
            "solver_method": record.solver_method,
            "t_start": record.t_start,
            "t_end": record.t_end,
            "num_points": record.num_points,
            "results_summary": record.results_summary,
            "created_at": record.created_at.isoformat() if record.created_at else None,
        }
    }


@router.delete(
    "/records/{record_id}",
    summary="删除参数扫描记录",
    description="删除指定的参数扫描记录"
)
async def delete_scan_record(
    record_id: int,
    db: Session = Depends(get_db)
):
    record = db.query(ParameterScanRecord).filter(
        ParameterScanRecord.id == record_id
    ).first()
    
    if not record:
        raise HTTPException(
            status_code=404,
            detail=f"未找到ID为 {record_id} 的扫描记录"
        )
    
    db.delete(record)
    db.commit()
    
    return {
        "success": True,
        "message": f"已删除扫描记录 ID: {record_id}"
    }
