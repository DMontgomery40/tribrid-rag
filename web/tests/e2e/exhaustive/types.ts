export type OutcomeStatus = 'ok' | 'failed' | 'skipped';

export interface UISurface {
  route: string;
  subtab?: string;
  label: string;
}

export interface ControlDescriptor {
  fingerprint: string;
  selector: string;
  tag: string;
  type: string;
  role: string;
  id: string;
  name: string;
  label: string;
  value: string;
  checked: boolean | null;
  disabled: boolean;
  visible: boolean;
  optionValues: string[];
}

export interface OutcomeRecord {
  ts: string;
  surface: string;
  surface_key: string;
  action: string;
  control_fingerprint: string;
  control_selector: string;
  status: OutcomeStatus;
  duration_ms: number;
  detail?: string;
  error?: string;
  retrieval_probe_question?: string;
  retrieval_probe_feedback?: 'thumbsup' | 'thumbsdown';
}
