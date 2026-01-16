import type { DdevProjectBasic } from "@/types/ddev";

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export interface ProjectMatch {
  project: DdevProjectBasic;
  score: number; // 0 = exact match, higher = worse match
  matchType: "exact" | "prefix" | "contains" | "fuzzy";
}

/**
 * Find the best matching project for a given query
 * Returns null if no reasonable match is found
 */
export function findBestProjectMatch(
  query: string,
  projects: DdevProjectBasic[]
): ProjectMatch | null {
  if (!query || query.length < 2 || projects.length === 0) {
    return null;
  }

  const normalizedQuery = query.toLowerCase().trim();
  let bestMatch: ProjectMatch | null = null;

  for (const project of projects) {
    const name = project.name.toLowerCase();

    // Exact match - perfect score
    if (name === normalizedQuery) {
      return { project, score: 0, matchType: "exact" };
    }

    // Prefix match - very good
    if (name.startsWith(normalizedQuery)) {
      const score = 0.1 + (name.length - normalizedQuery.length) * 0.01;
      if (!bestMatch || score < bestMatch.score) {
        bestMatch = { project, score, matchType: "prefix" };
      }
      continue;
    }

    // Contains match - good
    if (name.includes(normalizedQuery)) {
      const score = 0.3 + (name.length - normalizedQuery.length) * 0.01;
      if (!bestMatch || score < bestMatch.score) {
        bestMatch = { project, score, matchType: "contains" };
      }
      continue;
    }

    // Fuzzy match using Levenshtein distance
    const distance = levenshteinDistance(name, normalizedQuery);
    const maxLen = Math.max(name.length, normalizedQuery.length);
    const normalizedDistance = distance / maxLen;

    // Only accept fuzzy matches with < 50% difference
    if (normalizedDistance < 0.5) {
      const score = 0.5 + normalizedDistance;
      if (!bestMatch || score < bestMatch.score) {
        bestMatch = { project, score, matchType: "fuzzy" };
      }
    }
  }

  return bestMatch;
}

/**
 * Find all projects that reasonably match a query
 * Useful for disambiguation when multiple projects match
 */
export function findAllProjectMatches(
  query: string,
  projects: DdevProjectBasic[],
  threshold: number = 0.6
): ProjectMatch[] {
  if (!query || query.length < 2 || projects.length === 0) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  const matches: ProjectMatch[] = [];

  for (const project of projects) {
    const name = project.name.toLowerCase();

    // Exact match
    if (name === normalizedQuery) {
      matches.push({ project, score: 0, matchType: "exact" });
      continue;
    }

    // Prefix match
    if (name.startsWith(normalizedQuery)) {
      const score = 0.1 + (name.length - normalizedQuery.length) * 0.01;
      matches.push({ project, score, matchType: "prefix" });
      continue;
    }

    // Contains match
    if (name.includes(normalizedQuery)) {
      const score = 0.3 + (name.length - normalizedQuery.length) * 0.01;
      matches.push({ project, score, matchType: "contains" });
      continue;
    }

    // Fuzzy match
    const distance = levenshteinDistance(name, normalizedQuery);
    const maxLen = Math.max(name.length, normalizedQuery.length);
    const normalizedDistance = distance / maxLen;

    if (normalizedDistance < threshold) {
      const score = 0.5 + normalizedDistance;
      matches.push({ project, score, matchType: "fuzzy" });
    }
  }

  // Sort by score (lower is better)
  return matches.sort((a, b) => a.score - b.score);
}

/**
 * Extract potential project name from a natural language message
 * Simple heuristic: look for words after action keywords
 */
export function extractProjectName(message: string): string | null {
  const normalized = message.toLowerCase().trim();

  // Patterns to match: "start X", "stop X", "restart X", etc.
  const actionPatterns = [
    /(?:start|run|boot|launch)\s+(?:the\s+)?(?:project\s+)?([a-z0-9_-]+)/i,
    /(?:stop|shutdown|halt|kill)\s+(?:the\s+)?(?:project\s+)?([a-z0-9_-]+)/i,
    /(?:restart|reboot)\s+(?:the\s+)?(?:project\s+)?([a-z0-9_-]+)/i,
    /(?:describe|info|about|status)\s+(?:the\s+)?(?:project\s+)?([a-z0-9_-]+)/i,
    /(?:open)\s+(?:the\s+)?(?:site\s+)?(?:for\s+)?([a-z0-9_-]+)/i,
  ];

  for (const pattern of actionPatterns) {
    const match = normalized.match(pattern);
    if (match && match[1] && match[1] !== "all" && match[1] !== "everything") {
      return match[1];
    }
  }

  return null;
}
