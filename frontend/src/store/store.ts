/**
 * Redux Store Configuration
 * Manages wizard state, connections, checks, and runs
 */

import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

// Wizard State
interface WizardState {
  currentStep: number;
  selectedConnection: string | null;
  uploadedFiles: File[];
  selectedChecks: string[];
  checkParameters: Record<string, any>;
  executionResult: string | null;
  loading: boolean;
  error: string | null;
}

const initialWizardState: WizardState = {
  currentStep: 1,
  selectedConnection: null,
  uploadedFiles: [],
  selectedChecks: [],
  checkParameters: {},
  executionResult: null,
  loading: false,
  error: null,
};

const wizardSlice = createSlice({
  name: 'wizard',
  initialState: initialWizardState,
  reducers: {
    nextStep: (state) => {
      state.currentStep = Math.min(state.currentStep + 1, 5);
    },
    previousStep: (state) => {
      state.currentStep = Math.max(state.currentStep - 1, 1);
    },
    setCurrentStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload;
    },
    setSelectedConnection: (state, action: PayloadAction<string>) => {
      state.selectedConnection = action.payload;
    },
    setUploadedFiles: (state, action: PayloadAction<File[]>) => {
      state.uploadedFiles = action.payload;
    },
    setSelectedChecks: (state, action: PayloadAction<string[]>) => {
      state.selectedChecks = action.payload;
    },
    setCheckParameters: (state, action: PayloadAction<Record<string, any>>) => {
      state.checkParameters = action.payload;
    },
    setExecutionResult: (state, action: PayloadAction<string | null>) => {
      state.executionResult = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    resetWizard: (state) => {
      return initialWizardState;
    },
  },
});

// Results State
interface ResultsState {
  metrics: any | null;
  trends: any | null;
  anomalies: any | null;
  drillDownData: any | null;
  selectedColumn: string | null;
  loading: boolean;
  error: string | null;
}

const initialResultsState: ResultsState = {
  metrics: null,
  trends: null,
  anomalies: null,
  drillDownData: null,
  selectedColumn: null,
  loading: false,
  error: null,
};

const resultsSlice = createSlice({
  name: 'results',
  initialState: initialResultsState,
  reducers: {
    setMetrics: (state, action: PayloadAction<any>) => {
      state.metrics = action.payload;
    },
    setTrends: (state, action: PayloadAction<any>) => {
      state.trends = action.payload;
    },
    setAnomalies: (state, action: PayloadAction<any>) => {
      state.anomalies = action.payload;
    },
    setDrillDownData: (state, action: PayloadAction<any>) => {
      state.drillDownData = action.payload;
    },
    setSelectedColumn: (state, action: PayloadAction<string>) => {
      state.selectedColumn = action.payload;
    },
    setResultsLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setResultsError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearResults: (state) => {
      return initialResultsState;
    },
  },
});

// Configure Store
export const store = configureStore({
  reducer: {
    wizard: wizardSlice.reducer,
    results: resultsSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export Actions
export const wizardActions = wizardSlice.actions;
export const resultsActions = resultsSlice.actions;
