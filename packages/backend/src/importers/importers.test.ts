import { describe, it, expect } from 'vitest';
import {
  detectFileFormat,
  parseCSV,
  detectParser,
  getParserById,
  getAvailableParsers,
} from './index.js';
import { BBVAParser } from './bbva.parser.js';
import { SantanderParser } from './santander.parser.js';
import { NuParser } from './nu.parser.js';
import { GenericCSVParser } from './generic.parser.js';

describe('detectFileFormat', () => {
  it('detects CSV by extension', () => {
    const result = detectFileFormat(Buffer.from('a,b,c\n1,2,3'), 'transactions.csv');
    expect(result.format).toBe('csv');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('detects XLSX by extension', () => {
    const result = detectFileFormat(Buffer.from(''), 'file.xlsx');
    expect(result.format).toBe('xlsx');
  });

  it('detects OFX by extension', () => {
    const result = detectFileFormat(Buffer.from(''), 'file.ofx');
    expect(result.format).toBe('ofx');
  });

  it('detects OFX by content header', () => {
    const content = Buffer.from('OFXHEADER:100\nDATA:OFXSGML\n<OFX>');
    const result = detectFileFormat(content, 'unknown_file.dat');
    expect(result.format).toBe('ofx');
  });

  it('detects XLSX by ZIP magic bytes', () => {
    const content = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x00, 0x00]);
    const result = detectFileFormat(content, 'file.dat');
    expect(result.format).toBe('xlsx');
  });

  it('detects CSV by content analysis', () => {
    const content = Buffer.from('col1,col2,col3\nval1,val2,val3\nval4,val5,val6');
    const result = detectFileFormat(content, 'file.dat');
    expect(result.format).toBe('csv');
  });

  it('returns unknown for unrecognizable content', () => {
    const content = Buffer.from('random binary garbage');
    const result = detectFileFormat(content, 'file.dat');
    expect(result.format).toBe('unknown');
  });
});

describe('parseCSV', () => {
  it('parses simple CSV', () => {
    const rows = parseCSV('a,b,c\n1,2,3');
    expect(rows).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });

  it('handles quoted fields with commas', () => {
    const rows = parseCSV('name,value\n"Hello, World",123');
    expect(rows).toEqual([['name', 'value'], ['Hello, World', '123']]);
  });

  it('handles escaped quotes', () => {
    const rows = parseCSV('a\n"He said ""hello"""');
    expect(rows).toEqual([['a'], ['He said "hello"']]);
  });

  it('handles semicolon delimiter', () => {
    const rows = parseCSV('a;b;c\n1;2;3', ';');
    expect(rows).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });

  it('skips empty lines', () => {
    const rows = parseCSV('a,b\n\n1,2\n\n');
    expect(rows).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('BBVAParser', () => {
  const parser = new BBVAParser();

  it('has correct metadata', () => {
    expect(parser.bankId).toBe('bbva_mx');
    expect(parser.bankName).toBe('BBVA México');
    expect(parser.supportedFormats).toContain('csv');
  });

  it('detects BBVA file by filename', () => {
    const content = Buffer.from('Fecha,Descripción,Cargo,Abono,Saldo');
    expect(parser.detect(content, 'BBVA_movimientos.csv')).toBe(true);
    expect(parser.detect(content, 'bancomer_export.csv')).toBe(true);
  });

  it('detects BBVA file by header content', () => {
    const content = Buffer.from('Fecha,Descripción,Cargo,Abono,Saldo\n01/01/2024,Compra,100.00,,9900.00');
    expect(parser.detect(content, 'export.csv')).toBe(true);
  });

  it('does not detect unrelated files', () => {
    const content = Buffer.from('date,description,amount\n2024-01-01,test,100');
    expect(parser.detect(content, 'export.csv')).toBe(false);
  });

  it('parses BBVA CSV with Cargo/Abono columns', () => {
    const csv = [
      'Fecha,Descripción,Cargo,Abono,Saldo',
      '01/01/2024,Compra en tienda,150.00,,9850.00',
      '02/01/2024,Depósito nómina,,5000.00,14850.00',
      '03/01/2024,Pago servicios,200.50,,14649.50',
    ].join('\n');

    const transactions = parser.parse(Buffer.from(csv));
    expect(transactions).toHaveLength(3);

    expect(transactions[0]!.date).toBe('01/01/2024');
    expect(transactions[0]!.description).toBe('Compra en tienda');
    expect(transactions[0]!.amount).toBe(150.00);
    expect(transactions[0]!.type).toBe('expense');
    expect(transactions[0]!.balance).toBe(9850.00);

    expect(transactions[1]!.type).toBe('income');
    expect(transactions[1]!.amount).toBe(5000.00);

    expect(transactions[2]!.amount).toBe(200.50);
    expect(transactions[2]!.type).toBe('expense');
  });

  it('skips empty rows', () => {
    const csv = 'Fecha,Descripción,Cargo,Abono,Saldo\n,,,,\n01/01/2024,Test,100,,900';
    const transactions = parser.parse(Buffer.from(csv));
    expect(transactions).toHaveLength(1);
  });
});

describe('SantanderParser', () => {
  const parser = new SantanderParser();

  it('has correct metadata', () => {
    expect(parser.bankId).toBe('santander_mx');
    expect(parser.bankName).toBe('Santander México');
  });

  it('detects Santander file by filename', () => {
    const content = Buffer.from('Fecha,Descripción,Monto,Saldo');
    expect(parser.detect(content, 'santander_movimientos.csv')).toBe(true);
  });

  it('parses Santander CSV with single Monto column', () => {
    const csv = [
      'Fecha,Descripción,Referencia,Monto,Saldo',
      '01/01/2024,Compra OXXO,REF001,-85.50,9914.50',
      '02/01/2024,Transferencia recibida,REF002,3000.00,12914.50',
      '03/01/2024,Domiciliación Telmex,REF003,-599.00,12315.50',
    ].join('\n');

    const transactions = parser.parse(Buffer.from(csv));
    expect(transactions).toHaveLength(3);

    expect(transactions[0]!.description).toBe('Compra OXXO');
    expect(transactions[0]!.amount).toBe(85.50);
    expect(transactions[0]!.type).toBe('expense');
    expect(transactions[0]!.reference).toBe('REF001');

    expect(transactions[1]!.amount).toBe(3000.00);
    expect(transactions[1]!.type).toBe('income');

    expect(transactions[2]!.amount).toBe(599.00);
    expect(transactions[2]!.type).toBe('expense');
  });
});

describe('NuParser', () => {
  const parser = new NuParser();

  it('has correct metadata', () => {
    expect(parser.bankId).toBe('nu_mx');
    expect(parser.bankName).toBe('Nu México');
  });

  it('detects Nu file by filename', () => {
    const content = Buffer.from('date,title,amount');
    expect(parser.detect(content, 'nu_movimientos.csv')).toBe(true);
    expect(parser.detect(content, 'nubank_export.csv')).toBe(true);
  });

  it('detects Nu file by English headers', () => {
    const content = Buffer.from('date,title,amount\n2024-01-01,Coffee,45.00');
    expect(parser.detect(content, 'export.csv')).toBe(true);
  });

  it('parses Nu CSV (expenses as positive, payments as negative)', () => {
    const csv = [
      'date,title,amount',
      '2024-01-15,Uber Eats,189.00',
      '2024-01-16,Amazon,1250.00',
      '2024-01-20,Pago,-3000.00',
    ].join('\n');

    const transactions = parser.parse(Buffer.from(csv));
    expect(transactions).toHaveLength(3);

    expect(transactions[0]!.date).toBe('2024-01-15');
    expect(transactions[0]!.description).toBe('Uber Eats');
    expect(transactions[0]!.amount).toBe(189.00);
    expect(transactions[0]!.type).toBe('expense');

    expect(transactions[2]!.description).toBe('Pago');
    expect(transactions[2]!.amount).toBe(3000.00);
    expect(transactions[2]!.type).toBe('income');
  });
});

describe('GenericCSVParser', () => {
  const parser = new GenericCSVParser();

  it('has correct metadata', () => {
    expect(parser.bankId).toBe('generic');
    expect(parser.bankName).toBe('CSV Genérico');
  });

  it('never auto-detects', () => {
    const content = Buffer.from('Fecha,Descripción,Monto');
    expect(parser.detect(content, 'anything.csv')).toBe(false);
  });

  it('parses CSV with custom field mappings', () => {
    const csv = [
      'Fecha,Descripción,Monto,Referencia,Saldo',
      '01/01/2024,Compra tienda,-500.00,R001,9500.00',
      '02/01/2024,Depósito,2000.00,R002,11500.00',
    ].join('\n');

    const transactions = parser.parse(Buffer.from(csv), {
      fieldMappings: [
        { sourceColumn: 'Fecha', targetField: 'date' },
        { sourceColumn: 'Descripción', targetField: 'description' },
        { sourceColumn: 'Monto', targetField: 'amount' },
        { sourceColumn: 'Referencia', targetField: 'reference' },
        { sourceColumn: 'Saldo', targetField: 'balance' },
      ],
    });

    expect(transactions).toHaveLength(2);

    expect(transactions[0]!.date).toBe('01/01/2024');
    expect(transactions[0]!.description).toBe('Compra tienda');
    expect(transactions[0]!.amount).toBe(500.00);
    expect(transactions[0]!.type).toBe('expense');
    expect(transactions[0]!.reference).toBe('R001');
    expect(transactions[0]!.balance).toBe(9500.00);

    expect(transactions[1]!.type).toBe('income');
    expect(transactions[1]!.amount).toBe(2000.00);
  });

  it('handles currency-formatted amounts', () => {
    const csv = 'Fecha,Descripción,Monto\n01/01/2024,Test,"$1,234.56"';
    const transactions = parser.parse(Buffer.from(csv), {
      fieldMappings: [
        { sourceColumn: 'Fecha', targetField: 'date' },
        { sourceColumn: 'Descripción', targetField: 'description' },
        { sourceColumn: 'Monto', targetField: 'amount' },
      ],
    });
    expect(transactions[0]!.amount).toBe(1234.56);
    expect(transactions[0]!.type).toBe('income');
  });

  it('skips rows with no date or amount', () => {
    const csv = 'Fecha,Descripción,Monto\n,,\n01/01/2024,Valid,100';
    const transactions = parser.parse(Buffer.from(csv), {
      fieldMappings: [
        { sourceColumn: 'Fecha', targetField: 'date' },
        { sourceColumn: 'Descripción', targetField: 'description' },
        { sourceColumn: 'Monto', targetField: 'amount' },
      ],
    });
    expect(transactions).toHaveLength(1);
  });
});

describe('detectParser', () => {
  it('detects BBVA parser', () => {
    const content = Buffer.from('Fecha,Descripción,Cargo,Abono,Saldo\n01/01/2024,Test,100,,900');
    const parser = detectParser(content, 'bbva_export.csv');
    expect(parser.bankId).toBe('bbva_mx');
  });

  it('detects Santander parser', () => {
    const content = Buffer.from('data');
    const parser = detectParser(content, 'santander_movimientos.csv');
    expect(parser.bankId).toBe('santander_mx');
  });

  it('detects Nu parser', () => {
    const content = Buffer.from('date,title,amount\n2024-01-01,test,100');
    const parser = detectParser(content, 'nu_statement.csv');
    expect(parser.bankId).toBe('nu_mx');
  });

  it('falls back to generic parser', () => {
    const content = Buffer.from('col1,col2,col3\n1,2,3');
    const parser = detectParser(content, 'random_file.csv');
    expect(parser.bankId).toBe('generic');
  });
});

describe('getParserById', () => {
  it('returns parser by ID', () => {
    expect(getParserById('bbva_mx')?.bankName).toBe('BBVA México');
    expect(getParserById('santander_mx')?.bankName).toBe('Santander México');
    expect(getParserById('nu_mx')?.bankName).toBe('Nu México');
    expect(getParserById('generic')?.bankName).toBe('CSV Genérico');
  });

  it('returns undefined for unknown ID', () => {
    expect(getParserById('nonexistent')).toBeUndefined();
  });
});

describe('getAvailableParsers', () => {
  it('returns all registered parsers', () => {
    const parsers = getAvailableParsers();
    expect(parsers.length).toBe(4);
    expect(parsers.map(p => p.bankId)).toContain('bbva_mx');
    expect(parsers.map(p => p.bankId)).toContain('santander_mx');
    expect(parsers.map(p => p.bankId)).toContain('nu_mx');
    expect(parsers.map(p => p.bankId)).toContain('generic');
  });
});
