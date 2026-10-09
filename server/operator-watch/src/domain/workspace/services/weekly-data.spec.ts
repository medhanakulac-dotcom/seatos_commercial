import { cleanName, mondayOf, nameKey, parseCsv, parseTicketsCsv, parseUsageCsv, parseWeek, WeeklyDataError } from './weekly-data';

// Same shape as the Looker exports, with made-up operators.
const USAGE = `Week,Operator name,inventory_management,distribution_management,reservation_management,trip_management,fleet_management,analytics,accounting,# Feature count
"Oct 5, 2026",Alpha Ferry,1,1,1,1,1,1,0,6
"Oct 5, 2026",D&#039;Bravo Boat,0,0,1,0,0,0,0,1
"Oct 5, 2026",Charlie Bus,0,0,0,0,0,0,0,0
`;
const TICKETS = `operator_name,GMV,Tickets Actual\r\nAlpha Ferry,70311.2198,5327\r\n"Charlie Bus ",1233.8513999999998,151\r\nZee  Zenith Travel,1406.0855,61\r\n`;

describe('weekly data parsing', () => {
  it('reads quoted fields, doubled quotes, CRLF and a BOM', () => {
    expect(parseCsv('﻿a,"b, c","d ""e"""\r\n1,2,3\n\n')).toEqual([
      ['a', 'b, c', 'd "e"'],
      ['1', '2', '3'],
    ]);
  });

  it('cleans HTML-escaped names and matches names loosely', () => {
    expect(cleanName('D&#039;Camel Fast Ferry')).toBe("D'Camel Fast Ferry");
    expect(cleanName('  Zee  Zenith   Travel ')).toBe('Zee Zenith Travel');
    expect(nameKey('PhiPhi Cruiser')).toBe(nameKey('Phi Phi Cruiser'));
    expect(nameKey("D&#039;Camel")).toBe(nameKey('DCamel'));
    expect(nameKey('ห้างหุ้นส่วน ทดสอบ')).toBe('ห้างหุ้นส่วนทดสอบ');
  });

  it('reads Looker week labels and finds the Monday of a week in Bangkok time', () => {
    expect(parseWeek('Oct 5, 2026')).toBe('2026-10-05');
    expect(parseWeek('Sep 28, 2026')).toBe('2026-09-28');
    expect(parseWeek('2026-10-05')).toBe('2026-10-05');
    expect(() => parseWeek('5/10/2026')).toThrow(WeeklyDataError);
    // Sunday 11 Oct 2026, 22:00 Bangkok = 15:00 UTC: still the week of Monday 5 Oct.
    expect(mondayOf(new Date('2026-10-11T15:00:00Z'))).toBe('2026-10-05');
    expect(mondayOf(new Date('2026-10-11T17:30:00Z'))).toBe('2026-10-12'); // 00:30 Monday in Bangkok
  });

  it('parses the usage table: week, features and WAO', () => {
    const { weeks, rows } = parseUsageCsv(USAGE);
    expect(weeks).toEqual(['2026-10-05']);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ week: '2026-10-05', operatorName: 'Alpha Ferry', featureCount: 6, features: { inventory_management: true, accounting: false } });
    expect(rows[1].operatorName).toBe("D'Bravo Boat");
    expect(rows[2].featureCount).toBe(0);
  });

  it('parses tickets and GMV, rounding GMV to cents', () => {
    expect(parseTicketsCsv(TICKETS)).toEqual([
      { operatorName: 'Alpha Ferry', gmvUsd: 70311.22, tickets: 5327 },
      { operatorName: 'Charlie Bus', gmvUsd: 1233.85, tickets: 151 },
      { operatorName: 'Zee Zenith Travel', gmvUsd: 1406.09, tickets: 61 },
    ]);
  });

  it('says which column is missing or which value is wrong', () => {
    expect(() => parseUsageCsv('Week,Operator name\n"Oct 5, 2026",X\n')).toThrow(/missing column\(s\): inventory_management/);
    expect(() => parseTicketsCsv('operator_name,GMV\nX,1\n')).toThrow(/Tickets Actual/);
    expect(() => parseTicketsCsv('operator_name,GMV,Tickets Actual\nX,abc,1\n')).toThrow(/GMV for "X" is not a number/);
    expect(() => parseTicketsCsv('')).toThrow(/empty/);
  });
});
