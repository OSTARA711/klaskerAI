"use strict";

const API_BASE = "https://klasker-api.vedras1973.workers.dev";

const form = document.querySelector(".analysis-form");
const input = document.getElementById("public-url");

if (form && input) {
  form.addEventListener("submit", handleSubmit);
}

async function handleSubmit(event) {
  event.preventDefault();

  const submitButton = form.querySelector("button[type=\"submit\"]");
  const url = input.value.trim();

  if (!isValidUrl(url)) {
    showResult("Please enter a valid HTTP or HTTPS URL.", "error");
    input.focus();
    return;
  }

  const analysisId = crypto.randomUUID();
  const channelName = `klasker:analysis:${analysisId}`;

  setSubmitting(true, submitButton);
  showResult("Connecting to Klasker…", "pending");

  let realtime = null;
  let channel = null;

  try {
    realtime = new Ably.Realtime({
      authUrl: `${API_BASE}/api/ably-auth`,
      authParams: {
        analysis_id: analysisId,
      },
    });

    channel = realtime.channels.get(channelName);

    await realtime.connection.once("connected");

    await channel.subscribe((message) => {
      handleAblyMessage(message);
    });

    showResult("Analysis accepted. Scanning…", "pending");

    const response = await fetch(
      `${API_BASE}/api/analysis`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          analysis_id: analysisId,
        }),
      },
    );

    if (!response.ok) {
      let message = "Unable to start the analysis.";

      try {
        const body = await response.json();

        if (body && typeof body.error === "string") {
          message = body.error;
        }
      } catch {
        // Keep the generic error message.
      }

      throw new Error(message);
    }

    const accepted = await response.json();

    if (
      !accepted ||
      accepted.analysis_id !== analysisId ||
      accepted.status !== "accepted"
    ) {
      throw new Error("The analysis service returned an unexpected response.");
    }
  } catch (error) {
    console.error("Klasker analysis failed:", error);

    showResult(
      error instanceof Error
        ? error.message
        : "Unable to start the analysis.",
      "error",
    );

    if (realtime) {
      realtime.close();
    }

    setSubmitting(false, submitButton);
  }
}

function handleAblyMessage(message) {
  if (!message || typeof message.name !== "string") {
    return;
  }

  let data = message.data;

  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      // Leave it as a string.
    }
  }

  switch (message.name) {
    case "accepted":
      showResult("Analysis accepted. Scanning…", "pending");
      break;

    case "completed":
      renderCompleted(data);
      break;

    case "failed":
      renderFailed(data);
      break;

    default:
      console.warn("Unknown Klasker event:", message.name);
  }
}

function renderCompleted(data) {
  const result =
    data && typeof data === "object" && "result" in data
      ? data.result
      : data;

  const container = getResultContainer();

  container.className = "analysis-result analysis-result-success";
  container.innerHTML = "";

  if (!result || typeof result !== "object") {
    showResult("The analysis returned an unexpected result.", "error");
    setSubmitting(false);
    return;
  }

  renderReport(container, result);
  setSubmitting(false);
}

function renderReport(container, result) {
  const target = result.target || {};
  const score = result.score || {};
  const checks = Array.isArray(score.checks) ? score.checks : [];
  const http = result.http || {};
  const html = result.html || {};
  const discovery = result.discovery || {};
  const database = result.database || {};
  const scanner = result.scanner || {};

  const scoreValue = Number.isFinite(score.score)
    ? score.score
    : 0;

  const maximum = Number.isFinite(score.maximum)
    ? score.maximum
    : 100;

  const domain =
    typeof target.domain === "string" && target.domain
      ? target.domain
      : "Unknown website";

  const finalUrl =
    typeof target.final_url === "string" && target.final_url
      ? target.final_url
      : "";

  const report = document.createElement("div");
  report.className = "analysis-report";

  const header = document.createElement("header");
  header.className = "analysis-report-header";

  const eyebrow = document.createElement("p");
  eyebrow.className = "analysis-report-eyebrow";
  eyebrow.textContent = "KLASKER AITA";

  const title = document.createElement("h2");
  title.textContent = domain;

  header.appendChild(eyebrow);
  header.appendChild(title);

  if (finalUrl) {
    const url = document.createElement("p");
    url.className = "analysis-report-url";
    url.textContent = finalUrl;
    header.appendChild(url);
  }

  report.appendChild(header);

  report.appendChild(
    createScoreBlock(scoreValue, maximum),
  );

  report.appendChild(
    createOverviewSection(
      checks,
      scoreValue,
      maximum,
      http,
      html,
      discovery,
    ),
  );

  report.appendChild(
    createSecuritySection(checks),
  );

  report.appendChild(
    createContentSection(checks, html),
  );

  report.appendChild(
    createDiscoverySection(discovery),
  );

  report.appendChild(
    createRecommendations(checks, html, discovery),
  );

  report.appendChild(
    createTechnicalDetails(result, scanner, database),
  );

  container.appendChild(report);
}

function createScoreBlock(score, maximum) {
  const block = document.createElement("section");
  block.className = "analysis-score";

  const label = document.createElement("p");
  label.className = "analysis-score-label";
  label.textContent = "Klasker score";

  const value = document.createElement("div");
  value.className = "analysis-score-value";

  const number = document.createElement("strong");
  number.textContent = String(score);

  const suffix = document.createElement("span");
  suffix.textContent = ` / ${maximum}`;

  value.appendChild(number);
  value.appendChild(suffix);

  const status = document.createElement("p");
  status.className = "analysis-score-status";
  status.textContent = getScoreStatus(score, maximum);

  block.appendChild(label);
  block.appendChild(value);
  block.appendChild(status);

  return block;
}

function createOverviewSection(
  checks,
  score,
  maximum,
  http,
  html,
  discovery,
) {
  const section = createSection(
    "What Klasker found",
    "A concise summary of the analysis.",
  );

  const list = document.createElement("ul");
  list.className = "analysis-findings";

  const passed = checks.filter((check) => check[1] === true).length;
  const failed = checks.length - passed;

  addFinding(
    list,
    passed > 0,
    `${passed} of ${checks.length} checks passed.`,
  );

  if (http.status === 200) {
    addFinding(
      list,
      true,
      "The website responded successfully.",
    );
  } else {
    addFinding(
      list,
      false,
      `The website returned HTTP ${http.status || "an unexpected status"}.`,
    );
  }

  if (html.title) {
    addFinding(
      list,
      true,
      "A page title was detected.",
    );
  }

  if (failed > 0) {
    addFinding(
      list,
      false,
      `${failed} checks require attention.`,
    );
  }

  section.appendChild(list);

  return section;
}

function createSecuritySection(checks) {
  const section = createSection(
    "Security",
    "Security-related HTTP response headers detected by Klasker.",
  );

  const names = [
    "strict-transport-security",
    "content-security-policy",
    "x-content-type-options",
    "referrer-policy",
    "permissions-policy",
  ];

  const list = document.createElement("div");
  list.className = "analysis-check-list";

  names.forEach((name) => {
    const check = findCheck(checks, name);

    addCheckRow(
      list,
      formatCheckName(name),
      check ? check[1] === true : false,
    );
  });

  section.appendChild(list);

  return section;
}

function createContentSection(checks, html) {
  const section = createSection(
    "Content & metadata",
    "Page structure and metadata available to browsers, search systems and other agents.",
  );

  const list = document.createElement("div");
  list.className = "analysis-check-list";

  addCheckRow(
    list,
    "Page title",
    isCheckPassed(checks, "title"),
  );

  addCheckRow(
    list,
    "Description",
    isCheckPassed(checks, "description"),
  );

  addCheckRow(
    list,
    "Canonical URL",
    isCheckPassed(checks, "canonical"),
  );

  addCheckRow(
    list,
    "Open Graph",
    isCheckPassed(checks, "OpenGraph"),
  );

  addCheckRow(
    list,
    "JSON-LD structured data",
    isCheckPassed(checks, "JSON-LD"),
  );

  section.appendChild(list);

  return section;
}

function createDiscoverySection(discovery) {
  const section = createSection(
    "Discoverability",
    "Files that can help automated systems understand and discover the website.",
  );

  const list = document.createElement("div");
  list.className = "analysis-check-list";

  addAvailabilityRow(
    list,
    "robots.txt",
    discovery.robots,
  );

  addAvailabilityRow(
    list,
    "sitemap.xml",
    discovery.sitemap,
  );

  addAvailabilityRow(
    list,
    "llms.txt",
    discovery.llms,
  );

  section.appendChild(list);

  return section;
}

function createRecommendations(checks, html, discovery) {
  const section = createSection(
    "Recommendations",
    "Areas that may improve the website's technical and AI-readiness profile.",
  );

  const list = document.createElement("ul");
  list.className = "analysis-recommendations";

  const recommendations = [];

  if (!isCheckPassed(checks, "strict-transport-security")) {
    recommendations.push(
      "Add Strict-Transport-Security to strengthen HTTPS enforcement.",
    );
  }

  if (!isCheckPassed(checks, "content-security-policy")) {
    recommendations.push(
      "Add a Content-Security-Policy to reduce the impact of certain browser-side attacks.",
    );
  }

  if (!isCheckPassed(checks, "x-content-type-options")) {
    recommendations.push(
      "Add X-Content-Type-Options to prevent MIME-type sniffing.",
    );
  }

  if (!isCheckPassed(checks, "referrer-policy")) {
    recommendations.push(
      "Add a Referrer-Policy to control referrer information sent with requests.",
    );
  }

  if (!isCheckPassed(checks, "permissions-policy")) {
    recommendations.push(
      "Consider a Permissions-Policy appropriate to the site's features.",
    );
  }

  if (!isCheckPassed(checks, "description")) {
    recommendations.push(
      "Add a useful page description.",
    );
  }

  if (!isCheckPassed(checks, "canonical")) {
    recommendations.push(
      "Add a canonical URL where appropriate.",
    );
  }

  if (!isCheckPassed(checks, "OpenGraph")) {
    recommendations.push(
      "Add Open Graph metadata for richer representation when the page is shared.",
    );
  }

  if (!isCheckPassed(checks, "JSON-LD")) {
    recommendations.push(
      "Consider appropriate JSON-LD structured data.",
    );
  }

  if (!isAvailable(discovery.robots)) {
    recommendations.push(
      "Provide a robots.txt file where appropriate.",
    );
  }

  if (!isAvailable(discovery.sitemap)) {
    recommendations.push(
      "Provide a sitemap.xml where appropriate.",
    );
  }

  if (!isAvailable(discovery.llms)) {
    recommendations.push(
      "Consider providing llms.txt if it is appropriate for the service.",
    );
  }

  if (recommendations.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No recommendations were generated for this analysis.";
    list.appendChild(item);
  } else {
    recommendations.forEach((recommendation) => {
      const item = document.createElement("li");
      item.textContent = recommendation;
      list.appendChild(item);
    });
  }

  section.appendChild(list);

  return section;
}

function createTechnicalDetails(result, scanner, database) {
  const details = document.createElement("details");
  details.className = "analysis-technical";

  const summary = document.createElement("summary");
  summary.textContent = "Technical details";

  const content = document.createElement("div");
  content.className = "analysis-technical-content";

  if (scanner.name || scanner.version) {
    const scannerInfo = document.createElement("p");

    scannerInfo.textContent =
      `${scanner.name || "Klasker Scanner"}${
        scanner.version ? ` ${scanner.version}` : ""
      }`;

    content.appendChild(scannerInfo);
  }

  if (database.cache) {
    const cache = document.createElement("p");

    cache.textContent =
      database.cache.used
        ? `Cached result used (maximum age: ${database.cache.max_age_hours || 24} hours).`
        : `Fresh scan performed (cache maximum age: ${database.cache.max_age_hours || 24} hours).`;

    content.appendChild(cache);
  }

  if (database.scan_id) {
    const scanId = document.createElement("p");
    scanId.textContent = `Scan ID: ${database.scan_id}`;
    content.appendChild(scanId);
  }

  details.appendChild(summary);
  details.appendChild(content);

  return details;
}

function createSection(title, description) {
  const section = document.createElement("section");
  section.className = "analysis-section";

  const heading = document.createElement("h3");
  heading.textContent = title;

  section.appendChild(heading);

  if (description) {
    const text = document.createElement("p");
    text.className = "analysis-section-description";
    text.textContent = description;
    section.appendChild(text);
  }

  return section;
}

function addFinding(list, passed, text) {
  const item = document.createElement("li");
  item.className = passed
    ? "analysis-finding analysis-finding-pass"
    : "analysis-finding analysis-finding-fail";

  const marker = document.createElement("span");
  marker.className = "analysis-finding-marker";
  marker.setAttribute("aria-hidden", "true");
  marker.textContent = passed ? "✓" : "✕";

  const content = document.createElement("span");
  content.textContent = text;

  item.appendChild(marker);
  item.appendChild(content);
  list.appendChild(item);
}

function addCheckRow(list, label, passed) {
  const row = document.createElement("div");
  row.className = "analysis-check-row";

  const name = document.createElement("span");
  name.textContent = label;

  const value = document.createElement("span");
  value.className = passed
    ? "analysis-check-value analysis-check-pass"
    : "analysis-check-value analysis-check-fail";
  value.textContent = passed ? "Detected" : "Not detected";

  row.appendChild(name);
  row.appendChild(value);
  list.appendChild(row);
}

function addAvailabilityRow(list, label, data) {
  const available = isAvailable(data);

  const row = document.createElement("div");
  row.className = "analysis-check-row";

  const name = document.createElement("span");
  name.textContent = label;

  const value = document.createElement("span");
  value.className = available
    ? "analysis-check-value analysis-check-pass"
    : "analysis-check-value analysis-check-fail";
  value.textContent = available ? "Available" : "Not available";

  row.appendChild(name);
  row.appendChild(value);
  list.appendChild(row);
}

function findCheck(checks, name) {
  return checks.find(
    (check) =>
      Array.isArray(check) &&
      check.length >= 2 &&
      check[0] === name,
  );
}

function isCheckPassed(checks, name) {
  const check = findCheck(checks, name);
  return Boolean(check && check[1] === true);
}

function isAvailable(data) {
  return Boolean(
    data &&
    typeof data === "object" &&
    data.available === true,
  );
}

function getScoreStatus(score, maximum) {
  if (!maximum || maximum <= 0) {
    return "Analysis complete";
  }

  const percentage = (score / maximum) * 100;

  if (percentage >= 80) {
    return "STRONG";
  }

  if (percentage >= 60) {
    return "GOOD";
  }

  if (percentage >= 40) {
    return "NEEDS ATTENTION";
  }

  return "NEEDS IMPROVEMENT";
}

function formatCheckName(name) {
  const labels = {
    "strict-transport-security": "Strict-Transport-Security",
    "content-security-policy": "Content-Security-Policy",
    "x-content-type-options": "X-Content-Type-Options",
    "referrer-policy": "Referrer-Policy",
    "permissions-policy": "Permissions-Policy",
  };

  return labels[name] || name;
}

function renderFailed(data) {
  let message = "The analysis could not be completed.";

  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    message = data.error;
  }

  showResult(message, "error");
  setSubmitting(false);
}

function showResult(message, state) {
  const container = getResultContainer();

  container.className = `analysis-result analysis-result-${state}`;
  container.textContent = message;
}

function getResultContainer() {
  let container = document.getElementById("analysis-result");

  if (!container) {
    container = document.createElement("div");
    container.id = "analysis-result";
    container.className = "analysis-result";

    form.insertAdjacentElement("afterend", container);
  }

  return container;
}

function setSubmitting(submitting, button) {
  if (!button) {
    button = form.querySelector("button[type=\"submit\"]");
  }

  if (!button) {
    return;
  }

  button.disabled = submitting;

  if (submitting) {
    button.dataset.originalText = button.textContent;
    button.textContent = "Analysing…";
  } else if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
    delete button.dataset.originalText;
  }
}

function isValidUrl(value) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}
