/**
 * Google Sheets를 데이터베이스로 사용하는 서비스
 * Firestore 대신 Google Sheets에 데이터 저장
 */

/**
 * 스프레드시트 ID (환경에 따라 변경 필요)
 * 스크립트 속성에서 가져오거나 하드코딩
 */
function getSpreadsheetId() {
  const scriptProperties = PropertiesService.getScriptProperties();
  let spreadsheetId = scriptProperties.getProperty('SPREADSHEET_ID');
  
  if (!spreadsheetId) {
    // 스프레드시트가 없으면 생성
    const spreadsheet = SpreadsheetApp.create('Glossary Project Data');
    spreadsheetId = spreadsheet.getId();
    scriptProperties.setProperty('SPREADSHEET_ID', spreadsheetId);
    
    // 시트 초기화
    initializeSheets(spreadsheet);
  }
  
  return spreadsheetId;
}

/**
 * 스프레드시트 초기화 (시트 생성)
 */
function initializeSheets(spreadsheet) {
  const sheets = ['Glossary', 'Categories', 'Corpus', 'FileGroups', 'Folders', 
                  'Discussion', 'Authors', 'DiscussionCategories', 'Settings'];
  
  sheets.forEach(sheetName => {
    if (!spreadsheet.getSheetByName(sheetName)) {
      const sheet = spreadsheet.insertSheet(sheetName);
      
      // 용어집 시트 헤더
      if (sheetName === 'Glossary') {
        sheet.getRange(1, 1, 1, 5).setValues([['id', 'korean', 'japanese', 'category', 'notes', 'updatedAt']]);
      }
      // 카테고리 시트 헤더
      else if (sheetName === 'Categories') {
        sheet.getRange(1, 1, 1, 1).setValues([['categories']]);
      }
      // 코퍼스 시트 헤더
      else if (sheetName === 'Corpus') {
        sheet.getRange(1, 1, 1, 4).setValues([['id', 'korean', 'japanese', 'fileGroupId']]);
      }
      // 파일 그룹 시트 헤더
      else if (sheetName === 'FileGroups') {
        sheet.getRange(1, 1, 1, 6).setValues([['id', 'name', 'koreanFileName', 'japaneseFileName', 'itemCount', 'folderId']]);
      }
      // 폴더 시트 헤더
      else if (sheetName === 'Folders') {
        sheet.getRange(1, 1, 1, 2).setValues([['id', 'name']]);
      }
      // 토론 시트 헤더
      else if (sheetName === 'Discussion') {
        sheet.getRange(1, 1, 1, 8).setValues([['id', 'term', 'author', 'content', 'meaning', 'category', 'createdAt', 'updatedAt']]);
      }
      // 작성자 시트 헤더
      else if (sheetName === 'Authors') {
        sheet.getRange(1, 1, 1, 1).setValues([['authors']]);
      }
      // 토론 카테고리 시트 헤더
      else if (sheetName === 'DiscussionCategories') {
        sheet.getRange(1, 1, 1, 1).setValues([['categories']]);
      }
      // 설정 시트 헤더
      else if (sheetName === 'Settings') {
        sheet.getRange(1, 1, 1, 2).setValues([['key', 'value']]);
      }
    }
  });
}

/**
 * 용어집 데이터 저장
 */
function saveGlossary(data) {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const sheet = spreadsheet.getSheetByName('Glossary') || spreadsheet.insertSheet('Glossary');
    
    // 헤더 확인
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 6).setValues([['id', 'korean', 'japanese', 'category', 'notes', 'updatedAt']]);
    }
    
    // 기존 데이터 삭제
    if (sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
    
    // 새 데이터 추가
    if (data.terms && data.terms.length > 0) {
      const values = data.terms.map(term => [
        term.id || '',
        term.korean || '',
        term.japanese || '',
        JSON.stringify(term.category || []),
        term.notes || '',
        term.updatedAt || new Date().toISOString()
      ]);
      sheet.getRange(2, 1, values.length, 6).setValues(values);
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 용어집 데이터 로드
 */
function loadGlossary() {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const sheet = spreadsheet.getSheetByName('Glossary');
    
    if (!sheet || sheet.getLastRow() <= 1) {
      return { terms: [] };
    }
    
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
    const terms = data.map(row => ({
      id: row[0],
      korean: row[1],
      japanese: row[2],
      category: JSON.parse(row[3] || '[]'),
      notes: row[4],
      updatedAt: row[5]
    }));
    
    return { terms: terms };
  } catch (error) {
    return { terms: [], error: error.toString() };
  }
}

/**
 * 카테고리 저장
 */
function saveCategories(categories) {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const sheet = spreadsheet.getSheetByName('Categories') || spreadsheet.insertSheet('Categories');
    
    // 기존 데이터 삭제
    if (sheet.getLastRow() > 0) {
      sheet.clear();
    }
    
    // 헤더 추가
    sheet.getRange(1, 1).setValue('categories');
    
    // 카테고리 저장 (JSON 형식)
    sheet.getRange(2, 1).setValue(JSON.stringify(categories));
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 카테고리 로드
 */
function loadCategories() {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const sheet = spreadsheet.getSheetByName('Categories');
    
    if (!sheet || sheet.getLastRow() < 2) {
      return { categories: ['#dinkum', '#pubgm', '#ADK', '#palm', '#inzoi', '#tango'] };
    }
    
    const categoriesJson = sheet.getRange(2, 1).getValue();
    const categories = JSON.parse(categoriesJson || '[]');
    
    return { categories: categories.length > 0 ? categories : ['#dinkum', '#pubgm', '#ADK', '#palm', '#inzoi', '#tango'] };
  } catch (error) {
    return { categories: ['#dinkum', '#pubgm', '#ADK', '#palm', '#inzoi', '#tango'], error: error.toString() };
  }
}

/**
 * 코퍼스 데이터 저장
 */
function saveCorpus(data) {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const sheet = spreadsheet.getSheetByName('Corpus') || spreadsheet.insertSheet('Corpus');
    
    // 헤더 확인
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 4).setValues([['id', 'korean', 'japanese', 'fileGroupId']]);
    }
    
    // 기존 데이터 삭제
    if (sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
    
    // 새 데이터 추가
    if (data.items && data.items.length > 0) {
      const values = data.items.map(item => [
        item.id || '',
        item.korean || '',
        item.japanese || '',
        item.fileGroupId || ''
      ]);
      sheet.getRange(2, 1, values.length, 4).setValues(values);
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 코퍼스 데이터 로드
 */
function loadCorpus() {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const sheet = spreadsheet.getSheetByName('Corpus');
    
    if (!sheet || sheet.getLastRow() <= 1) {
      return { items: [] };
    }
    
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
    const items = data.map(row => ({
      id: row[0],
      korean: row[1],
      japanese: row[2],
      fileGroupId: row[3]
    }));
    
    return { items: items };
  } catch (error) {
    return { items: [], error: error.toString() };
  }
}

/**
 * 파일 그룹 저장
 */
function saveFileGroups(fileGroups) {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const sheet = spreadsheet.getSheetByName('FileGroups') || spreadsheet.insertSheet('FileGroups');
    
    // 헤더 확인
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 6).setValues([['id', 'name', 'koreanFileName', 'japaneseFileName', 'itemCount', 'folderId']]);
    }
    
    // 기존 데이터 삭제
    if (sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
    
    // 새 데이터 추가
    if (fileGroups && fileGroups.length > 0) {
      const values = fileGroups.map(fg => [
        fg.id || '',
        fg.name || '',
        fg.koreanFileName || '',
        fg.japaneseFileName || '',
        fg.itemCount || 0,
        fg.folderId || ''
      ]);
      sheet.getRange(2, 1, values.length, 6).setValues(values);
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 파일 그룹 로드
 */
function loadFileGroups() {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const sheet = spreadsheet.getSheetByName('FileGroups');
    
    if (!sheet || sheet.getLastRow() <= 1) {
      return { fileGroups: [] };
    }
    
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
    const fileGroups = data.map(row => ({
      id: row[0],
      name: row[1],
      koreanFileName: row[2],
      japaneseFileName: row[3],
      itemCount: row[4],
      folderId: row[5]
    }));
    
    return { fileGroups: fileGroups };
  } catch (error) {
    return { fileGroups: [], error: error.toString() };
  }
}

/**
 * 토론 데이터 저장
 */
function saveDiscussion(data) {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const sheet = spreadsheet.getSheetByName('Discussion') || spreadsheet.insertSheet('Discussion');
    
    // 헤더 확인
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 8).setValues([['id', 'term', 'author', 'content', 'meaning', 'category', 'createdAt', 'updatedAt']]);
    }
    
    // 기존 데이터 삭제
    if (sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
    
    // 새 데이터 추가
    if (data.posts && data.posts.length > 0) {
      const values = data.posts.map(post => [
        post.id || '',
        post.term || '',
        post.author || '',
        post.content || '',
        post.meaning || '',
        post.category || '',
        post.createdAt || new Date().toISOString(),
        post.updatedAt || new Date().toISOString()
      ]);
      sheet.getRange(2, 1, values.length, 8).setValues(values);
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 토론 데이터 로드
 */
function loadDiscussion() {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const sheet = spreadsheet.getSheetByName('Discussion');
    
    if (!sheet || sheet.getLastRow() <= 1) {
      return { posts: [] };
    }
    
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
    const posts = data.map(row => ({
      id: row[0],
      term: row[1],
      author: row[2],
      content: row[3],
      meaning: row[4],
      category: row[5],
      createdAt: row[6],
      updatedAt: row[7]
    }));
    
    return { posts: posts };
  } catch (error) {
    return { posts: [], error: error.toString() };
  }
}

/**
 * 작성자 목록 저장
 */
function saveAuthors(authors) {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const sheet = spreadsheet.getSheetByName('Authors') || spreadsheet.insertSheet('Authors');
    
    if (sheet.getLastRow() > 0) {
      sheet.clear();
    }
    
    sheet.getRange(1, 1).setValue('authors');
    sheet.getRange(2, 1).setValue(JSON.stringify(authors));
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 작성자 목록 로드
 */
function loadAuthors() {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const sheet = spreadsheet.getSheetByName('Authors');
    
    if (!sheet || sheet.getLastRow() < 2) {
      return { authors: [] };
    }
    
    const authorsJson = sheet.getRange(2, 1).getValue();
    const authors = JSON.parse(authorsJson || '[]');
    
    return { authors: authors };
  } catch (error) {
    return { authors: [], error: error.toString() };
  }
}

/**
 * 토론 카테고리 저장
 */
function saveDiscussionCategories(categories) {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const sheet = spreadsheet.getSheetByName('DiscussionCategories') || spreadsheet.insertSheet('DiscussionCategories');
    
    if (sheet.getLastRow() > 0) {
      sheet.clear();
    }
    
    sheet.getRange(1, 1).setValue('categories');
    sheet.getRange(2, 1).setValue(JSON.stringify(categories));
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 토론 카테고리 로드
 */
function loadDiscussionCategories() {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const sheet = spreadsheet.getSheetByName('DiscussionCategories');
    
    if (!sheet || sheet.getLastRow() < 2) {
      return { categories: [] };
    }
    
    const categoriesJson = sheet.getRange(2, 1).getValue();
    const categories = JSON.parse(categoriesJson || '[]');
    
    return { categories: categories };
  } catch (error) {
    return { categories: [], error: error.toString() };
  }
}

/**
 * 폴더 목록 저장
 */
function saveFolders(folders) {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const sheet = spreadsheet.getSheetByName('Folders') || spreadsheet.insertSheet('Folders');
    
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 2).setValues([['id', 'name']]);
    }
    
    if (sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
    
    if (folders && folders.length > 0) {
      const values = folders.map(folder => [
        folder.id || '',
        folder.name || ''
      ]);
      sheet.getRange(2, 1, values.length, 2).setValues(values);
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 폴더 목록 로드
 */
function loadFolders() {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const sheet = spreadsheet.getSheetByName('Folders');
    
    if (!sheet || sheet.getLastRow() <= 1) {
      return { folders: [] };
    }
    
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
    const folders = data.map(row => ({
      id: row[0],
      name: row[1]
    }));
    
    return { folders: folders };
  } catch (error) {
    return { folders: [], error: error.toString() };
  }
}

/**
 * 설정 저장
 */
function saveSetting(key, value) {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const sheet = spreadsheet.getSheetByName('Settings') || spreadsheet.insertSheet('Settings');
    
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 2).setValues([['key', 'value']]);
    }
    
    // 기존 설정 찾기
    const data = sheet.getDataRange().getValues();
    let found = false;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(value);
        found = true;
        break;
      }
    }
    
    if (!found) {
      sheet.appendRow([key, value]);
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 설정 로드
 */
function loadSetting(key) {
  try {
    const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    const sheet = spreadsheet.getSheetByName('Settings');
    
    if (!sheet || sheet.getLastRow() <= 1) {
      return { value: null };
    }
    
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        return { value: data[i][1] };
      }
    }
    
    return { value: null };
  } catch (error) {
    return { value: null, error: error.toString() };
  }
}
