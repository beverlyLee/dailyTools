import taichi as ti
import numpy as np
from typing import Dict, Any, Optional


@ti.data_oriented
class LBM_D2Q9:
    def __init__(self, nx: int = 256, ny: int = 128):
        self.nx = nx
        self.ny = ny
        
        self.c = ti.Vector.field(2, dtype=ti.i32, shape=9)
        self.w = ti.field(dtype=ti.f32, shape=9)
        
        self.f = ti.field(dtype=ti.f32, shape=(nx, ny, 9))
        self.f_new = ti.field(dtype=ti.f32, shape=(nx, ny, 9))
        self.rho = ti.field(dtype=ti.f32, shape=(nx, ny))
        self.u = ti.Vector.field(2, dtype=ti.f32, shape=(nx, ny))
        self.obstacle = ti.field(dtype=ti.i32, shape=(nx, ny))
        
        self.reynolds = 1000.0
        self.u_inlet = 0.1
        self.tau = 0.8
        self.dt = 1.0
        
        self._init_lattice()
        self._init_fields()
    
    def _init_lattice(self):
        c_np = np.array([
            [0, 0],
            [1, 0], [0, 1], [-1, 0], [0, -1],
            [1, 1], [-1, 1], [-1, -1], [1, -1]
        ], dtype=np.int32)
        self.c.from_numpy(c_np)
        
        w_np = np.array([
            4.0/9.0,
            1.0/9.0, 1.0/9.0, 1.0/9.0, 1.0/9.0,
            1.0/36.0, 1.0/36.0, 1.0/36.0, 1.0/36.0
        ], dtype=np.float32)
        self.w.from_numpy(w_np)
    
    def _init_fields(self):
        self.rho.fill(1.0)
        self.u.fill(0.0)
        self.obstacle.fill(0)
        
        self._init_equilibrium()
    
    @ti.kernel
    def _init_equilibrium(self):
        for i, j, k in self.f:
            rho = self.rho[i, j]
            u = self.u[i, j]
            cu = self.c[k].dot(u)
            usqr = u.dot(u)
            feq = self.w[k] * rho * (1.0 + 3.0 * cu + 4.5 * cu * cu - 1.5 * usqr)
            self.f[i, j, k] = feq
            self.f_new[i, j, k] = feq
    
    def set_parameters(self, reynolds: float, u_inlet: float):
        self.reynolds = reynolds
        self.u_inlet = u_inlet
        
        char_length = min(self.nx, self.ny) / 4.0
        nu = u_inlet * char_length / reynolds
        self.tau = 3.0 * nu + 0.5
    
    @ti.kernel
    def set_circular_obstacle(self, cx: ti.i32, cy: ti.i32, r: ti.i32):
        for i, j in self.obstacle:
            dx = i - cx
            dy = j - cy
            if dx * dx + dy * dy < r * r:
                self.obstacle[i, j] = 1
            else:
                self.obstacle[i, j] = 0
    
    @ti.kernel
    def set_rectangular_obstacle(self, x1: ti.i32, y1: ti.i32, x2: ti.i32, y2: ti.i32):
        for i, j in self.obstacle:
            if x1 <= i <= x2 and y1 <= j <= y2:
                self.obstacle[i, j] = 1
            else:
                self.obstacle[i, j] = 0
    
    @ti.func
    def equilibrium(self, rho: ti.f32, u: ti.template(), k: ti.i32) -> ti.f32:
        cu = self.c[k].dot(u)
        usqr = u.dot(u)
        return self.w[k] * rho * (1.0 + 3.0 * cu + 4.5 * cu * cu - 1.5 * usqr)
    
    @ti.kernel
    def collision(self):
        for i, j, k in self.f:
            if self.obstacle[i, j] == 0:
                rho = 0.0
                for kk in range(9):
                    rho += self.f[i, j, kk]
                self.rho[i, j] = rho
                
                ux = 0.0
                uy = 0.0
                for kk in range(9):
                    ux += self.c[kk][0] * self.f[i, j, kk]
                    uy += self.c[kk][1] * self.f[i, j, kk]
                self.u[i, j][0] = ux / rho
                self.u[i, j][1] = uy / rho
                
                feq = self.equilibrium(rho, self.u[i, j], k)
                self.f_new[i, j, k] = self.f[i, j, k] - (self.f[i, j, k] - feq) / self.tau
            else:
                self.f_new[i, j, k] = self.f[i, j, k]
    
    @ti.kernel
    def stream(self):
        for i, j, k in self.f:
            if self.obstacle[i, j] == 0:
                ip = (i - self.c[k][0] + self.nx) % self.nx
                jp = (j - self.c[k][1] + self.ny) % self.ny
                
                if self.obstacle[ip, jp] == 0:
                    self.f[i, j, k] = self.f_new[ip, jp, k]
                else:
                    opposite_k = self._get_opposite(k)
                    self.f[i, j, k] = self.f_new[i, j, opposite_k]
            else:
                opposite_k = self._get_opposite(k)
                self.f[i, j, k] = self.f[i, j, opposite_k]
    
    @ti.func
    def _get_opposite(self, k: ti.i32) -> ti.i32:
        opposite = [0, 3, 4, 1, 2, 7, 8, 5, 6]
        return opposite[k]
    
    @ti.kernel
    def apply_boundary_conditions(self):
        for j in range(self.ny):
            i = 0
            rho = 0.0
            for k in range(9):
                rho += self.f[i, j, k]
            
            ux = self.u_inlet
            uy = 0.0
            
            for k in range(9):
                if self.c[k][0] > 0:
                    rho_noneq = self.f[i, j, k] - self.equilibrium(rho, self.u[i, j], k)
                    u_eq = ti.Vector([ux, uy])
                    feq = self.equilibrium(rho, u_eq, k)
                    self.f[i, j, k] = feq + rho_noneq
        
        for j in range(self.ny):
            i = self.nx - 1
            for k in range(9):
                if self.c[k][0] < 0:
                    self.f[i, j, k] = self.f[i - 1, j, k]
    
    def step(self):
        self.collision()
        self.stream()
        self.apply_boundary_conditions()
    
    def get_velocity(self) -> np.ndarray:
        u_np = self.u.to_numpy()
        return u_np
    
    def get_density(self) -> np.ndarray:
        rho_np = self.rho.to_numpy()
        return rho_np
    
    def get_vorticity(self) -> np.ndarray:
        u_np = self.u.to_numpy()
        obstacle_np = self.obstacle.to_numpy()
        
        ux = u_np[:, :, 0]
        uy = u_np[:, :, 1]
        
        vorticity = np.zeros_like(ux)
        
        for i in range(1, self.nx - 1):
            for j in range(1, self.ny - 1):
                if obstacle_np[i, j] == 0:
                    dux_dy = (ux[i, j + 1] - ux[i, j - 1]) / 2.0
                    duy_dx = (uy[i + 1, j] - uy[i - 1, j]) / 2.0
                    vorticity[i, j] = dux_dy - duy_dx
        
        return vorticity
    
    def get_obstacle(self) -> np.ndarray:
        return self.obstacle.to_numpy()
    
    def reset(self):
        self._init_fields()
