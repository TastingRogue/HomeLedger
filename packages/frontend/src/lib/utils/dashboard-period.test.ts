import { describe, expect, it } from 'vitest';
import { dashboardCategories, dashboardRange, dashboardSeries, transactionDate } from './dashboard-period';
describe('dashboard periods',()=>{
  const now=new Date(2026,10,1,10);
  const transactions=[
    {date:'2026-11-01',type:'Ingreso',amount:1000},
    {date:'2026-11-25',type:'Gasto',amount:250},
    {date:'2026-10-31',type:'Gasto',amount:80},
  ];
  it('includes every recorded day of the selected calendar month, including dates after today',()=>{
    const data=dashboardSeries(transactions,'month',now);
    expect(data.income).toHaveLength(30);
    expect(data.income[0]).toBe(1000);
    expect(data.expenses[24]).toBe(250);
    expect(data.expenses.reduce((sum,value)=>sum+value,0)).toBe(250);
    expect(dashboardRange('month',now).end.getDate()).toBe(30);
  });
  it('retains day and week boundaries independently of full-month charts',()=>{
    expect(dashboardSeries(transactions,'today',now).income[0]).toBe(1000);
    expect(dashboardSeries(transactions,'today',now).expenses.reduce((a,b)=>a+b,0)).toBe(0);
    expect(dashboardSeries(transactions,'week',now).expenses.reduce((a,b)=>a+b,0)).toBe(80);
  });
  it('preserves the local calendar day for date-only records',()=>{
    expect(transactionDate('2026-11-01').getDate()).toBe(1);
    expect(transactionDate('2026-11-01').getMonth()).toBe(10);
  });
  it('groups extra categories without losing money or percentage from the donut',()=>{
    const items=Array.from({length:8},(_,i)=>({date:'2026-11-15',type:'Gasto',amount:10,categoryName:`Category ${i}`}));
    const slices=dashboardCategories(items,'month','Other',now);
    expect(slices).toHaveLength(6);
    expect(slices.reduce((sum,row)=>sum+row.total,0)).toBe(80);
    expect(slices.reduce((sum,row)=>sum+row.percentage,0)).toBe(100);
    expect(slices.at(-1)).toMatchObject({categoryName:'Other',total:30});
  });
});
