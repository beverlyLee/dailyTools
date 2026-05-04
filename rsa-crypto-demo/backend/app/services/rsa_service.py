from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.utils.rsa_utils import (
    is_prime,
    generate_prime,
    gcd,
    mod_inverse,
    mod_exp,
    generate_key_pair,
    encrypt,
    decrypt,
    encrypt_text,
    decrypt_text,
    generate_rsa_key_pair,
    encrypt_with_public_key,
    decrypt_with_private_key
)
from app.models.key_pair import KeyPairHistory
from app.models.crypto_record import CryptoHistory


class RSAService:
    @staticmethod
    def check_prime(n: int) -> Dict[str, Any]:
        result = is_prime(n)
        return {
            "number": n,
            "is_prime": result,
            "message": f"{n} 是素数" if result else f"{n} 不是素数"
        }
    
    @staticmethod
    def generate_prime_number(bit_length: int = 512) -> Dict[str, Any]:
        prime = generate_prime(bit_length)
        return {
            "prime": prime,
            "bit_length": bit_length,
            "message": f"生成了 {bit_length} 位素数"
        }
    
    @staticmethod
    def calculate_gcd(a: int, b: int) -> Dict[str, Any]:
        result = gcd(a, b)
        return {
            "a": a,
            "b": b,
            "gcd": result,
            "message": f"gcd({a}, {b}) = {result}"
        }
    
    @staticmethod
    def calculate_mod_inverse(e: int, phi: int) -> Dict[str, Any]:
        if gcd(e, phi) != 1:
            return {
                "e": e,
                "phi": phi,
                "inverse": None,
                "message": f"e = {e} 与 φ(n) = {phi} 不互质，无法计算模逆"
            }
        
        d = mod_inverse(e, phi)
        return {
            "e": e,
            "phi": phi,
            "d": d,
            "message": f"d ≡ {e}^(-1) mod {phi} = {d}"
        }
    
    @staticmethod
    def calculate_mod_exp(base: int, exponent: int, modulus: int) -> Dict[str, Any]:
        result, steps = mod_exp(base, exponent, modulus)
        return {
            "base": base,
            "exponent": exponent,
            "modulus": modulus,
            "result": result,
            "steps": steps,
            "message": f"{base}^{exponent} mod {modulus} = {result}"
        }
    
    @staticmethod
    def generate_rsa_keys_step_by_step(
        p: Optional[int] = None,
        q: Optional[int] = None,
        e: int = 65537,
        bit_length: int = 512,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        steps = []
        
        if p is None:
            p = generate_prime(bit_length)
            steps.append(f"步骤 1: 随机生成素数 p = {p}")
        else:
            if not is_prime(p):
                return {
                    "success": False,
                    "message": f"p = {p} 不是素数"
                }
            steps.append(f"步骤 1: 使用提供的素数 p = {p}")
        
        if q is None:
            q = generate_prime(bit_length)
            while q == p:
                q = generate_prime(bit_length)
            steps.append(f"步骤 2: 随机生成另一个素数 q = {q}（不同于 p）")
        else:
            if not is_prime(q):
                return {
                    "success": False,
                    "message": f"q = {q} 不是素数"
                }
            if q == p:
                return {
                    "success": False,
                    "message": "q 不能等于 p"
                }
            steps.append(f"步骤 2: 使用提供的素数 q = {q}")
        
        n = p * q
        steps.append(f"步骤 3: 计算 n = p * q = {p} * {q} = {n}")
        
        phi_n = (p - 1) * (q - 1)
        steps.append(f"步骤 4: 计算 φ(n) = (p-1) * (q-1) = {p-1} * {q-1} = {phi_n}")
        
        if gcd(e, phi_n) != 1:
            return {
                "success": False,
                "message": f"e = {e} 与 φ(n) = {phi_n} 不互质，请选择其他 e 值"
            }
        steps.append(f"步骤 5: 选择公钥指数 e = {e}（与 φ(n) 互质）")
        
        d = mod_inverse(e, phi_n)
        steps.append(f"步骤 6: 计算私钥指数 d ≡ e^(-1) mod φ(n) = {d}")
        
        try:
            _, _, private_pem, public_pem = generate_rsa_key_pair(bit_length * 2)
        except:
            private_pem = f"-----BEGIN PRIVATE KEY-----\n私钥（演示用）\nd = {d}\nn = {n}\n-----END PRIVATE KEY-----"
            public_pem = f"-----BEGIN PUBLIC KEY-----\n公钥（演示用）\ne = {e}\nn = {n}\n-----END PUBLIC KEY-----"
        
        key_pair_data = {
            "p": str(p),
            "q": str(q),
            "n": str(n),
            "phi_n": str(phi_n),
            "e": str(e),
            "d": str(d),
            "public_key": public_pem,
            "private_key": private_pem,
            "key_size": bit_length * 2
        }
        
        if db:
            key_pair = KeyPairHistory(**key_pair_data)
            db.add(key_pair)
            db.commit()
            db.refresh(key_pair)
            key_pair_data["id"] = key_pair.id
        
        return {
            "success": True,
            "steps": steps,
            "key_pair": key_pair_data,
            "message": "RSA 密钥对生成成功"
        }
    
    @staticmethod
    def encrypt_message(
        message: str,
        e: int,
        n: int,
        db: Optional[Session] = None,
        key_pair_id: Optional[int] = None
    ) -> Dict[str, Any]:
        try:
            encrypted_list = encrypt_text(message, e, n)
            
            encrypted_hex = [hex(num) for num in encrypted_list]
            
            if db:
                crypto_record = CryptoHistory(
                    operation_type="encrypt",
                    key_pair_id=key_pair_id,
                    plain_text=message,
                    cipher_text=str(encrypted_hex),
                    key_size=n.bit_length()
                )
                db.add(crypto_record)
                db.commit()
            
            return {
                "success": True,
                "plain_text": message,
                "cipher_text": encrypted_hex,
                "cipher_numbers": encrypted_list,
                "message": f"成功加密 {len(message)} 个字符"
            }
        except Exception as e:
            return {
                "success": False,
                "message": str(e)
            }
    
    @staticmethod
    def decrypt_message(
        cipher_numbers: List[int],
        d: int,
        n: int,
        db: Optional[Session] = None,
        key_pair_id: Optional[int] = None
    ) -> Dict[str, Any]:
        try:
            decrypted_text = decrypt_text(cipher_numbers, d, n)
            
            if db:
                crypto_record = CryptoHistory(
                    operation_type="decrypt",
                    key_pair_id=key_pair_id,
                    plain_text=decrypted_text,
                    cipher_text=str(cipher_numbers),
                    key_size=n.bit_length()
                )
                db.add(crypto_record)
                db.commit()
            
            return {
                "success": True,
                "cipher_numbers": cipher_numbers,
                "plain_text": decrypted_text,
                "message": f"成功解密 {len(cipher_numbers)} 个密文"
            }
        except Exception as e:
            return {
                "success": False,
                "message": str(e)
            }
