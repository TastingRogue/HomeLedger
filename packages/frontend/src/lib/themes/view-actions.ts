import { getContext, onDestroy } from 'svelte';
import type { Component } from 'svelte';

export interface CashFlowProps { labels:string[];income:number[];expenses:number[];incomeLabel:string;expenseLabel:string;height?:number }

export interface ViewRecord { id?: number; type?: unknown; [key:string]:unknown }
export type ViewAction = (record?: ViewRecord) => void | Promise<void>;
export type ViewActions = Record<string, ViewAction>;
export const VIEW_ACTIONS = Symbol('homeledger-theme-view-actions');
export interface ViewActionHost {
  charts?:{cashFlow:Component<CashFlowProps>;categoryColors:string[]};
  register: (actions: ViewActions) => () => void;
  run: (name: string, record?: ViewRecord) => boolean;
}

export function getViewCharts(){return getContext<ViewActionHost|undefined>(VIEW_ACTIONS)?.charts;}

export function hasViewActions(): boolean {
  return Boolean(getContext<ViewActionHost | undefined>(VIEW_ACTIONS));
}

/** Optional bridge: themes supply presentation, route pages keep complete forms. */
export function exposeViewActions(actions: ViewActions): void {
  const host = getContext<ViewActionHost | undefined>(VIEW_ACTIONS);
  if (host) onDestroy(host.register(actions));
}
