var CONFIG = {
  SPREADSHEET_ID: '1t9JxhkqTLJnWswA85KuzjyJtu4sbtOBfSrV1TXHCEYg',
  USER_SHEET_NAME: 'User',
  LEADERBOARD_SHEET_NAME: 'Leaderboard',
  SCORE_LOG_SHEET_NAME: 'ScoreLog',
  PROGRESS_SHEET_NAME: 'Progress',
  GRAMMAR_SHEET_NAME: 'Questions_Grammar',
  QUIZ_SHEET_NAME: 'Questions_Quiz',
  PRONUNCIATION_SHEET_NAME: 'Questions_Pronunciation',
  SCRAMBLE_SHEET_NAME: 'Questions_Scramble',
  WORD_MATCH_SHEET_NAME: 'Questions_WordMatch',
  LOOK_AND_WRITE_SHEET_NAME: 'Nhin_va_viet',
  CLASS_LEVEL_SHEET_NAME: 'Class_Level',
  COURSES_SHEET_NAME: 'Courses',
  DRIVE_FOLDER_ID: '1NxppMFrK9_8WyxNZLPKYEjS2mk1dmSKn',
  STARTER_SHEETS: {
    Nhin_va_viet: 'look_and_write',
    Chon_va_khoanh: 'choose_and_circle',
    Doc_va_hoan_thanh: 'read_and_complete',
    Doc_va_noi: 'read_and_match',
    Kiem_tra_tu_vung: 'vocabulary_test',
    Kiem_tra_dung_sai: 'vocabulary_check'
  },
  GAME_TOTALS: { grammar: 0, quiz: 0, pronunciation: 0, scramble: 0, word_match: 0, look_and_write: 0 },
  SCORING: {
    TIME_LIMIT_MS: 30000,
    CORRECT_MIN: 50,
    CORRECT_MAX: 200,
    WRONG_MIN: 20,
    WRONG_MAX: 80
  },
  TZ: 'Asia/Ho_Chi_Minh',
  CACHE_TTL_SHEET_SEC: 300,
  CACHE_TTL_LOGO_SEC: 21600,
  /** PDF sách điện tử mặc định trên Drive (tên file). Ghi đè bằng cột ebook_file_id trong sheet Courses. */
  EBOOK: {
    DEFAULT_FILE_NAME: 'Grade 8 HK1 (GS).pdf',
    BY_CLASS: {
      'Lớp 8': 'Grade 8 HK1 (GS).pdf'
    }
  }
};

/** Cache trong 1 lần gọi server (tránh openById / getSheets lặp). */
var _runtime = { ss: null, sheets: {} };

function getSpreadsheet_() {
  if (!_runtime.ss) {
    _runtime.ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }
  return _runtime.ss;
}

function getSheetByNameCached_(name) {
  var key = String(name || '').trim().toLowerCase();
  if (_runtime.sheets[key]) return _runtime.sheets[key];
  var sheet = getSheetByNameInsensitive_(getSpreadsheet_(), name);
  if (sheet) _runtime.sheets[key] = sheet;
  return sheet;
}

function getScriptCache_() {
  return CacheService.getScriptCache();
}

function invalidateSheetCache_(sheetName) {
  getScriptCache_().remove('rows_v1_' + String(sheetName || '').trim());
}

function getCachedSheetRows_(sheetName, allowEmpty) {
  var cacheKey = 'rows_v1_' + String(sheetName || '').trim();
  var cached = getScriptCache_().get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (err) { /* đọc lại từ sheet */ }
  }

  var sheet = getSheetByNameCached_(sheetName);
  if (!sheet) {
    if (allowEmpty) return [];
    throw new Error('Không tìm thấy sheet "' + sheetName + '"');
  }

  var rows = sheet.getDataRange().getValues();
  try {
    var payload = JSON.stringify(rows);
    if (payload.length > 0 && payload.length < 95000) {
      getScriptCache_().put(cacheKey, payload, CONFIG.CACHE_TTL_SHEET_SEC);
    }
  } catch (err) { /* bỏ qua nếu cache quá lớn */ }
  return rows;
}

/** Nhúng file HTML phụ (CSS/JS) vào template GAS. */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** Trang lỗi HTML thay vì trả về mã nguồn thô khi template sai. */
function buildWebAppErrorPage_(title, message) {
  var safeTitle = String(title || 'WeWIN').replace(/</g, '&lt;');
  var safeMsg = String(message || 'Không tải được trang web.')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
  return HtmlService.createHtmlOutput(
    '<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + safeTitle + '</title>' +
  '<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:48px auto;padding:0 20px;color:#333}' +
    'h1{color:#0d2b6e;font-size:1.35rem}ol{line-height:1.7}code{background:#f3f4f6;padding:2px 6px;border-radius:4px}</style>' +
    '</head><body><h1>Không mở được Web App</h1><p>' + safeMsg + '</p>' +
    '<ol><li>Mở <strong>Apps Script Editor</strong> → kiểm tra file <code>index.html</code> ' +
    'bắt đầu bằng <code>&lt;!DOCTYPE html&gt;</code> (không phải mã <code>Code.gs</code>).</li>' +
    '<li>Copy lại toàn bộ file HTML từ máy tính (index.html, grammar.html, GameStyles.html, GameCommon.html, …).</li>' +
    '<li>File fragment (<code>GameCommon.html</code>, …) phải có thẻ <code>&lt;script&gt;</code> riêng — include bằng <code>&lt;?!= include(\'GameCommon\'); ?&gt;</code>, không bọc thêm <code>&lt;script&gt;</code>.</li>' +
    '<li><strong>Deploy</strong> → <strong>Manage deployments</strong> → <strong>Edit</strong> → chọn <strong>New version</strong> → Deploy.</li>' +
    '<li>Mở URL kết thúc bằng <code>/exec</code> (không dùng <code>/dev</code>).</li></ol></body></html>'
  ).setTitle(safeTitle).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Phát hiện file .html trên GAS bị dán nhầm nội dung Code.gs. */
function assertHtmlPageFile_(filename, requireFullPage) {
  var content = '';
  try {
    content = HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (err) {
    throw new Error('Thiếu file HTML "' + filename + '.html" trong Apps Script Editor.');
  }
  var trimmed = String(content || '').trim();
  if (/^var\s+CONFIG\s*=/.test(trimmed) || /^function\s+doGet\s*\(/.test(trimmed)) {
    throw new Error(
      'File "' + filename + '.html" đang chứa mã Code.gs thay vì HTML. ' +
      'Hãy xóa nội dung sai và dán lại file HTML đúng từ máy tính.'
    );
  }
  if (requireFullPage !== false &&
      trimmed.indexOf('<!DOCTYPE') !== 0 && !/^<html[\s>]/i.test(trimmed)) {
    throw new Error('File "' + filename + '.html" không phải trang web hợp lệ (thiếu <!DOCTYPE html> hoặc <html>).');
  }
}

/** Chạy trong Editor (Run) để kiểm tra đủ file HTML trước khi Deploy. */
function checkWebAppFiles() {
  var pages = [
    'index', 'grammar', 'multiplechoice', 'pronunciation', 'word-scramble', 'word-match',
    'look-and-write', 'choose-and-circle', 'read-and-complete', 'read-and-match',
    'vocabulary-test', 'vocabulary-check'
  ];
  var fragments = ['GameStyles', 'GameCommon', 'starters-common', 'starters-sample-data'];
  var missing = [];
  var invalid = [];
  function check(name, fullPage) {
    try {
      assertHtmlPageFile_(name, fullPage);
    } catch (err) {
      var msg = String(err.message || err);
      if (msg.indexOf('Thiếu file') === 0) missing.push(name + '.html');
      else invalid.push(name + '.html: ' + msg);
    }
  }
  pages.forEach(function (name) { check(name, true); });
  fragments.forEach(function (name) { check(name, false); });
  if (missing.length || invalid.length) {
    var lines = [];
    if (missing.length) lines.push('Thiếu: ' + missing.join(', '));
    if (invalid.length) lines.push('Sai nội dung: ' + invalid.join(' | '));
    throw new Error(lines.join('\n'));
  }
  return 'OK — đủ ' + (pages.length + fragments.length) + ' file HTML. Tiếp theo: Deploy → New version → /exec';
}

function doGet(e) {
  e = e || { parameter: {} };
  var page = e.parameter.page || 'index';
  if (page === 'login') page = 'index';

  if (page === 'ebook') {
    return serveEbookPdf_(e.parameter.fileId);
  }

  var titles = {
    leaderboard: 'Bảng xếp hạng - WeWIN',
    grammar: 'Ngữ pháp - WeWIN',
    multiplechoice: 'Trắc nghiệm - WeWIN',
    pronunciation: 'Phát âm - WeWIN',
    scramble: 'Sắp xếp từ - WeWIN',
    word_match: 'Nối từ với hình ảnh - WeWIN',
    look_and_write: 'Nhìn và viết - WeWIN',
    choose_and_circle: 'Chọn và khoanh - WeWIN',
    read_and_complete: 'Đọc và hoàn thành - WeWIN',
    read_and_match: 'Đọc và nối - WeWIN',
    vocabulary_test: 'Kiểm tra từ vựng - WeWIN',
    vocabulary_check: 'Kiểm tra đúng sai - WeWIN',
    index: 'WeWIN'
  };
  var files = {
    grammar: 'grammar',
    multiplechoice: 'multiplechoice',
    pronunciation: 'pronunciation',
    scramble: 'word-scramble',
    word_match: 'word-match',
    look_and_write: 'look-and-write',
    choose_and_circle: 'choose-and-circle',
    read_and_complete: 'read-and-complete',
    read_and_match: 'read-and-match',
    vocabulary_test: 'vocabulary-test',
    vocabulary_check: 'vocabulary-check',
    index: 'index'
  };

  // Bảng xếp hạng nhúng trong index – không dùng trang login riêng
  var file = page === 'leaderboard' ? 'index' : (files[page] || 'index');
  var title = titles[page] || titles.index;

  try {
    assertHtmlPageFile_(file);

    // GAS chạy HTML trong iframe sandbox — window.location.search thường KHÔNG có ?course=...
    // Phải inject tham số URL từ server (e.parameter) xuống client.
    var template = HtmlService.createTemplateFromFile(file);
    template.urlParamsJson = JSON.stringify(e.parameter || {});

    return template.evaluate()
      .setTitle(title)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (err) {
    return buildWebAppErrorPage_(title, err.message || String(err));
  }
}

function getAppUrl() {
  return ScriptApp.getService().getUrl();
}

/** URL stream PDF cho PDF.js (cùng origin với web app). */
function getEbookPdfUrl(fileId) {
  fileId = String(fileId || '').trim();
  if (!fileId) return '';
  return getAppUrl() + '?page=ebook&fileId=' + encodeURIComponent(fileId);
}

function serveEbookPdf_(fileId) {
  fileId = String(fileId || '').trim();
  if (!fileId) {
    return ContentService.createTextOutput('Thiếu fileId sách điện tử.')
      .setMimeType(ContentService.MimeType.TEXT);
  }
  try {
    var file = DriveApp.getFileById(fileId);
    var blob = file.getBlob();
    if (blob.getContentType() !== MimeType.PDF) {
      blob = blob.setContentType(MimeType.PDF);
    }
    return ContentService.createBlobOutput(blob.getBytes())
      .setMimeType(MimeType.PDF);
  } catch (err) {
    return ContentService.createTextOutput('Không đọc được PDF: ' + (err.message || err))
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

function findDriveFileIdByName_(fileName, folderId) {
  fileName = String(fileName || '').trim();
  if (!fileName) return '';

  var cacheKey = 'ebook_id_' + fileName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  var cached = getScriptCache_().get(cacheKey);
  if (cached) return cached;

  var found = '';
  try {
    if (folderId) {
      var folder = DriveApp.getFolderById(String(folderId).trim());
      var files = folder.getFilesByName(fileName);
      if (files.hasNext()) found = files.next().getId();
    }
    if (!found) {
      var all = DriveApp.getFilesByName(fileName);
      if (all.hasNext()) found = all.next().getId();
    }
  } catch (err) { /* ignore */ }

  if (found) getScriptCache_().put(cacheKey, found, CONFIG.CACHE_TTL_LOGO_SEC);
  return found;
}

function resolveEbookFileId_(className, level, explicitId) {
  explicitId = String(explicitId || '').trim();
  if (explicitId) return explicitId;

  var byClass = CONFIG.EBOOK && CONFIG.EBOOK.BY_CLASS ? CONFIG.EBOOK.BY_CLASS : {};
  var fileName = byClass[String(className || '').trim()] ||
    (CONFIG.EBOOK && CONFIG.EBOOK.DEFAULT_FILE_NAME) || '';
  if (!fileName) return '';

  return findDriveFileIdByName_(fileName, CONFIG.DRIVE_FOLDER_ID);
}

function parseEbookPage_(value, fallback) {
  var n = parseInt(String(value || '').trim(), 10);
  if (isNaN(n) || n < 1) return fallback;
  return n;
}

/**
 * Chạy hàm này trong Apps Script Editor (Run) để hiện lại hộp cấp quyền.
 * Nếu không hiện: vào myaccount.google.com/permissions → gỡ app → chạy lại.
 */
function requestAuthorization() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.USER_SHEET_NAME);
  if (!sheet) {
    throw new Error('Không tìm thấy sheet "' + CONFIG.USER_SHEET_NAME + '"');
  }
  getProgressSheet_(true);
  var rowCount = sheet.getLastRow();
  var logo = getLogoSrc_();
  Logger.log('Sheet: ' + ss.getName() + ' | Rows: ' + rowCount + ' | Logo OK: ' + (logo.length > 0));
  return 'OK – đã kết nối Sheet "' + ss.getName() + '" (' + rowCount + ' dòng)';
}

function getLogoSrc() {
  return getLogoSrc_();
}

function getLogoSrc_() {
  var cacheKey = 'logo_src_v1';
  var cached = getScriptCache_().get(cacheKey);
  if (cached) return cached;

  var src = getLogoSrcUncached_();
  if (src && src.length < 95000) {
    getScriptCache_().put(cacheKey, src, CONFIG.CACHE_TTL_LOGO_SEC);
  }
  return src;
}

function getLogoSrcUncached_() {
  try {
    var files = DriveApp.getFilesByName('wewinlogo.png');
    if (files.hasNext()) {
      var blob = files.next().getBlob();
      return 'data:image/png;base64,' + Utilities.base64Encode(blob.getBytes());
    }
  } catch (err) { /* ignore */ }
  return 'https://wewin.edu.vn/wp-content/uploads/2023/07/Artboard-1-copy@1x-e1690017564880.png';
}

function getPageBootstrap() {
  return {
    appUrl: getAppUrl(),
    logoSrc: getLogoSrc_(),
    session: getSessionUser()
  };
}

function getDefaultClassLevelFilters_(filters) {
  if (!filters || !filters.length) return { class: '', level: '' };
  var defaultIndex = 0;
  for (var i = 0; i < filters.length; i++) {
    if (filters[i].class === '4-5 tuổi' && filters[i].level === 'Starters') {
      defaultIndex = i;
      break;
    }
  }
  var row = filters[defaultIndex] || filters[0];
  return {
    class: row && row.class === 'Tất cả' ? '' : String((row && row.class) || '').trim(),
    level: row ? String(row.level || '').trim() : ''
  };
}

/** Một request: logo + session + bộ lọc + khóa học mặc định (trang chủ). */
function getIndexHomeData() {
  try {
    var filters = readClassLevelFilters_();
    var defaults = getDefaultClassLevelFilters_(filters);
    var courseResult = getCourseList(defaults.class, defaults.level);
    return {
      success: true,
      appUrl: getAppUrl(),
      logoSrc: getLogoSrc_(),
      session: getSessionUser(),
      filters: filters,
      defaultClass: defaults.class,
      defaultLevel: defaults.level,
      courses: courseResult.courses || []
    };
  } catch (err) {
    return {
      success: false,
      message: err.message,
      filters: [],
      courses: [],
      defaultClass: '',
      defaultLevel: '',
      session: getSessionUser(),
      logoSrc: getLogoSrc_(),
      appUrl: getAppUrl()
    };
  }
}

function getSheetByNameInsensitive_(ss, name) {
  var target = String(name || '').trim().toLowerCase();
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (String(sheets[i].getName() || '').trim().toLowerCase() === target) {
      return sheets[i];
    }
  }
  return null;
}

function getUserSheet_() {
  var sheet = getSheetByNameCached_(CONFIG.USER_SHEET_NAME);
  if (!sheet) {
    throw new Error('Không tìm thấy sheet "' + CONFIG.USER_SHEET_NAME + '"');
  }
  return sheet;
}

function loginUser(username, password) {
  try {
    username = String(username || '').trim();
    password = String(password || '').trim();

    if (!username || !password) {
      return { success: false, message: 'Vui lòng nhập username và password' };
    }

    var data = getUserSheet_().getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      var rowUser = String(data[i][0] || '').trim();
      var rowPass = String(data[i][1] || '').trim();

      if (rowUser === username && rowPass === password) {
        var displayName = String(data[i][2] || username).trim();
        var props = PropertiesService.getUserProperties();
        props.setProperty('loggedIn', 'true');
        props.setProperty('displayName', displayName);
        props.setProperty('username', username);
        return { success: true, name: displayName, username: username };
      }
    }

    return { success: false, message: 'Sai username hoặc password' };
  } catch (err) {
    return { success: false, message: 'Lỗi hệ thống: ' + err.message };
  }
}

function getSessionUser() {
  var props = PropertiesService.getUserProperties();
  var loggedIn = props.getProperty('loggedIn') === 'true';
  var name = props.getProperty('displayName') || '';
  var username = props.getProperty('username') || '';
  return { loggedIn: loggedIn, name: name, username: username };
}

function logoutUser() {
  PropertiesService.getUserProperties().deleteAllProperties();
  return { success: true };
}

/** Chạy 1 lần trong Editor để tạo sheet Progress + câu hỏi (nếu chưa có). */
function setupDatabase() {
  getProgressSheet_(true);
  getLeaderboardSheet_(true);
  getScoreLogSheet_(true);
  setupQuestionDatabase();
  setupCoursesCatalog();
  return 'OK – database đã sẵn sàng (Progress, Leaderboard, ScoreLog, Questions_Grammar, Questions_Quiz, Questions_Pronunciation, Questions_Scramble, Questions_WordMatch, Class_Level, Courses)';
}

/**
 * Tạo 2 sheet câu hỏi trong Google Spreadsheet.
 * Chạy setupDatabase() hoặc setupQuestionDatabase() trong Apps Script Editor.
 *
 * Questions_Grammar: id | course | level | source | prefix | suffix | hint | answers | active
 *   - answers: nhiều đáp án đúng, cách nhau bằng dấu |
 *   - course: tên khóa hoặc * để dùng cho mọi khóa
 *   - level: Starters / Movers / … — để trống = dùng cho mọi level của course
 *   - active: TRUE/FALSE — đặt FALSE để ẩn câu (không xóa hẳn)
 *
 * Questions_Quiz — hỗ trợ 2 định dạng cột:
 *   Chuẩn: id | course | level | type | type_label | question | option_a | option_b | option_c | option_d | answer | accept | active
 *   - type: word_form | fill_blank | multiple_choice
 *   - option_a: có thể gộp 4 đáp án bằng dấu | (vd: go|goes|going|went)
 *
 * Questions_Scramble: id | course | level | word | hint | image | active
 *   - word: từ đúng (vd: PENCIL) — client tự đảo chữ hiển thị (P.N.E.L.C.I) và xáo thứ tự câu
 *   - không cần cột scrambled/order trên Sheet
 *
 * Questions_WordMatch: id | course | level | word | image | hint | active
 *   - mỗi dòng là 1 cặp từ - hình để nối
 */
function setupQuestionDatabase() {
  setupGrammarQuestionSheet_();
  setupQuizQuestionSheet_();
  setupPronunciationQuestionSheet_();
  setupScrambleQuestionSheet_();
  setupWordMatchQuestionSheet_();
  repairQuestionSheetHeaders_();
  return 'OK – sheet "' + CONFIG.GRAMMAR_SHEET_NAME + '", "' + CONFIG.QUIZ_SHEET_NAME + '", "' + CONFIG.PRONUNCIATION_SHEET_NAME + '", "' + CONFIG.SCRAMBLE_SHEET_NAME + '" và "' + CONFIG.WORD_MATCH_SHEET_NAME + '" đã sẵn sàng';
}

/** Sửa header lệch so với code (vd: surfix → suffix). Thêm cột level nếu thiếu. */
function repairQuestionSheetHeaders_() {
  var grammarSheet = getSheetByNameCached_(CONFIG.GRAMMAR_SHEET_NAME);
  if (grammarSheet && grammarSheet.getLastColumn() >= 1) {
    var headers = grammarSheet.getRange(1, 1, 1, grammarSheet.getLastColumn()).getValues()[0];
    for (var c = 0; c < headers.length; c++) {
      if (normalizeHeader_(headers[c]) === 'surfix') {
        grammarSheet.getRange(1, c + 1).setValue('suffix');
      }
    }
    ensureLevelColumn_(grammarSheet);
  }

  var quizSheet = getSheetByNameCached_(CONFIG.QUIZ_SHEET_NAME);
  if (quizSheet && quizSheet.getLastColumn() >= 1) {
    ensureLevelColumn_(quizSheet);
  }
}

/** Chèn cột level sau course nếu sheet cũ chưa có. */
function ensureLevelColumn_(sheet) {
  if (!sheet || sheet.getLastColumn() < 1) return;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var hasLevel = false;
  var courseCol = -1;
  for (var c = 0; c < headers.length; c++) {
    var h = normalizeHeader_(headers[c]);
    if (h === 'level' || h === 'cap_do' || h === 'trinh_do') hasLevel = true;
    if ((h.indexOf('course') >= 0 || h.indexOf('khoa_hoc') >= 0) && courseCol < 0) courseCol = c;
  }
  if (hasLevel) return;
  var insertAt = courseCol >= 0 ? courseCol + 2 : 3;
  sheet.insertColumnAfter(insertAt - 1);
  sheet.getRange(1, insertAt).setValue('level');
}

/** Chạy trong Apps Script Editor sau khi sửa Sheet để xóa cache cũ. */
function refreshQuestionCaches() {
  invalidateSheetCache_(CONFIG.GRAMMAR_SHEET_NAME);
  invalidateSheetCache_(CONFIG.QUIZ_SHEET_NAME);
  invalidateSheetCache_(CONFIG.PRONUNCIATION_SHEET_NAME);
  invalidateSheetCache_(CONFIG.SCRAMBLE_SHEET_NAME);
  invalidateSheetCache_(CONFIG.WORD_MATCH_SHEET_NAME);
  invalidateSheetCache_(CONFIG.COURSES_SHEET_NAME);
  invalidateSheetCache_(CONFIG.CLASS_LEVEL_SHEET_NAME);
  return 'OK – đã xóa cache câu hỏi / khóa học';
}

/**
 * Chạy trong Apps Script Editor: diagnoseQuestionLoad('EveryUp')
 * Kiểm tra Sheet online (không phải file .xlsx local) có khớp code không.
 */
function diagnoseQuestionLoad(course) {
  course = String(course || 'EveryUp').trim();
  refreshQuestionCaches();

  var grammarRows = getCachedSheetRows_(CONFIG.GRAMMAR_SHEET_NAME, true);
  var quizRows = getCachedSheetRows_(CONFIG.QUIZ_SHEET_NAME, true);
  var grammarMap = grammarRows.length ? buildGrammarColumnMap_(grammarRows[0]) : {};
  var quizMap = quizRows.length ? buildQuizColumnMap_(quizRows[0]) : {};

  return {
    spreadsheetId: CONFIG.SPREADSHEET_ID,
    course: course,
    grammar: {
      sheet: CONFIG.GRAMMAR_SHEET_NAME,
      rowCount: Math.max(grammarRows.length - 1, 0),
      headers: grammarRows.length ? grammarRows[0] : [],
      columnMap: grammarMap,
      matched: readGrammarQuestions_(course, '').length
    },
    quiz: {
      sheet: CONFIG.QUIZ_SHEET_NAME,
      rowCount: Math.max(quizRows.length - 1, 0),
      headers: quizRows.length ? quizRows[0] : [],
      columnMap: quizMap,
      matched: readQuizQuestions_(course, '').length
    },
    hint: grammarRows.length < 2 || quizRows.length < 2
      ? 'Sheet online trống hoặc thiếu dữ liệu — import file Game Trắc Nghiệm.xlsx lên Google Sheet.'
      : 'Nếu matched = 0: kiểm tra cột course/level trùng tên khóa (vd: Unit 1 + Starters) và active = TRUE.'
  };
}

function setupGrammarQuestionSheet_() {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(CONFIG.GRAMMAR_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.GRAMMAR_SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['id', 'course', 'level', 'source', 'prefix', 'suffix', 'hint', 'answers', 'active']);
  }

  formatQuestionHeader_(sheet, Math.max(sheet.getLastColumn(), 9));
}

function setupQuizQuestionSheet_() {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(CONFIG.QUIZ_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.QUIZ_SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'id', 'course', 'level', 'type', 'type_label', 'question',
      'option_a', 'option_b', 'option_c', 'option_d', 'answer', 'accept', 'active'
    ]);
  }

  formatQuestionHeader_(sheet, Math.max(sheet.getLastColumn(), 13));
}

function setupPronunciationQuestionSheet_() {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(CONFIG.PRONUNCIATION_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.PRONUNCIATION_SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'id', 'course', 'mode', 'prompt', 'target_text', 'target_ipa', 'reference_audio_url', 'hint', 'active'
    ]);
  }

  formatQuestionHeader_(sheet, 9);
}

/**
 * Questions_Scramble: id | course | level | word | hint | image | active
 * Chỉ ghi từ đúng trên Sheet; đảo chữ + xáo thứ tự câu ở client.
 */
function setupScrambleQuestionSheet_() {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(CONFIG.SCRAMBLE_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SCRAMBLE_SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['id', 'course', 'level', 'word', 'hint', 'image', 'active']);
    sheet.appendRow([1, 'EveryUp', 'Starters', 'PENCIL', 'Đồ dùng học tập', '', true]);
    sheet.appendRow([2, 'EveryUp', 'Starters', 'APPLE', 'Quả táo', '', true]);
    sheet.appendRow([3, 'EveryUp', 'Starters', 'TABLE', 'Cái bàn', '', true]);
  }

  formatQuestionHeader_(sheet, 7);
  ensureLevelColumn_(sheet);
}

/**
 * Questions_WordMatch: id | course | level | word | image | hint | active
 * Chỉ cần nhập cặp từ - hình, client tự xáo thứ tự 2 cột.
 */
function setupWordMatchQuestionSheet_() {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(CONFIG.WORD_MATCH_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.WORD_MATCH_SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['id', 'course', 'level', 'word', 'image', 'hint', 'active']);
    sheet.appendRow([1, 'EveryUp', 'Starters', 'PENCIL', '', 'Bút chì', true]);
    sheet.appendRow([2, 'EveryUp', 'Starters', 'APPLE', '', 'Trái táo', true]);
    sheet.appendRow([3, 'EveryUp', 'Starters', 'TABLE', '', 'Cái bàn', true]);
  }

  formatQuestionHeader_(sheet, 7);
  ensureLevelColumn_(sheet);
}

function formatQuestionHeader_(sheet, colCount) {
  var header = sheet.getRange(1, 1, 1, colCount);
  header.setFontWeight('bold').setBackground('#e8eef8');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, colCount);
}

/**
 * Sheet Class_Level: class | level | active
 *   - Thứ tự hiển thị = thứ tự dòng trên sheet (trên xuống dưới).
 *   - level để trống nếu lớp không có cấp độ con (vd: Tất cả, Lớp 1).
 *
 * Sheet Courses: class | level | course | active
 *   - Ràng buộc khóa học theo lớp + cấp độ; thứ tự dòng = thứ tự hiển thị.
 *   - course phải khớp cột course trong Questions_Grammar / Questions_Quiz.
 *
 * Chạy setupCoursesCatalog() trong Apps Script Editor (hoặc setupDatabase()).
 */
function setupCoursesCatalog() {
  setupClassLevelSheet_();
  setupCoursesSheet_();
  applyCoursesDataValidation_();
  invalidateSheetCache_(CONFIG.CLASS_LEVEL_SHEET_NAME);
  invalidateSheetCache_(CONFIG.COURSES_SHEET_NAME);
  return 'OK – sheet "' + CONFIG.CLASS_LEVEL_SHEET_NAME + '" và "' + CONFIG.COURSES_SHEET_NAME + '" đã sẵn sàng';
}

function setupClassLevelSheet_() {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(CONFIG.CLASS_LEVEL_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.CLASS_LEVEL_SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['class', 'level', 'active']);
    var rows = [
      ['Tất cả', '', true],
      ['Cambridge', 'Flyer', true],
      ['Cambridge', 'Movers', true],
      ['Cambridge', 'Starters', true],
      ['3-4 tuổi', 'Starters', true],
      ['4-5 tuổi', 'Starters', true],
      ['4-5 tuổi', 'Cấp độ 1', true],
      ['4-5 tuổi', 'Cấp độ 2', true],
      ['5-6 tuổi', 'Cấp độ 2', true],
      ['6-7 tuổi', 'Cấp độ 3', true],
      ['7-8 tuổi', 'Cấp độ 4', true],
      ['8-9 tuổi', 'Cấp độ 5', true],
      ['9-10 tuổi', 'Cấp độ 6', true],
      ['Lớp 1', '', true],
      ['Lớp 2', '', true],
      ['Lớp 3', '', true],
      ['Lớp 4', '', true]
    ];
    for (var i = 0; i < rows.length; i++) {
      sheet.appendRow(rows[i]);
    }
  }

  formatQuestionHeader_(sheet, 3);
}

function setupCoursesSheet_() {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(CONFIG.COURSES_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.COURSES_SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['class', 'level', 'course', 'active', 'ebook_file_id', 'ebook_page_start', 'ebook_page_end']);
    var rows = [
      ['Cambridge', 'Flyer', 'EveryUp', true],
      ['Cambridge', 'Flyer', 'Listen', true],
      ['Cambridge', 'Movers', 'Fun 4 Movers', true],
      ['Cambridge', 'Starters', 'EveryUp', true],
      ['4-5 tuổi', 'Starters', 'EveryUp', true],
      ['4-5 tuổi', 'Starters', 'Listen', true]
    ];
    for (var j = 0; j < rows.length; j++) {
      sheet.appendRow(rows[j]);
    }
  }

  formatQuestionHeader_(sheet, 4);
}

/** Dropdown phụ thuộc: cột level trong Courses chỉ hiện cấp độ thuộc lớp đã chọn. */
function applyCoursesDataValidation_() {
  var ss = getSpreadsheet_();
  var classLevelSheet = ss.getSheetByName(CONFIG.CLASS_LEVEL_SHEET_NAME);
  var coursesSheet = ss.getSheetByName(CONFIG.COURSES_SHEET_NAME);
  if (!classLevelSheet || !coursesSheet || coursesSheet.getLastRow() < 2) return;

  var classList = classLevelSheet.getRange('A2:A500');
  var classRule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(classList, true)
    .setAllowInvalid(false)
    .build();
  coursesSheet.getRange('A2:A500').setDataValidation(classRule);

  // Data validation cần công thức trả về TRUE/FALSE cho từng ô, không dùng FILTER trả mảng.
  // Rule này đảm bảo B2:B500 chỉ hợp lệ khi (A cùng dòng, B cùng dòng) tồn tại trong Class_Level.
  var levelFormula = '=OR($B2="";COUNTIFS(' +
    CONFIG.CLASS_LEVEL_SHEET_NAME + '!$A$2:$A$500;$A2;' +
    CONFIG.CLASS_LEVEL_SHEET_NAME + '!$B$2:$B$500;$B2;' +
    CONFIG.CLASS_LEVEL_SHEET_NAME + '!$B$2:$B$500;"<>")>0)';
  var levelRule = SpreadsheetApp.newDataValidation()
    .requireFormulaSatisfied(levelFormula)
    .setAllowInvalid(false)
    .build();
  coursesSheet.getRange('B2:B500').setDataValidation(levelRule);
}

function buildSimpleColumnMap_(headers, aliases) {
  var map = {};
  for (var key in aliases) {
    if (aliases.hasOwnProperty(key)) map[key] = -1;
  }
  for (var c = 0; c < headers.length; c++) {
    var h = normalizeSimpleHeader_(headers[c]);
    for (var k in aliases) {
      if (!aliases.hasOwnProperty(k) || map[k] >= 0) continue;
      var candidates = Array.isArray(aliases[k]) ? aliases[k] : [aliases[k]];
      for (var i = 0; i < candidates.length; i++) {
        var candidate = normalizeSimpleHeader_(candidates[i]);
        if (!candidate) continue;
        if (h === candidate || h.indexOf(candidate) >= 0 || candidate.indexOf(h) >= 0) {
          map[k] = c;
          break;
        }
      }
    }
  }
  return map;
}

function normalizeSimpleHeader_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function simpleCol_(row, colMap, key, defaultVal) {
  var idx = colMap[key];
  if (idx == null || idx < 0) return defaultVal;
  return row[idx];
}

function readClassLevelFilters_() {
  var rows = getCachedSheetRows_(CONFIG.CLASS_LEVEL_SHEET_NAME, true);
  if (rows.length < 2) return [];

  var colMap = buildSimpleColumnMap_(rows[0], {
    class: ['class', 'lop', 'nhom_lop'],
    level: ['level', 'cap_do', 'trinh_do'],
    active: ['active', 'hien_thi', 'kich_hoat']
  });
  if (colMap.class < 0) colMap.class = 0;
  if (colMap.level < 0) colMap.level = 1;
  if (colMap.active < 0) colMap.active = 2;

  var list = [];
  for (var i = 1; i < rows.length; i++) {
    if (!isActive_(simpleCol_(rows[i], colMap, 'active', true))) continue;
    list.push({
      class: String(simpleCol_(rows[i], colMap, 'class', '')).trim(),
      level: String(simpleCol_(rows[i], colMap, 'level', '')).trim()
    });
  }

  return list;
}

function getClassLevelFilters() {
  try {
    return { success: true, filters: readClassLevelFilters_() };
  } catch (err) {
    return { success: false, message: err.message, filters: [] };
  }
}

function normalizeFilter_(value) {
  var s = String(value || '').trim();
  if (!s || s === 'Tất cả') return '';
  return s;
}

function readCoursesFromCatalog_(classFilter, levelFilter) {
  var rows = getCachedSheetRows_(CONFIG.COURSES_SHEET_NAME, true);
  if (rows.length < 2) return null;

  var colMap = buildSimpleColumnMap_(rows[0], {
    class: ['class', 'lop', 'nhom_lop'],
    level: ['level', 'cap_do', 'trinh_do'],
    course: ['course', 'khoa_hoc', 'book', 'sach'],
    active: ['active', 'hien_thi', 'kich_hoat'],
    ebook_file_id: ['ebook_file_id', 'ebook', 'pdf_id', 'sach_pdf'],
    ebook_page_start: ['ebook_page_start', 'trang_dau', 'page_start'],
    ebook_page_end: ['ebook_page_end', 'trang_cuoi', 'page_end']
  });
  if (colMap.class < 0) colMap.class = 0;
  if (colMap.level < 0) colMap.level = 1;
  if (colMap.course < 0) colMap.course = 2;
  if (colMap.active < 0) colMap.active = 3;

  // Nếu không có cột course hợp lệ thì bỏ qua catalog, fallback sang dữ liệu câu hỏi.
  if (colMap.course < 0) return null;

  classFilter = normalizeFilter_(classFilter);
  levelFilter = normalizeFilter_(levelFilter);

  var list = [];
  for (var i = 1; i < rows.length; i++) {
    if (!isActive_(simpleCol_(rows[i], colMap, 'active', true))) continue;

    var rowClass = String(simpleCol_(rows[i], colMap, 'class', '')).trim();
    var rowLevel = String(simpleCol_(rows[i], colMap, 'level', '')).trim();
    var course = String(simpleCol_(rows[i], colMap, 'course', '')).trim();
    if (!course) continue;

    if (classFilter && rowClass !== classFilter) continue;
    if (levelFilter && rowLevel !== levelFilter) continue;

    var ebookFileId = resolveEbookFileId_(
      rowClass,
      rowLevel,
      simpleCol_(rows[i], colMap, 'ebook_file_id', '')
    );
    var ebookPageStart = parseEbookPage_(simpleCol_(rows[i], colMap, 'ebook_page_start', ''), 0);
    var ebookPageEnd = parseEbookPage_(simpleCol_(rows[i], colMap, 'ebook_page_end', ''), 0);

    list.push({
      id: course,
      name: course,
      class: rowClass,
      level: rowLevel,
      ebookFileId: ebookFileId,
      ebookPageStart: ebookPageStart,
      ebookPageEnd: ebookPageEnd
    });
  }

  return list;
}

function getGrammarQuestionSheet_() {
  var sheet = getSheetByNameCached_(CONFIG.GRAMMAR_SHEET_NAME);
  if (!sheet) {
    throw new Error('Không tìm thấy sheet "' + CONFIG.GRAMMAR_SHEET_NAME + '". Chạy setupQuestionDatabase() trước.');
  }
  return sheet;
}

function getQuizQuestionSheet_() {
  var sheet = getSheetByNameCached_(CONFIG.QUIZ_SHEET_NAME);
  if (!sheet) {
    throw new Error('Không tìm thấy sheet "' + CONFIG.QUIZ_SHEET_NAME + '". Chạy setupQuestionDatabase() trước.');
  }
  return sheet;
}

function isActive_(value) {
  if (value === '' || value === null || value === undefined) return true;
  var s = String(value).trim().toLowerCase();
  return s !== 'false' && s !== '0' && s !== 'no' && s !== 'không';
}

function splitPipe_(value) {
  return String(value || '')
    .split('|')
    .map(function (part) { return part.trim(); })
    .filter(function (part) { return part.length > 0; });
}

function matchCourse_(rowCourse, course) {
  var rc = String(rowCourse || '').trim();
  course = String(course || '').trim();
  if (!course) return false;
  if (!rc) return false;
  if (rc === '*') return true;
  if (rc === course) return true;
  return normalizeCourseKey_(rc) === normalizeCourseKey_(course);
}

/** Level trống trên sheet = dùng cho mọi level. Level trên URL trống = lấy mọi câu của course. */
function matchLevel_(rowLevel, level) {
  var rl = String(rowLevel || '').trim();
  level = String(level || '').trim();
  if (!level) return true;
  if (!rl || rl === '*') return true;
  return rl.toLowerCase() === level.toLowerCase();
}

function progressCourseKey_(course, level) {
  course = String(course || '').trim();
  level = String(level || '').trim();
  if (!level) return course;
  return course + '::' + level;
}

/** Bỏ tiền tố sách cũ để khớp course sau khi gỡ cột book. */
function normalizeCourseKey_(value) {
  return String(value || '').trim()
    .replace(/^sách\s+bài\s+tập\s*[–—-]\s*/i, '')
    .toLowerCase();
}

function getQuizTypeLabel_(type) {
  var labels = {
    word_form: 'Word form',
    fill_blank: 'Điền từ',
    multiple_choice: 'Chọn đáp án'
  };
  return labels[String(type || '').trim()] || String(type || '').trim();
}

function buildGrammarColumnMap_(headerRow) {
  var map = {
    id: 0, course: -1, level: -1, source: -1, prefix: -1,
    suffix: -1, hint: -1, answers: -1, active: -1
  };

  for (var c = 0; c < headerRow.length; c++) {
    var h = normalizeHeader_(headerRow[c]);
    if (h === 'id') map.id = c;
    else if ((h.indexOf('course') >= 0 || h.indexOf('khoa_hoc') >= 0 || h.indexOf('book') >= 0) && map.course < 0) map.course = c;
    else if ((h === 'level' || h === 'cap_do' || h === 'trinh_do') && map.level < 0) map.level = c;
    else if (h === 'source') map.source = c;
    else if (h === 'prefix') map.prefix = c;
    else if (h === 'suffix' || h === 'surfix') map.suffix = c;
    else if (h === 'hint') map.hint = c;
    else if (h === 'answers' || h === 'answer' || h.indexOf('dap_an') >= 0) map.answers = c;
    else if (h === 'active' || h === 'hien_thi' || h === 'kich_hoat') map.active = c;
  }

  return map;
}

function grammarCol_(row, map, key, fallback) {
  var idx = map[key];
  if (idx < 0) return fallback !== undefined ? fallback : '';
  return row[idx];
}

function readGrammarQuestions_(course, level) {
  var rows = getCachedSheetRows_(CONFIG.GRAMMAR_SHEET_NAME);
  if (rows.length < 2) return [];

  var colMap = buildGrammarColumnMap_(rows[0]);
  var questions = [];

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (!isActive_(grammarCol_(row, colMap, 'active', true))) continue;

    var rowCourse = String(grammarCol_(row, colMap, 'course', '')).trim();
    if (!matchCourse_(rowCourse, course)) continue;
    var rowLevel = String(grammarCol_(row, colMap, 'level', '')).trim();
    if (!matchLevel_(rowLevel, level)) continue;

    var answers = splitPipe_(grammarCol_(row, colMap, 'answers', ''));
    if (!answers.length) continue;

    questions.push({
      id: grammarCol_(row, colMap, 'id', i) || i,
      source: String(grammarCol_(row, colMap, 'source', '')),
      prefix: String(grammarCol_(row, colMap, 'prefix', '')),
      suffix: String(grammarCol_(row, colMap, 'suffix', '')),
      hint: String(grammarCol_(row, colMap, 'hint', '')),
      level: rowLevel,
      answers: answers
    });
  }

  return questions;
}

function normalizeHeader_(value) {
  return String(value || '').trim().toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s*\/\s*/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeQuizType_(value) {
  var s = String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (s === 'trac_nghiem' || s === 'multiplechoice') return 'multiple_choice';
  if (s === 'dien_tu' || s === 'fillblank') return 'fill_blank';
  if (s === 'wordform') return 'word_form';
  return s;
}

function buildQuizColumnMap_(headerRow) {
  var map = {
    id: 0, course: -1, level: -1, type: -1, type_label: -1, question: -1,
    option_a: -1, option_b: -1, option_c: -1, option_d: -1,
    answer: -1, accept: -1, active: -1
  };

  for (var c = 0; c < headerRow.length; c++) {
    var h = normalizeHeader_(headerRow[c]);
    if (h === 'id') map.id = c;
    else if ((h.indexOf('course') >= 0 || h.indexOf('khoa_hoc') >= 0 || h.indexOf('book') >= 0) && map.course < 0) map.course = c;
    else if ((h === 'level' || h === 'cap_do' || h === 'trinh_do') && map.level < 0) map.level = c;
    else if (h === 'type') map.type = c;
    else if (h === 'type_label') map.type_label = c;
    else if (h === 'question' || h === 'cau_hoi') map.question = c;
    else if (h === 'option_a' || (h.indexOf('option_a') >= 0 && map.option_a < 0)) map.option_a = c;
    else if (h === 'option_b') map.option_b = c;
    else if (h === 'option_c') map.option_c = c;
    else if (h === 'option_d' || (h.indexOf('option_d') >= 0 && map.option_d < 0)) map.option_d = c;
    else if ((h === 'options' || h.indexOf('option') >= 0) && map.option_a < 0) map.option_a = c;
    else if (h === 'answer' || h === 'dap_an') map.answer = c;
    else if (h === 'accept') map.accept = c;
    else if (h === 'active' || h === 'hien_thi' || h === 'kich_hoat') map.active = c;
  }

  return map;
}

function quizCol_(row, map, key, fallback) {
  var idx = map[key];
  if (idx < 0) return fallback !== undefined ? fallback : '';
  return row[idx];
}

function readQuizOptions_(row, map) {
  var keys = ['option_a', 'option_b', 'option_c', 'option_d'];
  var options = [];

  for (var k = 0; k < keys.length; k++) {
    var idx = map[keys[k]];
    if (idx < 0) continue;
    var val = String(row[idx] || '').trim();
    if (!val) continue;
    if (val.indexOf('|') >= 0) return splitPipe_(val);
    options.push(val);
  }

  return options;
}

function readQuizQuestions_(course, level) {
  var rows = getCachedSheetRows_(CONFIG.QUIZ_SHEET_NAME);
  if (rows.length < 2) return [];

  var colMap = buildQuizColumnMap_(rows[0]);
  var questions = [];

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (!isActive_(quizCol_(row, colMap, 'active', true))) continue;

    var rowCourse = String(quizCol_(row, colMap, 'course', '')).trim();
    if (!matchCourse_(rowCourse, course)) continue;
    var rowLevel = String(quizCol_(row, colMap, 'level', '')).trim();
    if (!matchLevel_(rowLevel, level)) continue;

    var type = normalizeQuizType_(quizCol_(row, colMap, 'type', ''));
    var question = String(quizCol_(row, colMap, 'question', '')).trim();
    var answer = String(quizCol_(row, colMap, 'answer', '')).trim();
    if (!type || !question || !answer) continue;

    var item = {
      id: quizCol_(row, colMap, 'id', i) || i,
      type: type,
      typeLabel: String(quizCol_(row, colMap, 'type_label', '')).trim() || getQuizTypeLabel_(type),
      question: question,
      answer: answer,
      level: rowLevel
    };

    if (type === 'fill_blank' || type === 'word_form') {
      item.fillMode = true;
      var accept = splitPipe_(quizCol_(row, colMap, 'accept', ''));
      if (!accept.length && type === 'word_form') {
        accept = splitPipe_(quizCol_(row, colMap, 'answer', ''));
      }
      item.accept = accept.length ? accept : [answer];
    } else {
      var options = readQuizOptions_(row, colMap);
      if (!options.length) continue;
      item.options = options;
    }

    questions.push(item);
  }

  return questions;
}

function getPronunciationQuestionSheet_() {
  var sheet = getSheetByNameCached_(CONFIG.PRONUNCIATION_SHEET_NAME);
  if (!sheet) {
    throw new Error('Không tìm thấy sheet "' + CONFIG.PRONUNCIATION_SHEET_NAME + '". Chạy setupQuestionDatabase() trước.');
  }
  return sheet;
}

function buildPronunciationColumnMap_(headerRow) {
  return buildSimpleColumnMap_(headerRow, {
    id: 'id',
    course: ['course', 'khoa_hoc', 'book'],
    mode: ['mode', 'che_do'],
    prompt: ['prompt', 'goi_y', 'mo_ta'],
    target_text: ['target_text', 'target', 'van_ban_muc_tieu', 'noi_dung'],
    target_ipa: ['target_ipa', 'ipa'],
    reference_audio_url: ['reference_audio_url', 'audio_url', 'file_am_thanh'],
    hint: ['hint', 'goi_y'],
    active: ['active', 'hien_thi', 'kich_hoat']
  });
}

function normalizePronunciationMode_(value) {
  var s = String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (s === 'luyen_am' || s === 'phoneme') return 'phoneme';
  if (s === 'luyen_cau' || s === 'sentence') return 'sentence';
  if (s === 'trong_am' || s === 'stress') return 'stress';
  return s || 'phoneme';
}

function getPronunciationModeLabel_(mode) {
  var labels = {
    phoneme: 'Luyện âm',
    sentence: 'Luyện câu',
    stress: 'Trọng âm'
  };
  return labels[String(mode || '').trim()] || 'Luyện âm';
}

function readPronunciationQuestions_(course) {
  var rows = getCachedSheetRows_(CONFIG.PRONUNCIATION_SHEET_NAME);
  if (rows.length < 2) return [];

  var colMap = buildPronunciationColumnMap_(rows[0]);
  var questions = [];
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (!isActive_(simpleCol_(row, colMap, 'active', true))) continue;
    var rowCourse = String(simpleCol_(row, colMap, 'course', '')).trim();
    if (!matchCourse_(rowCourse, course)) continue;

    var mode = normalizePronunciationMode_(simpleCol_(row, colMap, 'mode', 'phoneme'));
    var prompt = String(simpleCol_(row, colMap, 'prompt', '')).trim();
    var targetText = String(simpleCol_(row, colMap, 'target_text', '')).trim();
    if (!targetText) continue;

    questions.push({
      id: simpleCol_(row, colMap, 'id', i) || i,
      mode: mode,
      modeLabel: getPronunciationModeLabel_(mode),
      prompt: prompt || 'Nghe và đọc lại mẫu bên dưới',
      targetText: targetText,
      targetIpa: String(simpleCol_(row, colMap, 'target_ipa', '')).trim(),
      referenceAudioUrl: String(simpleCol_(row, colMap, 'reference_audio_url', '')).trim(),
      hint: String(simpleCol_(row, colMap, 'hint', '')).trim()
    });
  }
  return questions;
}

function getGrammarQuestions(course, level) {
  course = String(course || '').trim();
  level = String(level || '').trim();

  try {
    var questions = readGrammarQuestions_(course, level);
    return { success: true, course: course, level: level, questions: questions, total: questions.length };
  } catch (err) {
    return { success: false, message: err.message, course: course, level: level, questions: [], total: 0 };
  }
}

function getQuizQuestions(course, level) {
  course = String(course || '').trim();
  level = String(level || '').trim();

  try {
    var questions = readQuizQuestions_(course, level);
    return { success: true, course: course, level: level, questions: questions, total: questions.length };
  } catch (err) {
    return { success: false, message: err.message, course: course, level: level, questions: [], total: 0 };
  }
}

function getPronunciationQuestions(course) {
  course = String(course || '').trim();

  try {
    var questions = readPronunciationQuestions_(course);
    return { success: true, course: course, questions: questions, total: questions.length };
  } catch (err) {
    return { success: false, message: err.message, course: course, questions: [], total: 0 };
  }
}

function countGrammarQuestions_(course, level) {
  var rows = getCachedSheetRows_(CONFIG.GRAMMAR_SHEET_NAME);
  if (rows.length < 2) return 0;

  var colMap = buildGrammarColumnMap_(rows[0]);
  var count = 0;

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (!isActive_(grammarCol_(row, colMap, 'active', true))) continue;
    var rowCourse = String(grammarCol_(row, colMap, 'course', '')).trim();
    if (!matchCourse_(rowCourse, course)) continue;
    if (!matchLevel_(String(grammarCol_(row, colMap, 'level', '')).trim(), level)) continue;
    if (!splitPipe_(grammarCol_(row, colMap, 'answers', '')).length) continue;
    count++;
  }
  return count;
}

function countQuizQuestions_(course, level) {
  var rows = getCachedSheetRows_(CONFIG.QUIZ_SHEET_NAME);
  if (rows.length < 2) return 0;

  var colMap = buildQuizColumnMap_(rows[0]);
  var count = 0;

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (!isActive_(quizCol_(row, colMap, 'active', true))) continue;
    var rowCourse = String(quizCol_(row, colMap, 'course', '')).trim();
    if (!matchCourse_(rowCourse, course)) continue;
    if (!matchLevel_(String(quizCol_(row, colMap, 'level', '')).trim(), level)) continue;

    var type = normalizeQuizType_(quizCol_(row, colMap, 'type', ''));
    var question = String(quizCol_(row, colMap, 'question', '')).trim();
    var answer = String(quizCol_(row, colMap, 'answer', '')).trim();
    if (!type || !question || !answer) continue;

    if (type !== 'fill_blank' && type !== 'word_form') {
      if (!readQuizOptions_(row, colMap).length) continue;
    }
    count++;
  }
  return count;
}

function countPronunciationQuestions_(course) {
  var rows = getCachedSheetRows_(CONFIG.PRONUNCIATION_SHEET_NAME);
  if (rows.length < 2) return 0;

  var colMap = buildPronunciationColumnMap_(rows[0]);
  var count = 0;
  for (var i = 1; i < rows.length; i++) {
    if (!isActive_(simpleCol_(rows[i], colMap, 'active', true))) continue;
    var rowCourse = String(simpleCol_(rows[i], colMap, 'course', '')).trim();
    if (!matchCourse_(rowCourse, course)) continue;
    if (!String(simpleCol_(rows[i], colMap, 'target_text', '')).trim()) continue;
    count++;
  }
  return count;
}

function buildScrambleColumnMap_(headerRow) {
  return buildSimpleColumnMap_(headerRow, {
    id: 'id',
    course: ['course', 'khoa_hoc', 'book'],
    level: ['level', 'cap_do', 'trinh_do'],
    word: ['word', 'tu', 'answer', 'dap_an', 'target'],
    hint: ['hint', 'goi_y', 'mo_ta'],
    image: ['image', 'hinh', 'anh', 'picture'],
    active: ['active', 'hien_thi', 'kich_hoat']
  });
}

function normalizeScrambleWord_(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function readScrambleQuestions_(course, level) {
  var rows = getCachedSheetRows_(CONFIG.SCRAMBLE_SHEET_NAME, true);
  if (rows.length < 2) return [];

  var colMap = buildScrambleColumnMap_(rows[0]);
  var questions = [];
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (!isActive_(simpleCol_(row, colMap, 'active', true))) continue;
    if (!matchCourse_(String(simpleCol_(row, colMap, 'course', '')).trim(), course)) continue;
    if (!matchLevel_(String(simpleCol_(row, colMap, 'level', '')).trim(), level)) continue;

    var word = normalizeScrambleWord_(simpleCol_(row, colMap, 'word', ''));
    if (!word) continue;

    questions.push({
      id: simpleCol_(row, colMap, 'id', i) || i,
      word: word,
      hint: String(simpleCol_(row, colMap, 'hint', '')).trim(),
      image: toDriveImageUrl_(simpleCol_(row, colMap, 'image', ''))
    });
  }
  return questions;
}

function countScrambleQuestions_(course, level) {
  return readScrambleQuestions_(course, level).length;
}

function buildWordMatchColumnMap_(headerRow) {
  return buildSimpleColumnMap_(headerRow, {
    id: 'id',
    course: ['course', 'khoa_hoc', 'book'],
    level: ['level', 'cap_do', 'trinh_do'],
    word: ['word', 'tu', 'answer', 'dap_an', 'target'],
    image: ['image', 'hinh', 'anh', 'picture'],
    hint: ['hint', 'goi_y', 'mo_ta'],
    active: ['active', 'hien_thi', 'kich_hoat']
  });
}

function normalizeLevelKey_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ');
}

function matchLevelLoose_(rowLevel, level) {
  if (matchLevel_(rowLevel, level)) return true;
  var rl = normalizeLevelKey_(rowLevel);
  var lv = normalizeLevelKey_(level);
  if (!lv) return true;
  if (!rl || rl === '*') return true;
  return rl === lv;
}

function readWordMatchQuestions_(course, level, options) {
  options = options || {};
  var rows = getCachedSheetRows_(CONFIG.WORD_MATCH_SHEET_NAME, true);
  if (rows.length < 2) return [];

  var colMap = buildWordMatchColumnMap_(rows[0]);
  if (colMap.word < 0) colMap.word = 3;
  if (colMap.image < 0) colMap.image = 4;
  if (colMap.hint < 0) colMap.hint = 5;
  if (colMap.active < 0) colMap.active = 6;

  var questions = [];
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (!isActive_(simpleCol_(row, colMap, 'active', true))) continue;
    if (!matchCourse_(String(simpleCol_(row, colMap, 'course', '')).trim(), course)) continue;
    if (!matchLevelLoose_(String(simpleCol_(row, colMap, 'level', '')).trim(), level)) continue;

    var word = normalizeScrambleWord_(simpleCol_(row, colMap, 'word', ''));
    if (!word) continue;

    var image = toDriveImageUrl_(simpleCol_(row, colMap, 'image', ''));
    if (!image && options.requireImage) continue;

    questions.push({
      id: simpleCol_(row, colMap, 'id', i) || i,
      word: word,
      image: image,
      hint: String(simpleCol_(row, colMap, 'hint', '')).trim()
    });
  }

  /* Sheet cũ: nếu level URL không khớp, thử lại chỉ theo course. */
  if (!questions.length && level) {
    return readWordMatchQuestions_(course, '', options);
  }
  return questions;
}

function countWordMatchQuestions_(course, level) {
  return readWordMatchQuestions_(course, level, { requireImage: false }).length;
}

/** Chạy trong Apps Script Editor: diagnoseWordMatchLoad('Unit 1', 'Lớp 8') */
function diagnoseWordMatchLoad(course, level) {
  course = String(course || 'Unit 1').trim();
  level = String(level || '').trim();
  refreshQuestionCaches();

  var rows = getCachedSheetRows_(CONFIG.WORD_MATCH_SHEET_NAME, true);
  var colMap = rows.length ? buildWordMatchColumnMap_(rows[0]) : {};

  return {
    spreadsheetId: CONFIG.SPREADSHEET_ID,
    sheet: CONFIG.WORD_MATCH_SHEET_NAME,
    course: course,
    level: level,
    rowCount: Math.max(rows.length - 1, 0),
    headers: rows.length ? rows[0] : [],
    columnMap: colMap,
    matched: countWordMatchQuestions_(course, level),
    matchedAnyLevel: readWordMatchQuestions_(course, '', { requireImage: false }).length,
    hint: 'Nếu matched = 0: kiểm tra cột course/level trùng khóa (vd: Unit 1 + Lớp 8), word có dữ liệu, active = TRUE. Chạy refreshQuestionCaches() sau khi sửa sheet.'
  };
}

function getScrambleQuestions(course, level) {
  course = String(course || '').trim();
  level = String(level || '').trim();

  try {
    var questions = readScrambleQuestions_(course, level);
    return { success: true, course: course, level: level, questions: questions, total: questions.length };
  } catch (err) {
    return { success: false, message: err.message, course: course, level: level, questions: [], total: 0 };
  }
}

function getQuestionCounts(course, level) {
  course = String(course || '').trim();
  level = String(level || '').trim();

  try {
    return {
      success: true,
      grammar: countGrammarQuestions_(course, level),
      quiz: countQuizQuestions_(course, level),
      pronunciation: countPronunciationQuestions_(course),
      scramble: countScrambleQuestions_(course, level),
      word_match: countWordMatchQuestions_(course, level)
    };
  } catch (err) {
    return {
      success: false,
      message: err.message,
      grammar: CONFIG.GAME_TOTALS.grammar,
      quiz: CONFIG.GAME_TOTALS.quiz,
      pronunciation: CONFIG.GAME_TOTALS.pronunciation,
      scramble: CONFIG.GAME_TOTALS.scramble,
      word_match: CONFIG.GAME_TOTALS.word_match
    };
  }
}

function collectCoursesFromRows_(rows, colMap, colFn) {
  var courses = {};
  for (var i = 1; i < rows.length; i++) {
    if (!isActive_(colFn(rows[i], colMap, 'active', true))) continue;
    var course = String(colFn(rows[i], colMap, 'course', '')).trim();
    if (course && course !== '*') courses[course] = true;
  }
  return courses;
}

function getCourseList(classFilter, levelFilter) {
  try {
    var catalogCourses = readCoursesFromCatalog_(classFilter, levelFilter);
    if (catalogCourses && catalogCourses.length) {
      return {
        success: true,
        courses: catalogCourses,
        classFilter: normalizeFilter_(classFilter),
        levelFilter: normalizeFilter_(levelFilter)
      };
    }

    var courses = {};

    var grammarRows = getCachedSheetRows_(CONFIG.GRAMMAR_SHEET_NAME);
    if (grammarRows.length >= 2) {
      var grammarMap = buildGrammarColumnMap_(grammarRows[0]);
      var grammarCourses = collectCoursesFromRows_(grammarRows, grammarMap, grammarCol_);
      for (var g in grammarCourses) {
        if (grammarCourses.hasOwnProperty(g)) courses[g] = true;
      }
    }

    var quizRows = getCachedSheetRows_(CONFIG.QUIZ_SHEET_NAME);
    if (quizRows.length >= 2) {
      var quizMap = buildQuizColumnMap_(quizRows[0]);
      var quizCourses = collectCoursesFromRows_(quizRows, quizMap, quizCol_);
      for (var q in quizCourses) {
        if (quizCourses.hasOwnProperty(q)) courses[q] = true;
      }
    }

    var list = Object.keys(courses).sort().map(function (name) {
      return {
        id: name,
        name: name
      };
    });

    return { success: true, courses: list };
  } catch (err) {
    return { success: false, message: err.message, courses: [] };
  }
}

function getCurrentUsername_() {
  var props = PropertiesService.getUserProperties();
  if (props.getProperty('loggedIn') !== 'true') return '';
  return String(props.getProperty('username') || '').trim();
}

function getProgressSheet_(createIfMissing) {
  var ss = getSpreadsheet_();
  var sheet = getSheetByNameCached_(CONFIG.PROGRESS_SHEET_NAME);
  if (!sheet && createIfMissing) {
    sheet = ss.insertSheet(CONFIG.PROGRESS_SHEET_NAME);
    sheet.appendRow(['username', 'course', 'game', 'statuses', 'updated_at']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#e8eef8');
    sheet.setFrozenRows(1);
    _runtime.sheets[String(CONFIG.PROGRESS_SHEET_NAME).trim().toLowerCase()] = sheet;
  }
  if (!sheet) {
    throw new Error('Không tìm thấy sheet "' + CONFIG.PROGRESS_SHEET_NAME + '". Chạy setupDatabase() trước.');
  }
  return sheet;
}

function findProgressRow_(sheet, username, course, game, prefetchedRows) {
  var data = prefetchedRows || getCachedSheetRows_(CONFIG.PROGRESS_SHEET_NAME, true);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0] || '').trim() === username &&
        String(data[i][1] || '').trim() === course &&
        String(data[i][2] || '').trim() === game) {
      return i + 1;
    }
  }
  return -1;
}

function findUserCourseProgress_(rows, username, course, level) {
  var progressKey = progressCourseKey_(course, level);
  var result = { grammar: '', quiz: '' };
  if (!rows || rows.length < 2) return result;

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || '').trim() !== username) continue;
    if (String(rows[i][1] || '').trim() !== progressKey) continue;
    var game = String(rows[i][2] || '').trim();
    if (game === 'grammar') result.grammar = rows[i][3];
    else if (game === 'quiz') result.quiz = rows[i][3];
  }

  /* Sheet cũ chưa có khóa level: fallback sang course thuần nếu chưa có bản ghi level */
  if (level && !result.grammar && !result.quiz) {
    for (var j = 1; j < rows.length; j++) {
      if (String(rows[j][0] || '').trim() !== username) continue;
      if (String(rows[j][1] || '').trim() !== course) continue;
      var g = String(rows[j][2] || '').trim();
      if (g === 'grammar') result.grammar = rows[j][3];
      else if (g === 'quiz') result.quiz = rows[j][3];
    }
  }
  return result;
}

function sumCourseScoreFromRows_(rows, username, course) {
  var total = 0;
  if (!rows || rows.length < 2) return total;

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || '').trim() === username &&
        String(rows[i][2] || '').trim() === course) {
      total += Number(rows[i][7]) || 0;
    }
  }
  return total;
}

function sumGameScoreFromRows_(rows, username, course, game) {
  var total = 0;
  if (!rows || rows.length < 2) return total;

  username = String(username || '').trim();
  course = String(course || '').trim();
  game = String(game || '').trim();

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || '').trim() === username &&
        String(rows[i][2] || '').trim() === course &&
        String(rows[i][3] || '').trim() === game) {
      total += Number(rows[i][7]) || 0;
    }
  }
  return total;
}

function countExerciseItemTotal_(exercises) {
  if (!exercises || !exercises.length) return 0;
  var total = 0;
  for (var i = 0; i < exercises.length; i++) {
    var ex = exercises[i];
    total += (ex.items && ex.items.length) ? ex.items.length : 1;
  }
  return total;
}

function buildGameScoreMeta_(course, game, unitTotal) {
  unitTotal = Number(unitTotal) || 0;
  var meta = {
    sessionScore: 0,
    maxScore: unitTotal * CONFIG.SCORING.CORRECT_MAX,
    unitTotal: unitTotal
  };
  var username = getCurrentUsername_();
  if (username) {
    var scoreRows = getCachedSheetRows_(CONFIG.SCORE_LOG_SHEET_NAME, true);
    meta.sessionScore = sumGameScoreFromRows_(scoreRows, username, course, game);
  }
  return meta;
}

function emptyStatuses_(total) {
  var arr = [];
  for (var i = 0; i < total; i++) arr.push(null);
  return arr;
}

function parseStatuses_(jsonStr, total) {
  try {
    var parsed = JSON.parse(String(jsonStr || '[]'));
    if (!Array.isArray(parsed)) return emptyStatuses_(total);
    var arr = parsed.slice(0, total);
    while (arr.length < total) arr.push(null);
    return arr;
  } catch (err) {
    return emptyStatuses_(total);
  }
}

/** Ưu tiên: correct > wrong > chưa chơi — gộp tiến độ nhiều lần chơi theo từng câu. */
function pickStatus_(a, b) {
  if (a === 'correct' || b === 'correct') return 'correct';
  if (a === 'wrong' || b === 'wrong') return 'wrong';
  return null;
}

function mergeStatuses_(existing, incoming, total) {
  total = Number(total) || Math.max(existing.length, incoming.length, 0);
  var merged = emptyStatuses_(total);
  for (var i = 0; i < total; i++) {
    var e = i < existing.length ? existing[i] : null;
    var n = i < incoming.length ? incoming[i] : null;
    merged[i] = pickStatus_(e, n);
  }
  return merged;
}

function getGameProgress(course, game, totalQuestions, prefetchedProgressRows, level) {
  totalQuestions = Number(totalQuestions) || CONFIG.GAME_TOTALS[game] || 0;
  course = String(course || '').trim();
  game = String(game || '').trim();
  var progressKey = progressCourseKey_(course, level);

  var username = getCurrentUsername_();
  if (!username) {
    return {
      success: false,
      loggedIn: false,
      message: 'Chưa đăng nhập',
      statuses: emptyStatuses_(totalQuestions)
    };
  }

  try {
    var progressRows = prefetchedProgressRows || getCachedSheetRows_(CONFIG.PROGRESS_SHEET_NAME, true);
    var rowNum = findProgressRow_(null, username, progressKey, game, progressRows);
    if (rowNum < 0 && progressKey !== course) {
      rowNum = findProgressRow_(null, username, course, game, progressRows);
    }
    if (rowNum > 0) {
      var statusesJson = progressRows[rowNum - 1][3];
      return {
        success: true,
        loggedIn: true,
        username: username,
        statuses: parseStatuses_(statusesJson, totalQuestions)
      };
    }
    return {
      success: true,
      loggedIn: true,
      username: username,
      statuses: emptyStatuses_(totalQuestions)
    };
  } catch (err) {
    return {
      success: false,
      loggedIn: true,
      message: err.message,
      statuses: emptyStatuses_(totalQuestions)
    };
  }
}

function saveGameProgress(course, game, statuses, reset, level) {
  course = String(course || '').trim();
  game = String(game || '').trim();
  reset = reset === true || reset === 'true' || reset === 1;
  var progressKey = progressCourseKey_(course, level);

  var username = getCurrentUsername_();
  if (!username) {
    return { success: false, loggedIn: false, message: 'Chưa đăng nhập' };
  }
  if (!Array.isArray(statuses)) {
    return { success: false, message: 'Dữ liệu statuses không hợp lệ' };
  }

  try {
    var sheet = getProgressSheet_(true);
    var now = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
    var total = statuses.length;
    var rowNum = findProgressRow_(sheet, username, progressKey, game);
    var merged = statuses;

    if (!reset && rowNum > 0) {
      var existingJson = sheet.getRange(rowNum, 4).getValue();
      var existing = parseStatuses_(existingJson, total);
      merged = mergeStatuses_(existing, statuses, total);
    }

    var statusesJson = JSON.stringify(merged);
    if (rowNum > 0) {
      sheet.getRange(rowNum, 4, 1, 2).setValues([[statusesJson, now]]);
    } else {
      sheet.appendRow([username, progressKey, game, statusesJson, now]);
    }

    invalidateSheetCache_(CONFIG.PROGRESS_SHEET_NAME);

    return { success: true, loggedIn: true, username: username, statuses: merged };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function getCourseProgress(course, level) {
  course = String(course || '').trim();
  level = String(level || '').trim();

  var grammarTotal = countGrammarQuestions_(course, level) || CONFIG.GAME_TOTALS.grammar;
  var quizTotal = countQuizQuestions_(course, level) || CONFIG.GAME_TOTALS.quiz;
  var pronunciationTotal = countPronunciationQuestions_(course) || CONFIG.GAME_TOTALS.pronunciation;
  var progressRows = getCachedSheetRows_(CONFIG.PROGRESS_SHEET_NAME, true);
  var grammar = getGameProgress(course, 'grammar', grammarTotal, progressRows, level);
  var quiz = getGameProgress(course, 'quiz', quizTotal, progressRows, level);
  var pronunciation = getGameProgress(course, 'pronunciation', pronunciationTotal, progressRows);

  return {
    success: grammar.success && quiz.success && pronunciation.success,
    loggedIn: grammar.loggedIn,
    username: grammar.username || quiz.username || pronunciation.username || '',
    grammar: grammar.statuses,
    quiz: quiz.statuses,
    pronunciation: pronunciation.statuses,
    grammarTotal: grammarTotal,
    quizTotal: quizTotal,
    pronunciationTotal: pronunciationTotal,
    level: level
  };
}

/** Một request: tiến độ + điểm + số câu (trang chi tiết khóa học). */
function getCourseDetail(course, level) {
  course = String(course || '').trim();
  level = String(level || '').trim();

  var grammarTotal = countGrammarQuestions_(course, level) || CONFIG.GAME_TOTALS.grammar;
  var quizTotal = countQuizQuestions_(course, level) || CONFIG.GAME_TOTALS.quiz;
  var pronunciationTotal = countPronunciationQuestions_(course) || CONFIG.GAME_TOTALS.pronunciation;
  var scrambleTotal = countScrambleQuestions_(course, level) || CONFIG.GAME_TOTALS.scramble;
  var wordMatchTotal = countWordMatchQuestions_(course, level) || CONFIG.GAME_TOTALS.word_match;
  var lookAndWriteTotal = countLookAndWriteExercises_(course) || CONFIG.GAME_TOTALS.look_and_write;
  var maxScore = (grammarTotal + quizTotal + pronunciationTotal + scrambleTotal + wordMatchTotal + lookAndWriteTotal) * CONFIG.SCORING.CORRECT_MAX;
  if (maxScore < 1) {
    maxScore = (CONFIG.GAME_TOTALS.grammar + CONFIG.GAME_TOTALS.quiz + CONFIG.GAME_TOTALS.pronunciation + CONFIG.GAME_TOTALS.scramble + CONFIG.GAME_TOTALS.word_match + CONFIG.GAME_TOTALS.look_and_write) * CONFIG.SCORING.CORRECT_MAX;
  }

  var username = getCurrentUsername_();
  if (!username) {
    return {
      success: true,
      loggedIn: false,
      level: level,
      grammar: emptyStatuses_(grammarTotal),
      quiz: emptyStatuses_(quizTotal),
      pronunciation: emptyStatuses_(pronunciationTotal),
      scramble: emptyStatuses_(scrambleTotal),
      word_match: emptyStatuses_(wordMatchTotal),
      look_and_write: emptyStatuses_(lookAndWriteTotal),
      grammarTotal: grammarTotal,
      quizTotal: quizTotal,
      pronunciationTotal: pronunciationTotal,
      scrambleTotal: scrambleTotal,
      wordMatchTotal: wordMatchTotal,
      lookAndWriteTotal: lookAndWriteTotal,
      score: { total: 0, max: maxScore }
    };
  }

  try {
    var progressRows = getCachedSheetRows_(CONFIG.PROGRESS_SHEET_NAME, true);
    var prog = findUserCourseProgress_(progressRows, username, course, level);
    var scoreRows = getCachedSheetRows_(CONFIG.SCORE_LOG_SHEET_NAME, true);

    return {
      success: true,
      loggedIn: true,
      username: username,
      level: level,
      grammar: parseStatuses_(prog.grammar, grammarTotal),
      quiz: parseStatuses_(prog.quiz, quizTotal),
      pronunciation: getGameProgress(course, 'pronunciation', pronunciationTotal, progressRows).statuses,
      scramble: getGameProgress(course, 'scramble', scrambleTotal, progressRows, level).statuses,
      word_match: getGameProgress(course, 'word_match', wordMatchTotal, progressRows, level).statuses,
      look_and_write: getGameProgress(course, 'look_and_write', lookAndWriteTotal, progressRows).statuses,
      grammarTotal: grammarTotal,
      quizTotal: quizTotal,
      pronunciationTotal: pronunciationTotal,
      scrambleTotal: scrambleTotal,
      wordMatchTotal: wordMatchTotal,
      lookAndWriteTotal: lookAndWriteTotal,
      score: {
        total: sumCourseScoreFromRows_(scoreRows, username, course),
        max: maxScore
      }
    };
  } catch (err) {
    return {
      success: false,
      loggedIn: true,
      message: err.message,
      level: level,
      grammar: emptyStatuses_(grammarTotal),
      quiz: emptyStatuses_(quizTotal),
      pronunciation: emptyStatuses_(pronunciationTotal),
      scramble: emptyStatuses_(scrambleTotal),
      word_match: emptyStatuses_(wordMatchTotal),
      look_and_write: emptyStatuses_(lookAndWriteTotal),
      grammarTotal: grammarTotal,
      quizTotal: quizTotal,
      pronunciationTotal: pronunciationTotal,
      scrambleTotal: scrambleTotal,
      wordMatchTotal: wordMatchTotal,
      lookAndWriteTotal: lookAndWriteTotal,
      score: { total: 0, max: maxScore }
    };
  }
}

/** Một request: câu hỏi + tiến độ (trang ngữ pháp). */
function getGrammarGameData(course, level) {
  course = String(course || '').trim();
  level = String(level || '').trim();

  try {
    var questions = readGrammarQuestions_(course, level);
    var total = questions.length;
    var username = getCurrentUsername_();
    var statuses = emptyStatuses_(total);
    var loggedIn = false;
    var scoreMeta = buildGameScoreMeta_(course, 'grammar', total);

    if (username) {
      loggedIn = true;
      var progressRows = getCachedSheetRows_(CONFIG.PROGRESS_SHEET_NAME, true);
      var prog = findUserCourseProgress_(progressRows, username, course, level);
      statuses = parseStatuses_(prog.grammar, total);
    }

    return {
      success: true,
      course: course,
      level: level,
      questions: questions,
      total: total,
      sessionScore: scoreMeta.sessionScore,
      maxScore: scoreMeta.maxScore,
      loggedIn: loggedIn,
      username: username || '',
      statuses: statuses
    };
  } catch (err) {
    return {
      success: false,
      message: err.message,
      course: course,
      level: level,
      questions: [],
      total: 0,
      sessionScore: 0,
      maxScore: 0,
      loggedIn: false,
      username: '',
      statuses: []
    };
  }
}

/** Một request: câu hỏi + tiến độ (trang trắc nghiệm). */
function getQuizGameData(course, level) {
  course = String(course || '').trim();
  level = String(level || '').trim();

  try {
    var questions = readQuizQuestions_(course, level);
    var total = questions.length;
    var username = getCurrentUsername_();
    var statuses = emptyStatuses_(total);
    var loggedIn = false;
    var scoreMeta = buildGameScoreMeta_(course, 'quiz', total);

    if (username) {
      loggedIn = true;
      var progressRows = getCachedSheetRows_(CONFIG.PROGRESS_SHEET_NAME, true);
      var prog = findUserCourseProgress_(progressRows, username, course, level);
      statuses = parseStatuses_(prog.quiz, total);
    }

    return {
      success: true,
      course: course,
      level: level,
      questions: questions,
      total: total,
      sessionScore: scoreMeta.sessionScore,
      maxScore: scoreMeta.maxScore,
      loggedIn: loggedIn,
      username: username || '',
      statuses: statuses
    };
  } catch (err) {
    return {
      success: false,
      message: err.message,
      course: course,
      level: level,
      questions: [],
      total: 0,
      sessionScore: 0,
      maxScore: 0,
      loggedIn: false,
      username: '',
      statuses: []
    };
  }
}

function getPronunciationGameData(course) {
  course = String(course || '').trim();

  try {
    var questions = readPronunciationQuestions_(course);
    var total = questions.length;
    var username = getCurrentUsername_();
    var statuses = emptyStatuses_(total);
    var loggedIn = false;
    var scoreMeta = buildGameScoreMeta_(course, 'pronunciation', total);

    if (username) {
      loggedIn = true;
      var progress = getGameProgress(course, 'pronunciation', total);
      statuses = progress.statuses;
    }

    return {
      success: true,
      course: course,
      questions: questions,
      total: total,
      sessionScore: scoreMeta.sessionScore,
      maxScore: scoreMeta.maxScore,
      loggedIn: loggedIn,
      username: username || '',
      statuses: statuses
    };
  } catch (err) {
    return {
      success: false,
      message: err.message,
      course: course,
      questions: [],
      total: 0,
      sessionScore: 0,
      maxScore: 0,
      loggedIn: false,
      username: '',
      statuses: []
    };
  }
}

/** Một request: câu hỏi + tiến độ (trang sắp xếp từ vựng). */
function getScrambleGameData(course, level) {
  course = String(course || '').trim();
  level = String(level || '').trim();

  try {
    var questions = readScrambleQuestions_(course, level);
    var total = questions.length;
    var username = getCurrentUsername_();
    var statuses = emptyStatuses_(total);
    var loggedIn = false;
    var scoreMeta = buildGameScoreMeta_(course, 'scramble', total);

    if (username) {
      loggedIn = true;
      var progress = getGameProgress(course, 'scramble', total, null, level);
      statuses = progress.statuses;
    }

    return {
      success: true,
      course: course,
      level: level,
      questions: questions,
      total: total,
      sessionScore: scoreMeta.sessionScore,
      maxScore: scoreMeta.maxScore,
      loggedIn: loggedIn,
      username: username || '',
      statuses: statuses
    };
  } catch (err) {
    return {
      success: false,
      message: err.message,
      course: course,
      level: level,
      questions: [],
      total: 0,
      sessionScore: 0,
      maxScore: 0,
      loggedIn: false,
      username: '',
      statuses: []
    };
  }
}

/** Một request: câu hỏi + tiến độ (trang nối từ với hình ảnh). */
function getWordMatchGameData(course, level) {
  course = String(course || '').trim();
  level = String(level || '').trim();

  try {
    var questions = readWordMatchQuestions_(course, level);
    var total = questions.length;
    var username = getCurrentUsername_();
    var statuses = emptyStatuses_(total);
    var loggedIn = false;
    var scoreMeta = buildGameScoreMeta_(course, 'word_match', total);

    if (username) {
      loggedIn = true;
      var progress = getGameProgress(course, 'word_match', total, null, level);
      statuses = progress.statuses;
    }

    return {
      success: true,
      course: course,
      level: level,
      questions: questions,
      total: total,
      sessionScore: scoreMeta.sessionScore,
      maxScore: scoreMeta.maxScore,
      loggedIn: loggedIn,
      username: username || '',
      statuses: statuses
    };
  } catch (err) {
    return {
      success: false,
      message: err.message,
      course: course,
      level: level,
      questions: [],
      total: 0,
      sessionScore: 0,
      maxScore: 0,
      loggedIn: false,
      username: '',
      statuses: []
    };
  }
}

function buildLookAndWriteColumnMap_(headers) {
  return buildSimpleColumnMap_(headers, {
    ma_bai: ['ma_bai', 'ma bai', 'ma'],
    thu_tu: ['thu_tu', 'thu tu', 'order', 'stt'],
    course: ['ten_khoa_hoc', 'khoa_hoc', 'course', 'ten khoa hoc'],
    title: ['tieu_de_bai', 'tieu de bai', 'tieu de', 'title'],
    instruction: ['huong_dan', 'huong dan', 'instruction'],
    word_bank: ['hop_tu_goi_y', 'hop tu goi y', 'word_bank', 'tu goi y'],
    image: ['link_hinh_anh', 'link hinh anh', 'hinh_anh', 'image', 'anh'],
    answer: ['dap_an_dung', 'dap an dung', 'dap_an', 'answer'],
    active: ['dang_dung', 'dang dung', 'active', 'hien_thi']
  });
}

function isStarterNoteRow_(row, colMap) {
  var orderVal = String(simpleCol_(row, colMap, 'thu_tu', '')).trim();
  if (/[,…]/.test(orderVal)) return true;
  var code = String(simpleCol_(row, colMap, 'ma_bai', '')).trim();
  if (code.indexOf('…') >= 0) return true;
  var active = String(simpleCol_(row, colMap, 'active', '')).trim();
  if (active.indexOf('/') >= 0) return true;
  var wb = String(simpleCol_(row, colMap, 'word_bank', '')).trim();
  if (wb.indexOf('từ') === 0 || wb.indexOf('tu') === 0) return true;
  return false;
}

function toDriveImageUrl_(url) {
  var s = String(url || '').trim();
  if (!s) return '';
  var m = s.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return 'https://drive.google.com/uc?export=view&id=' + m[1];
  m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return 'https://drive.google.com/uc?export=view&id=' + m[1];
  return s;
}

function readLookAndWriteExercises_(course) {
  var rows = getCachedSheetRows_(CONFIG.LOOK_AND_WRITE_SHEET_NAME, true);
  if (rows.length < 2) return [];

  var colMap = buildLookAndWriteColumnMap_(rows[0]);
  if (colMap.ma_bai < 0) colMap.ma_bai = 0;
  if (colMap.thu_tu < 0) colMap.thu_tu = 1;
  if (colMap.course < 0) colMap.course = 2;
  if (colMap.image < 0) colMap.image = 6;
  if (colMap.answer < 0) colMap.answer = 7;
  if (colMap.active < 0) colMap.active = 8;

  var groups = {};

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (isStarterNoteRow_(row, colMap)) continue;
    if (!isActive_(simpleCol_(row, colMap, 'active', true))) continue;
    if (!matchCourse_(simpleCol_(row, colMap, 'course', ''), course)) continue;

    var code = String(simpleCol_(row, colMap, 'ma_bai', '')).trim();
    if (!code) continue;

    if (!groups[code]) {
      groups[code] = {
        id: code,
        title: '',
        instruction: 'Look and write.',
        word_bank: [],
        items: []
      };
    }

    var group = groups[code];
    var wb = splitPipe_(simpleCol_(row, colMap, 'word_bank', ''));
    if (wb.length && !group.word_bank.length) group.word_bank = wb;

    var title = String(simpleCol_(row, colMap, 'title', '')).trim();
    var instruction = String(simpleCol_(row, colMap, 'instruction', '')).trim();
    if (title) group.title = title;
    if (instruction) group.instruction = instruction;

    var order = Number(simpleCol_(row, colMap, 'thu_tu', group.items.length + 1));
    if (!order || isNaN(order)) order = group.items.length + 1;

    group.items.push({
      order: order,
      image: toDriveImageUrl_(simpleCol_(row, colMap, 'image', '')),
      answer: String(simpleCol_(row, colMap, 'answer', '')).trim()
    });
  }

  var exercises = [];
  for (var key in groups) {
    if (!groups.hasOwnProperty(key)) continue;
    var ex = groups[key];
    ex.items.sort(function (a, b) { return a.order - b.order; });
    if (!ex.word_bank.length) {
      ex.word_bank = ex.items.map(function (item) { return item.answer; });
    }
    exercises.push(ex);
  }

  exercises.sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
  return exercises;
}

function countLookAndWriteExercises_(course) {
  return readLookAndWriteExercises_(course).length;
}

/** Một request: bài tập Nhìn và viết (kéo-thả) + tiến độ. */
function getLookAndWriteGameData(course) {
  course = String(course || '').trim();

  try {
    var exercises = readLookAndWriteExercises_(course);
    var total = exercises.length;
    var unitTotal = countExerciseItemTotal_(exercises);
    var username = getCurrentUsername_();
    var statuses = emptyStatuses_(total);
    var loggedIn = false;
    var scoreMeta = buildGameScoreMeta_(course, 'look_and_write', unitTotal);

    if (username) {
      loggedIn = true;
      var progress = getGameProgress(course, 'look_and_write', total);
      statuses = progress.statuses;
    }

    return {
      success: true,
      course: course,
      exercises: exercises,
      total: total,
      unitTotal: unitTotal,
      sessionScore: scoreMeta.sessionScore,
      maxScore: scoreMeta.maxScore,
      loggedIn: loggedIn,
      username: username || '',
      statuses: statuses
    };
  } catch (err) {
    return {
      success: false,
      message: err.message,
      course: course,
      exercises: [],
      total: 0,
      unitTotal: 0,
      sessionScore: 0,
      maxScore: 0,
      loggedIn: false,
      username: '',
      statuses: []
    };
  }
}

function getLeaderboard(period, offset) {
  period = String(period || 'week').trim().toLowerCase();
  if (period !== 'day' && period !== 'week' && period !== 'month') period = 'week';
  offset = Number(offset) || 0;

  try {
    // Nguồn chuẩn cho BXH: ScoreLog (tránh cộng chồng giữa Leaderboard sheet + ScoreLog).
    // - day: tổng điểm tất cả game trong ngày
    // - week: tổng điểm các ngày trong tuần (ISO week, bắt đầu từ Thứ Hai)
    // - month: tổng điểm các ngày trong tháng (tương đương tổng các tuần trong tháng)
    var scoreLogData = readLeaderboardFromScoreLog_(period, offset);
    return buildLeaderboardResponse_(scoreLogData || [], period, offset);
  } catch (err) {
    return buildLeaderboardResponse_([], period, offset);
  }
}

function getLeaderboardSheet_(createIfMissing) {
  var ss = getSpreadsheet_();
  var sheet = getSheetByNameCached_(CONFIG.LEADERBOARD_SHEET_NAME);
  if (!sheet && createIfMissing) {
    sheet = ss.insertSheet(CONFIG.LEADERBOARD_SHEET_NAME);
    sheet.appendRow(['username', 'display_name', 'score', 'badge', 'period', 'period_key', 'updated_at']);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#e8eef8');
    sheet.setFrozenRows(1);
  }
  if (!sheet) {
    if (createIfMissing) {
      throw new Error('Không tìm thấy sheet "' + CONFIG.LEADERBOARD_SHEET_NAME + '". Chạy setupDatabase() trước.');
    }
    return null;
  }
  migrateLeaderboardSheet_(sheet);
  return sheet;
}

function migrateLeaderboardSheet_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['username', 'display_name', 'score', 'badge', 'period', 'period_key', 'updated_at']);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#e8eef8');
    sheet.setFrozenRows(1);
    return;
  }
  var header = String(sheet.getRange(1, 1).getValue() || '').trim().toLowerCase();
  if (header === 'username') return;
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
  sheet.getRange(1, 1, 1, 7).setValues([[
    'username', 'display_name', 'score', 'badge', 'period', 'period_key', 'updated_at'
  ]]);
  sheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#e8eef8');
  sheet.setFrozenRows(1);
}

function getScoreLogSheet_(createIfMissing) {
  var ss = getSpreadsheet_();
  var sheet = getSheetByNameCached_(CONFIG.SCORE_LOG_SHEET_NAME);
  if (!sheet && createIfMissing) {
    sheet = ss.insertSheet(CONFIG.SCORE_LOG_SHEET_NAME);
    sheet.appendRow([
      'username', 'display_name', 'course', 'game', 'question_index',
      'is_correct', 'elapsed_ms', 'points', 'answered_at'
    ]);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#e8eef8');
    sheet.setFrozenRows(1);
  }
  if (!sheet) {
    if (createIfMissing) {
      throw new Error('Không tìm thấy sheet "' + CONFIG.SCORE_LOG_SHEET_NAME + '". Chạy setupDatabase() trước.');
    }
    return null;
  }
  return sheet;
}

function toSheetDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  var raw = String(value || '').trim();
  if (!raw) return null;

  var formats = ['yyyy-MM-dd HH:mm:ss', 'yyyy-MM-dd', 'yyyy-MM'];
  for (var i = 0; i < formats.length; i++) {
    try {
      return Utilities.parseDate(raw, CONFIG.TZ, formats[i]);
    } catch (err) { /* try next */ }
  }

  var serial = Number(raw);
  if (!isNaN(serial) && serial > 20000) {
    return new Date(Math.round((serial - 25569) * 86400000));
  }
  return null;
}

function parseAnsweredAt_(value) {
  return toSheetDate_(value);
}

function normalizePeriodKey_(period, value) {
  if (period === 'week') return String(value || '').trim();

  var date = toSheetDate_(value);
  if (date) {
    if (period === 'month') return Utilities.formatDate(date, CONFIG.TZ, 'yyyy-MM');
    return Utilities.formatDate(date, CONFIG.TZ, 'yyyy-MM-dd');
  }

  var raw = String(value || '').trim();
  if (!raw) return '';

  if (/^\d{4}-\d{2}(-\d{2})?$/.test(raw)) {
    return period === 'month' ? raw.substring(0, 7) : raw.substring(0, 10);
  }

  var serial = Number(raw);
  if (!isNaN(serial) && serial > 20000) {
    date = new Date(Math.round((serial - 25569) * 86400000));
    if (period === 'month') return Utilities.formatDate(date, CONFIG.TZ, 'yyyy-MM');
    return Utilities.formatDate(date, CONFIG.TZ, 'yyyy-MM-dd');
  }

  return raw;
}

function readLeaderboardFromScoreLog_(period, offset) {
  var periodKey = getPeriodKey_(period, getPeriodDate_(period, offset));
  var rows = getCachedSheetRows_(CONFIG.SCORE_LOG_SHEET_NAME, true);
  if (!rows.length) return [];
  var byUser = {};

  for (var i = 1; i < rows.length; i++) {
    var answeredAt = parseAnsweredAt_(rows[i][8]);
    if (!answeredAt) continue;
    if (getPeriodKey_(period, answeredAt) !== periodKey) continue;

    var username = String(rows[i][0] || '').trim();
    var displayName = String(rows[i][1] || username).trim();
    if (!username) continue;

    if (!byUser[username]) {
      byUser[username] = { name: displayName, score: 0, badge: 'C1', avatar: '' };
    }
    byUser[username].score += Number(rows[i][7]) || 0;
  }

  var result = [];
  for (var key in byUser) {
    if (byUser.hasOwnProperty(key)) result.push(byUser[key]);
  }
  result.sort(function (a, b) { return b.score - a.score; });
  return result;
}

function mergeLeaderboardPlayers_(primary, secondary) {
  var map = {};
  function addPlayers(list, useSum) {
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var key = String(p.name || '').trim();
      if (!key) continue;
      if (!map[key]) {
        map[key] = { name: key, score: 0, badge: p.badge || 'C1', avatar: p.avatar || '' };
      }
      var score = Number(p.score) || 0;
      map[key].score = useSum ? map[key].score + score : Math.max(map[key].score, score);
    }
  }
  addPlayers(primary, true);
  addPlayers(secondary, true);
  var result = [];
  for (var k in map) {
    if (map.hasOwnProperty(k)) result.push(map[k]);
  }
  result.sort(function (a, b) { return b.score - a.score; });
  return result;
}

function readLeaderboardFromSheet_(period, offset) {
  getLeaderboardSheet_(false);
  var periodKey = getPeriodKey_(period, getPeriodDate_(period, offset));
  var byUser = {};
  var rows = getCachedSheetRows_(CONFIG.LEADERBOARD_SHEET_NAME, true);

  if (rows.length > 1) {
    for (var i = 1; i < rows.length; i++) {
      var rowPeriod = String(rows[i][4] || 'week').trim().toLowerCase();
      var rowKey = normalizePeriodKey_(rowPeriod, rows[i][5]);
      if (rowPeriod !== period || rowKey !== periodKey) continue;

      var username = String(rows[i][0] || '').trim();
      var displayName = String(rows[i][1] || username).trim();
      var mapKey = username || displayName;
      if (!mapKey) continue;

      if (!byUser[mapKey]) {
        byUser[mapKey] = {
          name: displayName,
          score: 0,
          badge: String(rows[i][3] || 'C1').trim(),
          avatar: ''
        };
      }
      byUser[mapKey].score += Number(rows[i][2]) || 0;
    }
  }

  var result = [];
  for (var key in byUser) {
    if (byUser.hasOwnProperty(key)) result.push(byUser[key]);
  }
  result.sort(function (a, b) { return b.score - a.score; });

  var fromLog = readLeaderboardFromScoreLog_(period, offset);
  return mergeLeaderboardPlayers_(result, fromLog);
}

function getPeriodDate_(period, offset) {
  var d = new Date();
  offset = Number(offset) || 0;
  if (period === 'day') {
    d.setDate(d.getDate() + offset);
  } else if (period === 'month') {
    d.setMonth(d.getMonth() + offset);
  } else {
    d.setDate(d.getDate() + offset * 7);
  }
  return d;
}

function pad2_(n) {
  return n < 10 ? '0' + n : String(n);
}

function getPeriodKey_(period, date) {
  if (period === 'day') {
    return Utilities.formatDate(date, CONFIG.TZ, 'yyyy-MM-dd');
  }
  if (period === 'month') {
    return Utilities.formatDate(date, CONFIG.TZ, 'yyyy-MM');
  }
  return Utilities.formatDate(date, CONFIG.TZ, 'yyyy') + '-W' + pad2_(getIsoWeek_(date));
}

function calculatePoints_(isCorrect, elapsedMs) {
  var cfg = CONFIG.SCORING;
  var elapsed = Math.max(0, Number(elapsedMs) || 0);
  var speedRatio = 1 - elapsed / cfg.TIME_LIMIT_MS;
  if (speedRatio < 0) speedRatio = 0;
  if (speedRatio > 1) speedRatio = 1;

  if (isCorrect) {
    return Math.round(cfg.CORRECT_MIN + (cfg.CORRECT_MAX - cfg.CORRECT_MIN) * speedRatio);
  }
  return -Math.round(cfg.WRONG_MIN + (cfg.WRONG_MAX - cfg.WRONG_MIN) * (1 - speedRatio));
}

function findLeaderboardRow_(sheet, username, period, periodKey, prefetchedRows) {
  var data = prefetchedRows;
  if (!data) {
    data = sheet ? sheet.getDataRange().getValues() : getCachedSheetRows_(CONFIG.LEADERBOARD_SHEET_NAME, true);
  }
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0] || '').trim() !== username) continue;
    if (String(data[i][4] || '').trim().toLowerCase() !== period) continue;
    if (normalizePeriodKey_(period, data[i][5]) !== periodKey) continue;
    return i + 1;
  }
  return -1;
}

function writeLeaderboardPeriodCells_(sheet, rowNum, periodKey, updatedAt) {
  sheet.getRange(rowNum, 6).setNumberFormat('@').setValue(String(periodKey));
  sheet.getRange(rowNum, 7).setNumberFormat('@').setValue(String(updatedAt));
}

function updateLeaderboardEntry_(username, displayName, points, date) {
  var sheet = getLeaderboardSheet_(true);
  var rows = sheet.getDataRange().getValues();
  var now = Utilities.formatDate(date, CONFIG.TZ, 'yyyy-MM-dd HH:mm:ss');
  var periods = ['day', 'week', 'month'];

  for (var p = 0; p < periods.length; p++) {
    var period = periods[p];
    var periodKey = getPeriodKey_(period, date);
    var rowNum = findLeaderboardRow_(sheet, username, period, periodKey, rows);
    if (rowNum > 0) {
      var current = Number(rows[rowNum - 1][2]) || 0;
      var newScore = current + points;
      rows[rowNum - 1][2] = newScore;
      sheet.getRange(rowNum, 3).setValue(newScore);
      writeLeaderboardPeriodCells_(sheet, rowNum, periodKey, now);
    } else {
      sheet.appendRow([username, displayName, points, 'C1', period, periodKey, now]);
      var newRow = sheet.getLastRow();
      rows.push([username, displayName, points, 'C1', period, periodKey, now]);
      writeLeaderboardPeriodCells_(sheet, newRow, periodKey, now);
    }
  }

  invalidateSheetCache_(CONFIG.LEADERBOARD_SHEET_NAME);
}

function submitAnswerScore(course, game, questionIndex, isCorrect, elapsedMs) {
  course = String(course || '').trim();
  game = String(game || '').trim();
  questionIndex = Number(questionIndex);
  isCorrect = isCorrect === true || isCorrect === 'true' || isCorrect === 1;
  elapsedMs = Number(elapsedMs) || 0;

  var username = getCurrentUsername_();
  if (!username) {
    return { success: false, loggedIn: false, message: 'Chưa đăng nhập' };
  }

  try {
    var props = PropertiesService.getUserProperties();
    var displayName = String(props.getProperty('displayName') || username).trim();
    var points = calculatePoints_(isCorrect, elapsedMs);
    var now = new Date();
    var answeredAt = Utilities.formatDate(now, CONFIG.TZ, 'yyyy-MM-dd HH:mm:ss');

    var logSheet = getScoreLogSheet_(true);
    logSheet.appendRow([
      username, displayName, course, game, questionIndex,
      isCorrect, elapsedMs, points, answeredAt
    ]);
    invalidateSheetCache_(CONFIG.SCORE_LOG_SHEET_NAME);

    updateLeaderboardEntry_(username, displayName, points, now);

    var scoreRows = getCachedSheetRows_(CONFIG.SCORE_LOG_SHEET_NAME, true);
    var grammarTotal = countGrammarQuestions_(course, '') || CONFIG.GAME_TOTALS.grammar;
    var quizTotal = countQuizQuestions_(course, '') || CONFIG.GAME_TOTALS.quiz;
    var pronunciationTotal = countPronunciationQuestions_(course, '') || CONFIG.GAME_TOTALS.pronunciation;
    var scrambleTotal = countScrambleQuestions_(course, '') || CONFIG.GAME_TOTALS.scramble;
    var wordMatchTotal = countWordMatchQuestions_(course, '') || CONFIG.GAME_TOTALS.word_match;
    var lookAndWriteTotal = countLookAndWriteExercises_(course) || CONFIG.GAME_TOTALS.look_and_write;
    var total = sumCourseScoreFromRows_(scoreRows, username, course);
    var max = (grammarTotal + quizTotal + pronunciationTotal + scrambleTotal + wordMatchTotal + lookAndWriteTotal) * CONFIG.SCORING.CORRECT_MAX;
    if (max < 1) max = (CONFIG.GAME_TOTALS.grammar + CONFIG.GAME_TOTALS.quiz + CONFIG.GAME_TOTALS.pronunciation + CONFIG.GAME_TOTALS.scramble + CONFIG.GAME_TOTALS.word_match + CONFIG.GAME_TOTALS.look_and_write) * CONFIG.SCORING.CORRECT_MAX;

    return {
      success: true,
      loggedIn: true,
      points: points,
      isCorrect: isCorrect,
      courseScore: total,
      courseMaxScore: max
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function getCourseScore_(username, course) {
  username = String(username || '').trim();
  course = String(course || '').trim();

  var rows = getCachedSheetRows_(CONFIG.SCORE_LOG_SHEET_NAME, true);
  var total = sumCourseScoreFromRows_(rows, username, course);

  var grammarTotal = countGrammarQuestions_(course, '') || CONFIG.GAME_TOTALS.grammar;
  var quizTotal = countQuizQuestions_(course, '') || CONFIG.GAME_TOTALS.quiz;
  var pronunciationTotal = countPronunciationQuestions_(course, '') || CONFIG.GAME_TOTALS.pronunciation;
  var scrambleTotal = countScrambleQuestions_(course, '') || CONFIG.GAME_TOTALS.scramble;
  var wordMatchTotal = countWordMatchQuestions_(course, '') || CONFIG.GAME_TOTALS.word_match;
  var lookAndWriteTotal = countLookAndWriteExercises_(course) || CONFIG.GAME_TOTALS.look_and_write;
  var max = (grammarTotal + quizTotal + pronunciationTotal + scrambleTotal + wordMatchTotal + lookAndWriteTotal) * CONFIG.SCORING.CORRECT_MAX;
  if (max < 1) max = (CONFIG.GAME_TOTALS.grammar + CONFIG.GAME_TOTALS.quiz + CONFIG.GAME_TOTALS.pronunciation + CONFIG.GAME_TOTALS.scramble + CONFIG.GAME_TOTALS.word_match + CONFIG.GAME_TOTALS.look_and_write) * CONFIG.SCORING.CORRECT_MAX;

  return { total: total, max: max };
}

function getCourseScore(course) {
  course = String(course || '').trim();
  var username = getCurrentUsername_();
  if (!username) {
    return { success: false, loggedIn: false, total: 0, max: 0 };
  }
  try {
    var score = getCourseScore_(username, course);
    return {
      success: true,
      loggedIn: true,
      total: score.total,
      max: score.max
    };
  } catch (err) {
    return { success: false, message: err.message, total: 0, max: 0 };
  }
}

/**
 * Chạy 1 lần trong Editor để xóa toàn bộ dữ liệu mẫu trên Sheet.
 */
function clearAllSampleData() {
  var q = clearSampleQuestionData();
  var lb = clearSampleLeaderboardData();
  return q + ' | ' + lb;
}

/**
 * Chạy 1 lần trong Editor để xóa câu hỏi mẫu (nếu đã tạo trước đó).
 */
function clearSampleQuestionData() {
  var removed = 0;
  var sampleGrammar = [
    "I can't play games because I need to sleep.",
    "She doesn't have enough money to buy a new bike.",
    "He lives far from school, so he is always late."
  ];
  var sampleQuiz = [
    'My sister is very',
    'She has lived in Hanoi',
    'Which sentence is correct?'
  ];

  var grammarSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    .getSheetByName(CONFIG.GRAMMAR_SHEET_NAME);
  if (grammarSheet && grammarSheet.getLastRow() > 1) {
    for (var g = grammarSheet.getLastRow(); g >= 2; g--) {
      var source = String(grammarSheet.getRange(g, 4).getValue() || '').trim();
      if (sampleGrammar.indexOf(source) >= 0) {
        grammarSheet.deleteRow(g);
        removed++;
      }
    }
  }

  var quizSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    .getSheetByName(CONFIG.QUIZ_SHEET_NAME);
  if (quizSheet && quizSheet.getLastRow() > 1) {
    for (var q = quizSheet.getLastRow(); q >= 2; q--) {
      var question = String(quizSheet.getRange(q, 6).getValue() || '').trim();
      var isSample = sampleQuiz.some(function (s) { return question.indexOf(s) >= 0; });
      if (isSample) {
        quizSheet.deleteRow(q);
        removed++;
      }
    }
  }

  return 'OK – đã xóa ' + removed + ' câu hỏi mẫu';
}

/**
 * Chạy 1 lần trong Apps Script Editor để sửa period_key / answered_at trên Google Sheet.
 */
function repairLeaderboardData() {
  var lb = getLeaderboardSheet_(false);
  var fixedLb = 0;
  if (lb && lb.getLastRow() > 1) {
    var rows = lb.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      var period = String(rows[i][4] || '').trim().toLowerCase();
      var key = normalizePeriodKey_(period, rows[i][5]);
      var updated = Utilities.formatDate(
        toSheetDate_(rows[i][6]) || new Date(),
        CONFIG.TZ,
        'yyyy-MM-dd HH:mm:ss'
      );
      writeLeaderboardPeriodCells_(lb, i + 1, key, updated);
      fixedLb++;
    }
  }

  var log = getScoreLogSheet_(false);
  var fixedLog = 0;
  if (log && log.getLastRow() > 1) {
    var logRows = log.getDataRange().getValues();
    for (var j = 1; j < logRows.length; j++) {
      var dt = toSheetDate_(logRows[j][8]);
      if (!dt) continue;
      var text = Utilities.formatDate(dt, CONFIG.TZ, 'yyyy-MM-dd HH:mm:ss');
      log.getRange(j + 1, 9).setNumberFormat('@').setValue(text);
      fixedLog++;
    }
  }

  return 'OK – đã sửa ' + fixedLb + ' dòng Leaderboard, ' + fixedLog + ' dòng ScoreLog';
}

function clearSampleLeaderboardData() {
  var sheet = getLeaderboardSheet_(false);
  if (!sheet || sheet.getLastRow() <= 1) {
    return 'OK – không có dữ liệu cần xóa';
  }

  var sampleNames = [
    'Trần Huỳnh Trang Thư', 'Trịnh Khôi Nguyên', 'Trần Quỳnh Anh',
    'Nguyễn Minh Anh', 'Phạm Hoàng Long', 'Lê Thảo My',
    'Võ Đình Khang', 'Hoàng Bảo Trân', 'Đặng Quốc Huy', 'Bùi Ngọc Linh'
  ];

  var rows = sheet.getDataRange().getValues();
  var removed = 0;
  for (var i = rows.length - 1; i >= 1; i--) {
    var name = String(rows[i][1] || rows[i][0] || '').trim();
    var isSample = sampleNames.some(function (s) { return name.indexOf(s) >= 0; });
    if (isSample) {
      sheet.deleteRow(i + 1);
      removed++;
    }
  }
  return 'OK – đã xóa ' + removed + ' dòng dữ liệu mẫu';
}

function buildLeaderboardResponse_(players, period, offset) {
  var now = new Date();
  var label = getPeriodLabel_(period, now, offset);
  var props = PropertiesService.getUserProperties();
  var currentName = props.getProperty('displayName') || '';

  var list = players.map(function (p, i) {
    return {
      rank: i + 1,
      name: p.name,
      score: p.score,
      badge: p.badge,
      avatar: p.avatar
    };
  });

  var myEntry = currentName
    ? list.filter(function (p) { return p.name.indexOf(currentName) >= 0; })[0]
    : null;
  var myRank = myEntry ? myEntry.rank : (list.length ? '500+' : '—');
  var myScore = myEntry ? myEntry.score : 0;

  return {
    period: period,
    offset: offset,
    periodLabel: label,
    updatedAt: Utilities.formatDate(now, CONFIG.TZ, 'HH:mm:ss dd/MM/yyyy'),
    players: list,
    currentUser: {
      rank: myRank,
      name: currentName || 'Khách',
      score: myScore,
      badge: 'C1'
    }
  };
}

function getPeriodLabel_(period, date, offset) {
  var d = getPeriodDate_(period, offset);
  if (period === 'day') {
    return Utilities.formatDate(d, CONFIG.TZ, 'dd/MM/yyyy');
  }
  if (period === 'month') {
    return 'THÁNG ' + Utilities.formatDate(d, CONFIG.TZ, 'M/yyyy');
  }
  return 'TUẦN ' + getIsoWeek_(d);
}

function getIsoWeek_(date) {
  var d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  var dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
