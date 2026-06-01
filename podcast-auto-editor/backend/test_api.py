import requests
import time
import subprocess
import os
import signal

PORT = 8767

def cleanup():
    os.system(f'pkill -f {PORT} > /dev/null 2>&1')
    time.sleep(1)

def main():
    print('=' * 50)
    print('Podcast Auto Editor - API Test')
    print('=' * 50)
    
    cleanup()
    
    print('\n1. Starting FastAPI server...')
    proc = subprocess.Popen(
        ['python', '-c', 
         f'import uvicorn; uvicorn.run("main:app", host="127.0.0.1", port={PORT}, log_level="error")'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    time.sleep(3)
    
    base_url = f'http://127.0.0.1:{PORT}'
    
    print('\n2. Testing health check...')
    try:
        response = requests.get(f'{base_url}/api/health', timeout=5)
        print(f'   Status: {response.status_code}')
        print(f'   Result: {response.json()}')
        print('   ✅ OK')
    except Exception as e:
        print(f'   ❌ Failed: {e}')
        proc.terminate()
        return
    
    print('\n3. Creating test audio file...')
    import ffmpeg
    test_audio = '/tmp/test_audio.wav'
    (
        ffmpeg
        .input('sine=frequency=1000:duration=3', f='lavfi')
        .output(test_audio, acodec='pcm_s16le', ar='44100')
        .overwrite_output()
        .run(capture_stdout=True, capture_stderr=True)
    )
    print('   ✅ Created test_audio.wav')
    
    print('\n4. Testing analyze-audio...')
    try:
        with open(test_audio, 'rb') as f:
            files = {'file': ('test_audio.wav', f, 'audio/wav')}
            response = requests.post(f'{base_url}/api/analyze-audio', files=files, timeout=30)
            print(f'   Status: {response.status_code}')
            if response.status_code == 200:
                result = response.json()
                print(f'   Success: {result["success"]}')
                print(f'   Duration: {result["duration"]:.2f}s')
                print(f'   Markers: {len(result["markers"])}')
                print(f'   Silence count: {result["silence_count"]}')
                print(f'   Filler count: {result["filler_count"]}')
                print('   ✅ OK')
                analysis_result = result
            else:
                print(f'   ❌ Error: {response.text}')
    except Exception as e:
        print(f'   ❌ Failed: {e}')
    
    print('\n5. Testing polish-text...')
    try:
        response = requests.post(f'{base_url}/api/polish-text', json={
            'text': '嗯这个那个其实我想说啊今天天气很好对吧',
            'language': 'zh'
        }, timeout=10)
        print(f'   Status: {response.status_code}')
        if response.status_code == 200:
            result = response.json()
            print(f'   Polished: {result["polished_text"]}')
            print('   ✅ OK')
    except Exception as e:
        print(f'   ❌ Failed: {e}')
    
    print('\n6. Testing render-audio...')
    try:
        response = requests.post(f'{base_url}/api/render-audio', json={
            'audio_file': analysis_result['audio_path'],
            'segments': [{'start': 0, 'end': 3, 'keep': True}]
        }, timeout=30)
        print(f'   Status: {response.status_code}')
        if response.status_code == 200:
            result = response.json()
            print(f'   Success: {result["success"]}')
            print(f'   Output filename: {result["output_filename"]}')
            print(f'   Output duration: {result["duration"]:.2f}s')
            print('   ✅ OK')
    except Exception as e:
        print(f'   ❌ Failed: {e}')
    
    print('\n' + '=' * 50)
    print('🎉 All tests completed!')
    print('=' * 50)
    
    proc.terminate()
    cleanup()

if __name__ == '__main__':
    main()
