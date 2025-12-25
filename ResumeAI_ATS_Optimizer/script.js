// ============================================
// CONFIGURATION & CONSTANTS
// ============================================
const COMMON_STOPWORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
  'from','as','is','was','are','be','been','being','have','has','had','do','does',
  'did','will','would','should','could','can','may','might','must','shall','i','you',
  'he','she','it','we','they','them','that','this','these','those','my','your',
  'his','her','its','our','their','what','which','who','when','where','why','how',
  'all','each','every','both','some','any','no','nor','not','only','same','such',
  'just','also','into','through','during','before','after','above','below','up','down',
  'out','off','over','under','again','further','then','once','here','there'
]);

// Generic action verbs – works across industries.
const ACTION_VERBS = [
  'led','managed','developed','created','implemented','designed','built','launched',
  'established','coordinated','directed','oversaw','spearheaded','pioneered','orchestrated',
  'streamlined','optimized','improved','enhanced','increased','achieved','exceeded',
  'accomplished','delivered','executed','transformed','revolutionized','innovated','collaborated',
  'facilitated','negotiated','resolved','analyzed','evaluated','assessed','identified',
  'proposed','suggested','recommended','initiated','started','expanded',
  'scaled','reduced','minimized','eliminated','automated','integrated','consolidated',
  'merged','restructured','reorganized','recruited','trained','mentored','coached',
  'supervised','supported','assisted','enabled','empowered','motivated','inspired'
];

// Common section headings used by ATS parsers.[web:24][web:35]
const SECTION_KEYWORDS = [
  'summary','professional summary','profile','about',
  'experience','work experience','professional experience',
  'education','academic','qualifications',
  'skills','technical skills','key skills','core competencies',
  'projects','personal projects','academic projects',
  'certifications','licenses',
  'awards','honors','achievements',
  'volunteer','volunteering'
];


// ============================================
// DOM ELEMENTS
// ============================================
const resumeInput = document.getElementById('resumeInput');
const jobDescInput = document.getElementById('jobDescInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearBtn = document.getElementById('clearBtn');
const resultsSection = document.getElementById('results');
const scoreCard = document.getElementById('scoreCard');
const scoreValue = document.getElementById('scoreValue');
const scoreText = document.getElementById('scoreText');
const scoreDescription = document.getElementById('scoreDescription');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const matchedKeywordsDiv = document.getElementById('matchedKeywords');
const missingKeywordsDiv = document.getElementById('missingKeywords');
const suggestionsList = document.getElementById('suggestionsList');


// ============================================
// EVENT LISTENERS
// ============================================
analyzeBtn.addEventListener('click', analyzeResume);
clearBtn.addEventListener('click', clearAll);
tabs.forEach(tab => {
  tab.addEventListener('click', switchTab);
});


// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================
function analyzeResume() {
  const resume = resumeInput.value.trim();
  const jobDesc = jobDescInput.value.trim();

  if (!resume || !jobDesc) {
    alert('Please fill in both resume and job description fields');
    return;
  }

  analyzeBtn.classList.add('loading');
  analyzeBtn.disabled = true;

  setTimeout(() => {
    analyzeBtn.classList.remove('loading');
    analyzeBtn.disabled = false;

    const analysis = performAnalysis(resume, jobDesc);
    displayResults(analysis);
    resultsSection.classList.add('active');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 800);
}


// ============================================
// KEYWORD EXTRACTION & ANALYSIS
// ============================================
function extractKeywords(text) {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s\-+#]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !COMMON_STOPWORDS.has(word));

  const frequency = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  return Object.keys(frequency)
    .sort((a, b) => frequency[b] - frequency[a])
    .slice(0, 80) // slightly higher cap to better cover niche roles
    .map(keyword => ({ keyword, count: frequency[keyword] }));
}


// ============================================
// MAIN ANALYSIS LOGIC
// ============================================
function performAnalysis(resume, jobDesc) {
  const jobKeywords = extractKeywords(jobDesc);
  const resumeTextLower = resume.toLowerCase();

  let matchedCount = 0;
  const matched = [];
  const missing = [];

  jobKeywords.forEach(({ keyword, count }) => {
    const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'gi');
    const matches = (resumeTextLower.match(regex) || []).length;

    if (matches > 0) {
      matched.push({ keyword, resumeMatches: matches, jobCount: count });
      matchedCount += 1;
    } else {
      missing.push({ keyword, jobCount: count });
    }
  });

  const atsScore = jobKeywords.length
    ? Math.round((matchedCount / jobKeywords.length) * 100)
    : 0;

  const resumeWords = resumeTextLower.split(/\s+/);
  const actionVerbsUsed = ACTION_VERBS.filter(verb =>
    resumeWords.some(word => word.includes(verb))
  ).length;

  const sectionsPresent = detectSections(resume);
  const lengthInWords = resumeWords.filter(Boolean).length;

  const suggestions = generateSuggestions({
    resume,
    matched,
    missing,
    actionVerbsUsed,
    sectionsPresent,
    atsScore,
    lengthInWords
  });

  return {
    atsScore,
    matchedKeywords: matched,
    missingKeywords: missing.slice(0, 15),
    totalJobKeywords: jobKeywords.length,
    actionVerbsUsed,
    sectionsPresent,
    suggestions
  };
}


// ============================================
// SUGGESTION GENERATION (CONTENT + FORMAT)
// ============================================
function generateSuggestions({
  resume,
  matched,
  missing,
  actionVerbsUsed,
  sectionsPresent,
  atsScore,
  lengthInWords
}) {
  const suggestions = [];
  const resumeLower = resume.toLowerCase();

  // 1. Missing job keywords (any domain)
  if (missing.length > 0) {
    const topMissing = missing.slice(0, 8).map(item => item.keyword).join(', ');
    suggestions.push({
      type: 'keywords',
      title: '🎯 Add Missing Role Keywords',
      text: `Important terms from the job description are not present in your resume. Naturally include these where they reflect your real experience: ${topMissing}.`,
      example: `Pattern: [Action Verb] + [Skill/Tool] + [Result].\nExample: "Implemented ${missing[0]?.keyword || 'key feature'} to improve performance by 20%."`
    });
  }

  // 2. Keyword density low even if score is okay
  if (atsScore >= 50 && atsScore < 80 && matched.length > 0) {
    suggestions.push({
      type: 'keywords',
      title: '📌 Reinforce Core Keywords',
      text: 'You match many keywords but can repeat the most critical ones 2–3 times in different sections (summary, experience, skills) while staying natural.',
      example: 'Example: Mention "React" in your summary, skills list, and at least one experience bullet if it is a core requirement.'
    });
  }

  // 3. Strong action verbs
  if (actionVerbsUsed < 5) {
    suggestions.push({
      type: 'action-verb',
      title: '💪 Start Bullets With Power Verbs',
      text: 'Many bullets do not start with strong action verbs. Replace weak openers like "Responsible for" with specific, impactful verbs.',
      example: 'Replace: "Worked on backend APIs"\nWith: "Developed and optimized REST APIs, reducing average response time by 35%."'
    });
  }

  // 4. Quantifiable impact
  if (!resume.match(/\d+%|\d+\s*(k|million|billion)|improved|increased|reduced|saved|grew/gi)) {
    suggestions.push({
      type: 'metrics',
      title: '📊 Show Measurable Impact',
      text: 'Use numbers to demonstrate impact. ATS and recruiters prioritize resumes with quantifiable achievements.',
      example: 'Example: "Increased user engagement by 27%" or "Reduced page load time from 3.2s to 1.1s."'
    });
  }

  // 5. Basic structure: sections
  const hasSkills = sectionsPresent.includes('skills');
  const hasExperience = sectionsPresent.includes('experience');
  const hasEducation = sectionsPresent.includes('education');

  if (!hasSkills) {
    suggestions.push({
      type: 'formatting',
      title: '🏷️ Add a Clear Skills Section',
      text: 'Include a dedicated "Skills" or "Technical Skills" section with target-job keywords. This is one of the first places ATS scanners and recruiters look.[web:24][web:35]',
      example: 'Skills: JavaScript, React, Node.js, SQL, Git, REST APIs, Problem-Solving'
    });
  }

  if (!hasExperience) {
    suggestions.push({
      type: 'formatting',
      title: '🧱 Add Work/Project Experience Section',
      text: 'Use a "Work Experience" or "Projects" section with bullet points under each entry. This helps ATS correctly interpret your timeline and responsibilities.[web:24][web:28]',
      example: 'Work Experience\nSoftware Intern | Company | 06/2024 – 08/2024\n• Developed feature X using Y, resulting in Z.'
    });
  }

  if (!hasEducation) {
    suggestions.push({
      type: 'formatting',
      title: '🎓 Include an Education Section',
      text: 'Add an "Education" section with degree, institution, and graduation year. Use a simple, consistent date format.[web:24][web:35]',
      example: 'Education\nB.E. Computer Engineering, DYPCOE, Pune — 2026'
    });
  }

  // 6. Length / depth
  if (lengthInWords < 200) {
    suggestions.push({
      type: 'content',
      title: '📝 Add More Detail',
      text: 'Your resume looks short. Add more bullet points that describe your responsibilities, tools used, and impact for each role or project.[web:26][web:35]',
      example: 'For each project, aim for 3–5 bullets: tech stack, what you built, how it helped users or the business.'
    });
  } else if (lengthInWords > 900) {
    suggestions.push({
      type: 'content',
      title: '✂️ Trim and Prioritize',
      text: 'The resume may be too long. Focus on recent experience and remove outdated or low-impact details to keep it concise and ATS-friendly.[web:34][web:35]',
      example: 'Keep most space for the last 5–7 years or your most relevant academic/side projects.'
    });
  }

  // 7. Formatting best practices (generic)
  if (usesComplexFormatting(resume)) {
    suggestions.push({
      type: 'formatting',
      title: '📐 Simplify Formatting for ATS',
      text: 'Avoid tables, text boxes, columns, images, and decorative icons. Use a single-column layout with bullet points and standard fonts for better ATS parsing.[web:24][web:28][web:34]',
      example: 'Use plain text sections like "Work Experience" with • bullets instead of graphics or multi-column designs.'
    });
  }

  // 8. File type hint (for UI / instructions)
  suggestions.push({
    type: 'formatting',
    title: '💾 Use ATS-Friendly File Type',
    text: 'When exporting, prefer .docx or simple PDF as requested in the job posting. Avoid image-based or highly stylized PDFs.[web:24][web:28]',
    example: 'Save as: "YourName_Role_Resume.docx" or a text-based PDF.'
  });

  return suggestions.slice(0, 8);
}


// ============================================
// SECTION DETECTION (GENERIC)
// ============================================
function detectSections(resume) {
  const text = resume.toLowerCase();
  const found = [];

  SECTION_KEYWORDS.forEach(sec => {
    const regex = new RegExp(`\\b${escapeRegex(sec)}\\b`, 'i');
    if (regex.test(text)) {
      if (sec.includes('skill')) found.push('skills');
      else if (sec.includes('experience')) found.push('experience');
      else if (sec.includes('education') || sec.includes('academic')) found.push('education');
      else if (sec.includes('summary') || sec.includes('profile') || sec.includes('about')) found.push('summary');
      else if (sec.includes('project')) found.push('projects');
      else if (sec.includes('certification') || sec.includes('license')) found.push('certifications');
      else if (sec.includes('award') || sec.includes('honor')) found.push('awards');
      else if (sec.includes('volunteer')) found.push('volunteer');
    }
  });

  return Array.from(new Set(found));
}


// ============================================
// SIMPLE FORMAT HEURISTICS
// ============================================
function usesComplexFormatting(text) {
  // Very rough heuristics – just to trigger tips.
  return (
    text.includes('|') ||
    text.includes('│') ||
    text.includes('►') ||
    text.includes('▪') ||
    text.match(/\t{2,}/) ||        // lots of tabs
    text.match(/={4,}|-{4,}/)      // ASCII boxes / separators
  );
}


// ============================================
// DISPLAY RESULTS
// ============================================
function displayResults(analysis) {
  const { atsScore, matchedKeywords, missingKeywords, suggestions } = analysis;

  scoreValue.textContent = `${atsScore}%`;
  scoreCard.className = 'score-card';

  if (atsScore >= 80) {
    scoreCard.classList.add('high');
    scoreText.textContent = '🎉 Great Match!';
    scoreDescription.textContent =
      'Your resume is strongly aligned with this job description and is likely to pass ATS screening.';
  } else if (atsScore >= 50) {
    scoreCard.classList.add('medium');
    scoreText.textContent = '⚠️ Decent Match';
    scoreDescription.textContent =
      'Your resume matches many keywords but still has room to improve. Apply the suggestions below to strengthen it.';
  } else {
    scoreCard.classList.add('low');
    scoreText.textContent = '❌ Needs Improvement';
    scoreDescription.textContent =
      'Your resume is missing key terms and/or structure for this role. Use the suggestions below to optimize it.';
  }

  if (matchedKeywords.length > 0) {
    matchedKeywordsDiv.innerHTML = matchedKeywords.slice(0, 15).map(item => `
      <div class="keyword-item matched">
        <div class="keyword-badge">✓</div>
        <div class="keyword-text">
          <strong>${escapeHtml(item.keyword)}</strong>
          <div class="keyword-count">Found ${item.resumeMatches}× in resume</div>
        </div>
      </div>
    `).join('');
  } else {
    matchedKeywordsDiv.innerHTML =
      '<div class="empty-state"><div class="empty-state-text">No keywords matched</div></div>';
  }

  if (missingKeywords.length > 0) {
    missingKeywordsDiv.innerHTML = missingKeywords.map(item => `
      <div class="keyword-item missing">
        <div class="keyword-badge">✗</div>
        <div class="keyword-text">
          <strong>${escapeHtml(item.keyword)}</strong>
          <div class="keyword-count">Important for this role</div>
        </div>
      </div>
    `).join('');
  } else {
    missingKeywordsDiv.innerHTML =
      '<div class="empty-state"><div class="empty-state-text">No missing keywords</div></div>';
  }

  if (suggestions.length > 0) {
    suggestionsList.innerHTML = suggestions.map(sug => `
      <div class="suggestion-item ${sug.type}">
        <div class="suggestion-title">${sug.title}</div>
        <div class="suggestion-text">${escapeHtml(sug.text)}</div>
        <pre class="suggestion-example">${escapeHtml(sug.example)}</pre>
      </div>
    `).join('');
  } else {
    suggestionsList.innerHTML =
      '<div class="empty-state"><div class="empty-state-text">No suggestions available</div></div>';
  }
}


// ============================================
// TAB SWITCHING
// ============================================
function switchTab(e) {
  const tabName = e.currentTarget.getAttribute('data-tab');

  tabs.forEach(tab => tab.classList.remove('active'));
  e.currentTarget.classList.add('active');

  tabContents.forEach(content => content.classList.remove('active'));
  document.getElementById(`${tabName}-tab`).classList.add('active');
}


// ============================================
// CLEAR ALL
// ============================================
function clearAll() {
  resumeInput.value = '';
  jobDescInput.value = '';
  resultsSection.classList.remove('active');
  resumeInput.focus();
}


// ============================================
// UTILITY FUNCTIONS
// ============================================
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]) || '';
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


// Focus on resume input on load
window.addEventListener('load', () => {
  resumeInput.focus();
});
