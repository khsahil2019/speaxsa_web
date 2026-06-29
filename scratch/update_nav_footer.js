const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../public/landing');
const files = [
  'about.html',
  'blog.html',
  'contact.html',
  'courses.html',
  'faq.html',
  'privacy.html',
  'success-stories.html',
  'teachers.html',
  'terms.html'
];

const targetNav = `<div class="d-flex gap-2 align-items-center">
        <a href="/student" class="btn btn-outline-light btn-sm px-3"><i class="fas fa-graduation-cap me-1"></i>Student</a>
        <a href="/teacher" class="btn btn-spx-primary btn-sm px-3"><i class="fas fa-chalkboard-teacher me-1"></i>Teacher</a>
      </div>`;

const targetNav2 = `<div class="d-flex gap-2 align-items-center">
          <a href="/student" class="btn btn-outline-light btn-sm px-3"><i
              class="fas fa-graduation-cap me-1"></i>Student</a>
          <a href="/teacher" class="btn btn-spx-primary btn-sm px-3"><i
              class="fas fa-chalkboard-teacher me-1"></i>Teacher</a>
        </div>`;

const replacementNav = `<div class="d-flex gap-2 align-items-center flex-wrap">
        <a href="/student" class="btn btn-outline-light btn-sm px-3"><i class="fas fa-graduation-cap me-1"></i>Student</a>
        <a href="/parent" class="btn btn-outline-light btn-sm px-3"><i class="fas fa-user-friends me-1"></i>Parent</a>
        <a href="/teacher" class="btn btn-spx-primary btn-sm px-3"><i class="fas fa-chalkboard-teacher me-1"></i>Teacher</a>
      </div>`;

const targetFooter = `<li><a href="/student">Student Portal Login</a></li>
          <li><a href="/teacher">Teacher Portal Login</a></li>`;

const replacementFooter = `<li><a href="/student">Student Portal Login</a></li>
          <li><a href="/parent">Parent Portal Login</a></li>
          <li><a href="/teacher">Teacher Portal Login</a></li>`;

files.forEach(file => {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace nav
  content = content.replace(targetNav, replacementNav);
  content = content.replace(targetNav2, replacementNav);
  
  // Replace footer
  content = content.replace(targetFooter, replacementFooter);
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated \${file}`);
});
