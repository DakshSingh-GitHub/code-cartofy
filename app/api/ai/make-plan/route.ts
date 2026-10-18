import { NextResponse } from "next/server";

interface MakePlanRequest {
  nodeId: string;
  label: string;
  dependentCount: number;
  dependents?: string[];
  code?: string;
  repoName?: string;
}

export async function POST(request: Request) {
  try {
    const body: MakePlanRequest = await request.json();
    const {
      nodeId,
      label,
      dependentCount,
      dependents = [],
      code = "",
      repoName = "Repository",
    } = body;

    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini API Key is not configured on the server. Please set GEMINI_API_KEY in .env.local.",
          missingKey: true,
        },
        { status: 500 }
      );
    }

    const prompt = `You are a Principal Software Architect crafting a strategic, actionable Refactoring and Architectural Decoupling Plan for a critical module in a codebase.

CONTEXT:
- File / Module: ${label} (${nodeId})
- Inbound Dependents (Fan-In): ${dependentCount} downstream modules depend on this file.
- Repository: ${repoName}
- Downstream Dependent Files:
${dependents.slice(0, 20).map((d) => `  - ${d}`).join("\n")}${
      dependents.length > 20
        ? `\n  - ...and ${dependents.length - 20} more files`
        : ""
    }

SOURCE CODE OF THE MODULE (truncated if large):
\`\`\`typescript
${code.slice(0, 12000)}
\`\`\`

YOUR TASK:
Create a comprehensive, production-grade Plan on "WHAT TO DO" and "WHAT NOT TO DO" to safely refactor and decouple this module without causing regressions or circular dependencies.

SPECIFIC REQUIREMENTS:
1. Provide a clear summary and risk assessment for refactoring this file.
2. Recommend the best architectural design pattern to adopt (e.g. Facade Pattern, Dependency Inversion, Service Layer, Factory / Registry, Interface Segregation).
3. "WHAT TO DO" (Do's): Provide 4-6 specific, concrete architectural best practices and steps that engineers MUST follow when refactoring this file (e.g., interface contracts, dependency injection, pure utility extraction, test harnesses). Each starting with "DO: ".
4. "WHAT NOT TO DO" (Don'ts): Provide 4-6 critical antipatterns and traps that engineers MUST AVOID (e.g., introducing cyclic imports, big-bang rewrites, mutating shared global state, using 'any' typing, importing God objects for single helpers). Each starting with "DON'T: ".
5. "REFACTORING PLAN": Provide a sequential 4-5 step execution protocol (e.g. Phase 1 Preparation, Phase 2 Core Extraction, Phase 3 Interface Decoupling, Phase 4 Consumer Migration, Phase 5 Deprecation & Verification).
6. "PROPOSED MODULES": Suggest 2-3 decoupled modular files to extract out of this file, including path, description, and clean TypeScript code snippets.
7. "GITHUB ISSUE": Generate a high-quality GitHub Issue title, body (in clean Markdown formatted with Do's and Don'ts checklists), and labels.

IMPORTANT: Your response MUST be valid JSON matching this schema:
{
  "summary": "Executive summary of the refactoring strategy for this module.",
  "riskLevel": "Critical" | "High" | "Medium",
  "architecturalPattern": "Recommended architectural pattern name",
  "blastRadiusDescription": "Explanation of blast radius, dependent impact, and failure modes.",
  "dos": [
    "DO: ...",
    "DO: ...",
    "DO: ...",
    "DO: ..."
  ],
  "donts": [
    "DON'T: ...",
    "DON'T: ...",
    "DON'T: ...",
    "DON'T: ..."
  ],
  "refactoringPlan": [
    "Phase 1 - Preparation: ...",
    "Phase 2 - Extraction: ...",
    "Phase 3 - Migration: ...",
    "Phase 4 - Verification: ..."
  ],
  "proposedModules": [
    {
      "path": "extracted/filepath/here.ts",
      "description": "What this extracted file handles",
      "codeSnippet": "TypeScript code snippet showcasing the extracted logic..."
    }
  ],
  "githubIssue": {
    "title": "[Plan] Architectural Refactoring & Decoupling: ${label}",
    "body": "Full GitHub Markdown containing executive summary, What to Do (Do's), What NOT to Do (Don'ts), Phase-by-phase Checklist, and modular breakdown.",
    "labels": ["plan", "architecture", "refactoring", "codecartofy"]
  }
}

Respond ONLY with the JSON object. Do not wrap in markdown fences or preamble.`;

    // Models to try in order of preference
    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ];
    let lastError: Error | null = null;
    let responseData: Record<string, unknown> | null = null;

    for (const model of modelsToTry) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const errMsg =
            errBody?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
          lastError = new Error(`Gemini API [${model}]: ${errMsg}`);
          if (res.status === 404 || errMsg.toLowerCase().includes("not found")) {
            continue;
          }
          throw lastError;
        }

        const data = await res.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidateText) {
          throw new Error("No plan response generated by Gemini.");
        }

        let cleanText = candidateText.trim();
        if (cleanText.startsWith("```json")) {
          cleanText = cleanText
            .replace(/^```json\s*/, "")
            .replace(/```$/, "")
            .trim();
        } else if (cleanText.startsWith("```")) {
          cleanText = cleanText.replace(/^```\s*/, "").replace(/```$/, "").trim();
        }

        responseData = JSON.parse(cleanText) as Record<string, unknown>;
        break;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    if (!responseData) {
      return NextResponse.json(
        {
          error:
            lastError?.message ||
            "Failed to synthesize refactoring plan with Gemini API.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis: responseData,
    });
  } catch (error: unknown) {
    console.error("AI Refactoring Plan error:", error);
    const msg =
      error instanceof Error
        ? error.message
        : "Internal server error during refactoring plan synthesis.";
    return NextResponse.json(
      {
        error: msg,
      },
      { status: 500 }
    );
  }
}
