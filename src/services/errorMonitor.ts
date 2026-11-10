import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { ExecutionMethod } from 'react-native-appwrite';
import { functions } from './appwrite';
import analyticsService from './analytics';
import { getSupportCode } from '../utils/supportCode';
import { IncidentReporter, type Action, type CaptureContext, type Incident } from './errorMonitorCore';

const reporter = new IncidentReporter({
  storage: AsyncStorage,
  uuid: Crypto.randomUUID,
  identity: () => ({
    supportCode: getSupportCode(),
    ...analyticsService.getDiagnosticIdentity(),
    releaseId: `${Constants.expoConfig?.version || 'unknown'}.${Constants.nativeBuildVersion || 'web'}`,
    platform: (['web', 'ios', 'android'].includes(Platform.OS) ? Platform.OS : 'web') as Incident['platform'],
    deviceClass: Device.deviceType ? String(Device.deviceType) : 'unknown',
  }),
  send: async incident => {
    const execution = await functions.createExecution(
      'error-monitor', JSON.stringify(incident), false, '/', ExecutionMethod.POST,
      { 'content-type': 'application/json' },
    );
    if (execution.responseStatusCode < 200 || execution.responseStatusCode >= 300) {
      throw new Error('diagnostic_delivery_failed');
    }
  },
});

export const recordBreadcrumb = (action: Action, screen?: string): void =>
  reporter.recordBreadcrumb(action, screen || analyticsService.getDiagnosticIdentity().screen);
export const captureIncident = (error: unknown, context: CaptureContext): Promise<void> => reporter.capture(error, context);
export const flushIncidents = (): Promise<void> => reporter.flush();
