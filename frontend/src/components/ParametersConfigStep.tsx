/**
 * Step 3: Parameters Configuration
 * Configure check-specific parameters
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Card,
  CardContent,
  Button,
  Alert,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { wizardActions } from '../store/store';
import { RootState } from '../store/store';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

const ParametersConfigStep: React.FC = () => {
  const dispatch = useDispatch();
  const { checkParameters } = useSelector((state: RootState) => state.wizard);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);

  // Simple parameter schema
  const parameterSchema = yup.object({
    freshness_max_age_days: yup.number().positive().nullable(),
    completeness_threshold: yup.number().min(0).max(100).nullable(),
    uniqueness_threshold: yup.number().min(0).max(100).nullable(),
    validity_regex_pattern: yup.string().nullable(),
    statistical_zscore_threshold: yup.number().positive().nullable(),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: yupResolver(parameterSchema),
    defaultValues: checkParameters,
  });

  const onSubmit = (data: any) => {
    const filteredData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== null && v !== '')
    );
    dispatch(wizardActions.setCheckParameters(filteredData));
  };

  const parameterFields = [
    {
      name: 'freshness_max_age_days',
      label: 'Max Age (Days)',
      description: 'Maximum acceptable age for data (Freshness check)',
      type: 'number',
    },
    {
      name: 'completeness_threshold',
      label: 'Completeness Threshold (%)',
      description: 'Minimum acceptable percentage of non-null values',
      type: 'number',
    },
    {
      name: 'uniqueness_threshold',
      label: 'Uniqueness Threshold (%)',
      description: 'Minimum acceptable percentage of unique values',
      type: 'number',
    },
    {
      name: 'validity_regex_pattern',
      label: 'Validity Pattern (Regex)',
      description: 'Regular expression pattern for validity checks',
      type: 'text',
    },
    {
      name: 'statistical_zscore_threshold',
      label: 'Z-Score Threshold',
      description: 'Z-score threshold for anomaly detection (typically 2-3)',
      type: 'number',
    },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Box>
        <Typography variant="h6" gutterBottom>
          Step 3: Configure Parameters
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          Configure thresholds and parameters for your checks. Leave fields empty to use defaults.
        </Alert>

        <Box sx={{ mb: 3 }}>
          {parameterFields.map((field) => (
            <Card key={field.name} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {field.label}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {field.description}
                </Typography>
                <TextField
                  fullWidth
                  type={field.type}
                  {...register(field.name as any)}
                  error={!!(errors as any)[field.name]}
                  helperText={(errors as any)[field.name]?.message}
                  placeholder={`Optional (${field.label})`}
                />
              </CardContent>
            </Card>
          ))}
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" color="primary" type="submit">
            Save Parameters
          </Button>
          <Button
            variant="outlined"
            onClick={() => dispatch(wizardActions.setCheckParameters({}))}
          >
            Reset to Defaults
          </Button>
        </Box>
      </Box>
    </form>
  );
};

export default ParametersConfigStep;
