// ~/klaskerAI/grad/website/static/js/mailrekon.js

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
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function setStatus(message) {
  statusElement.innerHTML = `
    <p>
      ${escapeHtml(message)}
    </p>
  `;
}


function getScannerLabel(scanner) {
  if (
    scanner ===
    "https://scanner1.klasker.com"
  ) {
    return "Rekon1";
  }

  if (
    scanner ===
    "https://scanner2.klasker.com"
  ) {
    return "Rekon2";
  }

  return "Scanner";
}


function formatRecords(records) {
  if (
    !Array.isArray(records) ||
    records.length === 0
  ) {
    return "<p>No records found.</p>";
  }

  return `
    <ul>
      ${records
        .map(
          (record) =>
            `<li><code>${escapeHtml(record)}</code></li>`
        )
        .join("")}
    </ul>
  `;
}


function yesNo(value) {
  return value ? "Yes" : "No";
}


function renderResult(response) {
  const result =
    response.result || {};

  const mx =
    result.mx || {};

  const spf =
    result.spf || {};

  const dkim =
    result.dkim || {};

  const dmarc =
    result.dmarc || {};

  const mtaSts =
    result.mta_sts || {};

  const tlsRpt =
    result.tls_rpt || {};

  const bimi =
    result.bimi || {};

  const dnssec =
    result.dnssec || {};

  const caa =
    result.caa || {};

  const score =
    result.score || {};

  const scope =
    result.scope || {};

  const scannerLabel =
    getScannerLabel(
      response.scanner
    );


  const recommendations =
    Array.isArray(
      score.recommendations
    )
      ? score.recommendations
      : [];


  resultElement.innerHTML = `
    <article class="widget">

      <h3>
        ${escapeHtml(response.domain)}
      </h3>

      <p>
        <strong>Status:</strong>
        ${escapeHtml(response.status)}
      </p>

      <p>
        <strong>Analysis ID:</strong>
        <code>
          ${escapeHtml(response.analysis_id)}
        </code>
      </p>

      <p>
        <strong>Scanner:</strong>
        ${escapeHtml(scannerLabel)}
      </p>

    </article>


    <article class="widget">

      <h3>
        Free Analysis Score
      </h3>

      <p>
        <strong>
          ${escapeHtml(score.value ?? "—")}/
          ${escapeHtml(score.maximum ?? "100")}
        </strong>
      </p>

      <p>
        <strong>Grade:</strong>
        ${escapeHtml(score.grade ?? "—")}
      </p>

      <p>
        <strong>Assessment:</strong>
        ${escapeHtml(
          score.type ||
          "Free configuration assessment"
        )}
      </p>

    </article>


    <div class="widget-grid">


      <article class="widget">

        <h3>
          MX
        </h3>

        <p>
          <strong>Available:</strong>
          ${yesNo(mx.available)}
        </p>

        <p>
          <strong>DNS query:</strong>
          ${yesNo(mx.query_ok)}
        </p>

        ${formatRecords(mx.records)}

      </article>


      <article class="widget">

        <h3>
          SPF
        </h3>

        <p>
          <strong>Detected:</strong>
          ${yesNo(spf.detected)}
        </p>

        <p>
          <strong>Records:</strong>
          ${escapeHtml(
            spf.record_count ?? 0
          )}
        </p>

        <p>
          <strong>Final mechanism:</strong>
          <code>
            ${escapeHtml(
              spf.all || "Not detected"
            )}
          </code>
        </p>

        ${formatRecords(spf.records)}

      </article>


      <article class="widget">

        <h3>
          DKIM
        </h3>

        <p>
          <strong>Usable key discovered:</strong>
          ${yesNo(dkim.detected)}
        </p>

        <p>
          <strong>Status:</strong>
          ${escapeHtml(
            dkim.status || "Unknown"
          )}
        </p>

        <p>
          <strong>Selectors tested:</strong>
          ${escapeHtml(
            dkim.selectors_tested ?? 0
          )}
        </p>

        <p>
          <strong>Valid keys:</strong>
          ${escapeHtml(
            dkim.valid_key_count ?? 0
          )}
        </p>

        <p>
          <strong>Revoked keys:</strong>
          ${escapeHtml(
            dkim.revoked_key_count ?? 0
          )}
        </p>

        <p>
          <strong>Discovery limited:</strong>
          ${yesNo(dkim.discovery_limited)}
        </p>

        ${
          Array.isArray(dkim.selectors) &&
          dkim.selectors.length > 0
            ? `
              <p>
                <strong>
                  Selectors discovered:
                </strong>
              </p>

              ${formatRecords(
                dkim.selectors
              )}
            `
            : `
              <p>
                No usable DKIM selector was
                discovered among the tested
                selectors.
              </p>
            `
        }

        <p>
          DKIM selector discovery is inherently
          incomplete because domains do not publish
          a universal directory of their selectors.
        </p>

      </article>


      <article class="widget">

        <h3>
          DMARC
        </h3>

        <p>
          <strong>Detected:</strong>
          ${yesNo(dmarc.detected)}
        </p>

        <p>
          <strong>Policy:</strong>
          <code>
            ${escapeHtml(
              dmarc.policy || "Not detected"
            )}
          </code>
        </p>

        ${
          dmarc.subdomain_policy
            ? `
              <p>
                <strong>
                  Subdomain policy:
                </strong>
                <code>
                  ${escapeHtml(
                    dmarc.subdomain_policy
                  )}
                </code>
              </p>
            `
            : ""
        }

        ${formatRecords(
          dmarc.records
        )}

      </article>


      <article class="widget">

        <h3>
          MTA-STS
        </h3>

        <p>
          <strong>Detected:</strong>
          ${yesNo(mtaSts.detected)}
        </p>

        <p>
          <strong>DNS query:</strong>
          ${yesNo(mtaSts.dns_query_ok)}
        </p>

        <p>
          <strong>Policy available:</strong>
          ${yesNo(mtaSts.policy_available)}
        </p>

        ${
          mtaSts.policy
            ? `
              <p>
                <strong>Policy:</strong>
                <code>
                  ${escapeHtml(
                    mtaSts.policy
                  )}
                </code>
              </p>
            `
            : ""
        }

        ${
          mtaSts.policy_url
            ? `
              <p>
                <strong>Policy URL:</strong>
                <code>
                  ${escapeHtml(
                    mtaSts.policy_url
                  )}
                </code>
              </p>
            `
            : ""
        }

      </article>


      <article class="widget">

        <h3>
          TLS-RPT
        </h3>

        <p>
          <strong>Detected:</strong>
          ${yesNo(tlsRpt.detected)}
        </p>

        <p>
          <strong>Records:</strong>
          ${escapeHtml(
            tlsRpt.record_count ?? 0
          )}
        </p>

        ${
          tlsRpt.aggregate_reporting
            ? `
              <p>
                <strong>
                  Aggregate reporting:
                </strong>
                <code>
                  ${escapeHtml(
                    tlsRpt.aggregate_reporting
                  )}
                </code>
              </p>
            `
            : ""
        }

        ${formatRecords(
          tlsRpt.records
        )}

      </article>


      <article class="widget">

        <h3>
          BIMI
        </h3>

        <p>
          <strong>Detected:</strong>
          ${yesNo(bimi.detected)}
        </p>

        <p>
          <strong>Records:</strong>
          ${escapeHtml(
            bimi.record_count ?? 0
          )}
        </p>

        ${
          bimi.logo_location
            ? `
              <p>
                <strong>
                  Logo location:
                </strong>
                <code>
                  ${escapeHtml(
                    bimi.logo_location
                  )}
                </code>
              </p>
            `
            : ""
        }

        ${
          bimi.authority_location
            ? `
              <p>
                <strong>
                  Authority location:
                </strong>
                <code>
                  ${escapeHtml(
                    bimi.authority_location
                  )}
                </code>
              </p>
            `
            : ""
        }

        ${formatRecords(
          bimi.records
        )}

      </article>


      <article class="widget">

        <h3>
          DNSSEC
        </h3>

        <p>
          <strong>DNSKEY present:</strong>
          ${yesNo(dnssec.dnskey_present)}
        </p>

        <p>
          <strong>DS present:</strong>
          ${yesNo(dnssec.ds_present)}
        </p>

        <p>
          <strong>Validated:</strong>
          ${yesNo(dnssec.validated)}
        </p>

        <p>
          <strong>Status:</strong>
          ${escapeHtml(
            dnssec.status || "Unknown"
          )}
        </p>

      </article>


      <article class="widget">

        <h3>
          CAA
        </h3>

        <p>
          <strong>Detected:</strong>
          ${yesNo(caa.detected)}
        </p>

        <p>
          <strong>Records:</strong>
          ${escapeHtml(
            caa.record_count ?? 0
          )}
        </p>

        ${formatRecords(
          caa.records
        )}

      </article>


    </div>


    <article class="widget">

      <h3>
        Recommendations
      </h3>

      ${
        recommendations.length > 0
          ? `
            <ul>
              ${recommendations
                .map(
                  (recommendation) =>
                    `<li>
                      ${escapeHtml(
                        recommendation
                      )}
                    </li>`
                )
                .join("")}
            </ul>
          `
          : `
            <p>
              No recommendations were returned.
            </p>
          `
      }

    </article>


    <article class="widget">

      <h3>
        Free Analysis Scope
      </h3>

      <p>
        This analysis evaluates publicly observable
        DNS and email-security configuration.
      </p>

      <ul>

        <li>
          Active SMTP testing:
          <strong>
            ${yesNo(scope.active_smtp_testing)}
          </strong>
        </li>

        <li>
          TLS testing:
          <strong>
            ${yesNo(scope.tls_testing)}
          </strong>
        </li>

        <li>
          DANE/TLSA testing:
          <strong>
            ${yesNo(scope.dane_testing)}
          </strong>
        </li>

        <li>
          Reputation testing:
          <strong>
            ${yesNo(scope.reputation_testing)}
          </strong>
        </li>

        <li>
          Active deliverability testing:
          <strong>
            ${yesNo(
              scope.active_deliverability_testing
            )}
          </strong>
        </li>

      </ul>

      <p>
        These active and deeper tests are outside
        the scope of the Free configuration assessment.
      </p>

    </article>
  `;
}


async function analyseDomain(domain) {
  setStatus(
    "Analysing email security…"
  );


  resultElement.innerHTML = `
    <p>
      MailRekon is querying the domain's publicly
      observable email infrastructure.
    </p>
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
          tier: "free",
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


if (
  form &&
  domainInput
) {
  form.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();


      const domain =
        domainInput.value
          .trim()
          .toLowerCase();


      if (!domain) {
        setStatus(
          "Please enter a domain."
        );

        domainInput.focus();

        return;
      }


      analyseDomain(domain);
    }
  );
}
