// ~/klaskerAI/grad-work/example-site/static/js/mailrekon.js

"use strict";

const MAILREKON_API =
"https://klasker-mail-api.vedras1973.workers.dev/api/mail-analysis";

const form = document.getElementById(
"mailrekon-form"
);

const domainInput = document.getElementById(
"mailrekon-domain"
);

const statusElement = document.getElementById(
"mailrekon-status"
);

const resultElement = document.getElementById(
"mailrekon-result"
);

function escapeHtml(value) {
return String(value)
.replace(/&/g, "&")
.replace(/</g, "<")
.replace(/>/g, ">")
.replace(/"/g, """)
.replace(/'/g, "'");
}

function setStatus(message) {
statusElement.innerHTML = `     <p>${escapeHtml(message)}</p>
  `;
}

function getScannerLabel(scanner) {
if (scanner === "https://scanner1.klasker.com") {
return "Scanner 1";
}

if (scanner === "https://scanner2.klasker.com") {
return "Scanner 2";
}

return "Scanner";
}

function formatRecords(records) {
if (!Array.isArray(records) || records.length === 0) {
return "<p>No records found.</p>";
}

return `     <ul>
      ${records
        .map(
          (record) =>
            `<li><code>${escapeHtml(record)}</code></li>`         )
        .join("")}     </ul>
  `;
}

function renderResult(response) {
const result = response.result || {};

const mx = result.mx || {};
const spf = result.spf || {};
const dmarc = result.dmarc || {};

const scannerLabel = getScannerLabel(
response.scanner
);

resultElement.innerHTML = ` <article class="widget">

  <h3>
    ${escapeHtml(response.domain)}
  </h3>

  <p>
    <strong>Status:</strong>
    ${escapeHtml(response.status)}
  </p>

  <p>
    <strong>Analysis ID:</strong>
    <code>${escapeHtml(response.analysis_id)}</code>
  </p>

  <p>
    <strong>Scanner:</strong>
    ${escapeHtml(scannerLabel)}
  </p>

</article>


<div class="widget-grid">

  <article class="widget">

    <h3>
      MX
    </h3>

    <p>
      <strong>Available:</strong>
      ${mx.available ? "Yes" : "No"}
    </p>

    ${formatRecords(mx.records)}

  </article>


  <article class="widget">

    <h3>
      SPF
    </h3>

    <p>
      <strong>Detected:</strong>
      ${spf.detected ? "Yes" : "No"}
    </p>

    ${formatRecords(spf.records)}

  </article>


  <article class="widget">

    <h3>
      DMARC
    </h3>

    <p>
      <strong>Detected:</strong>
      ${dmarc.detected ? "Yes" : "No"}
    </p>

    ${formatRecords(dmarc.records)}

  </article>

</div>

`;
}

async function analyseDomain(domain) {
setStatus("Analysing email security…");

resultElement.innerHTML = `     <p>
      MailRekon is querying the domain's publicly observable
      email infrastructure.     </p>
  `;

try {
const response = await fetch(
MAILREKON_API,
{
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
domain,
}),
}
);

let data;

try {
  data = await response.json();
} catch {
  throw new Error(
    "MailRekon returned an invalid response."
  );
}

if (!response.ok) {
  throw new Error(
    data.error ||
    "MailRekon could not complete the analysis."
  );
}

if (
  data.status !== "completed" ||
  !data.result
) {
  throw new Error(
    "MailRekon did not return a completed analysis."
  );
}

setStatus(
  "MailRekon analysis completed."
);

renderResult(data);

} catch (error) {
console.error(
"MailRekon analysis failed:",
error
);

setStatus(
  "MailRekon analysis failed."
);

resultElement.innerHTML = `
  <article class="widget">

    <h3>
      Analysis Unavailable
    </h3>

    <p>
      ${escapeHtml(
        error instanceof Error
          ? error.message
          : "Unable to complete the analysis."
      )}
    </p>

  </article>
`;

}
}

if (form && domainInput) {
form.addEventListener(
"submit",
(event) => {
event.preventDefault();

  const domain = domainInput.value
    .trim()
    .toLowerCase();

  if (!domain) {
    setStatus(
      "Please enter a domain, not an URL"
    );

    domainInput.focus();

    return;
  }

  analyseDomain(domain);
}

);
}
