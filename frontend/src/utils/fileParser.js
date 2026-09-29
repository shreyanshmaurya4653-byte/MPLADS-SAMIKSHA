/**
 * Universal Multi-Format Scheme Data Parser & Sanitizer
 * Supports: Excel (.xlsx, .xls), CSV, TSV (tab-separated / copy-paste from Excel), Pipe-separated, and JSON.
 * Aggressively filters out waste/garbage data, summary rows, duplicate headers, and blank entries.
 * Fully supports Indian Government MPLADS portal exports (Works Sanctioned, Recommended, Completed, MP Allocation limits).
 */
import * as XLSX from 'xlsx';

// Header aliases map to normalized field names (normalized: lowercased, only a-z0-9)
const HEADER_ALIASES = {
  title: [
    'title', 'work', 'worktitle', 'workname', 'projectname', 'projecttitle',
    'nameofwork', 'assetname', 'schemework', 'workdescription', 'description',
    'activity', 'itemofwork', 'project', 'details', 'name'
  ],
  category: [
    'category', 'workcategory', 'sector', 'type', 'assettype', 'domain', 'schemetype'
  ],
  implementing_agency: [
    'ida', 'implementingagency', 'agency', 'agencyname', 'dept', 'department',
    'executingagency', 'pia'
  ],
  sanctioned_amount: [
    'sanctionamount', 'sanctionedamount', 'sanctioned', 'allocatedamount',
    'allocatedlimit', 'recommendedamount', 'amountdisbursed', 'approvedamount',
    'amount', 'cost', 'sanctionedcost', 'estimatedcost', 'expenditure',
    'expenditureamount', 'totalexpenditure'
  ],
  estimated_cost: [
    'estimatedcost', 'estimated', 'estimate', 'estcost', 'targetcost'
  ],
  start_date: [
    'startdate', 'commencementdate', 'start', 'commencedon', 'recommendeddate',
    'sanctiondate', 'date'
  ],
  expected_completion: [
    'expectedcompletion', 'completiondate', 'completion', 'targetdate', 'enddate'
  ],
  state: [
    'state', 'statename', 'stateut'
  ],
  constituency: [
    'constituency', 'constituencyname', 'pc', 'parliamentaryconstituency'
  ],
  mp_name: [
    'honblemembersofparliaments', 'honblemembersofparliament', 'mpname',
    'nameofmp', 'memberofparliament', 'honblemp', 'mp'
  ],
  sr_no: [
    'srno', 'slno', 'sno', 'serialno', 'sn', 'sr'
  ]
};

function normalizeKey(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Clean and parse numeric currency strings (handles ₹, $, commas, blanks, decimals)
 */
export function parseAmount(val, fallback = 1000000) {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : Math.max(0, val);
  
  const str = String(val).trim();
  if (!str) return fallback;

  // Detect multipliers commonly used in government records
  let multiplier = 1;
  if (/cr(ore(s)?)?/i.test(str)) {
    multiplier = 10000000;
  } else if (/lakh(s)?|lac(s)?/i.test(str)) {
    multiplier = 100000;
  } else if (/\bk\b/i.test(str)) {
    multiplier = 1000;
  } else if (/\bm\b/i.test(str)) {
    multiplier = 1000000;
  }

  // Preserve decimal point, strip currency symbols, spaces, question marks, commas
  const cleaned = str.replace(/[₹$,\s?a-zA-Z]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) || parsed < 0 ? fallback : parsed * multiplier;
}

/**
 * Check whether a row is "waste data" or garbage
 */
export function isGarbageRow(title) {
  if (!title || typeof title !== 'string') return true;
  const t = title.trim().replace(/^\ufeff/, '').replace(/^["']+|["']+$/g, '').trim();
  if (t.length === 0) return true;

  const lower = normalizeKey(t);

  // Known column headers that should never be ingested as project names
  const garbageKeys = [
    'srno', 'slno', 'sno', 'serialno', 'sn', 'sr',
    'title', 'worktitle', 'projecttitle', 'projectname', 'workname', 'nameofwork', 'workdescription',
    'mpname', 'nameofmp', 'memberofparliament', 'honblemp', 'honblemembersofparliaments', 'honblemembersofparliament',
    'constituency', 'constituencyname', 'districtname', 'statename', 'schemename',
    'sanctionedamount', 'sanctionamount', 'allocatedamount', 'allocatedlimit', 'estimatedcost', 'expenditure',
    'category', 'workcategory', 'status', 'workstatus', 'remarks', 'description', 'date', 'image'
  ];
  if (garbageKeys.includes(lower)) return true;

  // Catch summary and aggregation lines commonly found in government spreadsheets
  const rawLower = t.toLowerCase();
  if (
    rawLower.startsWith('total') ||
    rawLower.startsWith('sub total') ||
    rawLower.startsWith('subtotal') ||
    rawLower.startsWith('sub-total') ||
    rawLower.startsWith('grand total') ||
    rawLower.startsWith('page ') ||
    rawLower.includes('sub-total') ||
    rawLower.includes('sub total') ||
    rawLower.includes('grand total') ||
    rawLower.includes('carry forward') ||
    rawLower.includes('brought forward')
  ) {
    return true;
  }

  // Purely punctuation, numbers, or symbols without meaningful text
  if (/^[\d\s.,;:\-_/\\#@!%&*()+=]+$/.test(t)) {
    return true;
  }

  return false;
}

/**
 * Detect delimiter in text lines (CSV, TSV, Semicolon, Pipe)
 */
function detectDelimiter(text) {
  const sample = text.slice(0, 2000);
  const tabCount = (sample.match(/\t/g) || []).length;
  const commaCount = (sample.match(/,/g) || []).length;
  const semiCount = (sample.match(/;/g) || []).length;
  const pipeCount = (sample.match(/\|/g) || []).length;

  if (tabCount > commaCount && tabCount > semiCount && tabCount > pipeCount) return '\t';
  if (pipeCount > commaCount && pipeCount > semiCount) return '|';
  if (semiCount > commaCount) return ';';
  return ',';
}

/**
 * Parse a delimited line respecting double-quoted strings (RFC 4180 standard)
 * NOTE: Do not treat apostrophe (') as a delimiter quote, as Indian gov headers contain "Hon'ble"
 */
function parseDelimitedLine(line, delimiter) {
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === delimiter && !insideQuotes) {
      result.push(current.trim().replace(/^["']+|["']+$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']+|["']+$/g, ''));
  return result;
}

/**
 * Map raw row array or object to clean scheme work object
 */
function normalizeWorkItem(row, headerMap, defaults = {}) {
  let title = '';
  let category = 'Community Infrastructure';
  let agency = 'Public Works Department (PWD)';
  let sanctioned = 1000000;
  let estimated = 1000000;
  let startDate = '2024-06-01';
  let completionDate = '2024-12-01';
  let stateVal = '';
  let constVal = '';
  let mpVal = '';

  if (Array.isArray(row)) {
    // Array of column values
    if (headerMap) {
      if (headerMap.title !== undefined) title = row[headerMap.title] || '';
      if (headerMap.category !== undefined) category = row[headerMap.category] || category;
      if (headerMap.implementing_agency !== undefined) agency = row[headerMap.implementing_agency] || agency;
      if (headerMap.sanctioned_amount !== undefined) sanctioned = parseAmount(row[headerMap.sanctioned_amount], 1000000);
      if (headerMap.estimated_cost !== undefined) estimated = parseAmount(row[headerMap.estimated_cost], sanctioned);
      if (headerMap.start_date !== undefined && row[headerMap.start_date]) startDate = row[headerMap.start_date];
      if (headerMap.expected_completion !== undefined && row[headerMap.expected_completion]) completionDate = row[headerMap.expected_completion];
      if (headerMap.state !== undefined) stateVal = row[headerMap.state] || '';
      if (headerMap.constituency !== undefined) constVal = row[headerMap.constituency] || '';
      if (headerMap.mp_name !== undefined) mpVal = row[headerMap.mp_name] || '';
    } else {
      // Positional fallback: look for first text column that is not a serial number
      let candidateTitleIdx = -1;
      for (let col = 0; col < row.length; col++) {
        const val = String(row[col] || '').trim();
        if (val.length > 2 && !/^[\d\s.,;:\-_/\\#@!%&*()+=]+$/.test(val) && !isGarbageRow(val)) {
          candidateTitleIdx = col;
          break;
        }
      }
      title = candidateTitleIdx !== -1 ? row[candidateTitleIdx] : (row[0] || '');
      if (row[1] && isNaN(parseFloat(row[1]))) category = row[1];
      
      // Look for amount in remaining columns
      for (let col = 0; col < row.length; col++) {
        if (col === candidateTitleIdx) continue;
        const p = parseAmount(row[col], null);
        if (p !== null && p > 0) {
          sanctioned = p;
          break;
        }
      }
      estimated = sanctioned;
    }
  } else if (typeof row === 'object' && row !== null) {
    // Key-value object (from Excel or JSON)
    for (const key of Object.keys(row)) {
      const normalizedKey = normalizeKey(key);
      for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
        if (aliases.includes(normalizedKey)) {
          if (field === 'title') title = String(row[key] || '');
          else if (field === 'category') category = String(row[key] || category);
          else if (field === 'implementing_agency') agency = String(row[key] || agency);
          else if (field === 'sanctioned_amount') sanctioned = parseAmount(row[key], 1000000);
          else if (field === 'estimated_cost') estimated = parseAmount(row[key], sanctioned);
          else if (field === 'start_date' && row[key]) startDate = String(row[key]);
          else if (field === 'expected_completion' && row[key]) completionDate = String(row[key]);
          else if (field === 'state') stateVal = String(row[key] || '');
          else if (field === 'constituency') constVal = String(row[key] || '');
          else if (field === 'mp_name') mpVal = String(row[key] || '');
        }
      }
    }
  }

  // Handle MP Allocation Limit files (no explicit work title column):
  if (!title && (mpVal || constVal)) {
    title = `MPLADS Scheme Allocation: ${mpVal ? mpVal.trim() + ' ' : ''}(${constVal ? constVal.trim() : (stateVal ? stateVal.trim() : 'Constituency')})`;
    category = 'Constituency Allocation';
  }

  title = title.trim().replace(/^["']+|["']+$/g, '');

  if (isGarbageRow(title)) {
    return null;
  }

  return {
    title,
    description: `Development project under ${category}`,
    category,
    implementing_agency: agency,
    sanctioned_amount: sanctioned,
    estimated_cost: estimated || sanctioned,
    start_date: startDate.length === 10 ? startDate : '2024-06-01',
    expected_completion: completionDate.length === 10 ? completionDate : '2024-12-01',
    state_id: defaults.state_id || 1,
    district_id: defaults.district_id || 1,
    constituency_id: defaults.constituency_id || 1
  };
}

/**
 * Main parse function supporting ArrayBuffer (Excel) or String (CSV/TSV/JSON)
 */
export async function parseUploadFile(fileOrText, defaults = {}) {
  let rawRows = [];

  // Case 1: Browser File Object
  if (fileOrText instanceof File) {
    const fileName = fileOrText.name.toLowerCase();

    // Excel format
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const buffer = await fileOrText.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } else {
      // Text formats (.csv, .tsv, .txt, .json)
      const text = await fileOrText.text();
      return parseTextContent(text, defaults);
    }
  } else if (typeof fileOrText === 'string') {
    return parseTextContent(fileOrText, defaults);
  }

  // Normalize array of objects from Excel
  const validWorks = [];
  let discardedCount = 0;

  for (const r of rawRows) {
    const item = normalizeWorkItem(r, null, defaults);
    if (item) {
      validWorks.push(item);
    } else {
      discardedCount++;
    }
  }

  return {
    validWorks,
    totalRead: rawRows.length,
    validCount: validWorks.length,
    discardedCount
  };
}

/**
 * Parse raw text (JSON, CSV, TSV, or Tabular Paste)
 */
export function parseTextContent(text, defaults = {}) {
  // Strip UTF-8 Byte Order Mark (BOM) if present
  const trimmed = (text || '').trim().replace(/^\ufeff/, '');
  if (!trimmed) {
    return { validWorks: [], totalRead: 0, validCount: 0, discardedCount: 0 };
  }

  // Try JSON first
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const validWorks = [];
        let discardedCount = 0;
        for (const p of parsed) {
          const item = normalizeWorkItem(p, null, defaults);
          if (item) validWorks.push(item);
          else discardedCount++;
        }
        return {
          validWorks,
          totalRead: parsed.length,
          validCount: validWorks.length,
          discardedCount
        };
      }
    } catch (e) {
      // Fallback to text lines
    }
  }

  // Delimited lines (CSV / TSV / Semicolon / Pipe)
  const delimiter = detectDelimiter(trimmed);
  const lines = trimmed.split(/\r?\n/).filter(l => l.trim().length > 0);

  if (lines.length === 0) {
    return { validWorks: [], totalRead: 0, validCount: 0, discardedCount: 0 };
  }

  // Scan the first 5 lines to find the true table header
  let headerMap = null;
  let headerLineIndex = -1;

  for (let l = 0; l < Math.min(lines.length, 5); l++) {
    const tokens = parseDelimitedLine(lines[l], delimiter);
    const testMap = {};
    tokens.forEach((token, colIdx) => {
      const norm = normalizeKey(token);
      for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
        if (aliases.includes(norm)) {
          testMap[field] = colIdx;
        }
      }
    });

    if (
      testMap.title !== undefined ||
      testMap.sanctioned_amount !== undefined ||
      (testMap.mp_name !== undefined && testMap.constituency !== undefined) ||
      (testMap.state !== undefined && testMap.sanctioned_amount !== undefined)
    ) {
      headerMap = testMap;
      headerLineIndex = l;
      break;
    }
  }

  const startIndex = headerLineIndex !== -1 ? headerLineIndex + 1 : 0;
  const validWorks = [];
  let discardedCount = 0;

  for (let i = startIndex; i < lines.length; i++) {
    const tokens = parseDelimitedLine(lines[i], delimiter);
    if (tokens.length === 0 || (tokens.length === 1 && !tokens[0])) {
      discardedCount++;
      continue;
    }

    const item = normalizeWorkItem(tokens, headerMap, defaults);
    if (item) {
      validWorks.push(item);
    } else {
      discardedCount++;
    }
  }

  return {
    validWorks,
    totalRead: lines.length - startIndex,
    validCount: validWorks.length,
    discardedCount
  };
}
