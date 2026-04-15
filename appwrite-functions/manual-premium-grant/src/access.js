const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trial']);

export function normalizeEmail(value) {
  return `${value || ''}`.trim().toLowerCase();
}

export function parseAdminAllowlist(value) {
  return `${value || ''}`
    .split(',')
    .map((item) => normalizeEmail(item))
    .filter(Boolean);
}

export function toEndOfDayIso(dateInput) {
  const value = `${dateInput || ''}`.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Expiry date must use YYYY-MM-DD format.');
  }

  const iso = `${value}T23:59:59.999Z`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Expiry date is invalid.');
  }

  return iso;
}

function asIsoIfFuture(value, now) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.getTime() > now.getTime() ? parsed.toISOString() : null;
}

export function computeEffectiveAccess({ subscription, schoolEnrollment, now = new Date().toISOString() }) {
  const currentTime = new Date(now);

  let subscriptionEnd = null;
  if (
    subscription &&
    ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) &&
    (subscription.status !== 'trial' || subscription.trialEndDate)
  ) {
    const candidate =
      subscription.status === 'trial'
        ? asIsoIfFuture(subscription.trialEndDate, currentTime)
        : asIsoIfFuture(subscription.subscriptionEndDate, currentTime);
    subscriptionEnd = candidate;
  }

  let schoolEnd = null;
  if (schoolEnrollment?.status === 'active') {
    schoolEnd = asIsoIfFuture(schoolEnrollment.expiresAt, currentTime);
  }

  if (subscriptionEnd && schoolEnd) {
    return subscriptionEnd >= schoolEnd
      ? { source: 'subscription', effectiveEndDate: subscriptionEnd }
      : { source: 'school', effectiveEndDate: schoolEnd };
  }

  if (subscriptionEnd) {
    return { source: 'subscription', effectiveEndDate: subscriptionEnd };
  }

  if (schoolEnd) {
    return { source: 'school', effectiveEndDate: schoolEnd };
  }

  return { source: 'none', effectiveEndDate: null };
}

export function resolveGrantOutcome({ requestedExpiresAt, currentEffectiveEndDate }) {
  const requestedEndDate = toEndOfDayIso(requestedExpiresAt);

  if (!currentEffectiveEndDate) {
    return {
      action: 'create',
      requestedEndDate,
      finalEffectiveEndDate: requestedEndDate,
    };
  }

  if (requestedEndDate > currentEffectiveEndDate) {
    return {
      action: 'extend',
      requestedEndDate,
      finalEffectiveEndDate: requestedEndDate,
    };
  }

  return {
    action: 'unchanged',
    requestedEndDate,
    finalEffectiveEndDate: currentEffectiveEndDate,
  };
}
