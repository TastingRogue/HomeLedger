import { describe,it,expect } from 'vitest';
import { GenericCSVParser } from './generic.parser.js';
describe('generic CSV headers',()=>{
  const parser=new GenericCSVParser();
  it('accepts English headers without silently dropping all transactions',()=>{
    const result=parser.parse(Buffer.from('date,description,amount\n2026-11-01,QA expense,-45.50\n2026-11-02,QA income,100'));
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({description:'QA expense',amount:45.5,type:'expense'});
    expect(result[1]).toMatchObject({amount:100,type:'income'});
  });
  it('retains Spanish headers and tolerates whitespace, accents and BOMs',()=>{
    const result=parser.parse(Buffer.from('\uFEFF FECHA , DESCRIPCIÓN , MONTO \n2026-11-01,Compra,-10'));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({description:'Compra',amount:10,type:'expense'});
  });
  it('respects explicit mappings for custom column names',()=>{
    const result=parser.parse(Buffer.from('When,What,Value\n2026-11-01,Custom,-12'),{fieldMappings:[{sourceColumn:'When',targetField:'date'},{sourceColumn:'What',targetField:'description'},{sourceColumn:'Value',targetField:'amount'}]});
    expect(result[0]).toMatchObject({description:'Custom',amount:12});
  });
});
