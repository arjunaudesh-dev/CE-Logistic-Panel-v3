import { db } from "@/lib/db";

// Cache for process flows to avoid repeated DB hits during bulk operations
let processFlowsCache: any[] | null = null;
let cacheTime = 0;

export async function getProcessFlows() {
  const now = Date.now();
  // 5 minute cache
  if (!processFlowsCache || now - cacheTime > 5 * 60 * 1000) {
    processFlowsCache = await db.processFlow.findMany({
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });
    cacheTime = now;
  }
  return processFlowsCache || [];
}

export function invalidateProcessFlowsCache() {
  processFlowsCache = null;
  cacheTime = 0;
}

export async function resolveProcessFlowAndProgress(
  fileCategory: string,
  fileCost: number,
  currentPosition: string,
  existingProcessFlowId: string | null
): Promise<{ processFlowId: string | null; currentProgress: number }> {
  const flows = (await getProcessFlows()) || [];

  let matchedFlow = existingProcessFlowId
    ? flows.find((f) => f.id === existingProcessFlowId)
    : null;

  // Auto-select based on rules if not explicitly bound
  if (!matchedFlow) {
    for (const flow of flows) {
      if (flow.conditionMethod && flow.conditionMethod !== "Any") {
        const methodMatch =
          fileCategory?.toLowerCase() === flow.conditionMethod.toLowerCase() ||
          (flow.conditionMethod === "RC" && fileCategory?.toLowerCase().includes("rc")) ||
          (flow.conditionMethod === "Non-Rate" && fileCategory?.toLowerCase().includes("non")) ||
          (flow.conditionMethod === "Contract" && fileCategory?.toLowerCase().includes("contract"));
        if (!methodMatch) continue;
      }

      if (flow.conditionMinValue !== null && flow.conditionMinValue !== undefined && fileCost < flow.conditionMinValue) {
        continue;
      }
      if (flow.conditionMaxValue !== null && flow.conditionMaxValue !== undefined && fileCost > flow.conditionMaxValue) {
        continue;
      }

      matchedFlow = flow;
      break;
    }
  }

  // Fallback heuristics if still not matched
  if (!matchedFlow) {
    matchedFlow = flows.find((f) => {
      const n = f.name.toLowerCase();
      if (fileCategory?.toLowerCase().includes("rc") && n.includes("rc")) return true;
      if (fileCategory?.toLowerCase().includes("non") && n.includes("non-rate")) return true;
      if (fileCategory?.toLowerCase().includes("contract") && n.includes("contract")) return true;
      return false;
    });
  }

  // Fallback to first available flow
  if (!matchedFlow && flows.length > 0) {
    matchedFlow = flows[0];
  }

  if (!matchedFlow) {
    return { processFlowId: null, currentProgress: 0 };
  }

  // Calculate percentage based on current position and expectedPercentage of steps
  let currentProgress = 0;
  let found = false;

  const totalSteps = matchedFlow.steps.length;
  const defaultPercentagePerStep = totalSteps > 0 ? 100 / totalSteps : 0;

  for (const step of matchedFlow.steps) {
    const stepPct = step.expectedPercentage && step.expectedPercentage > 0
      ? step.expectedPercentage
      : defaultPercentagePerStep;

    currentProgress += stepPct;

    if (step.positionName === currentPosition) {
      found = true;
      break;
    }
  }

  if (!found) {
    if (["Payment Done", "Closed", "Complete"].includes(currentPosition)) {
      currentProgress = 100;
    } else if (currentPosition === "PR Raised") {
      currentProgress = matchedFlow.steps.length > 0 && matchedFlow.steps[0].expectedPercentage > 0
        ? matchedFlow.steps[0].expectedPercentage
        : defaultPercentagePerStep;
    }
  }

  currentProgress = Math.min(100, Math.round(currentProgress * 10) / 10);

  return { processFlowId: matchedFlow.id, currentProgress };
}
