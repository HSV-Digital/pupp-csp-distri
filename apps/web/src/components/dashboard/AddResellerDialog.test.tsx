import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AddResellerDialog } from './AddResellerDialog';

const onOpenChangeMock = vi.fn();
const onAddMock = vi.fn().mockResolvedValue({});

vi.mock('@/lib/rules-engine', () => ({
	STARTING_SKUS: [
		{ id: 'bb', name: 'Business Basic', monthlyPrice: 6.0 },
		{ id: 'bs', name: 'Business Standard', monthlyPrice: 12.5 },
		{ id: 'bp', name: 'Business Premium', monthlyPrice: 22.0 },
	],
	buildRegionalPricingContext: () => ({ currencySymbol: '$' }),
	getRegionalStartingSkuMonthlyPrice: ({ startingSkuId }: { startingSkuId: string }) =>
		({ bb: 6, bs: 12.5, bp: 22 } as Record<string, number>)[startingSkuId] ??
		null,
}));

beforeEach(() => {
	onOpenChangeMock.mockReset();
	onAddMock.mockReset();
});

describe('AddResellerDialog', () => {
	it('renders dialog title when open', () => {
		render(
			<AddResellerDialog
				open={true}
				onOpenChange={onOpenChangeMock}
				onAdd={onAddMock}
			/>,
		);
		expect(screen.getByText('Add Customers')).toBeInTheDocument();
	});

	it('renders reseller upload source tabs', () => {
		render(
			<AddResellerDialog
				open={true}
				onOpenChange={onOpenChangeMock}
				onAdd={onAddMock}
			/>,
		);
		expect(
			screen.getByRole('tab', { name: 'CloudAscent (CLAS)' }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('tab', { name: 'Partner Center Renewals' }),
		).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: 'ASPX' })).toBeInTheDocument();
	});

	it('does not render dialog content when closed', () => {
		render(
			<AddResellerDialog
				open={false}
				onOpenChange={onOpenChangeMock}
				onAdd={onAddMock}
			/>,
		);
		expect(
			screen.queryByText('Add Customer'),
		).not.toBeInTheDocument();
	});
});
