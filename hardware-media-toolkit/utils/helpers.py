from datetime import datetime
import re

def timestamp_to_str(timestamp=None, format='%Y-%m-%d %H:%M:%S.%f'):
    if timestamp is None:
        timestamp = datetime.now()
    return timestamp.strftime(format)

def bytes_to_hex(data, separator=' '):
    if not data:
        return ''
    return separator.join(f'{b:02X}' for b in data)

def hex_to_bytes(hex_str):
    hex_str = re.sub(r'[\s\r\n\t,;:]+', '', hex_str)
    if len(hex_str) % 2 != 0:
        hex_str = hex_str + '0'
    try:
        return bytes.fromhex(hex_str)
    except ValueError:
        return b''

def bytes_to_ascii(data, replace='.'):
    ascii_str = ''
    for b in data:
        if 32 <= b <= 126:
            ascii_str += chr(b)
        else:
            ascii_str += replace
    return ascii_str

def parse_numeric_data(data):
    numbers = []
    try:
        text = data.decode('utf-8', errors='ignore')
        matches = re.findall(r'[-+]?\d*\.\d+|[-+]?\d+', text)
        for m in matches:
            try:
                numbers.append(float(m))
            except ValueError:
                pass
    except:
        pass
    return numbers
