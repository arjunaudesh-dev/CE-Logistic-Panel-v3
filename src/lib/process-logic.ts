import { db } from "@/lib/db";

// Cache for process flows to avoid repeated DB hits during bulk operations
let processFlowsCache: any[] | null = null;
let cacheTime = 0;

async function getProcessFlows() {
  const now = Date.now();
  // 5 minute cache
  if (!processFlowsCache || now - cacheTime > 5 * 60 * 1000) {
    processFlowsCache = await db.processFlow.findMany({
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });
    cacheTime = now;
  }
  return processFlowsCache;
}

export async function resolveProcessFlowAndProgress(
  fileCategory: string,
  fileCost: number,
  currentPosition: string,
  existingProcessFlowId: string | null
): Promise<{ processFlowId: string | null; currentProgress: number | null }> {
  const flows = await getProcessFlows();

  let matchedFlow = existingProcessFlowId
    ? flows.find((f) => f.id === existingProcessFlowId)
    : null;

  // Re-evaluate if not matched or if we want to auto-assign
  if (!matchedFlow) {
    // Basic heuristics based on fileCategory (RC, Non-Rate, etc) and fileCost
    for (const flow of flows) {
      // Check conditionMethod
      if (flow.conditionMethod && flow.conditionMethod !== "Any") {
        const methodMatch =
          fileCategory?.toLowerCase() === flow.conditionMethod.toLowerCase() ||
          (flow.conditionMethod === "RC" && fileCategory?.toLowerCase().includes("rc"));
        if (!methodMatch) continue;
      }

      // Check conditionMinValue / conditionMaxValue against fileCost
      if (flow.conditionMinValue !== null && fileCost < flow.conditionMinValue) {
        continue;
      }
      if (flow.conditionMaxValue !== null && fileCost > flow.conditionMaxValue) {
        continue;
      }

      matchedFlow = flow;
      break;
    }
  }

  // If we still don't have a flow, try to find a default one based on category
  if (!matchedFlow) {
    matchedFlow = flows.find((f) => {
      const n = f.name.toLowerCase();
      if (fileCategory?.toLowerCase().includes("rc") && n.includes("rc")) return true;
      if (fileCategory?.toLowerCase().includes("non") && n.includes("non-rate")) return true;
      if (fileCategory?.toLowerCase().includes("contract") && n.includes("contract")) return true;
      return false;
    });
  }

  // Default to the first flow if none matches
  if (!matchedFlow && flows.length > 0) {
    matchedFlow = flows[0];
  }

  if (!matchedFlow) {
    return { processFlowId: null, currentProgress: null };
  }

  // Calculate cumulative progress based on currentPosition
  let currentProgress = 0;
  let found = false;

  // We accumulate progress up to the step BEFORE the current position, 
  // or including the current position if we consider it "completed".
  // Let's accumulate up to the current step (meaning we have reached this step).
  for (const step of matchedFlow.steps) {
    const stepName = step.predefinedStage || step.positionName;
    if (stepName === currentPosition) {
      currentProgress += step.expectedPercentage || 0;
      found = true;
      break;
    }
    currentProgress += step.expectedPercentage || 0;
  }

  // If position wasn't found in this flow, return a reasonable default or 0
  if (!found && currentPosition === "Payment Complete") {
    currentProgress = 100;
  } else if (!found) {
    currentProgress = 0; // Unknown position in this flow
  }

  // Cap at 100
  if (currentProgress > 100) currentProgress = 100;

  return { processFlowId: matchedFlow.id, currentProgress };
}
