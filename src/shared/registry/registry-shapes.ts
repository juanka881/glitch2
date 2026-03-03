import * as z from 'zod';

export enum RegistryAgentStatus {
	Start = 'start',
	Running = 'running',
	Fail = 'fail',
	Exit = 'exit',
	Crash = 'crash',
}

export const registryAgentStatusSchema = z.enum(RegistryAgentStatus);
