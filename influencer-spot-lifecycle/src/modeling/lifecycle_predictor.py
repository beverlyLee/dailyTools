import logging
from dataclasses import dataclass
from typing import Optional

import numpy as np
import pandas as pd
from scipy.optimize import curve_fit

logger = logging.getLogger(__name__)


@dataclass
class LifecyclePhase:
    name: str
    start_day: int
    end_day: int
    description: str


@dataclass
class LifecycleResult:
    keyword: str
    L: float
    k: float
    x0: float
    peak_day: int
    growth_rate_at_peak: float
    decay_rate: float
    phases: list[LifecyclePhase]
    fitted_values: list[float]
    r_squared: float
    total_observations: int


def logistic_func(x, L, k, x0):
    return L / (1 + np.exp(-k * (x - x0)))


def extended_logistic_func(x, L, k, x0, d):
    return L / (1 + np.exp(-k * (x - x0))) * np.exp(-d * np.maximum(x - x0, 0))


class LifecyclePredictor:
    def __init__(self):
        self.results: dict[str, LifecycleResult] = {}

    def fit(self, timeline: pd.DataFrame, keyword: str) -> Optional[LifecycleResult]:
        if timeline.empty or "note_count" not in timeline.columns:
            logger.warning(f"Empty or invalid timeline for keyword: {keyword}")
            return None

        y = timeline["note_count_ma" if "note_count_ma" in timeline.columns else "note_count"].values.astype(float)
        x = np.arange(len(y), dtype=float)

        nonzero = y[y > 0]
        if len(nonzero) < 3:
            logger.warning(f"Not enough non-zero data points for {keyword}")
            return self._create_minimal_result(keyword, len(y), y)

        L_init = float(np.max(y)) * 1.2
        k_init = 0.3
        x0_init = float(np.argmax(y))
        d_init = 0.05

        try:
            popt, _ = curve_fit(
                extended_logistic_func,
                x, y,
                p0=[L_init, k_init, x0_init, d_init],
                maxfev=10000,
                bounds=([0, 0.01, 0, 0], [L_init * 5, 2.0, len(y), 0.5]),
            )
            L, k, x0, d = popt
            fitted = extended_logistic_func(x, L, k, x0, d)
        except Exception as e:
            logger.warning(f"Extended logistic fit failed for {keyword}: {e}, trying simple logistic")
            try:
                popt, _ = curve_fit(
                    logistic_func,
                    x, y,
                    p0=[L_init, k_init, x0_init],
                    maxfev=10000,
                    bounds=([0, 0.01, 0], [L_init * 5, 2.0, len(y)]),
                )
                L, k, x0 = popt
                d = 0.0
                fitted = logistic_func(x, L, k, x0)
            except Exception as e2:
                logger.error(f"All fitting failed for {keyword}: {e2}")
                return self._create_minimal_result(keyword, len(y), y)

        ss_res = np.sum((y - fitted) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0

        peak_day = int(round(x0))
        growth_rate_at_peak = L * k / 4

        phases = self._compute_phases(L, k, x0, d, len(y))

        result = LifecycleResult(
            keyword=keyword,
            L=float(L),
            k=float(k),
            x0=float(x0),
            peak_day=peak_day,
            growth_rate_at_peak=float(growth_rate_at_peak),
            decay_rate=float(d),
            phases=phases,
            fitted_values=fitted.tolist(),
            r_squared=float(r_squared),
            total_observations=len(y),
        )

        self.results[keyword] = result
        return result

    def _compute_phases(self, L, k, x0, d, total_days) -> list[LifecyclePhase]:
        phases = []

        threshold_sprout = L * 0.1
        threshold_burst = L * 0.8
        threshold_decay = L * 0.3

        sprout_end = 0
        burst_start = 0
        burst_end = 0
        decay_start = 0

        for day in range(total_days):
            val = extended_logistic_func(day, L, k, x0, d)
            if val >= threshold_sprout and sprout_end == 0:
                sprout_end = day
            if val >= threshold_burst and burst_start == 0:
                burst_start = day
            if val < threshold_decay and day > x0 and decay_start == 0:
                decay_start = day
            if val >= threshold_burst and burst_end == 0:
                burst_end = day

        if sprout_end == 0:
            sprout_end = max(1, int(x0 * 0.3))
        if burst_start == 0:
            burst_start = sprout_end
        if burst_end == 0:
            burst_end = int(x0)
        if decay_start == 0:
            decay_start = burst_end + max(1, int((total_days - burst_end) * 0.3))

        phases.append(LifecyclePhase(
            name="萌芽期",
            start_day=0,
            end_day=sprout_end,
            description="关键词出现初期，少量笔记开始发布",
        ))
        phases.append(LifecyclePhase(
            name="爆发期",
            start_day=burst_start,
            end_day=burst_end,
            description="热度快速攀升，大量笔记涌现",
        ))
        phases.append(LifecyclePhase(
            name="衰退期",
            start_day=decay_start,
            end_day=min(decay_start + max(1, int((total_days - decay_start) * 0.5)), total_days - 1),
            description="热度开始下降，笔记发布量减少",
        ))
        phases.append(LifecyclePhase(
            name="死亡期",
            start_day=min(decay_start + max(1, int((total_days - decay_start) * 0.5)), total_days - 1),
            end_day=total_days - 1,
            description="热度回归基线，该网红地已不再流行",
        ))

        return phases

    def _create_minimal_result(self, keyword: str, total_days: int, y: np.ndarray) -> LifecycleResult:
        phases = [
            LifecyclePhase(name="萌芽期", start_day=0, end_day=total_days // 4, description="数据不足"),
            LifecyclePhase(name="爆发期", start_day=total_days // 4, end_day=total_days // 2, description="数据不足"),
            LifecyclePhase(name="衰退期", start_day=total_days // 2, end_day=total_days * 3 // 4, description="数据不足"),
            LifecyclePhase(name="死亡期", start_day=total_days * 3 // 4, end_day=total_days - 1, description="数据不足"),
        ]
        return LifecycleResult(
            keyword=keyword,
            L=float(np.max(y)) if len(y) > 0 else 0,
            k=0.0,
            x0=0.0,
            peak_day=0,
            growth_rate_at_peak=0.0,
            decay_rate=0.0,
            phases=phases,
            fitted_values=y.tolist(),
            r_squared=0.0,
            total_observations=total_days,
        )

    def predict_future(self, keyword: str, future_days: int = 30) -> Optional[list[float]]:
        if keyword not in self.results:
            return None
        r = self.results[keyword]
        x_future = np.arange(r.total_observations, r.total_observations + future_days, dtype=float)
        if r.decay_rate > 0:
            return extended_logistic_func(x_future, r.L, r.k, r.x0, r.decay_rate).tolist()
        return logistic_func(x_future, r.L, r.k, r.x0).tolist()

    def compare_keywords(self) -> dict:
        comparison = {}
        for kw, r in self.results.items():
            comparison[kw] = {
                "peak_day": r.peak_day,
                "growth_rate": round(r.growth_rate_at_peak, 4),
                "decay_rate": round(r.decay_rate, 4),
                "max_popularity": round(r.L, 2),
                "r_squared": round(r.r_squared, 4),
                "lifecycle_length": r.total_observations,
                "phases": [
                    {"name": p.name, "start": p.start_day, "end": p.end_day, "desc": p.description}
                    for p in r.phases
                ],
            }
        return comparison
