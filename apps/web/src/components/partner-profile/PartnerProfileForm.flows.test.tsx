import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

let contextProfile: PartnerProfile | null = null;
vi.mock('@/lib/partner-profile-context', () => ({
	usePartnerProfile: () => ({
		profile: contextProfile,
		loading: false,
		refresh: vi.fn(),
		setProfile: vi.fn(),
	}),
}));

import { PartnerProfileForm } from './PartnerProfileForm';

Element.prototype.scrollIntoView = vi.fn();

describe('PartnerProfileForm indirect reseller flows', () => {
	it('saves a hydrated stored Indirect profile untouched', async () => {
		savePartnerProfileMock.mockClear();
		savePartnerProfileMock.mockImplementation(
			async (input: PartnerProfile) => input,
		);
		contextProfile = {
			partnerType: 'CSP Indirect',
			hasModernWorkOrSecurityDesignation: null,
			hasOver25Points: true,
			designations: ['modern-work', 'microsoft-security'],
			specializations: [
				'modern-work:adoption-change-management',
				'microsoft-security:cloud-security',
			],
			copilotJumpstartReady: true,
			companyLogoUrl: null,
			erpMarginPercent: 20,
		};
		render(<PartnerProfileForm />);

		fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
		await waitFor(() => {
			if (!savePartnerProfileMock.mock.calls.length) {
				throw new Error(
					'save not called; visible text: ' +
						(screen.queryByText(/need attention/i)?.textContent ?? 'no error'),
				);
			}
		});
		contextProfile = null;
	});

	it('recovers after an early failed Save on the CSP Direct default', async () => {
		savePartnerProfileMock.mockClear();
		savePartnerProfileMock.mockImplementation(
			async (input: PartnerProfile) => input,
		);
		render(<PartnerProfileForm />);

		// Save immediately: partnerType is the CSP Direct default, follow-up
		// unanswered, no designations — several errors parked.
		fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
		await screen.findByText(/need attention/i);

		// Now do what the user did: switch to Indirect and fill everything.
		fireEvent.click(
			screen.getByRole('radio', { name: 'CSP Indirect (Reseller)' }),
		);
		fireEvent.click(screen.getAllByRole('radio', { name: 'Yes' })[0]);
		fireEvent.click(screen.getByRole('checkbox', { name: 'Modern Work' }));
		fireEvent.click(
			screen.getByRole('checkbox', { name: 'Microsoft Security' }),
		);
		fireEvent.click(
			screen.getByRole('checkbox', {
				name: 'Modern Work Adoption and Change Management',
			}),
		);
		fireEvent.click(screen.getByRole('checkbox', { name: 'Cloud Security' }));
		fireEvent.click(screen.getAllByRole('radio', { name: 'Yes' })[1]);

		// The stale message should clear on its own once valid…
		await waitFor(() =>
			expect(screen.queryByText(/need attention/i)).not.toBeInTheDocument(),
		);

		// …and Save should now go through.
		fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
		await waitFor(() => {
			if (!savePartnerProfileMock.mock.calls.length) {
				throw new Error(
					'save not called; visible text: ' +
						(screen.queryByText(/need attention/i)?.textContent ?? 'no error'),
				);
			}
		});
	});

	it('saves after CSP Indirect + Yes + designations + specializations', async () => {
		savePartnerProfileMock.mockImplementation(
			async (input: PartnerProfile) => input,
		);
		render(<PartnerProfileForm />);

		fireEvent.click(
			screen.getByRole('radio', { name: 'CSP Indirect (Reseller)' }),
		);
		// First Yes group = the 25-points follow-up, second = JumpStart.
		fireEvent.click(screen.getAllByRole('radio', { name: 'Yes' })[0]);
		fireEvent.click(screen.getByRole('checkbox', { name: 'Modern Work' }));
		fireEvent.click(
			screen.getByRole('checkbox', { name: 'Microsoft Security' }),
		);
		fireEvent.click(
			screen.getByRole('checkbox', {
				name: 'Modern Work Adoption and Change Management',
			}),
		);
		fireEvent.click(screen.getByRole('checkbox', { name: 'Cloud Security' }));
		fireEvent.click(screen.getAllByRole('radio', { name: 'Yes' })[1]);

		fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

		await waitFor(() => {
			if (!savePartnerProfileMock.mock.calls.length) {
				throw new Error(
					'save not called; visible text: ' +
						(screen.queryByText(/need attention/i)?.textContent ?? 'no error'),
				);
			}
		});
		expect(savePartnerProfileMock).toHaveBeenCalled();
	});
});
