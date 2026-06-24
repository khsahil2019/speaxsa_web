const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock data representing different batches in the database
const mockBatches = [
  {
    id: 'batch_1',
    batch_name: 'Calculus Alpha',
    course_title: 'Advanced Mathematics for Grade 10',
    teacher_name: 'Albus Dumbledore',
    days_of_week: ['Monday', 'Wednesday'],
    start_time: '14:00:00',
    end_time: '15:30:00',
    seats_filled: 5,
    capacity: 30,
    status: 'active'
  },
  {
    id: 'batch_2',
    batch_name: 'Quantum Beta',
    course_title: 'Introductory Quantum Physics',
    teacher_name: 'Severus Snape',
    days_of_week: ['Tuesday', 'Thursday'],
    start_time: '16:00:00',
    end_time: '17:30:00',
    seats_filled: 25,
    capacity: 30,
    status: 'inactive'
  },
  {
    id: 'batch_3',
    batch_name: 'Organic Chem Gamma',
    course_title: 'Basic Organic Chemistry',
    teacher_name: 'Minerva McGonagall',
    days_of_week: ['Friday', 'Sunday'],
    start_time: '10:00:00',
    end_time: '11:30:00',
    seats_filled: 12,
    capacity: 20,
    status: 'cancelled'
  }
];

// Setup the mock browser context
const mockElement = (id) => {
  return {
    id,
    _value: '',
    get value() { return this._value; },
    set value(v) { this._value = v; },
    innerHTML: '',
    textContent: '',
    classList: {
      classes: [],
      add(c) { if (!this.classes.includes(c)) this.classes.push(c); },
      remove(c) { this.classes = this.classes.filter(x => x !== c); },
      contains(c) { return this.classes.includes(c); }
    },
    style: {},
    listeners: {},
    addEventListener(event, callback) {
      this.listeners[event] = callback;
    },
    dispatchEvent(event, data) {
      if (this.listeners[event]) {
        this.listeners[event](data);
      }
    }
  };
};

const domRegistry = {};
const getElementMock = (id) => {
  if (!domRegistry[id]) {
    domRegistry[id] = mockElement(id);
  }
  return domRegistry[id];
};

const context = {
  window: {
    _batches: [],
    _batchesFilterSearch: undefined,
    _batchesFilterStatus: undefined,
    _batchesFilterCourse: undefined,
    _batchesFilterTeacher: undefined,
    _batchesFilterDay: undefined
  },
  document: {
    getElementById: getElementMock,
    querySelectorAll: (selector) => [],
    addEventListener: (event, callback) => {
      if (event === 'DOMContentLoaded') {
        callback();
      }
    }
  },
  localStorage: {
    getItem: (key) => null,
    setItem: (key, val) => {},
    removeItem: (key) => {}
  },
  Chart: class MockChart {
    constructor() {}
    destroy() {}
  },
  bootstrap: {
    Toast: class MockToast {
      constructor() {}
      show() {}
    },
    Modal: class MockModal {
      constructor() {}
      show() {}
      hide() {}
    }
  },
  fetch: async (url, options) => {
    console.log(`[Fetch Mock] Request to: ${url}`);
    if (url.includes('/admin/batches')) {
      return {
        ok: true,
        json: async () => JSON.parse(JSON.stringify(mockBatches)),
        status: 200
      };
    }
    return { ok: true, json: async () => ({}), status: 200 };
  },
  loading: () => console.log('[UI Mock] Loading started...'),
  apiGet: async (url) => {
    console.log(`[API Mock] GET request to: ${url}`);
    if (url === '/admin/batches') {
      return JSON.parse(JSON.stringify(mockBatches));
    }
    return [];
  },
  fmtCurrency: (amount) => `INR ${parseFloat(amount).toFixed(2)}`,
  showToast: (msg, type = 'success') => console.log(`[Toast Mock] [${type.toUpperCase()}] ${msg}`),
  statusBadge: (status) => `[Badge:${status}]`,
  table: (headers, rowsHtml, isStriped) => `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody></table>`,
  console: console
};

// Create sandbox
vm.createContext(context);

// Read public/admin/admin.js content
const adminJsPath = path.join(__dirname, '../public/admin/admin.js');
let adminJsCode = fs.readFileSync(adminJsPath, 'utf8');

// We need to bind context properties to global scope of the vm
const setupGlobalsCode = `
  window = this.window;
  document = this.document;
  localStorage = this.localStorage;
  Chart = this.Chart;
  bootstrap = this.bootstrap;
  fetch = this.fetch;
  loading = this.loading;
  apiGet = this.apiGet;
  fmtCurrency = this.fmtCurrency;
  showToast = this.showToast;
  statusBadge = this.statusBadge;
  table = this.table;
`;

// Run the files in the context
try {
  vm.runInContext(setupGlobalsCode, context);
  vm.runInContext(adminJsCode, context);
  console.log('✓ Successfully loaded admin.js script into execution sandbox.\n');
} catch (err) {
  console.error('Failed to parse and run admin.js in sandbox:', err);
  process.exit(1);
}

// Begin testing the Batches Redesign
async function runTest() {
  console.log('--- TEST 1: Initial Render ---');
  // Invoke renderBatches
  await context.renderBatches();

  const pageContent = getElementMock('pageContent');
  console.log(`✓ pageContent innerHTML set. Length: ${pageContent.innerHTML.length} characters.`);
  if (!pageContent.innerHTML.includes('All Batches') || !pageContent.innerHTML.includes('batchesTableBody')) {
    console.error('FAIL: Rendered HTML is missing critical structural elements.');
    process.exit(1);
  }
  console.log('✓ Verified Page Layout header and Table Container presence.');

  const searchInput = getElementMock('batchFilterSearch');
  const statusSelect = getElementMock('batchFilterStatus');
  const courseSelect = getElementMock('batchFilterCourse');
  const teacherSelect = getElementMock('batchFilterTeacher');
  const daySelect = getElementMock('batchFilterDay');

  if (!searchInput.listeners['input'] || !statusSelect.listeners['change'] || !courseSelect.listeners['change'] || !teacherSelect.listeners['change'] || !daySelect.listeners['change']) {
    console.error('FAIL: Event listeners for filtering options are not registered.');
    process.exit(1);
  }
  console.log('✓ Verified all event listeners are successfully attached.');

  const tbodyEl = getElementMock('batchesTableBody');
  console.log(`✓ Initial table body content length: ${tbodyEl.innerHTML.length} characters.`);
  if (!tbodyEl.innerHTML.includes('Calculus Alpha') || !tbodyEl.innerHTML.includes('Quantum Beta') || !tbodyEl.innerHTML.includes('Organic Chem Gamma')) {
    console.error('FAIL: Initial render did not display all mock batches.');
    process.exit(1);
  }
  console.log('✓ Verified all 3 initial batches display in the table.');

  console.log('\n--- TEST 2: Real-time Search Filtering ---');
  // Simulate searching "Quantum"
  console.log('Action: Simulate searching "Quantum"');
  searchInput.dispatchEvent('input', { target: { value: 'Quantum' } });
  
  if (tbodyEl.innerHTML.includes('Calculus Alpha') || tbodyEl.innerHTML.includes('Organic Chem Gamma')) {
    console.error('FAIL: Search did not filter out mismatched batches.');
    process.exit(1);
  }
  if (!tbodyEl.innerHTML.includes('Quantum Beta')) {
    console.error('FAIL: Search filtered out matching batch.');
    process.exit(1);
  }
  console.log('✓ Verified search text correctly filters batches.');

  console.log('\n--- TEST 3: Status Filtering ---');
  // Clear search and select Status: "cancelled"
  searchInput.dispatchEvent('input', { target: { value: '' } });
  console.log('Action: Simulate filtering status "cancelled"');
  statusSelect.dispatchEvent('change', { target: { value: 'cancelled' } });

  if (tbodyEl.innerHTML.includes('Calculus Alpha') || tbodyEl.innerHTML.includes('Quantum Beta')) {
    console.error('FAIL: Status filter did not filter out active/inactive batches.');
    process.exit(1);
  }
  if (!tbodyEl.innerHTML.includes('Organic Chem Gamma')) {
    console.error('FAIL: Status filter did not keep cancelled batch.');
    process.exit(1);
  }
  console.log('✓ Verified status filter works correctly.');

  console.log('\n--- TEST 4: Day-of-Week Filtering ---');
  // Reset status filter and select Day: "Monday"
  statusSelect.dispatchEvent('change', { target: { value: '' } });
  console.log('Action: Simulate filtering day "Monday"');
  daySelect.dispatchEvent('change', { target: { value: 'Monday' } });

  if (tbodyEl.innerHTML.includes('Quantum Beta') || tbodyEl.innerHTML.includes('Organic Chem Gamma')) {
    console.error('FAIL: Day filter did not filter out batches not running on Monday.');
    process.exit(1);
  }
  if (!tbodyEl.innerHTML.includes('Calculus Alpha')) {
    console.error('FAIL: Day filter did not keep Monday batch.');
    process.exit(1);
  }
  console.log('✓ Verified day of week filter works correctly.');

  console.log('\n--- TEST 5: Dynamic Course & Teacher Option Verification ---');
  // Verify dropdown dynamic values populate properly
  console.log('Action: Verify Course & Teacher dropdown HTML options');
  const pageContentHtml = pageContent.innerHTML;
  if (!pageContentHtml.includes('value="Advanced Mathematics for Grade 10"') || !pageContentHtml.includes('value="Introductory Quantum Physics"') || !pageContentHtml.includes('value="Basic Organic Chemistry"')) {
    console.error('FAIL: Course filter dropdown options are not dynamically populated correctly.');
    process.exit(1);
  }
  if (!pageContentHtml.includes('value="Albus Dumbledore"') || !pageContentHtml.includes('value="Severus Snape"') || !pageContentHtml.includes('value="Minerva McGonagall"')) {
    console.error('FAIL: Teacher filter dropdown options are not dynamically populated correctly.');
    process.exit(1);
  }
  console.log('✓ Verified dynamic course & teacher dropdown options generated perfectly.');

  console.log('\n--- TEST 6: Reset Filters ---');
  // Call reset filters
  console.log('Action: Invoke resetBatchFilters()');
  context.resetBatchFilters();
  if (tbodyEl.innerHTML.includes('Calculus Alpha') && tbodyEl.innerHTML.includes('Quantum Beta') && tbodyEl.innerHTML.includes('Organic Chem Gamma')) {
    console.log('✓ Verified reset filters restored all batches successfully.');
  } else {
    console.error('FAIL: Reset filters did not restore all batches.');
    process.exit(1);
  }

  console.log('\n🎉 ALL DOM BATCHES INTEGRATION TESTS PASSED SUCCESSFULLY! Redesign logic is 100% sound. 🎉');
}

runTest();
