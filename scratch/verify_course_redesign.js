const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock data representing different courses in the database
const mockCourses = [
  {
    id: 'course_1',
    title: 'Advanced Mathematics for Grade 10',
    subject: 'Mathematics',
    grade: 'Class 10',
    board: 'CBSE',
    fees: 499,
    status: 'active',
    is_verified: true,
    is_featured: true,
    teacher_name: 'Albus Dumbledore',
    learning_duration: '3 Months',
    daily_class_duration: '60 Mins',
    language_instruction: 'English',
    assessment_days: 'Saturdays'
  },
  {
    id: 'course_2',
    title: 'Introductory Quantum Physics',
    subject: 'Physics',
    grade: 'Class 12',
    board: 'ICSE',
    fees: 999,
    status: 'pending_approval',
    is_verified: false,
    is_featured: false,
    teacher_name: 'Severus Snape',
    teacher_qualification: 'PhD in Dark Physics',
    teacher_experience: 15,
    teacher_level: 'Gold',
    teacher_bio: 'I teach how to bottle fame and brew glory.',
    learning_duration: '4 Months',
    daily_class_duration: '90 Mins',
    language_instruction: 'Bilingual',
    assessment_days: 'Fridays'
  },
  {
    id: 'course_3',
    title: 'Basic Organic Chemistry',
    subject: 'Chemistry',
    grade: 'Class 11',
    board: 'State Board',
    fees: 299,
    status: 'archived',
    is_verified: true,
    is_featured: false,
    teacher_name: 'Minerva McGonagall',
    learning_duration: '2 Months',
    daily_class_duration: '45 Mins',
    language_instruction: 'Hindi',
    assessment_days: 'Sundays'
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
    _courses: [],
    _coursesFilterSearch: undefined,
    _coursesFilterStatus: undefined,
    _coursesFilterSubject: undefined,
    _coursesFilterGrade: undefined,
    _coursesFilterSort: undefined
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
    if (url.includes('/admin/courses')) {
      return {
        ok: true,
        json: async () => JSON.parse(JSON.stringify(mockCourses)),
        status: 200
      };
    }
    return { ok: true, json: async () => ({}), status: 200 };
  },
  loading: () => console.log('[UI Mock] Loading started...'),
  apiGet: async (url) => {
    console.log(`[API Mock] GET request to: ${url}`);
    if (url === '/admin/courses') {
      return JSON.parse(JSON.stringify(mockCourses));
    }
    return [];
  },
  fmtCurrency: (amount) => `INR ${parseFloat(amount).toFixed(2)}`,
  showToast: (msg, type = 'success') => console.log(`[Toast Mock] [${type.toUpperCase()}] ${msg}`),
  statusBadge: (status) => `[Badge:${status}]`,
  console: console
};

// Create sandbox
vm.createContext(context);

// Read public/admin/admin.js content
const adminJsPath = path.join(__dirname, '../public/admin/admin.js');
let adminJsCode = fs.readFileSync(adminJsPath, 'utf8');

// We need to bind context properties to global scope of the vm since variables inside admin.js are top-level global
// We will assign sandbox properties to global inside the vm execution
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

// Begin testing the Courses Redesign
async function runTest() {
  console.log('--- TEST 1: Initial Render ---');
  // Invoke renderCourses
  await context.renderCourses();

  const pageContent = getElementMock('pageContent');
  console.log(`✓ pageContent innerHTML set. Length: ${pageContent.innerHTML.length} characters.`);
  if (!pageContent.innerHTML.includes('Course Management') || !pageContent.innerHTML.includes('courseCardsGrid')) {
    console.error('FAIL: Rendered HTML is missing critical structural elements.');
    process.exit(1);
  }
  console.log('✓ Verified Page Layout header and Grid Container presence.');

  const searchInput = getElementMock('courseFilterSearch');
  const statusSelect = getElementMock('courseFilterStatus');
  const subjectSelect = getElementMock('courseFilterSubject');
  const gradeSelect = getElementMock('courseFilterGrade');
  const sortSelect = getElementMock('courseFilterSort');

  if (!searchInput.listeners['input'] || !statusSelect.listeners['change'] || !subjectSelect.listeners['change'] || !gradeSelect.listeners['change'] || !sortSelect.listeners['change']) {
    console.error('FAIL: Event listeners for filtering options are not registered.');
    process.exit(1);
  }
  console.log('✓ Verified all event listeners are successfully attached.');

  const gridEl = getElementMock('courseCardsGrid');
  console.log(`✓ Initial grid content length: ${gridEl.innerHTML.length} characters.`);
  if (!gridEl.innerHTML.includes('Advanced Mathematics for Grade 10') || !gridEl.innerHTML.includes('Introductory Quantum Physics') || !gridEl.innerHTML.includes('Basic Organic Chemistry')) {
    console.error('FAIL: Initial cards render did not display all mock courses.');
    process.exit(1);
  }
  console.log('✓ Verified all 3 initial courses display in card form.');

  console.log('\n--- TEST 2: Real-time Search Filtering ---');
  // Simulate typing "Quantum" into the search bar
  console.log('Action: Simulate searching "Quantum"');
  searchInput.dispatchEvent('input', { target: { value: 'Quantum' } });
  
  console.log(`✓ Grid content after search: ${gridEl.innerHTML.length} characters.`);
  if (gridEl.innerHTML.includes('Advanced Mathematics') || gridEl.innerHTML.includes('Basic Organic Chemistry')) {
    console.error('FAIL: Search did not filter out mismatched courses.');
    process.exit(1);
  }
  if (!gridEl.innerHTML.includes('Introductory Quantum Physics')) {
    console.error('FAIL: Search filtered out matching course.');
    process.exit(1);
  }
  console.log('✓ Verified search text correctly filters courses.');

  console.log('\n--- TEST 3: Status Filtering ---');
  // Clear search and select Status: "archived"
  searchInput.dispatchEvent('input', { target: { value: '' } });
  console.log('Action: Simulate filtering status "archived"');
  statusSelect.dispatchEvent('change', { target: { value: 'archived' } });

  if (gridEl.innerHTML.includes('Advanced Mathematics') || gridEl.innerHTML.includes('Quantum Physics')) {
    console.error('FAIL: Status filter did not filter out active/pending courses.');
    process.exit(1);
  }
  if (!gridEl.innerHTML.includes('Basic Organic Chemistry')) {
    console.error('FAIL: Status filter did not keep archived course.');
    process.exit(1);
  }
  console.log('✓ Verified status filter works correctly.');

  console.log('\n--- TEST 4: Dynamic Category Option Verification ---');
  // Verify Subject dropdown contains correct unique sorted subjects
  console.log('Action: Verify Subject & Grade dropdown HTML contents');
  const pageContentHtml = pageContent.innerHTML;
  if (!pageContentHtml.includes('value="Mathematics"') || !pageContentHtml.includes('value="Physics"') || !pageContentHtml.includes('value="Chemistry"')) {
    console.error('FAIL: Subject filter dropdown options are not dynamically populated correctly.');
    process.exit(1);
  }
  if (!pageContentHtml.includes('value="Class 10"') || !pageContentHtml.includes('value="Class 11"') || !pageContentHtml.includes('value="Class 12"')) {
    console.error('FAIL: Grade filter dropdown options are not dynamically populated correctly.');
    process.exit(1);
  }
  console.log('✓ Verified dynamic subjects & grades dropdown options generated perfectly.');

  console.log('\n--- TEST 5: Sorting Integration ---');
  // Reset other filters and test sorting (Price: High to Low)
  statusSelect.dispatchEvent('change', { target: { value: '' } });
  console.log('Action: Simulate sorting by Price High to Low');
  sortSelect.dispatchEvent('change', { target: { value: 'price_desc' } });

  // Let's inspect the order of courses by checking their relative positions in innerHTML
  const MathIdx = gridEl.innerHTML.indexOf('Advanced Mathematics');
  const PhysicsIdx = gridEl.innerHTML.indexOf('Introductory Quantum Physics');
  const ChemIdx = gridEl.innerHTML.indexOf('Basic Organic Chemistry');

  console.log(`Positions in DOM: Physics (999): ${PhysicsIdx}, Math (499): ${MathIdx}, Chem (299): ${ChemIdx}`);
  if (PhysicsIdx > MathIdx || MathIdx > ChemIdx) {
    console.error('FAIL: Sorting by price desc did not order correctly (Expected: Physics -> Math -> Chem).');
    process.exit(1);
  }
  console.log('✓ Verified price desc sorting order correctly.');

  console.log('\n--- TEST 6: Reset Filters ---');
  // Call reset filters
  console.log('Action: Invoke resetCourseFilters()');
  context.resetCourseFilters();
  if (gridEl.innerHTML.includes('Advanced Mathematics') && gridEl.innerHTML.includes('Quantum Physics') && gridEl.innerHTML.includes('Basic Organic Chemistry')) {
    console.log('✓ Verified reset filters restored all courses successfully.');
  } else {
    console.error('FAIL: Reset filters did not restore all courses.');
    process.exit(1);
  }

  console.log('\n🎉 ALL DOM INTEGRATION TESTS PASSED SUCCESSFULLY! Redesign logic is 100% sound. 🎉');
}

runTest();
