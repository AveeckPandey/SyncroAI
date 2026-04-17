const API_URL = "http://localhost:3000/api/analyze";
const resumeUpload = document.getElementById("resumeUpload");
const fileNameDisplay = document.getElementById("fileNameDisplay");
const dropZone = document.getElementById("dropZone");

const statusLine = document.getElementById("status");
const analyzeBtn = document.getElementById("analyzeBtn");
const conclusionCard = document.getElementById("conclusionCard");
const resultsContainer = document.getElementById("results");

const resumeSummary = document.getElementById("resumeSummary");
const resumeRaw = document.getElementById("resumeRaw");

const scrapedSummary = document.getElementById("scrapedSummary");
const scrapedList = document.getElementById("scrapedList");

const resultsSummary = document.getElementById("resultsSummary");
const resultsList = document.getElementById("resultsList");
const resultsRaw = document.getElementById("resultsRaw");
const rawLinkedinContainer = document.getElementById("rawLinkedinContainer");

const contentSuggestions = document.getElementById("contentSuggestions");
const keywordsContainer = document.getElementById("keywordsContainer");
const recommendedKeywords = document.getElementById("recommendedKeywords");
const headlineContainer = document.getElementById("headlineContainer");
const recommendedHeadlineText = document.getElementById("recommendedHeadlineText");
const aboutContainer = document.getElementById("aboutContainer");
const recommendedAboutText = document.getElementById("recommendedAboutText");

// UI Feedback for File Upload
resumeUpload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    fileNameDisplay.textContent = `📄 ${file.name}`;
    dropZone.classList.add("has-file");
  } else {
    fileNameDisplay.textContent = "📁 Upload Resume PDF (Optional)";
    dropZone.classList.remove("has-file");
  }
});

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read the resume file."));
        return;
      }
      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };

    reader.onerror = () => reject(reader.error || new Error("Failed to read the resume file."));
    reader.readAsDataURL(file);
  });
}

function resetResults() {
  resultsContainer.classList.remove("visible");
  conclusionCard.style.display = "none";
  
  resumeSummary.textContent = "";
  resumeRaw.textContent = "";
  scrapedSummary.textContent = "";
  scrapedList.innerHTML = "";
  resultsSummary.textContent = "";
  resultsList.innerHTML = "";
  resultsRaw.textContent = "";
  contentSuggestions.style.display = "none";
  recommendedKeywords.innerHTML = "";
  if(recommendedHeadlineText) recommendedHeadlineText.textContent = "";
  recommendedAboutText.textContent = "";
  
  statusLine.className = "";
  rawLinkedinContainer.style.display = "none";
}

function setStatus(message, type = "") {
  statusLine.innerText = message;
  statusLine.className = type;
}

function showResumeData(resume) {
  if (!resume?.fileName) {
    resumeSummary.textContent = "No resume was uploaded.";
    resumeRaw.textContent = "No data.";
    return;
  }

  if (resume.parsed) {
    resumeSummary.textContent = `Parsed ${resume.fileName} (${resume.characters} chars)`;
  } else {
    resumeSummary.textContent = `Failed to extract text from ${resume.fileName}`;
  }

  resumeRaw.textContent = resume.preview || "No preview available.";
}

function showLinkedInData(profile) {
  scrapedSummary.textContent = "Successfully extracted fields:";
  
  for (const [key, value] of Object.entries(profile || {})) {
    const item = document.createElement("li");
    item.innerHTML = `<strong style="color: #cbd5e1; text-transform: capitalize;">${key}:</strong> ${value ? (value.length > 80 ? value.substring(0, 80) + "..." : value) : "Not available"}`;
    scrapedList.appendChild(item);
  }
}

function showConclusion(analysis) {
  conclusionCard.style.display = "block";
  resultsSummary.textContent = analysis.conclusion || "Audit completed.";
  
  for (const recommendation of analysis.recommendations || []) {
    const item = document.createElement("li");
    item.textContent = recommendation;
    resultsList.appendChild(item);
  }

  const hasKeywords = analysis.recommendedKeywords && analysis.recommendedKeywords.length > 0;
  const hasHeadline = analysis.recommendedHeadline && analysis.recommendedHeadline.trim() !== "";
  const hasAboutText = analysis.recommendedAboutText && analysis.recommendedAboutText.trim() !== "";

  if (hasKeywords || hasHeadline || hasAboutText) {
    contentSuggestions.style.display = "block";
    
    if (hasKeywords) {
      keywordsContainer.style.display = "block";
      recommendedKeywords.innerHTML = "";
      for (const kw of analysis.recommendedKeywords) {
        const tag = document.createElement("span");
        tag.className = "keyword-tag";
        tag.textContent = kw;
        recommendedKeywords.appendChild(tag);
      }
    } else {
      keywordsContainer.style.display = "none";
    }

    if (hasHeadline && headlineContainer) {
      headlineContainer.style.display = "block";
      recommendedHeadlineText.textContent = analysis.recommendedHeadline;
    } else if (headlineContainer) {
      headlineContainer.style.display = "none";
    }

    if (hasAboutText) {
      aboutContainer.style.display = "block";
      recommendedAboutText.textContent = analysis.recommendedAboutText;
    } else {
      aboutContainer.style.display = "none";
    }
  }

  if (analysis.raw || analysis.response) {
    rawLinkedinContainer.style.display = "block";
    resultsRaw.textContent = analysis.raw || analysis.response || "";
  }
}

document.getElementById("analyzeBtn").addEventListener("click", async () => {
  resetResults();
  setStatus("Connecting to LinkedIn page...");
  analyzeBtn.classList.add("loading");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id || !tab.url?.includes("linkedin.com/in/")) {
      setStatus("Please navigate to a LinkedIn Profile page.", "status-error");
      analyzeBtn.classList.remove("loading");
      return;
    }

    setStatus("Reading profile data...");

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        if (typeof globalThis.syncroAIScrapeLinkedIn !== "function") {
          throw new Error("Scraper script failed to load.");
        }
        return await globalThis.syncroAIScrapeLinkedIn();
      },
    });

    const linkedinData = result?.result;
    if (!linkedinData) {
      setStatus("Could not extract data from page.", "status-error");
      analyzeBtn.classList.remove("loading");
      return;
    }

    setStatus("Preparing resume data...");
    const resumeFile = resumeUpload.files?.[0];
    const resumeBase64 = resumeFile ? await readFileAsBase64(resumeFile) : "";

    setStatus("Sending to AI Model...");

    const responseFromServer = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        linkedinData: linkedinData,
        resumeText: "",
        resumeBase64,
        resumeFileName: resumeFile?.name || "",
      }),
    });

    if (!responseFromServer.ok) {
      throw new Error(`API error ${responseFromServer.status}`);
    }

    const finalResult = await responseFromServer.json();
    
    // Display results beautifully
    resultsContainer.classList.add("visible");
    showResumeData(finalResult.resume);
    showLinkedInData(finalResult.linkedin || linkedinData);
    
    if (finalResult.analysis?.mode === "fallback") {
      showConclusion(finalResult.analysis);
      setStatus("Fallback audit completed.", "status-success");
    } else {
      // Create a structure for gemini display if it only returned a string (as it was in original code)
      let displayAnalysis = finalResult.analysis || {};
      
      // If the backend `route.ts` returned `{ analysis: { mode: "gemini", response: "..." } }`
      if (displayAnalysis.response && !displayAnalysis.recommendations) {
         displayAnalysis = {
           conclusion: "AI Audit Results",
           raw: displayAnalysis.response,
           recommendations: ["See detailed AI evaluation below"]
         };
      }
      
      showConclusion(displayAnalysis);
      setStatus("AI Audit Completed Successfully ✨", "status-success");
    }
  } catch (error) {
    console.error(error);
    if (error instanceof TypeError) {
      setStatus("Backend offline. Ensure server is running.", "status-error");
    } else {
      setStatus("Error processing the request.", "status-error");
    }
  } finally {
    analyzeBtn.classList.remove("loading");
  }
});
