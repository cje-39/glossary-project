#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
간단한 프록시 서버 - Anthropic API 호출을 위한 CORS 우회
Python 3.7+ 필요
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
import json
import urllib.request
import urllib.parse
import sys

# 출력 버퍼링 비활성화 (실시간 로그 확인)
sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
sys.stderr.reconfigure(encoding='utf-8', line_buffering=True)

class ProxyHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        """모든 요청 로그 출력"""
        message = format % args
        print(f"[LOG] [{self.address_string()}] {message}", flush=True)
    
    def log_request(self, code='-', size='-'):
        """요청 로깅 (오버라이드하여 모든 요청 로그)"""
        print(f"[LOG] 요청: {self.requestline} - 상태: {code} - 크기: {size}", flush=True)
        self.log_message('"%s" %s %s', self.requestline, str(code), str(size))
    
    def do_OPTIONS(self):
        """CORS preflight 요청 처리"""
        print(f"[DEBUG] OPTIONS 요청 받음: {self.path}", flush=True)
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        """POST 요청 처리"""
        print(f"\n[DEBUG] ========== POST 요청 받음 ==========", flush=True)
        print(f"[DEBUG] 경로: {self.path}", flush=True)
        print(f"[DEBUG] 요청 라인: {self.requestline}", flush=True)
        print(f"[DEBUG] 클라이언트: {self.address_string()}", flush=True)
        print(f"[DEBUG] 요청 헤더: {dict(self.headers)}", flush=True)
        print(f"[DEBUG] =====================================", flush=True)
        
        if self.path == '/api/claude' or self.path == '/api/claude/':
            try:
                print("[DEBUG] /api/claude 엔드포인트 처리 시작", flush=True)
                # 요청 본문 읽기
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length == 0:
                    print("[DEBUG] Content-Length가 0입니다", flush=True)
                    self.send_error_response(400, '요청 본문이 비어있습니다.')
                    return
                post_data = self.rfile.read(content_length)
                print(f"[DEBUG] 요청 본문 크기: {content_length} bytes", flush=True)
                request_data = json.loads(post_data.decode('utf-8'))
                print("[DEBUG] 요청 데이터 파싱 완료", flush=True)
                
                # API 키 추출
                api_key = request_data.get('apiKey', '')
                if not api_key:
                    self.send_error_response(400, 'API 키가 필요합니다.')
                    return
                
                # API 키 형식 확인 (디버그용)
                print(f"[DEBUG] API 키 길이: {len(api_key)}", flush=True)
                print(f"[DEBUG] API 키 시작: {api_key[:10]}...", flush=True)
                
                # Anthropic API 요청 데이터 준비
                api_request_data = {k: v for k, v in request_data.items() if k != 'apiKey'}
                
                # Anthropic API 호출
                print("[DEBUG] Anthropic API 호출 시작", flush=True)
                print(f"[DEBUG] 요청할 모델: {api_request_data.get('model', 'N/A')}", flush=True)
                print(f"[DEBUG] 요청 데이터 키: {list(api_request_data.keys())}", flush=True)
                api_url = 'https://api.anthropic.com/v1/messages'
                api_request = urllib.request.Request(
                    api_url,
                    data=json.dumps(api_request_data).encode('utf-8'),
                    headers={
                        'Content-Type': 'application/json',
                        'x-api-key': api_key.strip(),
                        'anthropic-version': '2023-06-01'
                    }
                )
                
                try:
                    print("[DEBUG] API 요청 전송 중...", flush=True)
                    with urllib.request.urlopen(api_request) as response:
                        response_data = response.read()
                        print("[DEBUG] API 응답 받음, 크기:", len(response_data), "bytes", flush=True)
                        self.send_success_response(response_data)
                except urllib.error.HTTPError as e:
                    error_data = e.read()
                    error_text = error_data.decode('utf-8')
                    print(f"[DEBUG] API 오류: {e.code}", flush=True)
                    print(f"[DEBUG] API 오류 내용: {error_text}", flush=True)
                    self.send_error_response(e.code, error_data)
                except Exception as e:
                    print(f"[DEBUG] API 호출 예외: {e}", flush=True)
                    raise
                    
            except Exception as e:
                print(f"[DEBUG] 처리 중 오류 발생: {e}", flush=True)
                import traceback
                traceback.print_exc()
                self.send_error_response(500, str(e))
        else:
            print(f"[DEBUG] 경로를 찾을 수 없음: {self.path}", flush=True)
            print(f"[DEBUG] 지원하는 경로: /api/claude", flush=True)
            print(f"[DEBUG] 요청이 서버에 도달했지만 경로가 일치하지 않음", flush=True)
            # 404 응답 전송
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            error_response = json.dumps({'error': f'Not Found: {self.path}', 'supported_paths': ['/api/claude']})
            self.wfile.write(error_response.encode('utf-8'))

    def do_GET(self):
        """정적 파일 서빙"""
        print(f"[DEBUG] GET 요청 받음: {self.path}", flush=True)  # 디버그 로그
        if self.path == '/' or self.path == '/index.html':
            self.path = '/index.html'
        elif self.path.startswith('/'):
            self.path = self.path
        
        try:
            # 파일 읽기
            with open('.' + self.path, 'rb') as f:
                content = f.read()
            
            # Content-Type 설정
            content_type = 'text/html'
            if self.path.endswith('.js'):
                content_type = 'application/javascript'
            elif self.path.endswith('.css'):
                content_type = 'text/css'
            elif self.path.endswith('.json'):
                content_type = 'application/json'
            elif self.path.endswith('.ttf') or self.path.endswith('.woff') or self.path.endswith('.woff2'):
                content_type = 'font/ttf'
            
            self.send_response(200)
            self.send_header('Content-type', content_type)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(content)
        except (ConnectionAbortedError, BrokenPipeError, OSError) as e:
            # 클라이언트가 연결을 끊은 경우 무시
            print(f"[DEBUG] 클라이언트 연결 중단: {e}", flush=True)
        except FileNotFoundError:
            try:
                self.send_error_response(404, 'File Not Found')
            except (ConnectionAbortedError, BrokenPipeError, OSError):
                print(f"[DEBUG] 에러 응답 전송 중 연결 중단", flush=True)
        except Exception as e:
            try:
                self.send_error_response(500, str(e))
            except (ConnectionAbortedError, BrokenPipeError, OSError):
                print(f"[DEBUG] 에러 응답 전송 중 연결 중단: {e}", flush=True)

    def send_success_response(self, data):
        """성공 응답 전송"""
        try:
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
        except (ConnectionAbortedError, BrokenPipeError, OSError):
            # 클라이언트가 연결을 끊은 경우 무시
            print(f"[DEBUG] 성공 응답 전송 중 연결 중단", flush=True)

    def send_error_response(self, status_code, message):
        """오류 응답 전송"""
        try:
            self.send_response(status_code)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            if isinstance(message, bytes):
                self.wfile.write(message)
            else:
                error_response = json.dumps({'error': str(message)})
                self.wfile.write(error_response.encode('utf-8'))
        except (ConnectionAbortedError, BrokenPipeError, OSError):
            # 클라이언트가 연결을 끊은 경우 무시
            print(f"[DEBUG] 에러 응답 전송 중 연결 중단 (상태 코드: {status_code})", flush=True)

def run_server(port=3000):
    """서버 실행"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, ProxyHandler)
    print(f'서버가 http://localhost:{port}에서 실행 중입니다.')
    print(f'브라우저에서 http://localhost:{port}/discussion.html 로 접속하세요.')
    print('서버를 종료하려면 Ctrl+C를 누르세요.')
    print('=' * 50)
    print('[DEBUG] 서버가 요청을 기다리는 중...')
    print('=' * 50)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n[DEBUG] 서버 종료 중...')
        httpd.shutdown()

if __name__ == '__main__':
    run_server()
