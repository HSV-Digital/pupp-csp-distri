import { describe, expect, it } from 'vitest';
import { formatCurrency, formatCurrencyCompact } from './format-utils';

describe('currency formatting', () => {
	it.each([
		['BRL', 'pt-BR', 'R$', 11_460, 'R$11,460.00'],
		['NOK', 'nb-NO', 'kr', 20_340, '20,340.00 kr'],
		['DKK', 'da-DK', 'kr', 12_940, '12,940.00 kr'],
		['SEK', 'sv-SE', 'kr', 12_940, '12,940.00 kr'],
	])(
		'uses US number separators for %s',
		(currency, locale, currencySymbol, value, expected) => {
			expect(formatCurrency(value, { currency, locale, currencySymbol })).toBe(
				expected,
			);
		},
	);

	it.each([
		['BRL', 'pt-BR', 'R$', 'R$1,235'],
		['NOK', 'nb-NO', 'kr', '1,235 kr'],
		['DKK', 'da-DK', 'kr', '1,235 kr'],
		['SEK', 'sv-SE', 'kr', '1,235 kr'],
	])(
		'uses US compact number separators for %s',
		(currency, locale, currencySymbol, expected) => {
			expect(
				formatCurrencyCompact(1234.56, { currency, locale, currencySymbol }),
			).toBe(expected);
		},
	);

	it('keeps existing manual symbol behavior for other currencies', () => {
		expect(
			formatCurrency(1234.56, {
				currency: 'CAD',
				locale: 'en-CA',
				currencySymbol: 'CA$',
			}),
		).toBe('CA$1,234.56');
	});
});
