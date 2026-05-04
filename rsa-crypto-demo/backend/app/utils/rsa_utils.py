import random
import math
from typing import Tuple, List
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


def mod_inverse(e: int, phi: int) -> int:
    m0 = phi
    y = 0
    x = 1
    
    if phi == 1:
        return 0
    
    while e > 1:
        q = e // phi
        t = phi
        
        phi = e % phi
        e = t
        t = y
        
        y = x - q * y
        x = t
    
    if x < 0:
        x += m0
    
    return x


def mod_exp(base: int, exponent: int, modulus: int) -> int:
    result = 1
    base = base % modulus
    
    steps = []
    step_count = 0
    
    while exponent > 0:
        step_count += 1
        if exponent % 2 == 1:
            steps.append(f"步骤 {step_count}: exponent 为奇数，result = {result} * {base} mod {modulus} = {(result * base) % modulus}")
            result = (result * base) % modulus
        
        exponent = exponent // 2
        if exponent > 0:
            steps.append(f"步骤 {step_count + 1}: 平方 base，base = {base}^2 mod {modulus} = {(base * base) % modulus}")
            base = (base * base) % modulus
    
    steps.append(f"最终结果: {result}")
    
    return result, steps


def generate_key_pair(
    p: int = None, 
    q: int = None, 
    e: int = 65537, 
    bit_length: int = 1024
) -> Tuple[int, int, int, int, int, int]:
    if p is None:
        p = generate_prime(bit_length)
    if q is None:
        q = generate_prime(bit_length)
        while q == p:
            q = generate_prime(bit_length)
    
    n = p * q
    phi_n = (p - 1) * (q - 1)
    
    if gcd(e, phi_n) != 1:
        raise ValueError(f"e = {e} 与 φ(n) = {phi_n} 不互质")
    
    d = mod_inverse(e, phi_n)
    
    return p, q, n, phi_n, e, d


def encrypt(message: int, e: int, n: int) -> int:
    if message >= n:
        raise ValueError("消息必须小于 n")
    return pow(message, e, n)


def decrypt(ciphertext: int, d: int, n: int) -> int:
    return pow(ciphertext, d, n)


def encrypt_text(text: str, e: int, n: int) -> List[int]:
    encrypted = []
    for char in text:
        char_code = ord(char)
        if char_code >= n:
            raise ValueError(f"字符 '{char}' 的编码 {char_code} 大于 n，无法加密")
        encrypted.append(pow(char_code, e, n))
    return encrypted


def decrypt_text(encrypted_list: List[int], d: int, n: int) -> str:
    decrypted = []
    for num in encrypted_list:
        char_code = pow(num, d, n)
        decrypted.append(chr(char_code))
    return ''.join(decrypted)


def generate_rsa_key_pair(key_size: int = 2048):
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
    
    return private_key, public_key, private_pem.decode('utf-8'), public_pem.decode('utf-8')


def encrypt_with_public_key(text: str, public_key_pem: str):
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


def decrypt_with_private_key(encrypted_hex: str, private_key_pem: str):
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
