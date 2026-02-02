// Netlify Serverless Function for Confluence API Proxy
// This function handles CORS and proxies requests to Confluence API

exports.handler = async (event, context) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // GET 요청만 허용
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // 쿼리 파라미터에서 pageId와 apiToken 가져오기
    const { pageId, apiToken } = event.queryStringParameters || {};

    // 파라미터 검증
    if (!pageId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'pageId가 필요합니다.' })
      };
    }

    // API Token은 쿼리 파라미터 또는 환경변수에서 가져오기
    const token = apiToken || process.env.CONFLUENCE_TOKEN;
    const email = event.queryStringParameters?.email || process.env.CONFLUENCE_EMAIL;

    // Confluence API Token은 Basic 인증을 사용해야 함 (email:token)
    let authHeader;
    if (token && email) {
      // Basic 인증: base64(email:token)
      const credentials = Buffer.from(`${email}:${token}`).toString('base64');
      authHeader = `Basic ${credentials}`;
    } else if (token) {
      // 이메일이 없으면 Bearer 토큰 시도 (일부 경우 작동할 수 있음)
      console.warn('이메일이 제공되지 않았습니다. Basic 인증을 사용하려면 이메일이 필요합니다.');
      authHeader = `Bearer ${token}`;
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'apiToken이 필요합니다. 쿼리 파라미터로 전달하거나 환경변수 CONFLUENCE_TOKEN을 설정해주세요.' })
      };
    }

    // Confluence API 호출
    const baseURL = 'https://krafton.atlassian.net';
    const url = `${baseURL}/wiki/rest/api/content/${pageId}?expand=body.storage`;
    
    console.log('Confluence API 호출:', {
      url: url.replace(pageId, 'PAGE_ID'),
      authType: email ? 'Basic' : 'Bearer',
      hasEmail: !!email,
      hasToken: !!token
    });
    
    const response = await fetch(url, {
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
      const errorText = await response.text().catch(() => '');
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || 'Unknown error' };
      }

      console.error('Confluence API 오류:', {
        status: response.status,
        statusText: response.statusText,
        data: errorData,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.status === 401) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ 
            error: '인증 실패: API Token 또는 이메일을 확인해주세요.',
            details: errorData
          })
        };
      } else if (response.status === 403) {
        // 403 에러의 상세 정보 포함
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ 
            error: '접근 거부 (403 Forbidden)',
            details: errorData,
            possibleCauses: [
              '회사 방화벽/프록시가 Netlify Functions에서 Confluence API로의 요청을 차단',
              'Confluence API 권한 부족 (페이지 접근 권한 확인 필요)',
              '인증 방식 문제 (이메일과 토큰이 올바르게 전달되지 않음)',
              'Confluence API 설정 문제'
            ],
            suggestion: 'Netlify Functions 로그를 확인하거나, Confluence 관리자에게 API 접근 권한을 요청하세요.'
          })
        };
      } else if (response.status === 404) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: '페이지를 찾을 수 없습니다.', details: errorData })
        };
      }
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: `API 요청 실패: ${response.status} ${response.statusText}`,
          details: errorData 
        })
      };
    }

    // 성공 응답
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Confluence API 프록시 오류:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: '서버 오류가 발생했습니다.',
        message: error.message 
      })
    };
  }
};
