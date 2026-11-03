export type DashboardPeriod = 'today' | 'week' | 'month';
export function transactionDate(value:string):Date {
  // Financial reports group by the stored civil date (the YYYY-MM-DD prefix).
  return new Date(/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value)?`${value.slice(0,10)}T12:00:00`:value);
}
export function dashboardRange(period:DashboardPeriod,now=new Date()):{start:Date;end:Date} {
  const start=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const end=new Date(now.getFullYear(),now.getMonth(),now.getDate(),23,59,59,999);
  if(period==='week')start.setDate(start.getDate()-((start.getDay()+6)%7));
  if(period==='month'){start.setDate(1);end.setMonth(end.getMonth()+1,0);}
  return {start,end};
}
export function dashboardSeries(items:{date:string;type:string;amount:number}[],period:DashboardPeriod,now=new Date()) {
  const {start,end}=dashboardRange(period,now);
  const count=period==='today'?now.getHours()+1:period==='week'?((now.getDay()+6)%7)+1:new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const income:number[]=Array(count).fill(0),expenses:number[]=Array(count).fill(0);
  for(const row of items){
    const date=transactionDate(row.date);
    if(date<start||date>end||!Number.isFinite(row.amount))continue;
    const index=period==='today'?(/^\d{4}-\d{2}-\d{2}$/.test(row.date)?0:new Date(row.date).getHours()):period==='week'?((date.getDay()+6)%7):date.getDate()-1;
    const target=row.type==='Ingreso'?income:row.type==='Gasto'?expenses:undefined;
    if(target&&index>=0&&index<count)target[index]=(target[index]??0)+Math.abs(row.amount);
  }
  return {income,expenses};
}

export function dashboardCategories(items:{date:string;type:string;amount:number;categoryName?:string|null}[],period:DashboardPeriod,otherLabel:string,now=new Date()) {
  const {start,end}=dashboardRange(period,now);
  const totals=new Map<string,number>();
  for(const row of items){const date=transactionDate(row.date);if(row.type!=='Gasto'||date<start||date>end||!Number.isFinite(row.amount))continue;const name=row.categoryName||otherLabel;totals.set(name,(totals.get(name)??0)+Math.abs(row.amount));}
  const entries=[...totals].sort((a,b)=>b[1]-a[1]);
  const total=entries.reduce((sum,[,amount])=>sum+amount,0);
  const visible=entries.length<=6?entries:entries.filter(([name])=>name!==otherLabel).slice(0,5);
  if(entries.length>6){const selected=new Set(visible.map(([name])=>name));visible.push([otherLabel,entries.filter(([name])=>!selected.has(name)).reduce((sum,[,amount])=>sum+amount,0)]);}
  return visible.map(([categoryName,amount])=>({categoryName,total:amount,percentage:total?amount/total*100:0}));
}
