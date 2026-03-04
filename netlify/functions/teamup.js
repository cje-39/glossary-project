// Netlify Serverless Function for TeamUP API Proxy
// This function handles CORS and proxies requests to TeamUP API

exports.handler = async (event, context) => {
  // CORS 헤더 설정 (모든 도메인 허용)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24시간
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
    const { calendarId, apiKey, startDate, endDate } = event.queryStringParameters || {};

    // 파라미터 검증
    if (!calendarId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'calendarId가 필요합니다.' })
      };
    }

    if (!apiKey) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'apiKey가 필요합니다.' })
      };
    }

    if (!startDate || !endDate) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'startDate와 endDate가 필요합니다.' })
      };
    }

    // TeamUP API 호출
    const apiUrl = `https://api.teamup.com/${calendarId}/events?startDate=${startDate}&endDate=${endDate}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Teamup-Token': apiKey.trim()
      }
    });

    // 응답 데이터 읽기
    const data = await response.json();

    // 에러 처리
    if (!response.ok) {
      if (response.status === 401) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ 
            error: '인증 실패: API 키를 확인해주세요.',
            details: data 
          })
        };
      }
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: `API 요청 실패: ${response.status} ${response.statusText}`,
          details: data 
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
    console.error('TeamUP API 프록시 오류:', error);
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
