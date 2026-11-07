import {
  analyseIncident,
  getIncidentHistory,
  getMemoryInsights,
  getServiceStatus,
  isDemoMode,
  submitFeedback,
} from "./api.js";
import { initTheme } from "./theme.js";

const state = {
  page: "dashboard",
  analysis: null,
  incidentRecords: [],
  historyFilters: { search: "", service: "", environment: "", severity: "", outcome: "", sort: "newest" },
  historyLoading: false,
  historyRequestId: 0,
  historyOptionsLoaded: false,
  submitting: false,
  mobileNavOpen: false,
};

const main = document.querySelector("#main-content");
const nav = document.querySelector("#primary-nav");
const dialog = document.querySelector("#detail-dialog");
const toastRegion = document.querySelector("#toast-region");
const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[character]));

const pageDetails = {
  dashboard: ["Incident Response Dashboard", "Every incident leaves a lesson. Use historical outcomes to make the next response more informed."],
  "new-incident": ["Report an incident", "Share the symptoms and context. IncidentIQ compares the report with available incident memory."],
  "incident-history": ["Incident history", "Search previous incidents and inspect the causes, environments, and outcomes recorded along the way."],
  "memory-insights": ["Memory insights", "A transparent view of incident patterns and fix outcomes represented in the available memory."],
};

initTheme();
bindGlobalEvents();
renderServiceStatus();
renderPage();

function bindGlobalEvents() {
  nav.addEventListener("click", (event) => {
    const link = event.target.closest("[data-page]");
    if (!link) return;
    event.preventDefault();
    navigate(link.dataset.page);
  });

  document.querySelector(".brand[href='#dashboard']")?.addEventListener("click", (event) => {
    event.preventDefault();
    navigate("dashboard");
  });
  document.querySelector(".mobile-topbar .brand[href='#dashboard']")?.addEventListener("click", (event) => {
    event.preventDefault();
    navigate("dashboard");
  });

  document.querySelector("#mobile-menu-button").addEventListener("click", toggleMobileNav);
  document.querySelector("#sidebar-scrim").addEventListener("click", closeMobileNav);

  main.addEventListener("click", handleMainClick);
  main.addEventListener("submit", handleFormSubmit);
  main.addEventListener("input", handleHistoryInput);
  main.addEventListener("change", handleHistoryChange);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
    if (event.target.closest("[data-close-dialog]")) dialog.close();
  });
  dialog.addEventListener("cancel", () => dialog.close());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMobileNav();
  });
  window.addEventListener("hashchange", () => {
    const target = window.location.hash.slice(1);
    if (pageDetails[target]) navigate(target, false);
  });
}

function navigate(page, updateHash = true) {
  if (!pageDetails[page]) return;
  state.page = page;
  if (dialog.open) dialog.close();
  closeMobileNav();
  if (updateHash && window.location.hash !== `#${page}`) history.replaceState(null, "", `#${page}`);
  renderPage();
  main.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderPage() {
  for (const link of nav.querySelectorAll("[data-page]")) {
    if (link.dataset.page === state.page) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  const [title, subtitle] = pageDetails[state.page];
  const action = state.page === "dashboard" ? `<button class="primary-button" type="button" data-action="navigate" data-page="new-incident"><span aria-hidden="true">＋</span> Report incident</button>` : "";
  const pageShell = state.page === "dashboard"
    ? dashboardPage()
    : `<div class="content-wrap">${pageHeader(title, subtitle, action)}${demoBanner()}${pageContent()}</div>`;
  main.innerHTML = pageShell;
}

function pageHeader(title, subtitle, action = "") {
  return `<header class="page-heading"><div class="heading-copy"><div class="eyebrow">INCIDENTIQ / RESPONSE WORKSPACE</div><h1>${escapeHTML(title)}</h1><p class="subtitle">${escapeHTML(subtitle)}</p></div>${action}</header>`;
}

function demoBanner() {
  if (!isDemoMode()) return "";
  return `<div class="demo-banner" role="note"><strong>DEMO MODE</strong><span>Illustrative incidents, memory, analysis and analytics only. No live AI or Hindsight service is connected. Feedback is simulated in this browser session and is not persisted externally.</span></div>`;
}

function pageContent() {
  if (state.page === "dashboard") return dashboardPage();
  if (state.page === "new-incident") return newIncidentPage();
  if (state.page === "incident-history") return historyPage();
  return insightsPage();
}

async function getDashboardData() {
  const [insights, records] = await Promise.all([getMemoryInsights(), getIncidentHistory()]);
  return { insights, records };
}

function dashboardPage() {
  queueMicrotask(async () => {
    if (state.page !== "dashboard") return;
    try {
      const { insights, records } = await getDashboardData();
      if (state.page !== "dashboard") return;
      main.innerHTML = `<div class="content-wrap">${dashboardHero(records)}${demoBanner()}${dashboardContent(insights, records)}</div>`;
    } catch (error) {
      if (state.page === "dashboard") showPageError(error, "dashboard");
    }
  });
  return `<div class="content-wrap"><div class="loading-shell" role="status"><span class="spinner"></span>Loading incident overview…</div></div>`;
}

function dashboardHero(records) {
  const connectedMemories = [
    { record: records.find((item) => item.outcome === "Worked"), outcome: "Worked", position: { x: 300, y: 98 } },
    { record: records.find((item) => item.outcome === "Failed"), outcome: "Failed", position: { x: 300, y: 315 } },
  ].filter((memory) => memory.record);
  const memoryTooltip = (record, outcome) => [
    record.title,
    record.id,
    `Outcome: ${outcome}`,
    record.rootCause && `Root cause: ${record.rootCause}`,
    record.fix && `Attempted fix: ${record.fix}`,
  ].filter(Boolean).join(" · ");
  return `<section class="dashboard-hero" aria-labelledby="dashboard-hero-heading">
    <div class="hero-copy">
      <div class="hero-kicker"><span class="signal-pulse"></span> INCIDENT RESPONSE / BUILT ON EXPERIENCE</div>
      <h1 id="dashboard-hero-heading">Every incident<br>leaves a <span>lesson.</span></h1>
      <p>Production gets complicated. Your team's memory shouldn't. IncidentIQ connects today's symptoms to yesterday's fixes—and the ones that failed.</p>
      <div class="hero-actions">
        <button class="primary-button" type="button" data-action="navigate" data-page="new-incident"><span aria-hidden="true">↗</span> Report an incident</button>
        <button class="secondary-button" type="button" data-action="navigate" data-page="memory-insights">Explore memory <span aria-hidden="true">→</span></button>
      </div>
      <div class="hero-proof"><span class="proof-mark">↳</span> Not another incident inbox. A response that remembers.</div>
    </div>
    <div class="hero-visual" aria-label="Illustration of the IncidentIQ memory engine connecting previous incidents to a current investigation">
      <div class="visual-caption"><span>IIQ / MEMORY ENGINE</span><span class="visual-state"><i></i> ${isDemoMode() ? "SAMPLE DATA" : "TEAM MEMORY"}</span></div>
      <svg class="memory-network" viewBox="0 0 620 390" role="img" aria-labelledby="network-title network-description">
        <title id="network-title">IncidentIQ incident memory connections</title>
        <desc id="network-description">A central incident investigation is linked to two previous incidents, one successful and one unsuccessful.</desc>
        <defs>
          <pattern id="micro-grid" width="19" height="19" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="currentColor" opacity=".34"/></pattern>
          <radialGradient id="memory-glow"><stop stop-color="#FF6900" stop-opacity=".16"/><stop offset="1" stop-color="#FF6900" stop-opacity="0"/></radialGradient>
        </defs>
        <rect width="620" height="390" rx="24" fill="url(#micro-grid)"/>
        <circle cx="337" cy="194" r="170" fill="url(#memory-glow)"/>
        <path class="network-link network-link-success" d="M348 187C328 137 316 120 300 98"/>
        <path class="network-link network-link-failed" d="M351 207c-22 53-31 81-51 108"/>
        <path class="network-link network-link-muted" d="M385 192c64-3 100-3 160 1"/>
        ${connectedMemories.map(({ record, outcome, position }) => `<a class="network-node-link" href="#incident-history" data-action="detail" data-incident-id="${escapeHTML(record.id)}" aria-label="View details for ${escapeHTML(record.title)}, outcome ${escapeHTML(outcome)}" aria-haspopup="dialog" title="${escapeHTML(memoryTooltip(record, outcome))}"><title>${escapeHTML(memoryTooltip(record, outcome))}</title><circle class="network-node-hit-area" cx="${position.x}" cy="${position.y}" r="16"/><circle class="network-node ${outcome === "Worked" ? "node-success" : "node-failed"}" cx="${position.x}" cy="${position.y}" r="6"/></a>`).join("")}
        <circle class="network-node node-active" cx="548" cy="193" r="6"/>
        <circle class="network-node node-center" cx="350" cy="197" r="9"/>
        <circle class="network-ring" cx="350" cy="197" r="30"/>
        <circle class="network-ring network-ring-outer" cx="350" cy="197" r="45"/>
      </svg>
      ${connectedMemories.map(({ record, outcome }) => `<button class="visual-memory ${outcome === "Worked" ? "visual-memory-success" : "visual-memory-failed"}" type="button" data-action="detail" data-incident-id="${escapeHTML(record.id)}" aria-haspopup="dialog" aria-label="View details for ${escapeHTML(record.title)}, outcome ${escapeHTML(outcome)}" title="${escapeHTML(memoryTooltip(record, outcome))}"><span class="memory-node-icon" aria-hidden="true">${outcome === "Worked" ? "↗" : "↘"}</span><span><b>${escapeHTML(record.title)}</b><small>${escapeHTML(record.id)} · ${escapeHTML(outcome.toUpperCase())}</small></span><i class="outcome-light" aria-hidden="true"></i></button>`).join("")}
      <div class="visual-core"><span class="core-orbit orbit-one"></span><span class="core-orbit orbit-two"></span><span class="core-mark">◈</span><b>INCIDENT<br>IN CONTEXT</b><small>${connectedMemories.length ? `LINKED TO ${connectedMemories.length} ${connectedMemories.length === 1 ? "MEMORY" : "MEMORIES"}` : "NO HISTORICAL MEMORIES"}</small></div>
      <div class="visual-current"><span class="current-dot"></span><span><b>CURRENT REPORT</b><small>Submit an incident to begin</small></span></div>
      <div class="visual-index">MEMORY GRAPH / 01—04</div>
    </div>
  </section>`;
}

function dashboardContent(insights, records) {
  const counts = insights.counts;
  const lessons = Array.isArray(insights.lessons) ? insights.lessons : [];
  return `
    <section class="metrics-grid" aria-label="Incident statistics">
      ${metric("TOTAL INCIDENTS ANALYSED", counts.incidentsAnalysed, "Records in incident history")}
      ${metric("SUCCESSFUL RESOLUTIONS", counts.successfulResolutions, "Outcomes marked WORKED")}
      ${metric("FAILED RESOLUTIONS", counts.failedResolutions, "Outcomes marked FAILED")}
      ${metric("REMEMBERED INCIDENTS", counts.rememberedIncidents, "Incidents with recorded outcomes")}
    </section>
    <div class="dashboard-grid">
      <section aria-labelledby="recent-heading"><div class="section-heading"><div><h2 id="recent-heading">Recent incidents</h2><p>Historical cases and this session's reports</p></div><button class="text-link" type="button" data-action="navigate" data-page="incident-history">View history →</button></div>
        <div class="panel recent-list">${records.slice(0, 5).map(dashboardIncidentRow).join("") || emptyState("No incidents yet", "New incident reports will appear here.")}</div>
      </section>
      <section aria-labelledby="lessons-heading"><div class="section-heading"><div><h2 id="lessons-heading">Recent lessons learned</h2><p>Guidance returned by the incident service</p></div></div>
        <div class="lesson-list">${lessons.length ? lessons.slice(0, 3).map(dashboardLessonCard).join("") : emptyState("No lessons available", "The incident service has not returned any lessons yet.")}</div>
      </section>
    </div>
    <section class="quick-action" aria-label="Quick incident report"><div><strong>Something needs attention?</strong><span>Start with the symptoms. Bring previous incident learnings into the response.</span></div><button class="primary-button" type="button" data-action="navigate" data-page="new-incident">＋ New incident</button></section>`;
}

function metric(label, value, note) {
  return `<article class="metric-card"><div class="metric-label">${escapeHTML(label)}</div><div class="metric-value">${Number(value) || 0}</div><div class="metric-note">${escapeHTML(note)}</div></article>`;
}

function dashboardIncidentRow(record) {
  return `<button class="incident-row" type="button" data-action="detail" data-incident-id="${escapeHTML(record.id)}" aria-label="View details for ${escapeHTML(record.title)}">
    <div><div class="incident-title">${escapeHTML(record.title)}</div><div class="incident-meta">${escapeHTML(record.id)} · ${escapeHTML(record.environment)} · ${formatDate(record.createdAt)}</div></div>
    <div class="incident-service">${escapeHTML(record.service)}</div>
    <div>${severityBadge(record.severity)}</div>
    <div>${outcomeBadge(record.outcome)}</div>
  </button>`;
}

function dashboardLessonCard(lesson, index) {
  return `<article class="lesson-card">
    <span class="lesson-icon" aria-hidden="true">◈</span>
    <div class="lesson-content">
      <div class="lesson-card-topline"><span class="lesson-number">LESSON 0${index + 1}</span></div>
      <p class="lesson-text">${escapeHTML(lesson)}</p>
    </div>
  </article>`;
}

function newIncidentPage() {
  const analysis = state.analysis ? renderAnalysis(state.analysis) : "";
  return `<section class="panel form-panel">
    <div class="form-intro"><h2>Incident details</h2><p>Provide enough context to compare this report with relevant historical incidents. Do not include passwords, API keys, or other secrets.</p></div>
    <form class="incident-form" id="incident-form" novalidate>
      <div class="form-grid">
        <div class="field field-full"><label for="incident-description">Incident description <span aria-hidden="true">*</span></label><textarea id="incident-description" name="description" maxlength="5000" required placeholder="What changed? What are users or systems experiencing? Include impact and timing."></textarea></div>
        <div class="field"><label for="incident-service">Affected service <span aria-hidden="true">*</span></label><input id="incident-service" name="service" maxlength="100" required placeholder="e.g. checkout-api"></div>
        <div class="field"><label for="incident-environment">Environment</label><select id="incident-environment" name="environment"><option>Production</option><option>Staging</option><option>Development</option></select></div>
        <div class="field"><label for="incident-severity">Severity</label><select id="incident-severity" name="severity"><option>Critical</option><option selected>High</option><option>Medium</option><option>Low</option></select></div>
        <div class="field field-full"><label for="incident-logs">Error logs or technical details <span class="field-hint">Optional · redact sensitive data</span></label><textarea class="logs-area" id="incident-logs" name="logs" maxlength="5000" placeholder="Paste a short, redacted error excerpt (optional)"></textarea></div>
      </div>
      <div class="form-error-slot" id="form-error" aria-live="polite"></div>
      <div class="form-footer"><span class="privacy-note">Analysis uses Hindsight memory and an LLM. Do not include secrets.</span><button class="primary-button" type="submit" id="analyse-button">◈ &nbsp; Analyse incident</button></div>
    </form>
  </section>${analysis}`;
}

function renderAnalysis(analysis) {
  const memories = Array.isArray(analysis.memories) ? analysis.memories : [];
  const lessons = Array.isArray(analysis.lessons) ? analysis.lessons : [];
  return `<section class="analysis-section" id="analysis-results" aria-labelledby="analysis-heading">
    <div class="analysis-topline"><div class="analysis-heading-copy"><span class="analysis-label">ANALYSIS · ${isDemoMode() ? "DEMO PROVIDER" : "BACKEND PROVIDER"}</span><h2 id="analysis-heading">${escapeHTML(analysis.title)}</h2><p>${escapeHTML(analysis.service)} · ${escapeHTML(analysis.environment)} · ${escapeHTML(analysis.severity)} · ${escapeHTML(analysis.incidentId)}</p></div>${severityBadge(analysis.severity)}</div>
    <div class="analysis-intro">${escapeHTML(analysis.summary)}</div>
    <div class="section-heading"><div><h2>Recommended fixes</h2><p>Evidence and previous outcomes are shown with each suggestion.</p></div></div>
    <div class="recommendations-list">${analysis.recommendations.map((recommendation) => recommendationCard(analysis, recommendation)).join("")}</div>
    <section class="memory-section" aria-labelledby="memory-heading">
      <div class="section-heading"><div><h2 id="memory-heading">What the agent remembers</h2><p>Historical evidence connected to this incident—not generic chat context.</p></div></div>
      <div class="memory-intro"><span class="lesson-icon" aria-hidden="true">⌘</span><div><strong>WHY THESE MEMORIES MATTER</strong><p>IncidentIQ compares symptoms, service, and environment to previous incidents, then shows which fixes worked or failed and why those cases are relevant.</p></div></div>
      ${memories.length ? `<div class="memory-timeline">${memories.map(memoryCard).join("")}</div>` : emptyState("No matching historical memory", isDemoMode() ? "No sufficiently similar incident was found in the demo memory. Recommendations are marked as having insufficient historical evidence." : "No sufficiently similar incident was returned from available team memory. Recommendations are marked as having insufficient historical evidence.")}
      ${lessons.length ? `<div class="lessons-panel"><h3>Lessons from Previous Incidents</h3><ul>${lessons.map((lesson) => `<li>${escapeHTML(lesson)}</li>`).join("")}</ul></div>` : ""}
    </section>
  </section>`;
}

function recommendationCard(analysis, recommendation) {
  const evidenceClass = recommendation.evidenceStatus === "Previously successful" ? "evidence-success"
    : recommendation.evidenceStatus === "Previously unsuccessful" ? "evidence-failed"
      : recommendation.evidenceStatus === "Mixed historical outcomes" ? "evidence-mixed" : "evidence-none";
  const feedback = recommendation.feedback;
  const memoriesById = new Map((recommendation.historicalEvidence || analysis.memories || []).map((memory) => [memory.id, memory]));
  const related = recommendation.relatedIncidentIds.length
    ? `<ul class="evidence-list">${recommendation.relatedIncidentIds.map((id) => {
      const memory = memoriesById.get(id);
      return `<li class="evidence-item">
        <div class="evidence-item-heading"><button class="incident-reference" type="button" data-action="detail" data-incident-id="${escapeHTML(id)}">${escapeHTML(id)}</button>${memory ? outcomeBadge(memory.outcome) : ""}</div>
        <p>${escapeHTML(memory?.relevance || memory?.description || "This incident was included in the provider's historical evidence for this recommendation.")}</p>
        ${memory?.fix ? `<span class="evidence-fix"><strong>Recorded fix:</strong> ${escapeHTML(memory.fix)}</span>` : ""}
      </li>`;
    }).join("")}</ul>`
    : `<span>No matching historical evidence</span>`;
  const feedbackClass = feedback ? ` feedback-recorded feedback-${feedback.toLowerCase()}` : "";
  const feedbackLabel = feedback ? `${feedback === "Worked" ? "✓" : "×"} &nbsp; ${feedback.toUpperCase()} · RECORDED` : "";
  return `<article class="recommendation-card${feedbackClass}">
    <div class="recommendation-heading"><h3>${escapeHTML(recommendation.title)}</h3><span class="badge ${evidenceClass}">${escapeHTML(recommendation.evidenceStatus)}</span></div>
    <p class="recommendation-description">${escapeHTML(recommendation.description)}</p>
    <div class="reason-block"><strong>Why this recommendation</strong><p>${escapeHTML(recommendation.reason)}</p></div>
    <ol class="steps-list">${recommendation.steps.map((step) => `<li>${escapeHTML(step)}</li>`).join("")}</ol>
    <div class="recommendation-evidence">
      <div class="evidence-section-heading"><strong>Historical evidence</strong><span>Why this fix was selected</span></div>
      <div class="recommendation-stats">
        <span class="success-stat"><b>${Number(recommendation.previousSuccesses) || 0}</b> previous successes</span>
        <span class="failure-stat"><b>${Number(recommendation.previousFailures) || 0}</b> previous failures</span>
      </div>
      <div class="related-incidents"><strong>Related incidents</strong>${related}</div>
    </div>
    <div class="feedback-row">
      <div class="feedback-actions">
        <button class="feedback-button feedback-worked ${feedback === "Worked" ? "is-selected" : ""}" type="button" data-action="feedback" data-incident-id="${escapeHTML(analysis.incidentId)}" data-fix-id="${escapeHTML(recommendation.id)}" data-worked="true" aria-pressed="${feedback === "Worked"}" ${feedback ? "disabled" : ""}>${feedback === "Worked" ? feedbackLabel : "✓ &nbsp; WORKED"}</button>
        <button class="feedback-button feedback-failed ${feedback === "Failed" ? "is-selected" : ""}" type="button" data-action="feedback" data-incident-id="${escapeHTML(analysis.incidentId)}" data-fix-id="${escapeHTML(recommendation.id)}" data-worked="false" aria-pressed="${feedback === "Failed"}" ${feedback ? "disabled" : ""}>${feedback === "Failed" ? feedbackLabel : "× &nbsp; FAILED"}</button>
      </div>
      <span class="feedback-note${feedback ? " feedback-confirmed" : ""}" role="${feedback ? "status" : "note"}">${feedback
    ? escapeHTML(recommendation.feedbackMessage || "Outcome confirmed by the service.")
    : "Record the observed outcome after trying this fix."}</span>
    </div>
  </article>`;
}

function memoryCard(memory) {
  const outcomeClass = memory.outcome === "Worked" ? "memory-worked" : "memory-failed";
  return `<article class="memory-card ${outcomeClass}">
    <div class="memory-card-header"><h3>${escapeHTML(memory.title)}</h3><span class="demo-chip">${memorySourceLabel(memory)}</span></div>
    <div class="memory-meta"><span>${escapeHTML(memory.id)}</span><span>${escapeHTML(memory.service)}</span><span>${escapeHTML(memory.environment)}</span><span>${escapeHTML(memory.severity)}</span></div>
    <div class="memory-outcome-row"><span>RECORDED OUTCOME</span>${outcomeBadge(memory.outcome)}</div>
    <div class="memory-copy">
      <div><strong>Incident</strong><p>${escapeHTML(memory.description || "Not recorded")}</p></div>
      <div><strong>Root cause</strong><p>${escapeHTML(memory.rootCause || "Not recorded")}</p></div>
      <div><strong>Fix attempted</strong><p>${escapeHTML(memory.fix || "Not recorded")}</p></div>
    </div>
    <div class="memory-relevance"><strong>Why it is relevant</strong><p>${escapeHTML(memory.relevance || "Related historical context; no specific match explanation was recorded.")}</p></div>
  </article>`;
}

function memorySourceLabel(memory) {
  return isDemoMode() || /^DEMO-/i.test(String(memory.id || ""))
    ? "DEMO MEMORY"
    : "TEAM MEMORY";
}

function historyPage() {
  state.historyOptionsLoaded = false;
  queueMicrotask(() => { if (state.page === "incident-history") loadHistory(); });
  return `<div class="history-toolbar" role="search" aria-label="Filter incident history">
    <label class="visually-hidden" for="history-search">Search incident history</label><input class="filter-control search-filter" type="search" id="history-search" name="search" placeholder="⌕  Search incidents…" value="${escapeHTML(state.historyFilters.search)}">
    ${filterSelect("service", "All services", ["checkout-api", "payments-api", "catalog-api", ...state.incidentRecords.map((item) => item.service)])}
    ${filterSelect("environment", "All environments", ["Production", "Staging", "Development"])}
    ${filterSelect("severity", "All severities", ["Critical", "High", "Medium", "Low"])}
    ${filterSelect("outcome", "All outcomes", ["Worked", "Failed", "Pending"])}
    <label class="visually-hidden" for="history-sort">Sort incidents</label><select class="filter-control" id="history-sort" name="sort"><option value="newest" ${state.historyFilters.sort === "newest" ? "selected" : ""}>Newest first</option><option value="oldest" ${state.historyFilters.sort === "oldest" ? "selected" : ""}>Oldest first</option></select>
  </div><div class="section-heading"><div><h2>Incident records</h2><p id="history-count">Loading records…</p></div></div><div class="history-results" id="history-results"><div class="loading-shell"><span class="spinner"></span>Loading incident history…</div></div>`;
}

function filterSelect(name, placeholder, options) {
  const unique = [...new Set(options)];
  const value = state.historyFilters[name];
  return `<label class="visually-hidden" for="history-${name}">${escapeHTML(placeholder)}</label><select class="filter-control" id="history-${name}" name="${name}"><option value="">${escapeHTML(placeholder)}</option>${unique.map((option) => `<option value="${escapeHTML(option)}" ${value === option ? "selected" : ""}>${escapeHTML(option)}</option>`).join("")}</select>`;
}

async function loadHistory() {
  const results = document.querySelector("#history-results");
  if (!results) return;
  const requestId = ++state.historyRequestId;
  state.historyLoading = true;
  try {
    if (!state.historyOptionsLoaded) {
      const allRecords = await getIncidentHistory();
      if (requestId !== state.historyRequestId || state.page !== "incident-history") return;
      state.incidentRecords = allRecords;
      const serviceSelect = document.querySelector("#history-service");
      if (serviceSelect) {
        const selected = state.historyFilters.service;
        serviceSelect.innerHTML = `<option value="">All services</option>${[...new Set(allRecords.map((record) => record.service))].sort().map((service) => `<option value="${escapeHTML(service)}" ${service === selected ? "selected" : ""}>${escapeHTML(service)}</option>`).join("")}`;
      }
      state.historyOptionsLoaded = true;
    }
    const records = await getIncidentHistory({
      search: state.historyFilters.search,
      service: state.historyFilters.service,
      environment: state.historyFilters.environment,
      severity: state.historyFilters.severity,
      outcome: state.historyFilters.outcome,
    });
    if (requestId !== state.historyRequestId || state.page !== "incident-history") return;
    state.incidentRecords = records;
    const sorted = [...state.incidentRecords].sort((a, b) => state.historyFilters.sort === "oldest"
      ? a.createdAt.localeCompare(b.createdAt)
      : b.createdAt.localeCompare(a.createdAt));
    updateHistoryResults(sorted);
  } catch (error) {
    if (requestId === state.historyRequestId) results.innerHTML = `<div class="inline-error">Could not load incident history: ${escapeHTML(error.message)}</div>`;
  } finally {
    if (requestId === state.historyRequestId) state.historyLoading = false;
  }
}

function updateHistoryResults(records) {
  const results = document.querySelector("#history-results");
  const count = document.querySelector("#history-count");
  if (!results || !count) return;
  count.textContent = `${records.length} ${records.length === 1 ? "incident" : "incidents"} found`;
  results.innerHTML = records.length ? records.map(historyCard).join("") : emptyState("No incidents match these filters", "Try changing the search phrase or clearing one or more filters.");
}

function historyCard(record) {
  return `<article class="history-card">
    <div class="history-primary"><div class="incident-title">${escapeHTML(record.title)}</div><div class="incident-meta">${escapeHTML(record.id)} · ${escapeHTML(record.category)}</div></div>
    <div class="history-service"><div class="history-caption">SERVICE</div>${escapeHTML(record.service)}</div>
    <div class="history-environment"><div class="history-caption">ENVIRONMENT</div><div class="history-value">${escapeHTML(record.environment)}</div></div>
    <div class="history-severity"><div class="history-caption">SEVERITY</div>${severityBadge(record.severity)}</div>
    <div class="history-outcome"><div class="history-caption">OUTCOME</div>${outcomeBadge(record.outcome)}</div>
    <div class="history-date"><div class="history-caption">REPORTED</div><div class="history-value">${formatDate(record.createdAt)}</div></div>
    <button class="secondary-button detail-button" type="button" data-action="detail" data-incident-id="${escapeHTML(record.id)}">Details</button>
  </article>`;
}

function insightsPage() {
  const header = pageHeader(pageDetails["memory-insights"][0], pageDetails["memory-insights"][1]);
  queueMicrotask(async () => {
    if (state.page !== "memory-insights") return;
    try {
      const insights = await getMemoryInsights();
      if (state.page === "memory-insights") main.innerHTML = `<div class="content-wrap">${pageHeader(pageDetails["memory-insights"][0], pageDetails["memory-insights"][1])}${demoBanner()}${insightsContent(insights)}</div>`;
    } catch (error) {
      if (state.page === "memory-insights") showPageError(error, "memory-insights");
    }
  });
  return `<div class="loading-shell"><span class="spinner"></span>Loading memory insights…</div>`;
}

function insightsContent(insights) {
  const counts = insights.counts;
  const maxOutcome = Math.max(counts.successfulResolutions, counts.failedResolutions, 1);
  return `<section class="metrics-grid" aria-label="Memory statistics">
    ${metric("REMEMBERED INCIDENTS", counts.rememberedIncidents, "Incidents with recorded outcomes")}
    ${metric("SUCCESSFUL FIX OUTCOMES", counts.successfulResolutions, "Marked WORKED")}
    ${metric("FAILED FIX OUTCOMES", counts.failedResolutions, "Marked FAILED")}
    ${metric("INCIDENTS ANALYSED", counts.incidentsAnalysed, "Incident records in this workspace")}
  </section>
  <div class="insights-grid">
    <section class="insight-panel"><h3>Resolution outcomes</h3><p>Recorded outcome counts. No percentages inferred.</p><div class="outcome-chart">
      ${chartRow("Worked", counts.successfulResolutions, maxOutcome, false)}${chartRow("Failed", counts.failedResolutions, maxOutcome, true)}
    </div></section>
    <section class="insight-panel"><h3>Common incident types</h3><p>Categories represented in the current incident memory.</p>${patternList(insights.commonIncidentTypes, "No incident categories are available.")}</section>
    <section class="insight-panel"><h3>Frequently successful fixes</h3><p>Historical fixes with a WORKED outcome.</p>${patternList(insights.successfulFixes, "No successful fix outcomes recorded.")}</section>
    <section class="insight-panel"><h3>Recurring failure patterns</h3><p>Fixes or approaches marked FAILED in available incidents.</p>${patternList(insights.failurePatterns, "No failed fix outcomes recorded.")}</section>
  </div>
  <section class="lessons-panel" style="margin-top:14px"><h3>Lessons from Previous Incidents</h3>${insights.lessons?.length ? `<ul>${insights.lessons.map((lesson) => `<li>${escapeHTML(lesson)}</li>`).join("")}</ul>` : emptyState("", "The incident service has not returned any lessons yet.")}</section>`;
}

function chartRow(label, count, max, failed) {
  const width = count ? Math.max(4, (count / max) * 100) : 0;
  return `<div class="chart-row"><span>${escapeHTML(label)}</span><div class="chart-track" role="img" aria-label="${escapeHTML(label)}: ${count}"><div class="chart-bar ${failed ? "failed" : ""}" style="width:${width}%"></div></div><span class="chart-count">${count}</span></div>`;
}

function patternList(items, emptyMessage) {
  if (!items.length) return emptyState("", emptyMessage);
  return `<div class="pattern-list">${items.map((item) => `<div class="pattern-row"><span class="pattern-name">${escapeHTML(item.name)}</span><span class="pattern-count">${item.count} ${item.count === 1 ? "record" : "records"}</span></div>`).join("")}</div>`;
}

function severityBadge(severity) {
  const safe = ["Critical", "High", "Medium", "Low"].includes(severity) ? severity : "Low";
  return `<span class="badge badge-${safe.toLowerCase()}">${escapeHTML(safe)}</span>`;
}

function outcomeBadge(outcome) {
  const safe = ["Worked", "Failed", "Pending"].includes(outcome) ? outcome : "Pending";
  const kind = safe === "Worked" ? "success" : safe === "Failed" ? "failed" : "pending";
  return `<span class="badge badge-${kind}">${escapeHTML(safe)}</span>`;
}

function emptyState(title, message) {
  return `<div class="empty-state">${title ? `<strong>${escapeHTML(title)}</strong>` : ""}${escapeHTML(message)}</div>`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function handleMainClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action } = button.dataset;
  if (action === "navigate") navigate(button.dataset.page);
  if (action === "feedback") void recordFeedback(button);
  if (action === "detail") {
    event.preventDefault();
    void openIncidentDetail(button.dataset.incidentId);
  }
  if (action === "retry") renderPage();
}

async function handleFormSubmit(event) {
  if (event.target.id !== "incident-form") return;
  event.preventDefault();
  const form = event.target;
  const description = form.elements.description.value.trim();
  const service = form.elements.service.value.trim();
  const errorSlot = form.querySelector("#form-error");
  errorSlot.innerHTML = "";
  if (!description || !service) {
    errorSlot.innerHTML = `<div class="inline-error" role="alert">${!description ? "Enter an incident description." : ""}${!description && !service ? " " : ""}${!service ? "Enter the affected service." : ""}</div>`;
    (!description ? form.elements.description : form.elements.service).focus();
    return;
  }
  if (state.submitting) return;
  const payload = {
    description,
    service,
    environment: form.elements.environment.value,
    severity: form.elements.severity.value,
    logs: form.elements.logs.value.trim(),
  };
  const button = form.querySelector("#analyse-button");
  state.submitting = true;
  button.disabled = true;
  button.innerHTML = `<span class="spinner button-spinner" aria-hidden="true"></span> Analysing incident…`;
  try {
    state.analysis = await analyseIncident(payload);
    renderPage();
    document.querySelector("#analysis-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    toast(isDemoMode() ? "Demo analysis ready; no live AI or Hindsight service was used." : "Analysis received from the backend.", "info");
  } catch (error) {
    state.submitting = false;
    button.disabled = false;
    button.innerHTML = "◈ &nbsp; Analyse incident";
    errorSlot.innerHTML = `<div class="inline-error" role="alert">Analysis could not be completed: ${escapeHTML(error.message)}</div>`;
  } finally {
    state.submitting = false;
  }
}

async function recordFeedback(button) {
  if (button.disabled || button.dataset.busy === "true") return;
  const { incidentId, fixId } = button.dataset;
  const worked = button.dataset.worked === "true";
  const recommendation = state.analysis?.recommendations.find((item) => item.id === fixId);
  if (!recommendation || recommendation.feedback) return;
  const actionButtons = main.querySelectorAll(`[data-incident-id="${CSS.escape(incidentId)}"][data-fix-id="${CSS.escape(fixId)}"]`);
  actionButtons.forEach((item) => { item.disabled = true; });
  button.dataset.busy = "true";
  const originalLabel = button.innerHTML;
  button.innerHTML = `<span class="spinner button-spinner" aria-hidden="true"></span> Sending`;
  try {
    const result = await submitFeedback(incidentId, fixId, worked, {
      service: state.analysis.service,
      environment: state.analysis.environment,
      severity: state.analysis.severity,
    });
    if (!result?.confirmed) throw new Error(result?.message || "The service did not confirm this feedback.");
    recommendation.feedback = worked ? "Worked" : "Failed";
    recommendation.feedbackMessage = result.message || (result.simulated
      ? "Feedback was recorded, but Hindsight persistence was not confirmed."
      : "Outcome confirmed by the service.");
    renderPage();
    toast(result.message || `${recommendation.feedback} feedback confirmed by the service.`, "success");
  } catch (error) {
    actionButtons.forEach((item) => { item.disabled = false; });
    button.innerHTML = originalLabel;
    delete button.dataset.busy;
    toast(`Feedback was not confirmed: ${error.message}`, "error");
  }
}

function handleHistoryInput(event) {
  if (event.target.name !== "search" || state.page !== "incident-history") return;
  state.historyFilters.search = event.target.value;
  void loadHistory();
}

function handleHistoryChange(event) {
  if (!["service", "environment", "severity", "outcome", "sort"].includes(event.target.name)) return;
  state.historyFilters[event.target.name] = event.target.value;
  void loadHistory();
}

async function openIncidentDetail(incidentId) {
  try {
    const records = await getIncidentHistory();
    const record = records.find((item) => item.id === incidentId);
    if (!record) throw new Error("This incident could not be found.");
    document.querySelector("#dialog-content").innerHTML = `<div class="dialog-inner">
      <div class="dialog-header"><div><span class="analysis-label">${recordSourceLabel(record)}</span><h2 id="dialog-title">${escapeHTML(record.title)}</h2><p>${escapeHTML(record.id)} · ${escapeHTML(record.service)} · ${escapeHTML(record.environment)} · ${formatDate(record.createdAt)}</p></div><button class="icon-button" type="button" data-close-dialog aria-label="Close incident details">×</button></div>
      ${detailSection("Incident description", record.description)}
      ${detailSection("Root cause", record.rootCause || "Not recorded")}
      ${detailSection("Resolution / fix attempted", record.resolution || "No confirmed resolution recorded")}
      ${detailSection("Outcome", record.outcome)}
      ${Object.keys(record.feedback || {}).length ? detailSection("Recommendation feedback", Object.entries(record.feedback).map(([id, outcome]) => `${record.recommendations.find((item) => item.id === id)?.title || id}: ${outcome}`).join(" · ")) : ""}
      <div class="dialog-section"><h3>Context</h3><p>${escapeHTML(record.severity)} severity · ${escapeHTML(record.category)}</p></div>
      ${isDemoRecord(record) ? `<div class="memory-relevance"><strong>Demo record:</strong> This illustrative example is not a live production incident or a Hindsight record.</div>` : ""}
    </div>`;
    dialog.showModal();
  } catch (error) {
    toast(error.message, "error");
  }
}

function recordSourceLabel(record) {
  if (isDemoRecord(record)) return "DEMO MEMORY";
  // The backend marks preloaded team-memory records as isDemo; it does not mean mock data.
  if (record.isDemo) return "TEAM MEMORY";
  return "INCIDENT RECORD";
}

function isDemoRecord(record) {
  return /^DEMO-/i.test(String(record.id || "")) || Boolean(record.isDemo && isDemoMode());
}

function detailSection(title, body) {
  return `<section class="dialog-section"><h3>${escapeHTML(title)}</h3><p>${escapeHTML(body)}</p></section>`;
}

async function renderServiceStatus() {
  try {
    const status = await getServiceStatus();
    document.querySelector("#backend-status").textContent = status.backendConfigured ? (status.connected ? "Connected" : status.checked ? "Unavailable" : "Configured") : "Not configured";
    document.querySelector("#memory-status").textContent = status.memoryConfigured ? (status.connected ? "Connected" : status.checked ? "Unavailable" : "Configured") : "Not configured";
    document.querySelector("#connection-note").textContent = status.message || (status.checked ? (status.connected ? "Connection check succeeded." : "Connection check failed.") : "Connection has not been checked.");
    document.querySelector("#mode-chip").textContent = status.mode === "demo" ? "DEMO MODE" : status.mode === "live" ? "LIVE MODE" : "MODE UNKNOWN";
    const dot = document.querySelector(".service-card-title .status-dot");
    dot.className = `status-dot ${status.mode === "live" && status.checked && status.connected ? "status-dot-live" : "status-dot-neutral"}`;
  } catch (error) {
    document.querySelector("#connection-note").textContent = `Status unavailable: ${error.message}`;
    document.querySelector("#mode-chip").textContent = isDemoMode() ? "DEMO MODE" : "MODE UNKNOWN";
    document.querySelector("#backend-status").textContent = "Status unavailable";
    document.querySelector("#memory-status").textContent = "Status unavailable";
  }
}

function showPageError(error, page) {
  const title = pageDetails[page][0];
  main.innerHTML = `<div class="content-wrap">${pageHeader(title, pageDetails[page][1])}${demoBanner()}<div class="inline-error" role="alert">Could not load this view: ${escapeHTML(error.message)} <button class="quiet-button" type="button" data-action="retry">Try again</button></div></div>`;
}

function toast(message, kind = "success") {
  const item = document.createElement("div");
  item.className = `toast${kind === "error" ? " toast-error" : kind === "info" ? " toast-info" : ""}`;
  item.setAttribute("role", kind === "error" ? "alert" : "status");
  item.textContent = message;
  toastRegion.append(item);
  window.setTimeout(() => item.remove(), 4800);
}

function toggleMobileNav() {
  state.mobileNavOpen = !state.mobileNavOpen;
  document.body.classList.toggle("nav-open", state.mobileNavOpen);
  document.querySelector("#sidebar").classList.toggle("is-open", state.mobileNavOpen);
  document.querySelector("#mobile-menu-button").setAttribute("aria-expanded", String(state.mobileNavOpen));
  document.querySelector("#mobile-menu-button").setAttribute("aria-label", state.mobileNavOpen ? "Close navigation menu" : "Open navigation menu");
}

function closeMobileNav() {
  state.mobileNavOpen = false;
  document.body.classList.remove("nav-open");
  document.querySelector("#sidebar").classList.remove("is-open");
  document.querySelector("#mobile-menu-button").setAttribute("aria-expanded", "false");
  document.querySelector("#mobile-menu-button").setAttribute("aria-label", "Open navigation menu");
}
