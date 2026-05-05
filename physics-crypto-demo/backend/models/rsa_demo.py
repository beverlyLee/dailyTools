import random
import math
from typing import Dict, List, Tuple, Optional
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding

class RSADemo:
    # 小素数列表用于快速筛选
    SMALL_PRIMES = [
        2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47,
        53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109,
        113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179,
        181, 191, 193, 197, 199
    ]
    
    def __init__(self):
        self.p = None
        self.q = None
        self.n = None
        self.phi_n = None
        self.e = None
        self.d = None
        self.steps = []
    
    @staticmethod
    def is_prime(n: int, k: int = 5) -> bool:
        """使用 Miller-Rabin 素性测试"""
        if n < 2:
            return False
        if n in RSADemo.SMALL_PRIMES:
            return True
        for p in RSADemo.SMALL_PRIMES:
            if n % p == 0:
                return False
        
        # 分解 n-1 = d * 2^s
        d = n - 1
        s = 0
        while d % 2 == 0:
            d //= 2
            s += 1
        
        # Miller-Rabin 测试
        for _ in range(k):
            a = random.randrange(2, n - 1)
            x = pow(a, d, n)
            if x == 1 or x == n - 1:
                continue
            for __ in range(s - 1):
                x = pow(x, 2, n)
                if x == n - 1:
                    break
            else:
                return False
        return True
    
    @staticmethod
    def generate_prime(bits: int = 512) -> int:
        """生成指定位数的素数"""
        while True:
            n = random.getrandbits(bits)
            n |= (1 << bits - 1) | 1  # 确保是奇数且最高位为 1
            if RSADemo.is_prime(n):
                return n
    
    @staticmethod
    def extended_gcd(a: int, b: int) -> Tuple[int, int, int]:
        """扩展欧几里得算法：返回 (g, x, y) 使得 ax + by = g = gcd(a, b)"""
        if a == 0:
            return b, 0, 1
        g, y, x = RSADemo.extended_gcd(b % a, a)
        return g, x - (b // a) * y, y
    
    @staticmethod
    def modular_inverse(e: int, phi: int) -> Optional[int]:
        """计算模逆元：d 使得 (e * d) mod phi = 1"""
        g, x, _ = RSADemo.extended_gcd(e, phi)
        if g != 1:
            return None
        return x % phi
    
    @staticmethod
    def gcd(a: int, b: int) -> int:
        """计算最大公约数"""
        while b:
            a, b = b, a % b
        return a
    
    def generate_key_pair(self, p: Optional[int] = None, q: Optional[int] = None, 
                          e: Optional[int] = None, bits: int = 512) -> Dict:
        """生成 RSA 密钥对，可手动指定参数用于教学演示"""
        self.steps = []
        
        # 步骤 1：选择素数 p 和 q
        self.steps.append({
            'step': 1,
            'title': '选择素数 p 和 q',
            'description': 'RSA 算法首先选择两个不同的大素数 p 和 q。'
        })
        
        if p is None:
            p = self.generate_prime(bits)
            self.steps.append({
                'step': 1.1,
                'title': '生成素数 p',
                'description': f'随机生成 {bits} 位素数 p',
                'value': p
            })
        else:
            if not self.is_prime(p):
                raise ValueError(f'p = {p} 不是素数')
            self.steps.append({
                'step': 1.1,
                'title': '使用指定的素数 p',
                'description': '用户指定的素数 p',
                'value': p
            })
        
        if q is None:
            q = self.generate_prime(bits)
            while q == p:
                q = self.generate_prime(bits)
            self.steps.append({
                'step': 1.2,
                'title': '生成素数 q',
                'description': f'随机生成 {bits} 位素数 q（与 p 不同）',
                'value': q
            })
        else:
            if not self.is_prime(q):
                raise ValueError(f'q = {q} 不是素数')
            if q == p:
                raise ValueError('q 必须与 p 不同')
            self.steps.append({
                'step': 1.2,
                'title': '使用指定的素数 q',
                'description': '用户指定的素数 q',
                'value': q
            })
        
        self.p = p
        self.q = q
        
        # 步骤 2：计算 n = p * q
        self.steps.append({
            'step': 2,
            'title': '计算模数 n',
            'description': '计算 n = p * q，n 用于加密和解密。',
            'formula': f'n = {p} × {q}',
            'value': p * q
        })
        self.n = p * q
        
        # 步骤 3：计算欧拉函数 φ(n)
        self.steps.append({
            'step': 3,
            'title': '计算欧拉函数 φ(n)',
            'description': '对于 n = pq，φ(n) = (p-1)(q-1)，表示小于 n 且与 n 互质的正整数个数。',
            'formula': f'φ(n) = ({p} - 1) × ({q} - 1) = {p-1} × {q-1}',
            'value': (p - 1) * (q - 1)
        })
        self.phi_n = (p - 1) * (q - 1)
        
        # 步骤 4：选择公钥指数 e
        self.steps.append({
            'step': 4,
            'title': '选择公钥指数 e',
            'description': '选择 e 满足 1 < e < φ(n) 且 gcd(e, φ(n)) = 1。常用值：3, 17, 65537。'
        })
        
        if e is None:
            # 尝试使用常用的 e 值
            common_e_values = [65537, 17, 3]
            chosen_e = None
            for candidate in common_e_values:
                if 1 < candidate < self.phi_n and self.gcd(candidate, self.phi_n) == 1:
                    chosen_e = candidate
                    break
            
            if chosen_e is None:
                # 如果常用值不可用，随机选择
                while True:
                    candidate = random.randrange(2, self.phi_n)
                    if self.gcd(candidate, self.phi_n) == 1:
                        chosen_e = candidate
                        break
            
            self.e = chosen_e
            self.steps.append({
                'step': 4.1,
                'title': '选择 e',
                'description': f'选择 e = {chosen_e}，验证 gcd({chosen_e}, {self.phi_n}) = 1',
                'value': chosen_e
            })
        else:
            if not (1 < e < self.phi_n):
                raise ValueError(f'e 必须满足 1 < e < φ(n) = {self.phi_n}')
            if self.gcd(e, self.phi_n) != 1:
                raise ValueError(f'gcd(e, φ(n)) = {self.gcd(e, self.phi_n)} ≠ 1')
            self.e = e
            self.steps.append({
                'step': 4.1,
                'title': '使用指定的 e',
                'description': f'用户指定 e = {e}，验证 gcd({e}, {self.phi_n}) = 1',
                'value': e
            })
        
        # 步骤 5：计算私钥指数 d
        self.steps.append({
            'step': 5,
            'title': '计算私钥指数 d',
            'description': '计算 d 使得 (e × d) mod φ(n) = 1。d 是 e 在模 φ(n) 下的乘法逆元。',
            'formula': f'd ≡ e⁻¹ (mod φ(n))，即 {self.e} × d ≡ 1 (mod {self.phi_n})'
        })
        
        self.d = self.modular_inverse(self.e, self.phi_n)
        if self.d is None:
            raise ValueError('无法计算 d，e 和 φ(n) 不互质')
        
        self.steps.append({
            'step': 5.1,
            'title': '计算 d',
            'description': f'使用扩展欧几里得算法计算得到 d = {self.d}',
            'verification': f'验证: ({self.e} × {self.d}) mod {self.phi_n} = {(self.e * self.d) % self.phi_n}',
            'value': self.d
        })
        
        # 总结
        self.steps.append({
            'step': 6,
            'title': '密钥生成完成',
            'description': '公钥：(e, n)，私钥：(d, n)。公钥可以公开，私钥必须保密。',
            'public_key': {'e': self.e, 'n': self.n},
            'private_key': {'d': self.d, 'n': self.n}
        })
        
        return {
            'p': self.p,
            'q': self.q,
            'n': self.n,
            'phi_n': self.phi_n,
            'e': self.e,
            'd': self.d,
            'steps': self.steps
        }
    
    @staticmethod
    def mod_pow_steps(base: int, exponent: int, modulus: int) -> Dict:
        """分步展示模幂运算（快速幂算法）"""
        steps = []
        result = 1
        base = base % modulus
        
        steps.append({
            'step': 0,
            'title': '初始化',
            'description': f'计算 {base}^{exponent} mod {modulus}',
            'formula': f'使用快速幂算法：初始化 result = 1, base = {base} mod {modulus} = {base}'
        })
        
        current_exponent = exponent
        step_num = 1
        
        while exponent > 0:
            if exponent % 2 == 1:
                old_result = result
                result = (result * base) % modulus
                steps.append({
                    'step': step_num,
                    'title': f'步骤 {step_num}：指数为奇数',
                    'description': f'exponent = {exponent} 是奇数，执行 result = (result × base) mod modulus',
                    'formula': f'result = ({old_result} × {base}) mod {modulus} = {result}',
                    'exponent': exponent,
                    'result': result,
                    'base': base
                })
            else:
                steps.append({
                    'step': step_num,
                    'title': f'步骤 {step_num}：指数为偶数',
                    'description': f'exponent = {exponent} 是偶数，跳过乘法',
                    'exponent': exponent,
                    'result': result,
                    'base': base
                })
            
            step_num += 1
            old_base = base
            base = (base * base) % modulus
            exponent = exponent // 2
            
            steps.append({
                'step': step_num,
                'title': f'步骤 {step_num}：平方底数',
                'description': '将底数平方，指数减半',
                'formula': f'base = ({old_base})² mod {modulus} = {base}, exponent = {current_exponent} // 2 = {exponent}',
                'exponent': exponent,
                'result': result,
                'base': base
            })
            step_num += 1
            current_exponent = exponent
        
        steps.append({
            'step': step_num,
            'title': '最终结果',
            'description': f'快速幂运算完成',
            'formula': f'{base if "base" in locals() else old_base}^{current_exponent if "current_exponent" in locals() else exponent} mod {modulus} = {result}',
            'result': result
        })
        
        return {
            'base': base if 'base' in locals() else old_base,
            'exponent': current_exponent if 'current_exponent' in locals() else exponent,
            'modulus': modulus,
            'result': result,
            'steps': steps
        }
    
    def encrypt(self, message: str, public_key: Optional[Dict] = None) -> Dict:
        """加密消息：m^e mod n"""
        if public_key is None:
            if self.e is None or self.n is None:
                raise ValueError('请先生成密钥对或提供公钥')
            e, n = self.e, self.n
        else:
            e, n = public_key['e'], public_key['n']
        
        # 将消息转换为整数（每个字符使用 Unicode 码点）
        steps = []
        steps.append({
            'step': 1,
            'title': '消息编码',
            'description': '将文本消息转换为整数（使用字符的 Unicode 码点）',
            'original_message': message
        })
        
        # 分块加密（RSA 通常加密对称密钥，这里演示直接加密消息）
        encrypted_blocks = []
        block_size = (n.bit_length() - 1) // 8  # 每块最大字节数
        
        if block_size < 1:
            # n 太小，直接按字符加密
            for i, char in enumerate(message):
                m = ord(char)
                c = pow(m, e, n)
                encrypted_blocks.append(c)
                steps.append({
                    'step': 2 + i,
                    'title': f'加密字符 {i+1}',
                    'description': f'加密字符 "{char}"',
                    'formula': f'c = m^e mod n = {m}^{e} mod {n} = {c}',
                    'character': char,
                    'm': m,
                    'c': c
                })
        else:
            # 分块处理
            message_bytes = message.encode('utf-8')
            for i in range(0, len(message_bytes), block_size):
                block = message_bytes[i:i+block_size]
                # 将字节块转换为整数
                m = int.from_bytes(block, byteorder='big')
                c = pow(m, e, n)
                encrypted_blocks.append(c)
                steps.append({
                    'step': 2 + (i // block_size),
                    'title': f'加密块 {(i // block_size) + 1}',
                    'description': f'加密第 {(i // block_size) + 1} 块数据',
                    'formula': f'c = m^e mod n = {m}^{e} mod {n} = {c}',
                    'block_bytes': block.hex(),
                    'm': m,
                    'c': c
                })
        
        steps.append({
            'step': len(steps) + 1,
            'title': '加密完成',
            'description': '消息加密完成',
            'encrypted_blocks': encrypted_blocks,
            'block_count': len(encrypted_blocks)
        })
        
        return {
            'encrypted_blocks': encrypted_blocks,
            'steps': steps,
            'public_key': {'e': e, 'n': n}
        }
    
    def decrypt(self, encrypted_blocks: List[int], private_key: Optional[Dict] = None) -> Dict:
        """解密密文：c^d mod n"""
        if private_key is None:
            if self.d is None or self.n is None:
                raise ValueError('请先生成密钥对或提供私钥')
            d, n = self.d, self.n
        else:
            d, n = private_key['d'], private_key['n']
        
        steps = []
        steps.append({
            'step': 1,
            'title': '开始解密',
            'description': '使用私钥 (d, n) 解密密文块',
            'block_count': len(encrypted_blocks)
        })
        
        decrypted_blocks = []
        for i, c in enumerate(encrypted_blocks):
            m = pow(c, d, n)
            decrypted_blocks.append(m)
            steps.append({
                'step': 2 + i,
                'title': f'解密块 {i+1}',
                'description': f'解密第 {i+1} 个密文块',
                'formula': f'm = c^d mod n = {c}^{d} mod {n} = {m}',
                'c': c,
                'm': m
            })
        
        # 尝试将整数转换回文本
        try:
            # 尝试逐个字符解码
            if all(m < 0x110000 for m in decrypted_blocks):  # Unicode 最大值
                message = ''.join(chr(m) for m in decrypted_blocks)
            else:
                # 尝试按字节块解码
                message_bytes = b''
                for m in decrypted_blocks:
                    byte_length = (m.bit_length() + 7) // 8
                    message_bytes += m.to_bytes(byte_length, byteorder='big')
                message = message_bytes.decode('utf-8')
        except:
            message = f'解码失败，原始整数块: {decrypted_blocks}'
        
        steps.append({
            'step': len(steps) + 1,
            'title': '解密完成',
            'description': '消息解密完成',
            'decrypted_message': message,
            'decrypted_blocks': decrypted_blocks
        })
        
        return {
            'decrypted_message': message,
            'decrypted_blocks': decrypted_blocks,
            'steps': steps,
            'private_key': {'d': d, 'n': n}
        }
    
    def verify_encryption(self, message: str) -> Dict:
        """验证 RSA 加解密的正确性：解密加密后的消息应该等于原始消息"""
        encryption_result = self.encrypt(message)
        decryption_result = self.decrypt(encryption_result['encrypted_blocks'])
        
        is_valid = decryption_result['decrypted_message'] == message
        
        return {
            'original_message': message,
            'encrypted_blocks': encryption_result['encrypted_blocks'],
            'decrypted_message': decryption_result['decrypted_message'],
            'is_valid': is_valid,
            'verification': f'原始消息: "{message}"\n解密后: "{decryption_result["decrypted_message"]}"\n验证结果: {"通过 ✓" if is_valid else "失败 ✗"}'
        }
