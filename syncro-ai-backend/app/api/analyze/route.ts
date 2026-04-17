import { GoogleGenerativeAI } from "@google/generative-ai";
import { PDFParse } from "pdf-parse";
import { NextResponse } from "next/server";
import path from "node:path";
import { pathToFileURL } from "node:url";

let pdfWorkerConfigured = false;

function normalizeText(value: string | undefined) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function collectInterestingLines(text: string, limit = 6) {
  const lines = text
    .split(/[\n.]/)
    .map((line) => normalizeText(line))
    .filter((line) => line.length > 20);

  return [...new Set(lines)].slice(0, limit);
}

function collectKeywordMatches(resumeText: string, linkedinData: Record<string, string>) {
  const trackedKeywords = [
    "react",
    "next.js",
    "javascript",
    "typescript",
    "node.js",
    "express",
    "mongodb",
    "sql",
    "python",
    "java",
    "tailwind",
    "aws",
    "docker",
    "api",
  ];

  const resumeLower = resumeText.toLowerCase();
  const linkedinLower = JSON.stringify(linkedinData).toLowerCase();
  const missing: string[] = [];
  const matched: string[] = [];

  for (const keyword of trackedKeywords) {
    if (!resumeLower.includes(keyword)) {
      continue;
    }

    if (linkedinLower.includes(keyword)) {
      matched.push(keyword);
    } else {
      missing.push(keyword);
    }
  }

  return { matched, missing };
}

function buildFallbackAnalysis(linkedinData: Record<string, string>, resumeText: string) {
  const recommendations: string[] = [];
  const headline = linkedinData?.headline || "";
  const about = linkedinData?.about || "";
  const experience = linkedinData?.experience || "";
  const lowerResumeText = resumeText.toLowerCase();
  const keywordMatches = collectKeywordMatches(resumeText, linkedinData);
  let conclusion = `Fallback audit generated for ${linkedinData?.name || "this profile"}.`;

  if (!headline || headline.toLowerCase().includes("not found")) {
    recommendations.push(
      "Add a keyword-rich LinkedIn headline that clearly states your role, tech stack, and career focus."
    );
  }

  if (!about || about.toLowerCase().includes("not found") || about.length < 120) {
    recommendations.push(
      "Expand your About section with a short intro, strongest projects, technical skills, and measurable impact."
    );
  }

  if (!experience || experience.toLowerCase().includes("not found") || experience.length < 120) {
    recommendations.push(
      "Add more detail to Experience with tools used, outcomes, numbers, and ownership for each role or project."
    );
  }

  if (!resumeText) {
    recommendations.push(
      "Upload a resume PDF so the audit can compare your resume achievements against LinkedIn content."
    );
  }

  if (resumeText && lowerResumeText.includes("react") && !`${headline} ${about}`.toLowerCase().includes("react")) {
    recommendations.push("Your resume mentions React, but your LinkedIn top section does not. Add it to improve search visibility.");
  }

  if (resumeText && lowerResumeText.includes("next.js") && !`${headline} ${about}`.toLowerCase().includes("next.js")) {
    recommendations.push("Your resume mentions Next.js, but LinkedIn does not highlight it clearly. Surface it in your headline or About section.");
  }

  if (keywordMatches.missing.length > 0) {
    recommendations.push(`Resume keywords missing from LinkedIn: ${keywordMatches.missing.join(", ")}.`);
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Your profile has the basic sections. Next improve recruiter visibility by aligning your resume keywords with the headline and About section."
    );
  }

  if (keywordMatches.matched.length > 0) {
    conclusion += ` LinkedIn already reflects these resume keywords: ${keywordMatches.matched.join(", ")}.`;
  }

  return {
    analysis: {
      mode: "fallback",
      conclusion,
      recommendations,
      recommendedKeywords: keywordMatches.missing,
      recommendedAboutText: "",
    },
  };
}

async function extractResumeText(resumeText: string | undefined, resumeBase64: string | undefined) {
  const providedResumeText = normalizeText(resumeText);
  if (providedResumeText) {
    return providedResumeText;
  }

  if (!resumeBase64) {
    return "";
  }

  if (!pdfWorkerConfigured) {
    const workerPath = path.join(
      process.cwd(),
      "node_modules",
      "pdfjs-dist",
      "legacy",
      "build",
      "pdf.worker.mjs"
    );

    PDFParse.setWorker(pathToFileURL(workerPath).toString());
    pdfWorkerConfigured = true;
  }

  const parser = new PDFParse({ data: Buffer.from(resumeBase64, "base64") });

  try {
    const result = await parser.getText();
    return normalizeText(result.text);
  } finally {
    await parser.destroy();
  }
}

function buildResumeSection(resumeFileName: string | undefined, extractedResumeText: string) {
  const highlights = collectInterestingLines(extractedResumeText);

  return {
    fileName: resumeFileName || null,
    parsed: Boolean(extractedResumeText),
    preview: extractedResumeText.slice(0, 400),
    characters: extractedResumeText.length,
    highlights,
  };
}

function buildLinkedInSection(linkedinData: Record<string, string>) {
  return {
    ...linkedinData,
  };
}

function parseGeminiResponse(responseText: string, linkedinData: Record<string, string>) {
  const cleaned = responseText.trim();

  try {
    const parsed = JSON.parse(cleaned);
      return {
        mode: "gemini",
        conclusion:
          parsed.conclusion ||
          parsed.summary ||
          `Gemini audit generated for ${linkedinData?.name || "this profile"}.`,
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations
          : Array.isArray(parsed.actionPlan)
            ? parsed.actionPlan
            : [],
        recommendedKeywords: Array.isArray(parsed.recommendedKeywords) ? parsed.recommendedKeywords : [],
        recommendedHeadline: parsed.recommendedHeadline || "",
        recommendedAboutText: parsed.recommendedAboutText || "",
        raw: responseText,
      };
  } catch {
    const recommendations = collectInterestingLines(cleaned, 8);

    return {
      mode: "gemini",
      conclusion: `Gemini audit generated for ${linkedinData?.name || "this profile"}.`,
      recommendations,
      raw: responseText,
    };
  }
}

export async function POST(req: Request) {
  try {
    const { linkedinData, resumeText, resumeBase64, resumeFileName } = await req.json();
    const extractedResumeText = await extractResumeText(resumeText, resumeBase64);
    const resumeMeta = buildResumeSection(resumeFileName, extractedResumeText);
    const linkedinSection = buildLinkedInSection(linkedinData);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        ...buildFallbackAnalysis(linkedinSection, extractedResumeText),
        resume: resumeMeta,
        linkedin: linkedinSection,
      });
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

      const prompt = `
        You are a Multi-Agent Career Strategy Team consisting of a Tech Recruiter and an SEO Specialist.

        INPUT 1 (Resume): ${extractedResumeText}
        INPUT 2 (Current LinkedIn): ${JSON.stringify(linkedinData)}

        TASK:
        1. Agent 'Recruiter': Identify top 3 technical achievements or certifications in the Resume MISSING from LinkedIn.
        2. Agent 'SEO Specialist': Suggest a new LinkedIn Headline using keywords from the Resume (e.g., MERN, Next.js).
        3. Agent 'Writer': Generate a recommended 'About' section text they can copy-paste.

        Final Output: Provide a structured JSON response EXACTLY matching this schema:
        {
          "conclusion": "A short 1-sentence summary",
          "recommendations": ["Action item 1", "Action item 2", "Action item 3"],
          "recommendedKeywords": ["Keyword1", "Keyword2", "Keyword3"],
          "recommendedHeadline": "Suggested new headline based on the resume",
          "recommendedAboutText": "The actual text they should paste into their About section"
        }
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      return NextResponse.json({
        analysis: parseGeminiResponse(responseText, linkedinSection),
        resume: resumeMeta,
        linkedin: linkedinSection,
      });
    } catch (geminiError: any) {
      console.error("Gemini request failed, using fallback analysis:", geminiError);
      const fallback = buildFallbackAnalysis(linkedinSection, extractedResumeText);
      const errorMsg = geminiError?.message || "Unknown error";
      fallback.analysis.conclusion = `⚠️ GENAI Error: ${errorMsg.slice(0, 100)}... Reverted to basic script.`;
      
      return NextResponse.json({
        ...fallback,
        resume: resumeMeta,
        linkedin: linkedinSection,
      });
    }
  } catch (error) {
    console.error("Analyze route failed:", error);
    return NextResponse.json(
      { error: "Failed to generate analysis." },
      { status: 500 }
    );
  }
}
