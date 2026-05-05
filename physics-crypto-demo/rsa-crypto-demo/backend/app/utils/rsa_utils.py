import random
import math
from typing import Tuple, List, Dict, Any
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.backends import default_backend


def is_prime(n: int, k: int = 5) -> bool:
    if n <= 1:
        return False
    elif n <= 3:
        return True
    elif n % 2 == 0:
        return False
    
    d = n - 1
    s = 0
    while d % 2 == 0:
        d //= 2
        s += 1
    
    for _ in range(k):
        a = random.randint(2, n - 2)
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


def generate_prime(bit_length: int = 1024) -> int:
    while True:
        n = random.getrandbits(bit_length)
        n |= (1 << bit_length - 1) | 1
        if is_prime(n):
            return n


def gcd(a: int, b: int) -> int:
    while b:
        a, b = b, a % b
    return a


def extended_gcd(a: int, b: int) -> Tuple[int, int, int]:
    if a == 0:
        return b, 0, 1
    g, y, x = extended_gcd(b % a, a)
    return g, x - (b // a) * y, y


def mod_inverse(e: int, phi: int) -> int:
    g, x, y = extended_gcd(e, phi)
    if g != 1:
        raise ValueError(f"e = {e} 与 φ(n) = {phi} 不互质")
    return x % phi


def mod_exp(base: int, exponent: int, modulus: int) -> Tuple[int, List[Dict[str, Any]]]:
    result = 1
    base = base % modulus
    
    steps = []
    step_count = 0
    
    while exponent > 0:
        step_count += 1
        step_info = {
            "step": step_count,
            "exponent": exponent,
            "base": base,
            "result": result,
            "action": ""
        }
        
        if exponent % 2 == 1:
            old_result = result
            result = (result * base) % modulus
            step_info["action"] = f"exponent 为奇数，result = {old_result} * {base} mod {modulus} = {result}"
            steps.append(step_info.copy())
        else:
            step_info["action"] = f"exponent 为偶数，仅平方 base"
            steps.append(step_info.copy())
        
        exponent = exponent // 2
        if exponent > 0:
            step_count += 1
            old_base = base
            base = (base * base) % modulus
            steps.append({
                "step": step_count,
                "exponent": exponent,
                "base": base,
                "result": result,
                "action": f"平方 base，base = {old_base}^2 mod {modulus} = {base}"
            })
    
    steps.append({
        "step": step_count + 1,
        "exponent": 0,
        "base": base,
        "result": result,
        "action": f"最终结果: {result}",
        "is_final": True
    })
    
    return result, steps


def generate_key_pair(
    p: int = None, 
    q: int = None, 
    e: int = 65537, 
    bit_length: int = 1024
) -> Dict[str, Any]:
    steps = []
    
    if p is None:
        p = generate_prime(bit_length)
        steps.append({
            "step": 1,
            "title": "选择素数 p",
            "description": f"随机生成 {bit_length} 位素数 p",
            "value": p,
            "formula": "p = \\text{random_prime}(" + str(bit_length) + ")"
        })
    else:
        if not is_prime(p):
            raise ValueError(f"p = {p} 不是素数")
        steps.append({
            "step": 1,
            "title": "选择素数 p",
            "description": f"用户提供的素数 p",
            "value": p,
            "formula": "p = " + str(p)
        })
    
    if q is None:
        q = generate_prime(bit_length)
        while q == p:
            q = generate_prime(bit_length)
        steps.append({
            "step": 2,
            "title": "选择素数 q",
            "description": f"随机生成 {bit_length} 位素数 q（与 p 不同）",
            "value": q,
            "formula": "q = \\text{random_prime}(" + str(bit_length) + "), q \\neq p"
        })
    else:
        if not is_prime(q):
            raise ValueError(f"q = {q} 不是素数")
        if q == p:
            raise ValueError("q 必须与 p 不同")
        steps.append({
            "step": 2,
            "title": "选择素数 q",
            "description": f"用户提供的素数 q",
            "value": q,
            "formula": "q = " + str(q)
        })
    
    n = p * q
    steps.append({
        "step": 3,
        "title": "计算 n = pq",
        "description": "计算模数 n，这是公钥和私钥的一部分",
        "value": n,
        "formula": "n = p \\times q = " + str(p) + " \\times " + str(q) + " = " + str(n)
    })
    
    phi_n = (p - 1) * (q - 1)
    steps.append({
        "step": 4,
        "title": "计算 φ(n)",
        "description": "欧拉函数 φ(n) = (p-1)(q-1)",
        "value": phi_n,
        "formula": "\\phi(n) = (p-1) \\times (q-1) = (" + str(p-1) + ") \\times (" + str(q-1) + ") = " + str(phi_n)
    })
    
    if gcd(e, phi_n) != 1:
        raise ValueError(f"e = {e} 与 φ(n) = {phi_n} 不互质")
    
    steps.append({
        "step": 5,
        "title": "选择公钥指数 e",
        "description": f"选择 e 使得 1 < e < φ(n) 且 gcd(e, φ(n)) = 1",
        "value": e,
        "formula": "e = " + str(e) + ", \\gcd(e, \\phi(n)) = 1"
    })
    
    d = mod_inverse(e, phi_n)
    steps.append({
        "step": 6,
        "title": "计算私钥指数 d",
        "description": "计算 d 使得 e × d ≡ 1 (mod φ(n))",
        "value": d,
        "formula": "d = e^{-1} \\mod \\phi(n)"
    })
    
    return {
        "p": p,
        "q": q,
        "n": n,
        "phi_n": phi_n,
        "e": e,
        "d": d,
        "public_key": (e, n),
        "private_key": (d, n),
        "steps": steps
    }


def encrypt(message: int, e: int, n: int) -> Tuple[int, List[Dict[str, Any]]]:
    if message >= n:
        raise ValueError("消息必须小于 n")
    
    result, steps = mod_exp(message, e, n)
    return result, steps


def decrypt(ciphertext: int, d: int, n: int) -> Tuple[int, List[Dict[str, Any]]]:
    result, steps = mod_exp(ciphertext, d, n)
    return result, steps


def encrypt_text(text: str, e: int, n: int) -> Dict[str, Any]:
    encrypted = []
    details = []
    
    for char in text:
        char_code = ord(char)
        if char_code >= n:
            raise ValueError(f"字符 '{char}' 的编码 {char_code} 大于 n，无法加密")
        
        encrypted_char, steps = encrypt(char_code, e, n)
        encrypted.append(encrypted_char)
        details.append({
            "char": char,
            "char_code": char_code,
            "encrypted": encrypted_char,
            "steps": steps
        })
    
    return {
        "encrypted": encrypted,
        "details": details,
        "encrypted_text": ' '.join(map(str, encrypted))
    }


def decrypt_text(encrypted_list: List[int], d: int, n: int) -> Dict[str, Any]:
    decrypted = []
    details = []
    
    for num in encrypted_list:
        decrypted_char, steps = decrypt(num, d, n)
        char = chr(decrypted_char)
        decrypted.append(char)
        details.append({
            "encrypted": num,
            "decrypted_code": decrypted_char,
            "char": char,
            "steps": steps
        })
    
    return {
        "decrypted": ''.join(decrypted),
        "details": details
    }


def verify_rsa(message: int, e: int, d: int, n: int) -> Dict[str, Any]:
    encrypted, encrypt_steps = encrypt(message, e, n)
    decrypted, decrypt_steps = decrypt(encrypted, d, n)
    
    return {
        "original": message,
        "encrypted": encrypted,
        "decrypted": decrypted,
        "valid": message == decrypted,
        "encrypt_steps": encrypt_steps,
        "decrypt_steps": decrypt_steps
    }


def generate_rsa_key_pair(key_size: int = 2048) -> Dict[str, Any]:
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=key_size,
        backend=default_backend()
    )
    
    public_key = private_key.public_key()
    
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    
    return {
        "private_key": private_key,
        "public_key": public_key,
        "private_pem": private_pem.decode('utf-8'),
        "public_pem": public_pem.decode('utf-8')
    }


def encrypt_with_public_key(text: str, public_key_pem: str) -> str:
    public_key = serialization.load_pem_public_key(
        public_key_pem.encode('utf-8'),
        backend=default_backend()
    )
    
    encrypted = public_key.encrypt(
        text.encode('utf-8'),
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    
    return encrypted.hex()


def decrypt_with_private_key(encrypted_hex: str, private_key_pem: str) -> str:
    private_key = serialization.load_pem_private_key(
        private_key_pem.encode('utf-8'),
        password=None,
        backend=default_backend()
    )
    
    encrypted_bytes = bytes.fromhex(encrypted_hex)
    
    decrypted = private_key.decrypt(
        encrypted_bytes,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    
    return decrypted.decode('utf-8')
