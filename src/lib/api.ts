import { NextResponse } from "next/server";

/**
 * Typed safe error responses (API_CONTRACT.md error model). Never leak raw
 * provider payloads, stack traces, or access details.
 */
export interface ApiError {
  code: string;
  message: string;
  correlationId: string;
  retryable: boolean;
  fieldErrors?: Record<string, string>;
}

export function apiError(
  status: number,
  code: string,
  message: string,
  options: { retryable?: boolean; fieldErrors?: Record<string, string> } = {},
) {
  const body: ApiError = {
    code,
    message,
    correlationId: crypto.randomUUID(),
    retryable: options.retryable ?? false,
    ...(options.fieldErrors ? { fieldErrors: options.fieldErrors } : {}),
  };
  return NextResponse.json({ error: body }, { status });
}

export function zodFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join(".") || "form";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}
