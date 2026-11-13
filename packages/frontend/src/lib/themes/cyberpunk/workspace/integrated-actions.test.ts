import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, fireEvent, waitFor, within } from '@testing-library/svelte';
import Harness from './IntegratedHarness.test.svelte';
import { apiGet } from '#lib/api/client.ts';
import { setLocale } from '#lib/stores/preferences.ts';
vi.mock('$app/env',()=>({browser:false}));
vi.mock('#lib/api/client.ts',()=>({apiGet:vi.fn(),apiPost:vi.fn(),apiPut:vi.fn(),apiPatch:vi.fn(),apiDelete:vi.fn()}));
beforeEach(()=>{
  vi.clearAllMocks();setLocale('en');
  vi.mocked(apiGet).mockImplementation(async path=>{
    if(path==='/reports/dashboard')return {monthlySummary:{}};
    if(path==='/goals')return [{id:7,name:'Emergency fund',type:'Lista de Deseos',status:'Activa',targetAmount:1000,savedAmount:200,progress:20}];
    if(path==='/categories')return [{id:2,name:'Groceries',type:'Gasto',icon:'tag',subcategories:[{id:3,name:'Fruit'}]}];
    if(path.includes('/forecast'))return {estimatedDate:null,monthlyContribution:0};
    return [];
  });
});
describe('complete workflows inside Cyberpunk compositions',()=>{
  it('keeps goal cards and opens the original withdrawal form directly',async()=>{
    const {container}=render(Harness);
    await waitFor(()=>expect(container.querySelector('.cp-goal-grid')).not.toBeNull());
    const cards=container.querySelector('.cp-goal-grid');if(!cards)throw new Error('Missing themed cards');
    await fireEvent.click(within(cards as HTMLElement).getByRole('button',{name:'Withdraw'}));
    await waitFor(()=>expect(container.querySelector('[role="dialog"]')).not.toBeNull());
    expect(container.querySelector('.cp-manage')).toBeNull();
    expect(container.querySelector('.cp-goal-numbers')).not.toBeNull();
  });
  it('opens real subcategory management from the themed category tile',async()=>{
    const {container}=render(Harness,{path:'/categorias'});
    await waitFor(()=>expect(container.querySelector('.cp-category-tile')).not.toBeNull());
    const tile=container.querySelector('.cp-category-tile');if(!tile)throw new Error('Missing category tile');
    await fireEvent.click(within(tile as HTMLElement).getByRole('button',{name:'+ Subcategories'}));
    await waitFor(()=>expect(container.querySelector('.cp-route-controller [role="dialog"]')).not.toBeNull());
    expect(container.querySelector('.cp-manage')).toBeNull();
  });
});
