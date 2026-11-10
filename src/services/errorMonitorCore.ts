export type Flow = 'startup' | 'signup' | 'login' | 'onboarding' | 'lesson' | 'progress' | 'purchase' | 'account';
export type Severity = 'warning' | 'error' | 'fatal';
export type Action =
  | 'app_started' | 'screen_opened' | 'signup_opened' | 'signup_submitted' | 'signup_failed'
  | 'login_opened' | 'login_submitted' | 'login_failed' | 'oauth_started' | 'oauth_callback'
  | 'session_restore_started' | 'session_restore_failed' | 'onboarding_step_started'
  | 'onboarding_step_completed' | 'lesson_started' | 'lesson_completed'
  | 'progress_save_started' | 'progress_save_failed' | 'checkout_started'
  | 'checkout_failed' | 'purchase_restore_started' | 'purchase_restore_failed'
  | 'entitlement_sync_failed' | 'signout_started' | 'signout_failed'
  | 'request_started' | 'request_failed' | 'render_failed' | 'unhandled_error';

export type Breadcrumb = { action: Action; elapsedMs: number; screen?: string };
export type Incident = {
  eventId: string; occurredAt: string; supportCode: string; anonymousId?: string;
  sessionId?: string; userId?: string; flow: Flow; stage: string; screen: string;
  action: Action; severity: Severity; errorType: string; statusCode?: number;
  requestId?: string; message: string; stack: string; releaseId: string;
  platform: 'web' | 'ios' | 'android'; deviceClass: string; breadcrumbs: Breadcrumb[];
};
export type CaptureContext = {
  flow: Flow; stage: string; action: Action; severity: Severity; screen?: string;
  statusCode?: number; requestId?: string; errorType?: string;
};
type QueueItem = { incident: Incident; queuedAt: number };
type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<unknown> };
type ReporterOptions = {
  storage: Storage; send: (incident: Incident) => Promise<void>; uuid: () => string;
  identity: () => { supportCode: string; anonymousId?: string; sessionId?: string; userId?: string;
    releaseId: string; platform: Incident['platform']; deviceClass: string; screen: string };
  now?: () => number;
};
const QUEUE_KEY = '@moneyquest_error_monitor_queue_v1';
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_QUEUE = 20;
const MAX_BREADCRUMBS = 20;

export function redactDiagnostic(value: unknown, max = 1024): string {
  return String(value ?? '')
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email]')
    .replace(/\bBearer\s+\S+/gi, '[credential]')
    .replace(/\b(?:password|passwd|token|secret|cookie|authorization|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, '[credential]')
    .slice(0, max);
}

const label = (value: unknown, max: number) =>
  String(value ?? '').replace(/[^a-z0-9_.:-]/gi, '_').slice(0, max);

export class IncidentReporter {
  private breadcrumbs: Breadcrumb[] = [];
  private startedAt: number;
  private queue: QueueItem[] = [];
  private loaded = false;
  private pending = Promise.resolve();
  private reporting = false;
  private lastError: unknown = null;
  private lastErrorAt = 0;

  constructor(private options: ReporterOptions) {
    this.startedAt = (options.now || Date.now)();
  }

  recordBreadcrumb(action: Action, screen?: string): void {
    this.breadcrumbs.push({ action, elapsedMs: Math.max(0, Math.min(DAY_MS, (this.options.now || Date.now)() - this.startedAt)),
      ...(screen ? { screen: label(screen, 80) } : {}) });
    if (this.breadcrumbs.length > MAX_BREADCRUMBS) this.breadcrumbs.shift();
  }

  getBreadcrumbs(): Breadcrumb[] { return [...this.breadcrumbs]; }

  private async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const stored = await this.options.storage.getItem(QUEUE_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      this.queue = Array.isArray(parsed) ? parsed.filter((item): item is QueueItem =>
        Boolean(item && typeof item === 'object' && item.incident &&
          typeof item.incident.eventId === 'string' && Number.isFinite(item.queuedAt) &&
          (this.options.now || Date.now)() - item.queuedAt < DAY_MS))
        .slice(-MAX_QUEUE) : [];
    } catch { this.queue = []; }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    try { await this.options.storage.setItem(QUEUE_KEY, JSON.stringify(this.queue)); } catch { /* best effort */ }
  }

  private schedule(work: () => Promise<void>): Promise<void> {
    this.pending = this.pending.then(work).catch(() => {});
    return this.pending;
  }

  async capture(error: unknown, context: CaptureContext): Promise<void> {
    if (error && error === this.lastError && (this.options.now || Date.now)() - this.lastErrorAt < 1000) return;
    this.lastError = error;
    this.lastErrorAt = (this.options.now || Date.now)();
    this.recordBreadcrumb(context.action, context.screen || this.options.identity().screen);
    try {
      const identity = this.options.identity();
      const asError = error instanceof Error ? error : null;
      const incident: Incident = {
        eventId: this.options.uuid(), occurredAt: new Date((this.options.now || Date.now)()).toISOString(),
        supportCode: identity.supportCode, anonymousId: label(identity.anonymousId, 80),
        sessionId: label(identity.sessionId, 80), userId: label(identity.userId, 36),
        flow: context.flow, stage: label(context.stage, 64),
        screen: label(context.screen || identity.screen, 80), action: context.action,
        severity: context.severity, errorType: label(context.errorType ||
          (asError as Error & { type?: string })?.type || asError?.name || 'unknown', 80),
        statusCode: context.statusCode, requestId: label(context.requestId, 80),
        message: redactDiagnostic(asError?.message || (typeof error === 'string' ? error : ''), 1024),
        stack: redactDiagnostic(asError?.stack, 2048), releaseId: label(identity.releaseId, 80),
        platform: identity.platform, deviceClass: label(identity.deviceClass, 40),
        breadcrumbs: this.getBreadcrumbs(),
      };
      // A large stack can exceed the receiver's 16 KB body cap. Keep useful stages first.
      while (JSON.stringify(incident).length > 15000 && incident.breadcrumbs.length) incident.breadcrumbs.shift();
      if (JSON.stringify(incident).length > 15000) incident.stack = '';
      await this.schedule(async () => {
        await this.load();
        this.queue = [...this.queue, { incident, queuedAt: (this.options.now || Date.now)() }].slice(-MAX_QUEUE);
        await this.persist();
        await this.flushNow();
      });
    } catch { /* Reporting never changes the user action. */ }
  }

  private async flushNow(): Promise<void> {
    if (this.reporting) return;
    this.reporting = true;
    try {
      this.queue = this.queue.filter(item => (this.options.now || Date.now)() - item.queuedAt < DAY_MS);
      for (const item of [...this.queue]) {
        try {
          await this.options.send(item.incident);
          this.queue = this.queue.filter(queued => queued.incident.eventId !== item.incident.eventId);
        } catch { break; }
      }
      await this.persist();
    } finally { this.reporting = false; }
  }

  async flush(): Promise<void> {
    await this.schedule(async () => { await this.load(); await this.flushNow(); });
  }
}
