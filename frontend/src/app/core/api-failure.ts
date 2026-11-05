import { HttpErrorResponse } from '@angular/common/http';

import { ApiError, ApiFieldError } from './budget.models';

export class ContractError extends Error {
  constructor() {
    super('The server returned an unexpected response.');
    this.name = 'ContractError';
  }
}

export type ApiFailureKind =
  | 'validation'
  | 'conflict'
  | 'not-found'
  | 'jar-not-in-plan'
  | 'invalid-data'
  | 'network'
  | 'server';

export interface ApiFailure {
  kind: ApiFailureKind;
  status: number | null;
  message: string;
  error: ApiError | null;
}

function isFieldError(value: unknown): value is ApiFieldError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const field = value as Record<string, unknown>;
  return typeof field['field'] === 'string' && typeof field['code'] === 'string' && typeof field['message'] === 'string';
}

export function isApiError(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record['code'] === 'string' &&
    typeof record['message'] === 'string' &&
    Array.isArray(record['errors']) &&
    record['errors'].every((item) => isFieldError(item))
  );
}

export function toApiFailure(error: unknown): ApiFailure {
  if (error instanceof ContractError) {
    return {
      kind: 'invalid-data',
      status: null,
      message: 'The server returned data this screen cannot display.',
      error: null
    };
  }

  if (!(error instanceof HttpErrorResponse)) {
    return {
      kind: 'server',
      status: null,
      message: 'Something went wrong. Please try again.',
      error: null
    };
  }

  const body = isApiError(error.error) ? error.error : null;
  if (error.status === 0) {
    return {
      kind: 'network',
      status: 0,
      message: 'The service could not be reached. Check your connection and try again.',
      error: body
    };
  }

  if (body?.code === 'MONTHLY_PLAN_ALREADY_EXISTS' || error.status === 409) {
    return {
      kind: 'conflict',
      status: error.status,
      message: body?.message ?? 'A monthly plan already exists for this month.',
      error: body
    };
  }

  if (body?.code === 'JAR_NOT_IN_MONTHLY_PLAN') {
    return {
      kind: 'jar-not-in-plan',
      status: error.status,
      message: body.message,
      error: body
    };
  }

  if (body?.code === 'MONTHLY_PLAN_NOT_FOUND' || error.status === 404) {
    return {
      kind: 'not-found',
      status: error.status,
      message: body?.message ?? 'No monthly plan exists for this month.',
      error: body
    };
  }

  if (error.status === 400) {
    return {
      kind: 'validation',
      status: error.status,
      message: body?.message ?? 'One or more fields are invalid.',
      error: body
    };
  }

  return {
    kind: 'server',
    status: error.status,
    message: 'Something went wrong while talking to the server. Please try again.',
    error: body
  };
}

export function fieldMessage(failure: ApiFailure, field: string): string | null {
  return failure.error?.errors.find((item) => item.field === field)?.message ?? null;
}
