import { Family, Child, Device } from '@guardian/shared-types';
import { Policy } from '@guardian/shared-types';

export interface ExtraTimeRequest {
  id: string;
  childId: string;
  childName: string;
  requestedMinutes: number;
  reason?: string;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface ChildDashboardState {
  child: Child;
  policy: Policy | null;
  devices: Device[];
  todayUsageMinutes: number;
  isOnline: boolean;
  currentSchedule: string | null;
  nextScheduleTransition: string | null;
  pendingRequests: ExtraTimeRequest[];
}

export interface FamilyState {
  family: Family | null;
  children: Child[];
  selectedChildId: string | null;
  dashboardData: ChildDashboardState | null;
  pendingRequests: ExtraTimeRequest[];
  isLoading: boolean;
  error: string | null;
}

export type FamilyAction =
  | { type: 'SET_FAMILY'; family: Family }
  | { type: 'SET_CHILDREN'; children: Child[] }
  | { type: 'SELECT_CHILD'; childId: string }
  | { type: 'SET_DASHBOARD'; data: ChildDashboardState }
  | { type: 'SET_REQUESTS'; requests: ExtraTimeRequest[] }
  | { type: 'RESOLVE_REQUEST'; requestId: string; status: 'APPROVED' | 'REJECTED' }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null };

export const initialFamilyState: FamilyState = {
  family: null,
  children: [],
  selectedChildId: null,
  dashboardData: null,
  pendingRequests: [],
  isLoading: false,
  error: null,
};

export function familyReducer(state: FamilyState, action: FamilyAction): FamilyState {
  switch (action.type) {
    case 'SET_FAMILY':
      return { ...state, family: action.family };
    case 'SET_CHILDREN':
      return { ...state, children: action.children };
    case 'SELECT_CHILD':
      return { ...state, selectedChildId: action.childId };
    case 'SET_DASHBOARD':
      return { ...state, dashboardData: action.data };
    case 'SET_REQUESTS':
      return { ...state, pendingRequests: action.requests };
    case 'RESOLVE_REQUEST':
      return {
        ...state,
        pendingRequests: state.pendingRequests.map((r) =>
          r.id === action.requestId ? { ...r, status: action.status } : r,
        ),
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    default:
      return state;
  }
}
