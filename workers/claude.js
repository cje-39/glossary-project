// Cloudflare Worker for Claude API Proxy
// This worker handles CORS and proxies requests to Anthropic Claude API

export default {
  async fetch(request, env, ctx) {
    // 모든 요청에 대해 즉시 CORS 헤더를 포함한 응답을 반환하도록 보장
    // Cloudflare의 보안 기능이 요청을 차단하기 전에 처리
    
    // CORS 헤더 설정
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version, Accept',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Credentials': 'false',
      'Content-Type': 'application/json'
    };
    
    // 요청 정보 로깅 (Worker에 도달한 경우에만 로그가 출력됨)
    try {
      console.log('=== Worker Request Received ===');
      console.log('Request method:', request.method);
      console.log('Request URL:', request.url);
      console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    } catch (logError) {
      // 로깅 실패는 무시
    }

    // OPTIONS 요청 처리 (CORS preflight) - 모든 OPTIONS 요청에 대해 200 반환
    if (request.method === 'OPTIONS') {
      console.log('Handling OPTIONS request');
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version, Accept',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Max-Age': '86400',
          'Access-Control-Allow-Credentials': 'false',
          'Content-Length': '0'
        }
      });
    }

    // POST 요청만 허용
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    try {
      console.log('Processing POST request');
      console.log('Content-Type:', request.headers.get('Content-Type'));
      console.log('Content-Length:', request.headers.get('Content-Length'));
      
      // 요청 본문 파싱
      let requestData;
      try {
        const requestText = await request.text();
        console.log('Request body length:', requestText.length);
        console.log('Request body preview:', requestText.substring(0, 200));
        
        requestData = JSON.parse(requestText);
        console.log('Request data parsed successfully');
      } catch (parseError) {
        console.error('Failed to parse request body:', parseError);
        return new Response(
          JSON.stringify({ error: '요청 본문을 파싱할 수 없습니다.', details: parseError.message }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        );
      }
      
      const { apiKey, ...requestBody } = requestData;
      console.log('API key present:', !!apiKey);

      // API 키 검증
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: 'API 키가 필요합니다.' }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      // Anthropic API 호출
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey.trim(),
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      });

      // 응답 데이터 읽기
      const data = await response.json();

      // 에러 처리
      if (!response.ok) {
        return new Response(
          JSON.stringify(data),
          {
            status: response.status,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      // 성공 응답
      return new Response(
        JSON.stringify(data),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Claude API 프록시 오류:', error);
      return new Response(
        JSON.stringify({
          error: '서버 오류가 발생했습니다.',
          message: error.message
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }
  }
};
