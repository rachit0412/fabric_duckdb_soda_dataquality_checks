export type WorkflowContext = {
  connectionId?: string;
  snapshotId?: string;
};

const WORKFLOW_CONTEXT_KEY = 'dq-workflow-context';

export const readWorkflowContext = (): WorkflowContext | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(WORKFLOW_CONTEXT_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as WorkflowContext;
    return parsed.connectionId || parsed.snapshotId ? parsed : null;
  } catch (error) {
    console.error('Failed to read workflow context:', error);
    return null;
  }
};

export const setWorkflowContext = (context: WorkflowContext): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const nextContext: WorkflowContext = {};
  if (context.connectionId) {
    nextContext.connectionId = context.connectionId;
  }
  if (context.snapshotId) {
    nextContext.snapshotId = context.snapshotId;
  }

  try {
    if (!nextContext.connectionId && !nextContext.snapshotId) {
      sessionStorage.removeItem(WORKFLOW_CONTEXT_KEY);
      return;
    }

    sessionStorage.setItem(WORKFLOW_CONTEXT_KEY, JSON.stringify(nextContext));
  } catch (error) {
    console.error('Failed to persist workflow context:', error);
  }
};