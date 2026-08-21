cat > static/js/analysis.js <<'EOF'
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
    /*
     * Create the Ably client first.
     *
     * The Worker supplies a short-lived TokenRequest restricted
     * to this exact analysis channel.
     */
    realtime = new Ably.Realtime({
      authUrl: `${API_BASE}/api/ably-auth`,
      authParams: {
        analysis_id: analysisId,
      },
    });

    /*
     * Obtain the channel before submitting the analysis request.
     * This is deliberately done first so the browser cannot miss
     * a fast scanner result.
     */
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

  /*
   * Ably normally gives us the object directly because the Worker
   * publishes JSON. Keep this fallback for encoded/string payloads.
   */
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

  const heading = document.createElement("h3");
  heading.textContent = "Analysis complete";

  const content = document.createElement("pre");
  content.textContent = JSON.stringify(result, null, 2);

  container.appendChild(heading);
  container.appendChild(content);

  setSubmitting(false);
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
EOF
