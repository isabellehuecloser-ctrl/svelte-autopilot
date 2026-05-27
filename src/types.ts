export type Severity = "critical" | "warning" | "suggestion";

export interface Finding {
  file: string;
  line: number | null;
  severity: Severity;
  issue: string;
  suggestion: string;
}

export interface ChangedFile {
  path: string;
  patch: string;
  status: string;
}
