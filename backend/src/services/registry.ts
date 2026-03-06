import { config } from "../config";

export interface ServiceResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ServiceExecutionContext {
  accessToken?: string;
  baseUrl: string;
  endpoint: string;
  method: string;
  service: RegisteredService;
}

export interface ServiceDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  priceLabel: string;
  priceAmount: string;
  priceCurrency: string;
  tags: string[];
  handler: (
    body: Record<string, unknown>,
    context: ServiceExecutionContext
  ) => Promise<ServiceResult>;
}

export interface RegisteredService extends ServiceDefinition {
  agentId: string;
  planId: string;
}

function getServiceEnv(serviceId: string, key: string): string {
  const envKey = `NVM_${serviceId.toUpperCase().replace(/-/g, "_")}_${key}`;
  return process.env[envKey] || "";
}

export function getRegisteredService(serviceId: string): RegisteredService | undefined {
  const def = serviceRegistry.get(serviceId);
  if (!def) return undefined;

  return {
    ...def,
    agentId: getServiceEnv(serviceId, "AGENT_ID") || config.nevermined.agentId,
    planId: getServiceEnv(serviceId, "PLAN_ID") || config.nevermined.planId,
  };
}

export function getAllServices(): ServiceDefinition[] {
  return [...serviceRegistry.values()];
}

export function getServicePublicInfo(def: ServiceDefinition) {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    category: def.category,
    priceLabel: def.priceLabel,
    priceAmount: def.priceAmount,
    priceCurrency: def.priceCurrency,
    tags: def.tags,
  };
}

export const serviceRegistry = new Map<string, ServiceDefinition>();

export function registerService(def: ServiceDefinition): void {
  serviceRegistry.set(def.id, def);
}
