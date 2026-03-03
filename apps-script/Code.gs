/**
 * 메인 서버 사이드 코드
 * Google Apps Script 웹 앱의 진입점
 */

/**
 * 웹 앱으로 배포 시 실행되는 함수
 */
function doGet(e) {
  const page = e.parameter.page || 'hub';
  
  // 페이지별 HTML 파일 로드
  let template;
  switch(page) {
    case 'hub':
      template = HtmlService.createTemplateFromFile('Hub');
      break;
    case 'glossary':
      template = HtmlService.createTemplateFromFile('Glossary');
      break;
    case 'corpus':
      template = HtmlService.createTemplateFromFile('Corpus');
      break;
    case 'discussion':
      template = HtmlService.createTemplateFromFile('Discussion');
      break;
    case 'review':
      template = HtmlService.createTemplateFromFile('Review');
      break;
    case 'meeting':
      template = HtmlService.createTemplateFromFile('Meeting');
      break;
    case 'settings':
      template = HtmlService.createTemplateFromFile('Settings');
      break;
    default:
      template = HtmlService.createTemplateFromFile('Hub');
  }
  
  // 공통 스타일과 스크립트 포함
  template.styles = getStyles();
  template.scripts = getScripts();
  
  return template.evaluate()
    .setTitle('East Translation Team Language Resource Hub')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

/**
 * POST 요청 처리
 */
function doPost(e) {
  const action = e.parameter.action;
  
  try {
    switch(action) {
      case 'saveGlossary':
        return ContentService.createTextOutput(
          JSON.stringify(DataService.saveGlossary(JSON.parse(e.postData.contents)))
        ).setMimeType(ContentService.MimeType.JSON);
        
      case 'loadGlossary':
        return ContentService.createTextOutput(
          JSON.stringify(DataService.loadGlossary())
        ).setMimeType(ContentService.MimeType.JSON);
        
      case 'saveCorpus':
        return ContentService.createTextOutput(
          JSON.stringify(DataService.saveCorpus(JSON.parse(e.postData.contents)))
        ).setMimeType(ContentService.MimeType.JSON);
        
      case 'loadCorpus':
        return ContentService.createTextOutput(
          JSON.stringify(DataService.loadCorpus())
        ).setMimeType(ContentService.MimeType.JSON);
        
      case 'saveDiscussion':
        return ContentService.createTextOutput(
          JSON.stringify(DataService.saveDiscussion(JSON.parse(e.postData.contents)))
        ).setMimeType(ContentService.MimeType.JSON);
        
      case 'loadDiscussion':
        return ContentService.createTextOutput(
          JSON.stringify(DataService.loadDiscussion())
        ).setMimeType(ContentService.MimeType.JSON);
        
      case 'callClaude':
        return ContentService.createTextOutput(
          JSON.stringify(ApiService.callClaude(JSON.parse(e.postData.contents)))
        ).setMimeType(ContentService.MimeType.JSON);
        
      case 'callConfluence':
        return ContentService.createTextOutput(
          JSON.stringify(ApiService.callConfluence(e.parameter))
        ).setMimeType(ContentService.MimeType.JSON);
        
      case 'saveCategories':
        return ContentService.createTextOutput(
          JSON.stringify(DataService.saveCategories(JSON.parse(e.postData.contents)))
        ).setMimeType(ContentService.MimeType.JSON);
        
      case 'loadCategories':
        return ContentService.createTextOutput(
          JSON.stringify(DataService.loadCategories())
        ).setMimeType(ContentService.MimeType.JSON);
        
      case 'saveFileGroups':
        return ContentService.createTextOutput(
          JSON.stringify(DataService.saveFileGroups(JSON.parse(e.postData.contents)))
        ).setMimeType(ContentService.MimeType.JSON);
        
      case 'loadFileGroups':
        return ContentService.createTextOutput(
          JSON.stringify(DataService.loadFileGroups())
        ).setMimeType(ContentService.MimeType.JSON);
        
      case 'saveFolders':
        return ContentService.createTextOutput(
          JSON.stringify(DataService.saveFolders(JSON.parse(e.postData.contents)))
        ).setMimeType(ContentService.MimeType.JSON);
        
      case 'loadFolders':
        return ContentService.createTextOutput(
          JSON.stringify(DataService.loadFolders())
        ).setMimeType(ContentService.MimeType.JSON);
        
      case 'saveAuthors':
        return ContentService.createTextOutput(
          JSON.stringify(DataService.saveAuthors(JSON.parse(e.postData.contents)))
        ).setMimeType(ContentService.MimeType.JSON);
        
      case 'loadAuthors':
        return ContentService.createTextOutput(
          JSON.stringify(DataService.loadAuthors())
        ).setMimeType(ContentService.MimeType.JSON);
        
      case 'saveDiscussionCategories':
        return ContentService.createTextOutput(
          JSON.stringify(DataService.saveDiscussionCategories(JSON.parse(e.postData.contents)))
        ).setMimeType(ContentService.MimeType.JSON);
        
      case 'loadDiscussionCategories':
        return ContentService.createTextOutput(
          JSON.stringify(DataService.loadDiscussionCategories())
        ).setMimeType(ContentService.MimeType.JSON);
        
      case 'saveSetting':
        const settingData = JSON.parse(e.postData.contents);
        return ContentService.createTextOutput(
          JSON.stringify(DataService.saveSetting(settingData.key, settingData.value))
        ).setMimeType(ContentService.MimeType.JSON);
        
      case 'loadSetting':
        return ContentService.createTextOutput(
          JSON.stringify(DataService.loadSetting(e.parameter.key))
        ).setMimeType(ContentService.MimeType.JSON);
        
      default:
        return ContentService.createTextOutput(
          JSON.stringify({ error: 'Unknown action' })
        ).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * HTML 파일에서 스타일 포함
 */
function getStyles() {
  return HtmlService.createHtmlOutputFromFile('Styles').getContent();
}

/**
 * HTML 파일에서 스크립트 포함
 */
function getScripts() {
  return HtmlService.createHtmlOutputFromFile('Scripts').getContent();
}

/**
 * HTML 파일 포함 헬퍼 함수
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
