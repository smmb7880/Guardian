import { ApiClient, ApiError } from '../services/apiClient';
import { Child } from '@guardian/shared-types';
import { FamilyAction } from '../context/FamilyContext';

export interface ChildrenListState {
  isLoading: boolean;
  error: string | null;
}

export async function loadChildrenList(
  client: ApiClient,
  familyId: string,
  dispatch: (action: FamilyAction) => void,
): Promise<void> {
  dispatch({ type: 'SET_LOADING', loading: true });
  dispatch({ type: 'SET_ERROR', error: null });

  const children = await client.get<Child[]>(`/families/${familyId}/children`);
  dispatch({ type: 'SET_CHILDREN', children });
  dispatch({ type: 'SET_LOADING', loading: false });
}

export async function deleteChild(
  client: ApiClient,
  familyId: string,
  childId: string,
  dispatch: (action: FamilyAction) => void,
): Promise<void> {
  await client.delete(`/families/${familyId}/children/${childId}`);
  // Reload list after deletion
  await loadChildrenList(client, familyId, dispatch);
}

export function handleChildrenListError(err: unknown, dispatch: (action: FamilyAction) => void): void {
  const msg = err instanceof ApiError ? err.message : 'Failed to load children.';
  dispatch({ type: 'SET_ERROR', error: msg });
  dispatch({ type: 'SET_LOADING', loading: false });
}
