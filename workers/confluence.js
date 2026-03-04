// Cloudflare Worker for Confluence API Proxy
// This worker handles CORS and proxies requests to Confluence API

export default {
  async fetch(request, env, ctx) {
    // CORS 헤더 설정
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json'
    };

    // OPTIONS 요청 처리 (CORS preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }

    // GET 요청만 허용
    if (request.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: corsHeaders
        }
      );
    }

    try {
      // URL 파싱
      const url = new URL(request.url);
      const pageId = url.searchParams.get('pageId');
      const apiToken = url.searchParams.get('apiToken');
      const email = url.searchParams.get('email');
      const action = url.searchParams.get('action'); // 'children'이면 하위 페이지 목록
      const limit = url.searchParams.get('limit') || '20';

      // 파라미터 검증
      if (!pageId) {
        return new Response(
          JSON.stringify({ error: 'pageId가 필요합니다.' }),
          {
            status: 400,
            headers: corsHeaders
          }
        );
      }

      if (!apiToken) {
        return new Response(
          JSON.stringify({ error: 'apiToken이 필요합니다.' }),
          {
            status: 400,
            headers: corsHeaders
          }
        );
      }

      // Confluence API Token은 Basic 인증을 사용해야 함 (email:token)
      let authHeader;
      if (apiToken && email) {
        // Basic 인증: base64(email:token)
        const credentials = btoa(`${email}:${apiToken}`);
        authHeader = `Basic ${credentials}`;
      } else if (apiToken) {
        // 이메일이 없으면 Bearer 토큰 시도
        console.warn('이메일이 제공되지 않았습니다. Basic 인증을 사용하려면 이메일이 필요합니다.');
        authHeader = `Bearer ${apiToken}`;
      } else {
        return new Response(
          JSON.stringify({ error: 'apiToken이 필요합니다.' }),
          {
            status: 400,
            headers: corsHeaders
          }
        );
      }

      // Confluence API 호출
      const baseURL = 'https://krafton.atlassian.net';
      let confluenceUrl;
      
      if (action === 'children') {
        // 하위 페이지 목록 가져오기
        confluenceUrl = `${baseURL}/wiki/rest/api/content/${pageId}/child/page?limit=${limit}&expand=version`;
      } else {
        // 페이지 내용 가져오기
        confluenceUrl = `${baseURL}/wiki/rest/api/content/${pageId}?expand=body.storage`;
      }
      
      console.log('Confluence API 호출:', {
        url: confluenceUrl.replace(pageId, 'PAGE_ID'),
        action: action || 'content',
        authType: email ? 'Basic' : 'Bearer',
        hasEmail: !!email,
        hasToken: !!apiToken
      });
      
      const response = await fetch(confluenceUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      // 응답 데이터 읽기
      const data = await response.json();

      // 에러 처리
      if (!response.ok) {
        if (response.status === 401) {
          return new Response(
            JSON.stringify({
              error: '인증 실패: API Token 또는 이메일을 확인해주세요.',
              details: data
            }),
            {
              status: 401,
              headers: corsHeaders
            }
          );
        } else if (response.status === 403) {
          return new Response(
            JSON.stringify({
              error: '접근 거부 (403 Forbidden)',
              details: data,
              possibleCauses: [
                '회사 방화벽/프록시가 Cloudflare Workers에서 Confluence API로의 요청을 차단',
                'Confluence API 권한 부족 (페이지 접근 권한 확인 필요)',
                '인증 방식 문제 (이메일과 토큰이 올바르게 전달되지 않음)',
                'Confluence API 설정 문제'
              ],
              suggestion: 'Cloudflare Workers 로그를 확인하거나, Confluence 관리자에게 API 접근 권한을 요청하세요.'
            }),
            {
              status: 403,
              headers: corsHeaders
            }
          );
        } else if (response.status === 404) {
          return new Response(
            JSON.stringify({
              error: '페이지를 찾을 수 없습니다.',
              details: data
            }),
            {
              status: 404,
              headers: corsHeaders
            }
          );
        }
        
        return new Response(
          JSON.stringify({
            error: `API 요청 실패: ${response.status} ${response.statusText}`,
            details: data
          }),
          {
            status: response.status,
            headers: corsHeaders
          }
        );
      }

      // 성공 응답
      return new Response(
        JSON.stringify(data),
        {
          status: 200,
          headers: corsHeaders
        }
      );
    } catch (error) {
      console.error('Confluence API 프록시 오류:', error);
      return new Response(
        JSON.stringify({
          error: '서버 오류가 발생했습니다.',
          message: error.message
        }),
        {
          status: 500,
          headers: corsHeaders
        }
      );
    }
  }
};
