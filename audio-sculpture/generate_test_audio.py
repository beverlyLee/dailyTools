import struct
import math

sample_rate = 44100
duration = 2.0
freq = 440.0

samples = []
for i in range(int(sample_rate * duration)):
    sample = int(32767 * math.sin(2 * math.pi * freq * i / sample_rate))
    samples.append(sample)

with open('test_audio.mp3', 'wb') as f:
    f.write(b'RIFF')
    f.write(struct.pack('<I', 36 + len(samples) * 2))
    f.write(b'WAVE')
    f.write(b'fmt ')
    f.write(struct.pack('<I', 16))
    f.write(struct.pack('<H', 1))
    f.write(struct.pack('<H', 1))
    f.write(struct.pack('<I', sample_rate))
    f.write(struct.pack('<I', sample_rate * 2))
    f.write(struct.pack('<H', 2))
    f.write(struct.pack('<H', 16))
    f.write(b'data')
    f.write(struct.pack('<I', len(samples) * 2))
    for sample in samples:
        f.write(struct.pack('<h', sample))

print('Test audio file created')
