import { ApiClient, ApiError } from '../services/apiClient';
import { AuthAction, AuthenticatedUser } from '../context/AuthContext';
import { UserRole } from '@guardian/shared-types';

export interface FamilySetupFormState {
  familyName: string;
  firstChildName: string;
  firstChildDateOfBirth: string; // ISO date string YYYY-MM-DD
  isLoading: boolean;
  fieldErrors: { familyName?: string; firstChildName?: string; firstChildDateOfBirth?: string };
  formError: string | null;
}

export const initialFamilySetupFormState: FamilySetupFormState = {
  familyName: '',
  firstChildName: '',
  firstChildDateOfBirth: '',
  isLoading: false,
  fieldErrors: {},
  formError: null,
};

export function validateFamilySetupForm(
  state: FamilySetupFormState,
): FamilySetupFormState['fieldErrors'] {
  const errors: FamilySetupFormState['fieldErrors'] = {};
  if (!state.familyName.trim()) errors.familyName = 'Family name is required';
  if (!state.firstChildName.trim()) errors.firstChildName = "Child's name is required";
  if (!state.firstChildDateOfBirth) {
    errors.firstChildDateOfBirth = 'Date of birth is required';
  } else {
    const dob = new Date(state.firstChildDateOfBirth);
    const now = new Date();
    if (isNaN(dob.getTime())) errors.firstChildDateOfBirth = 'Invalid date';
    else if (dob >= now) errors.firstChildDateOfBirth = 'Date of birth must be in the past';
  }
  return errors;
}

export interface FamilySetupResult {
  familyId: string;
  childId: string;
}

export async function performFamilySetup(
  client: ApiClient,
  form: Pick<FamilySetupFormState, 'familyName' | 'firstChildName' | 'firstChildDateOfBirth'>,
  currentUser: AuthenticatedUser,
  dispatch: (action: AuthAction) => void,
): Promise<FamilySetupResult> {
  // Step 1: Create family
  const family = await client.post<{ id: string; name: string }>('/families', {
    name: form.familyName,
  });

  // Step 2: Create first child
  const child = await client.post<{ id: string }>(`/families/${family.id}/children`, {
    name: form.firstChildName,
    dateOfBirth: form.firstChildDateOfBirth,
  });

  // Step 3: Update local user with familyId
  const updatedUser: AuthenticatedUser = { ...currentUser, familyId: family.id };
  dispatch({
    type: 'RESTORE_SESSION',
    user: updatedUser,
    accessToken: '',  // will be re-read from storage; token unchanged
    refreshToken: '',
  });

  return { familyId: family.id, childId: child.id };
}

export function handleFamilySetupError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return 'Setup failed. Please check your connection and try again.';
}
