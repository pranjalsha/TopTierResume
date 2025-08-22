import { extractTextFromPDF } from "../utils/pdfUtils.js";
import { getOpenAIResponse } from "../utils/openai.js";
import multer from "multer";
import fs from "fs";
import Resume from "../models/resumeModel.js";

export const customizeResume = async (req, res) => {
  try {
    const jobDesc = req.body.jobDesc;
    const resumeFile = req.file;

    if (!resumeFile || !jobDesc) {
      return res.status(400).json({
        message: "Both resume PDF and job description are required",
      });
    }

    // Extract text from uploaded resume PDF
    const resumeText = await extractTextFromPDF(resumeFile.path);

const prompt = `
You are a world-class resume strategist, senior recruiter, and ATS specialist who has placed candidates at elite companies and built ATS-tuning engines. Your job: take the GIVEN JOB DESCRIPTION and the ORIGINAL RESUME and produce **(A)** a single, world-class REWRITE of the resume optimized for hiring managers and ATS, and **(B)** an actionable, precise ATS OPTIMIZATION REPORT that gives real, implementable changes which will measurably improve ATS score and recruiter-readability.

OUTPUT RULES (READ CAREFULLY):
1) OUTPUT must be a single block of plain text only. No extra commentary, no code fences, no JSON wrappers, no analysis outside the block.
2) The block must contain two clearly separated sections **in this order**:
   - The rewritten resume (first)
   - The ATS OPTIMIZATION REPORT (second)
3) Use the exact section headers shown below (double hashes). Do not add other headers outside this block.
4) Do NOT invent facts (education, job titles, employers). You may **infer conservative metrics** only when strongly implied by the resume; mark any inferred number with (est.).
5) If you propose any new certification or claim, mark it as "Suggested — verify before adding."

RESUME FORMATTING RULES (MUST FOLLOW):
- Header: First line must be: Full Name  
  Second line: Phone | City, Country | email@example.com | LINKEDIN | GITHUB | PORTFOLIO (all on one line separated by " | ").
- Section headings must be enclosed in double hashes: ## SUMMARY ##, ## EXPERIENCE ##, ## PROJECTS ##, ## EDUCATION ##, ## SKILLS ##, etc.
- Dates: For each experience/education entry, place the date range on its own line immediately AFTER the job title / institution line.
- Bullets: Every bullet must begin with a hyphen "-" at the start of a new line. Max 2 lines per bullet.
- Order: Put the most relevant, job-matching experience first.
- Length: 1 page preferred for early/mid-career. 2 pages only if resume shows >10 years or clear leadership scope.

RESUME CONTENT RULES:
- Start each bullet with a strong action verb (Led, Built, Improved, Reduced, Scaled, Launched, Architected, Negotiated, Automated, Designed, Delivered).
- Translate responsibilities into impact: format as "Action + Outcome + Metric/Context" when possible.
- Inject exact noun phrases from JOB DESCRIPTION (keywords) naturally into bullets and the SKILLS section.
- Group SKILLS as: Languages | Frameworks/Libs | Tools/Infra | Cloud | Other.
- If the JD requests specific deliverables (e.g., "design REST APIs", "CI/CD", "Kubernetes"), ensure a bullet explicitly mentions that deliverable using the same phrase.

SECTION 1 — REWRITTEN RESUME (EXACT FORMAT REQUIRED)
Produce the rewritten resume first using the exact formatting rules above.

## ATS OPTIMIZATION REPORT ##
After the resume, include a focused report with the following labeled subsections (each subsection header as shown, exactly):

## ATS SCORE ##
- Provide an estimated ATS compatibility score (0-100) for the rewritten resume vs the JOB DESCRIPTION, and one-line justification for the score.

## TOP 5 KEYWORD GAPS (COPY-PASTE) ##
- List up to 5 exact keyword phrases that are present in JOB DESCRIPTION but missing or underrepresented in the ORIGINAL resume. Provide each as a copy-paste phrase.

## EXACT KEYWORDS/PHRASES TO ADD (COPY-PASTE) ##
- Provide 8–15 exact keywords/phrases (comma-separated) to drop into Skills and bullets. Order them by priority (highest first). Use the same casing as in JD.

## TOP 5 BULLET REWRITES (COPY-PASTE) ##
- For five of the weakest or vaguest bullets in the ORIGINAL resume, show exact replacements in this format:
  - Original: "..."
  - Replace with: "..."  
  (Make replacements concise, use metrics or (est.) where needed.)

## FORMAT & FILE RECOMMENDATIONS ##
- Exact filename suggestion for job application (e.g., Firstname_Lastname_Company_Role.pdf).
- Export settings (PDF): font family and size, margins, single-column, embed fonts, PDF/A if available, filename case.

## QUANTIFICATION SUGGESTIONS (COPY-PASTE TEMPLATES) ##
- For bullet items that lack metrics, provide 6 ready-to-use sentence templates with placeholders to quantify impact. Example:
  - "Reduced API latency by {X}% (from {A}ms to {B}ms) by optimizing {component}."
- Clearly map each suggestion to the relevant original bullet index (e.g., Experience #1 bullet 2 → template).

## TOP 7 ACTIONABLE FIXES (PRIORITIZED) ##
- Provide a ranked list (1–7) of exact actions the candidate must take to improve ATS score and recruiter impression. Each action must be one line and directly actionable (e.g., "Add 'RESTful APIs' under Frameworks and include it in 2 bullets with context").

## FORMATTING/READABILITY FIXES ##
- 4 concise, copy-pasteable fixes (e.g., "Replace dense paragraph in SUMMARY with 1 bullet starting 'Product-focused Software Engineer...'").

## SKILLS SECTION (FINAL COPY-PASTE) ##
- Provide the final SKILLS line(s) exactly as they should appear. Grouped and comma-separated.

## SUGGESTED BULLETS TO ADD (COPY-PASTE) ##
- Add 5 new high-impact bullets (one-liners) that the candidate can add to the most relevant role to increase match. Mark any inferred metrics with (est.).

## VERIFICATION & NEXT STEPS ##
- 3 quick checks the candidate should run before submitting (e.g., match 10 keywords, run ATS checker on Jobscan, save as PDF/A).

ADDITIONAL RULES:
- Every inferred numeric estimate must be suffixed with (est.).
- Do NOT include any recruiter contact details or confidential info.
- Be precise and terse — the report should enable the candidate to implement changes in <60 minutes.

JOB DESCRIPTION:
"""
${jobDesc}
"""

ORIGINAL RESUME:
"""
${resumeText}
"""
`; 
 


    const aiResponse = await getOpenAIResponse(prompt);

    const newResumeEntry = new Resume({
      customizedText: aiResponse,
      originalFileName: resumeFile.originalname,
      user: req.user._id, // req.user is available from your 'protect' middleware
    });
    await newResumeEntry.save();

    // Delete the uploaded file after use
    fs.unlinkSync(resumeFile.path);

    res.status(200).json({ customizedText: aiResponse });
  } catch (error) {
    console.error("❌ Customize Resume Error:", error);
    res.status(500).json({ message: "AI resume customization failed" });
  }
};
