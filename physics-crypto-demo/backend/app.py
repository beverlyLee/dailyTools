from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db.database import (
    init_db,
    save_fluid_simulation,
    get_fluid_simulations,
    get_fluid_simulation,
    save_rsa_key,
    get_rsa_keys,
    get_rsa_key,
    save_rsa_operation,
    get_rsa_operations
)

from models.lbm_simulator import LBMSimulator
from models.rsa_demo import RSADemo

app = Flask(__name__)
CORS(app)

# 全局变量存储当前运行的模拟器
current_simulator = None
current_rsa = None

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Physics & Crypto Demo API is running'})

# ==================== 流体模拟 API ====================

@app.route('/api/fluid/init', methods=['POST'])
def init_fluid_simulator():
    global current_simulator
    
    data = request.get_json() or {}
    
    nx = data.get('grid_width', 256)
    ny = data.get('grid_height', 128)
    reynolds = data.get('reynolds', 1000.0)
    inlet_vel = data.get('inlet_velocity', 0.1)
    
    try:
        current_simulator = LBMSimulator(
            nx=nx,
            ny=ny,
            reynolds=reynolds,
            inlet_vel=inlet_vel
        )
        
        return jsonify({
            'success': True,
            'message': 'Fluid simulator initialized',
            'parameters': {
                'grid_size': [nx, ny],
                'reynolds': reynolds,
                'inlet_velocity': inlet_vel,
                'nu': current_simulator.nu,
                'tau': current_simulator.tau
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/fluid/step', methods=['POST'])
def fluid_step():
    global current_simulator
    
    if current_simulator is None:
        return jsonify({'success': False, 'error': 'Simulator not initialized. Call /api/fluid/init first.'}), 400
    
    data = request.get_json() or {}
    steps = data.get('steps', 1)
    
    try:
        current_simulator.step(steps=steps)
        state = current_simulator.get_state()
        
        return jsonify({
            'success': True,
            'steps_performed': steps,
            'state': {
                'grid_size': state['grid_size'],
                'reynolds': state['reynolds'],
                'inlet_velocity': state['inlet_velocity'],
                'nu': state['nu'],
                'tau': state['tau']
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/fluid/state', methods=['GET'])
def get_fluid_state():
    global current_simulator
    
    if current_simulator is None:
        return jsonify({'success': False, 'error': 'Simulator not initialized'}), 400
    
    try:
        state = current_simulator.get_state()
        return jsonify({
            'success': True,
            'state': state
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/fluid/save', methods=['POST'])
def save_fluid_simulation_data():
    global current_simulator
    
    if current_simulator is None:
        return jsonify({'success': False, 'error': 'Simulator not initialized'}), 400
    
    data = request.get_json() or {}
    
    try:
        snapshot = current_simulator.get_snapshot_data()
        
        sim_id = save_fluid_simulation(
            reynolds_number=current_simulator.reynolds,
            inlet_velocity=current_simulator.inlet_vel,
            grid_size=current_simulator.nx,
            steps=data.get('steps', 0),
            parameters={
                'nx': current_simulator.nx,
                'ny': current_simulator.ny,
                'nu': current_simulator.nu,
                'tau': current_simulator.tau
            },
            snapshot=snapshot
        )
        
        return jsonify({
            'success': True,
            'simulation_id': sim_id,
            'message': 'Simulation saved successfully'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/fluid/simulations', methods=['GET'])
def list_fluid_simulations():
    try:
        simulations = get_fluid_simulations(limit=20)
        return jsonify({
            'success': True,
            'simulations': simulations
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/fluid/simulations/<int:sim_id>', methods=['GET'])
def get_fluid_simulation_detail(sim_id):
    try:
        simulation = get_fluid_simulation(sim_id)
        if simulation:
            return jsonify({
                'success': True,
                'simulation': simulation
            })
        return jsonify({'success': False, 'error': 'Simulation not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ==================== RSA 算法演示 API ====================

@app.route('/api/rsa/generate', methods=['POST'])
def generate_rsa_keys():
    global current_rsa
    
    data = request.get_json() or {}
    
    try:
        current_rsa = RSADemo()
        
        p = data.get('p')
        q = data.get('q')
        e = data.get('e')
        bits = data.get('bits', 256)
        
        # 转换为整数（如果提供了）
        if p is not None:
            p = int(p)
        if q is not None:
            q = int(q)
        if e is not None:
            e = int(e)
        
        result = current_rsa.generate_key_pair(p=p, q=q, e=e, bits=bits)
        
        # 保存到数据库
        key_id = save_rsa_key(
            p=result['p'],
            q=result['q'],
            n=result['n'],
            phi_n=result['phi_n'],
            e=result['e'],
            d=result['d'],
            steps=result['steps']
        )
        
        return jsonify({
            'success': True,
            'key_id': key_id,
            'public_key': {
                'e': result['e'],
                'n': result['n']
            },
            'private_key': {
                'd': result['d'],
                'n': result['n']
            },
            'parameters': {
                'p': result['p'],
                'q': result['q'],
                'phi_n': result['phi_n']
            },
            'steps': result['steps']
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/rsa/modpow', methods=['POST'])
def mod_pow_demo():
    data = request.get_json() or {}
    
    try:
        base = int(data.get('base', 2))
        exponent = int(data.get('exponent', 10))
        modulus = int(data.get('modulus', 100))
        
        result = RSADemo.mod_pow_steps(base, exponent, modulus)
        
        return jsonify({
            'success': True,
            'result': result
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/rsa/encrypt', methods=['POST'])
def rsa_encrypt():
    global current_rsa
    
    data = request.get_json() or {}
    message = data.get('message', '')
    
    if not message:
        return jsonify({'success': False, 'error': 'Message is required'}), 400
    
    public_key = data.get('public_key')
    
    try:
        if current_rsa is None and public_key is None:
            current_rsa = RSADemo()
            current_rsa.generate_key_pair(bits=512)
        
        if public_key:
            result = RSADemo().encrypt(message, public_key=public_key)
        else:
            result = current_rsa.encrypt(message)
        
        return jsonify({
            'success': True,
            'encrypted_blocks': result['encrypted_blocks'],
            'steps': result['steps'],
            'public_key': result['public_key']
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/rsa/decrypt', methods=['POST'])
def rsa_decrypt():
    global current_rsa
    
    data = request.get_json() or {}
    encrypted_blocks = data.get('encrypted_blocks', [])
    
    if not encrypted_blocks:
        return jsonify({'success': False, 'error': 'Encrypted blocks are required'}), 400
    
    private_key = data.get('private_key')
    
    try:
        if private_key:
            rsa_demo = RSADemo()
            result = rsa_demo.decrypt(encrypted_blocks, private_key=private_key)
        elif current_rsa is not None:
            result = current_rsa.decrypt(encrypted_blocks)
        else:
            return jsonify({'success': False, 'error': 'No private key available. Generate keys first or provide private key.'}), 400
        
        return jsonify({
            'success': True,
            'decrypted_message': result['decrypted_message'],
            'decrypted_blocks': result['decrypted_blocks'],
            'steps': result['steps']
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/rsa/verify', methods=['POST'])
def rsa_verify():
    global current_rsa
    
    data = request.get_json() or {}
    message = data.get('message', 'Hello RSA!')
    
    try:
        if current_rsa is None:
            current_rsa = RSADemo()
            current_rsa.generate_key_pair(bits=512)
        
        result = current_rsa.verify_encryption(message)
        
        # 保存操作记录
        key_id = save_rsa_key(
            p=current_rsa.p,
            q=current_rsa.q,
            n=current_rsa.n,
            phi_n=current_rsa.phi_n,
            e=current_rsa.e,
            d=current_rsa.d,
            steps=current_rsa.steps
        )
        
        save_rsa_operation(
            operation_type='encrypt',
            key_id=key_id,
            input_text=message,
            output_text=str(result['encrypted_blocks'])
        )
        
        save_rsa_operation(
            operation_type='decrypt',
            key_id=key_id,
            input_text=str(result['encrypted_blocks']),
            output_text=result['decrypted_message']
        )
        
        return jsonify({
            'success': True,
            'key_id': key_id,
            'verification': result
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/rsa/keys', methods=['GET'])
def list_rsa_keys():
    try:
        keys = get_rsa_keys(limit=20)
        return jsonify({
            'success': True,
            'keys': keys
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/rsa/keys/<int:key_id>', methods=['GET'])
def get_rsa_key_detail(key_id):
    try:
        key = get_rsa_key(key_id)
        if key:
            return jsonify({
                'success': True,
                'key': key
            })
        return jsonify({'success': False, 'error': 'Key not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/rsa/operations', methods=['GET'])
def list_rsa_operations():
    key_id = request.args.get('key_id')
    if key_id:
        key_id = int(key_id)
    
    try:
        operations = get_rsa_operations(key_id=key_id, limit=20)
        return jsonify({
            'success': True,
            'operations': operations
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    init_db()
    print('Database initialized')
    app.run(host='0.0.0.0', port=5001, debug=True)
