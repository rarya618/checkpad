import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from './csv';

describe('parseCsv', () => {
	it('reads rows and fields', () => expect(parseCsv('a,b\n1,2\n')).toEqual([['a', 'b'], ['1', '2']]));
	it('reads the last row without a line break', () => expect(parseCsv('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]));
	it('reads Windows and old Mac line breaks', () => expect(parseCsv('a\r\nb\rc')).toEqual([['a'], ['b'], ['c']]));
	it('keeps empty fields, including a trailing one', () => expect(parseCsv('a,,c,\n')).toEqual([['a', '', 'c', '']]));
	it('reads commas, line breaks and escaped quotes inside quotes', () =>
		expect(parseCsv('"Smith, Jane","He said ""hi""","line 1\r\nline 2"')).toEqual([['Smith, Jane', 'He said "hi"', 'line 1\r\nline 2']]));
	it('reads an empty quoted field', () => expect(parseCsv('"",x')).toEqual([['', 'x']]));
	it('drops Excel’s byte-order mark', () => expect(parseCsv('﻿First name\nAda')).toEqual([['First name'], ['Ada']]));
	it('gives nothing for an empty file', () => expect(parseCsv('')).toEqual([]));
	it('reads a blank line as one empty field', () => expect(parseCsv('a\n\nb')).toEqual([['a'], [''], ['b']]));
	it('keeps going through an unclosed quote', () => expect(parseCsv('"abc,def\nghi')).toEqual([['abc,def\nghi']]));
});

describe('toCsv', () => {
	it('quotes only fields that need it, with Windows line breaks', () =>
		expect(toCsv([['name', 'note'], ['Smith, Jane', 'said "hi"'], ['Ada', 'two\nlines']])).toBe('name,note\r\n"Smith, Jane","said ""hi"""\r\nAda,"two\nlines"\r\n'));
	it('writes numbers, and nothing for null and undefined', () => expect(toCsv([[1, null, undefined, 0]])).toBe('1,,,0\r\n'));
	it('reads back what it writes', () => {
		const rows = [['a', 'b,c', '"q"', 'x\r\ny', '']];
		expect(parseCsv(toCsv(rows))).toEqual(rows);
	});
});
