import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { PartnerProfile } from '@repo/shared';

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
	usePathname: () => '/csp-partners/en/partner-profile',
}));

const savePartnerProfileMock = vi.fn();
vi.mock('@/lib/partner-profile-api', () => ({
	savePartnerProfile: (input: PartnerProfile) => savePartnerProfileMock(input),
	uploadPartnerLogo: vi.fn(),
}));

vi.mock('@/lib/partner-profile-context', () => ({
	usePartnerProfile: () => ({
		profile: null,
		loading: false,
		refresh: vi.fn(),
		setProfile: vi.fn(),
	}),
}));

import { PartnerProfileForm } from './PartnerProfileForm';

Element.prototype.scrollIntoView = vi.fn();

const save = () =>
	fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
const pickIndirect = () =>
	fireEvent.click(screen.getByRole('radio', { name: 'CSP Indirect (Reseller)' }));
const pickDirect = () =>
	fireEvent.click(screen.getByRole('radio', { name: 'CSP Direct (Direct Bill)' }));
const answerFollowUp = (answer: 'Yes' | 'No') =>
	fireEvent.click(screen.getAllByRole('radio', { name: answer })[0]);
const fillRest = () => {
	fireEvent.click(screen.getByRole('checkbox', { name: 'Modern Work' }));
	fireEvent.click(screen.getByRole('checkbox', { name: 'Microsoft Security' }));
	fireEvent.click(
		screen.getByRole('checkbox', {
			name: 'Modern Work Adoption and Change Management',
		}),
	);
	fireEvent.click(screen.getByRole('checkbox', { name: 'Cloud Security' }));
};

const expectSaves = async () => {
	save();
	await waitFor(() => {
		if (!savePartnerProfileMock.mock.calls.length) {
			throw new Error(
				'save not called; message: ' +
					(screen.queryByText(/need attention/i)?.textContent ?? 'none'),
			);
		}
	});
};

describe('partner type switching', () => {
	beforeEach(() => {
		savePartnerProfileMock.mockReset();
		savePartnerProfileMock.mockImplementation(
			async (input: PartnerProfile) => input,
		);
	});

	it('A: Direct follow-up answered, then switch to Indirect and fill', async () => {
		render(<StrictMode><PartnerProfileForm /></StrictMode>);
		answerFollowUp('Yes'); // Direct follow-up
		pickIndirect();
		answerFollowUp('Yes'); // now the 25-points follow-up
		fillRest();
		await expectSaves();
	});

	it('B: failed Save on Direct (contradiction), then switch and fill', async () => {
		render(<StrictMode><PartnerProfileForm /></StrictMode>);
		answerFollowUp('Yes'); // Yes without designations = contradiction
		save();
		await screen.findByText(/need attention/i);
		pickIndirect();
		answerFollowUp('Yes');
		fillRest();
		await waitFor(() =>
			expect(screen.queryByText(/need attention/i)).not.toBeInTheDocument(),
		);
		await expectSaves();
	});

	it('C: toggle type back and forth before filling', async () => {
		render(<StrictMode><PartnerProfileForm /></StrictMode>);
		answerFollowUp('Yes');
		pickIndirect();
		pickDirect();
		pickIndirect();
		answerFollowUp('Yes');
		fillRest();
		await expectSaves();
	});

	it('D: Direct follow-up No (sections hidden), then switch to Indirect', async () => {
		render(<StrictMode><PartnerProfileForm /></StrictMode>);
		answerFollowUp('No'); // hides sections 2-4 on Direct
		save(); // valid for Direct+No, but saves — reset mock and continue
		await waitFor(() => expect(savePartnerProfileMock).toHaveBeenCalled());
		savePartnerProfileMock.mockClear();
		pickIndirect();
		answerFollowUp('Yes');
		fillRest();
		await expectSaves();
	});

	it('F: after switching type, the follow-up radio starts unanswered', () => {
		render(<StrictMode><PartnerProfileForm /></StrictMode>);
		answerFollowUp('Yes'); // Direct follow-up = Yes
		expect(screen.getAllByRole('radio', { name: 'Yes' })[0]).toBeChecked();

		pickIndirect();
		// hasOver25Points is null — the reused radio group must NOT still show
		// the Direct answer as checked.
		expect(
			screen.getAllByRole('radio', { name: 'Yes' })[0],
		).not.toBeChecked();

		// Toggling back also resets: the old Direct answer was cleared when the
		// branch was switched away, so both follow-ups always start unanswered.
		pickDirect();
		expect(
			screen.getAllByRole('radio', { name: 'Yes' })[0],
		).not.toBeChecked();
	});

	it('E: failed Save while Indirect follow-up unanswered, then answer and fill', async () => {
		render(<StrictMode><PartnerProfileForm /></StrictMode>);
		pickIndirect();
		save();
		await screen.findByText(/need attention/i);
		answerFollowUp('Yes');
		fillRest();
		await waitFor(() =>
			expect(screen.queryByText(/need attention/i)).not.toBeInTheDocument(),
		);
		await expectSaves();
	});
});
