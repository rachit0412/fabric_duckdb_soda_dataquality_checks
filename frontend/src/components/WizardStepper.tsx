/**
 * Wizard Stepper Component
 * Main 5-step wizard for data quality check execution
 */

import React, { useState } from 'react';
import {
  Stepper,
  Step,
  StepLabel,
  Button,
  Container,
  Paper,
  Box,
  Typography,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { wizardActions } from '../store/store';
import { RootState } from '../store/store';

import DataSourceStep from './DataSourceStep';
import CheckSelectionStep from './CheckSelectionStep';
import ParametersConfigStep from './ParametersConfigStep';
import ReviewExecuteStep from './ReviewExecuteStep';
import ResultsVisualization from './ResultsVisualization';

const steps = [
  'Data Source',
  'Check Selection',
  'Parameters',
  'Review & Execute',
  'Results',
];

const WizardStepper: React.FC = () => {
  const dispatch = useDispatch();
  const { currentStep, loading } = useSelector((state: RootState) => state.wizard);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    setError(null);
    
    // Validate current step before proceeding
    const isValid = validateStep(currentStep);
    if (!isValid) {
      setError(`Please complete all required fields in Step ${currentStep}`);
      return;
    }

    dispatch(wizardActions.nextStep());
  };

  const handleBack = () => {
    setError(null);
    dispatch(wizardActions.previousStep());
  };

  const handleReset = () => {
    dispatch(wizardActions.resetWizard());
    setError(null);
  };

  const validateStep = (step: number): boolean => {
    // Add validation logic per step if needed
    return true;
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <DataSourceStep />;
      case 2:
        return <CheckSelectionStep />;
      case 3:
        return <ParametersConfigStep />;
      case 4:
        return <ReviewExecuteStep />;
      case 5:
        return <ResultsVisualization />;
      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
          Data Quality Check Wizard
        </Typography>

        <Stepper activeStep={currentStep - 1} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Box
            sx={{
              mb: 3,
              p: 2,
              bgcolor: '#ffebee',
              border: '1px solid #ef5350',
              borderRadius: 1,
              color: '#c62828',
            }}
          >
            {error}
          </Box>
        )}

        <Box sx={{ minHeight: '400px', mb: 4 }}>
          {renderStep()}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Button
            disabled={currentStep === 1 || loading}
            onClick={handleBack}
          >
            Back
          </Button>

          {currentStep === 5 ? (
            <Button
              variant="contained"
              color="primary"
              onClick={handleReset}
            >
              Start Over
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={handleNext}
              disabled={loading}
            >
              Next
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default WizardStepper;
