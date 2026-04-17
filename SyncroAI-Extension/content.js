function normalizeText(value) {
  return value?.replace(/\s+/g, " ")?.trim() || "";
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonLdPeople() {
  const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
  const people = [];

  for (const script of scripts) {
    const text = script.textContent?.trim();
    if (!text) {
      continue;
    }

    try {
      const data = JSON.parse(text);
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.["@graph"])
          ? data["@graph"]
          : [data];

      for (const item of items) {
        if (item?.["@type"] === "Person") {
          people.push(item);
        }
      }
    } catch (error) {
      // Ignore JSON-LD blocks that are not valid JSON for this simple parser.
    }
  }

  return people;
}

function firstNonEmptyText(selectors, root = document) {
  for (const selector of selectors) {
    const text = normalizeText(root.querySelector(selector)?.innerText);
    if (text) {
      return text;
    }
  }

  return "";
}

function firstNonEmptyAttribute(selectors, attributeName, root = document) {
  for (const selector of selectors) {
    const value = normalizeText(root.querySelector(selector)?.getAttribute(attributeName));
    if (value) {
      return value;
    }
  }

  return "";
}

function getTitleBasedName() {
  const title = normalizeText(document.title);
  if (!title) {
    return "";
  }

  const separators = [" | LinkedIn", " | Professional Profile", " - LinkedIn"];
  let cleanedTitle = title;

  for (const separator of separators) {
    if (cleanedTitle.includes(separator)) {
      cleanedTitle = cleanedTitle.split(separator)[0];
    }
  }

  if (cleanedTitle.includes(" - ")) {
    cleanedTitle = cleanedTitle.split(" - ")[0];
  }

  return normalizeText(cleanedTitle);
}

function getMetaHeadline() {
  const description = firstNonEmptyAttribute(
    [
      'meta[property="og:description"]',
      'meta[name="description"]',
    ],
    "content"
  );

  if (!description) {
    return "";
  }

  return normalizeText(description.replace(/^View\s+/, ""));
}

function getJsonLdName() {
  const person = parseJsonLdPeople()[0];
  return normalizeText(person?.name);
}

function getJsonLdHeadline() {
  const person = parseJsonLdPeople()[0];
  return normalizeText(person?.jobTitle || person?.description);
}

function getTopCardTextLines() {
  const topCard = document.querySelector("main");
  const text = normalizeText(topCard?.innerText);
  if (!text) {
    return [];
  }

  return topCard.innerText
    .split("\n")
    .map((line) => normalizeText(line))
    .filter(Boolean)
    .slice(0, 20);
}

function getTopCardHeadline() {
  const lines = getTopCardTextLines();
  const name = getTitleBasedName() || getJsonLdName();

  for (const line of lines) {
    if (!line || line === name) {
      continue;
    }

    if (
      line.length > 8 &&
      !/followers|connections|contact info|message|open to work|talks about/i.test(line)
    ) {
      return line;
    }
  }

  return "";
}

function findSectionByHeading(headingText) {
  const sections = Array.from(document.querySelectorAll("main section, section"));

  return sections.find((section) => {
    const heading = Array.from(section.querySelectorAll("h1, h2, h3, span"))
      .map((node) => normalizeText(node.textContent).toLowerCase())
      .find((text) => text === headingText.toLowerCase());

    return Boolean(heading);
  });
}

function extractSectionText(headingText, maxLength) {
  const section = findSectionByHeading(headingText);
  if (!section) {
    return "";
  }

  const clonedSection = section.cloneNode(true);
  clonedSection
    .querySelectorAll("button, a[aria-label*='See more'], .visually-hidden")
    .forEach((node) => node.remove());

  const fullText = normalizeText(clonedSection.innerText);
  if (!fullText) {
    return "";
  }

  const headingPattern = new RegExp(`^${headingText}\\s*`, "i");
  const cleanedText = normalizeText(fullText.replace(headingPattern, ""));

  return maxLength ? cleanedText.slice(0, maxLength) : cleanedText;
}

function extractSectionFromFullText(headingText, nextHeadings = []) {
  const bodyText = normalizeText(document.body?.innerText);
  if (!bodyText) {
    return "";
  }

  const escapedHeading = headingText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedNextHeadings = nextHeadings
    .map((heading) => heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

  const pattern = escapedNextHeadings
    ? new RegExp(`${escapedHeading}\\s+([\\s\\S]*?)(?=\\s+(?:${escapedNextHeadings})\\s+)`, "i")
    : new RegExp(`${escapedHeading}\\s+([\\s\\S]*)`, "i");

  const match = bodyText.match(pattern);
  return normalizeText(match?.[1] || "");
}

function extractExperienceFromLists() {
  const sections = Array.from(document.querySelectorAll("main section, section"));

  for (const section of sections) {
    const sectionText = normalizeText(section.innerText);
    if (!/^experience\b/i.test(sectionText)) {
      continue;
    }

    const listItems = Array.from(section.querySelectorAll("li"))
      .map((item) => normalizeText(item.innerText))
      .filter((text) => text.length > 20);

    if (listItems.length > 0) {
      return normalizeText(listItems.join(" | ")).slice(0, 1000);
    }
  }

  return "";
}

async function preparePageForScrape(attempt) {
  if (attempt > 0) {
    window.scrollTo({ top: Math.min(document.body.scrollHeight, attempt * 700), behavior: "instant" });
  }

  await delay(350);
}

function scrapeLinkedIn() {
  console.log("SyncroAI: Hunting for profile data...");

  const aboutText =
    extractSectionText("About") ||
    extractSectionFromFullText("About", ["Activity", "Experience", "Education", "Skills"]);

  const experienceText =
    extractSectionText("Experience", 1000) ||
    extractSectionFromFullText("Experience", ["Education", "Skills", "Projects", "Licenses & certifications"]).slice(0, 1000) ||
    extractExperienceFromLists();

  const profileData = {
    name:
      firstNonEmptyText([
        "main h1",
        ".text-heading-xlarge",
        ".pv-text-details__left-panel h1",
        "[data-view-name='profile-card'] h1",
      ]) ||
      firstNonEmptyAttribute(
        [
          'meta[property="og:title"]',
          'meta[name="twitter:title"]',
        ],
        "content"
      ) ||
      getJsonLdName() ||
      getTitleBasedName() ||
      "Name not found",
    headline:
      firstNonEmptyText([
        "main .text-body-medium.break-words",
        "main .text-body-medium",
        ".pv-text-details__left-panel .text-body-medium",
        "[data-view-name='profile-card'] .text-body-medium",
      ]) ||
      getJsonLdHeadline() ||
      getTopCardHeadline() ||
      getMetaHeadline() ||
      "Headline not found",
    about: aboutText || "About section not found",
    experience: experienceText || "Experience not found",
  };

  console.log("SyncroAI: Scraped profile data", profileData);
  return profileData;
}

async function scrapeLinkedInWithRetry() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await preparePageForScrape(attempt);
    const profileData = scrapeLinkedIn();
    const hasUsefulData = Object.values(profileData).some(
      (value) => value && !value.toLowerCase().includes("not found")
    );

    if (hasUsefulData) {
      return profileData;
    }

    await delay(500);
  }

  return scrapeLinkedIn();
}

globalThis.syncroAIScrapeLinkedIn = scrapeLinkedInWithRetry;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_PROFILE") {
    scrapeLinkedInWithRetry().then(sendResponse);
  }
  return true; 
});
