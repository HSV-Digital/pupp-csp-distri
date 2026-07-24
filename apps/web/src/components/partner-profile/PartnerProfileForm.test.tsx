import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_PARTNER_PROFILE, type PartnerProfile } from '@repo/shared';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: pushMock, replace: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
	usePathname: () => '/csp-partners/en/partner-profile',
}));

const savePartnerProfileMock = vi.fn();
const uploadPartnerLogoMock = vi.fn();
vi.mock('@/lib/partner-profile-api', () => ({
	savePartnerProfile: (input: PartnerProfile) => savePartnerProfileMock(input),
	uploadPartnerLogo: (file: File) => uploadPartnerLogoMock(file),
}));

const setProfileMock = vi.fn();
let contextProfile: PartnerProfile | null = null;
vi.mock('@/lib/partner-profile-context', () => ({
	usePartnerProfile: () => ({
		profile: contextProfile,
		loading: false,
		refresh: vi.fn(),
		setProfile: setProfileMock,
	}),
}));

import { PartnerProfileForm } from './PartnerProfileForm';

// jsdom doesn't implement scrollIntoView, which onInvalid calls via rAF.
Element.prototype.scrollIntoView = vi.fn();

const STORED_PROFILE: PartnerProfile = {
	partnerType: 'CSP Direct',
	hasModernWorkOrSecurityDesignation: true,
	hasOver25Points: null,
	designations: ['modern-work', 'microsoft-security'],
	specializations: ['modern-work:copilot'],
	copilotJumpstartReady: true,
	companyLogoUrl: null,
	erpMarginPercent: 20,
};

describe('PartnerProfileForm save', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		contextProfile = STORED_PROFILE;
		savePartnerProfileMock.mockImplementation(
			async (input: PartnerProfile) => input,
		);
	});

	it('saves an edited margin on an existing profile', async () => {
		render(<PartnerProfileForm />);

		const margin = screen.getByRole('spinbutton');
		fireEvent.change(margin, { target: { value: '25' } });
		fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

		await waitFor(() => expect(savePartnerProfileMock).toHaveBeenCalled());
		expect(savePartnerProfileMock.mock.calls[0][0].erpMarginPercent).toBe(25);
		await waitFor(() =>
			expect(screen.getByText('Profile saved')).toBeInTheDocument(),
		);
	});

	it('saves after toggling a specialization', async () => {
		render(<PartnerProfileForm />);

		fireEvent.click(screen.getByRole('checkbox', { name: 'Data Security' }));
		fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

		await waitFor(() => expect(savePartnerProfileMock).toHaveBeenCalled());
		expect(savePartnerProfileMock.mock.calls[0][0].specializations).toContain(
			'microsoft-security:data-security',
		);
	});

	it('shows an error beside Save when validation blocks the submit', async () => {
		render(<PartnerProfileForm />);

		// Unchecking every designation makes the form invalid (min 1 required).
		fireEvent.click(screen.getByRole('checkbox', { name: 'Modern Work' }));
		fireEvent.click(
			screen.getByRole('checkbox', { name: 'Microsoft Security' }),
		);
		fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

		await waitFor(() =>
			expect(
				screen.getByText(/Some answers need attention/),
			).toBeInTheDocument(),
		);
		// The message names the section holding the failure, so it stays
		// actionable even when the failing field isn't rendered.
		expect(
			screen.getByText(/Solutions Partner designations/, {
				selector: 'span',
			}),
		).toBeInTheDocument();
		expect(savePartnerProfileMock).not.toHaveBeenCalled();
	});

	it('only offers specializations for the selected designations', () => {
		render(<PartnerProfileForm />);

		// STORED_PROFILE holds Modern Work + Microsoft Security, not Business
		// Applications — so its specialization column must not render.
		expect(
			screen.getByRole('checkbox', { name: 'Data Security' }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole('checkbox', { name: 'Supply Chain' }),
		).not.toBeInTheDocument();

		// Checking the Business Applications designation reveals its column.
		fireEvent.click(
			screen.getByRole('checkbox', { name: 'Business Applications' }),
		);
		expect(
			screen.getByRole('checkbox', { name: 'Supply Chain' }),
		).toBeInTheDocument();
	});

	it('drops a deselected designation\'s specializations on save', async () => {
		render(<PartnerProfileForm />);

		fireEvent.click(screen.getByRole('checkbox', { name: 'Data Security' }));
		// Unchecking the designation hides its column; its answers must not be
		// persisted.
		fireEvent.click(
			screen.getByRole('checkbox', { name: 'Microsoft Security' }),
		);
		expect(
			screen.queryByRole('checkbox', { name: 'Data Security' }),
		).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

		await waitFor(() => expect(savePartnerProfileMock).toHaveBeenCalled());
		expect(savePartnerProfileMock.mock.calls[0][0].specializations).toEqual([
			'modern-work:copilot',
		]);
	});

	it('clears the validation message once the answers are fixed, without another save', async () => {
		render(<PartnerProfileForm />);

		fireEvent.click(screen.getByRole('checkbox', { name: 'Modern Work' }));
		fireEvent.click(
			screen.getByRole('checkbox', { name: 'Microsoft Security' }),
		);
		fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
		await waitFor(() =>
			expect(
				screen.getByText(/Some answers need attention/),
			).toBeInTheDocument(),
		);

		// Re-checking a designation makes the form valid again — the message
		// must go away on its own, not linger until the next Save click.
		fireEvent.click(screen.getByRole('checkbox', { name: 'Modern Work' }));
		await waitFor(() =>
			expect(
				screen.queryByText(/Some answers need attention/),
			).not.toBeInTheDocument(),
		);
	});

	it('drops stale ids from a stored profile instead of failing validation invisibly', async () => {
		contextProfile = {
			...STORED_PROFILE,
			// Simulates a profile saved before an id was removed/renamed (e.g.
			// the old 'none' designation): no checkbox renders for it, so it
			// must not be able to block the save.
			designations: [
				'none' as PartnerProfile['designations'][number],
				'modern-work',
			],
			specializations: [
				'modern-work:teamwork-deployment' as PartnerProfile['specializations'][number],
				'modern-work:copilot',
			],
		};
		render(<PartnerProfileForm />);

		fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

		await waitFor(() => expect(savePartnerProfileMock).toHaveBeenCalled());
		expect(savePartnerProfileMock.mock.calls[0][0].designations).toEqual([
			'modern-work',
		]);
		expect(savePartnerProfileMock.mock.calls[0][0].specializations).toEqual([
			'modern-work:copilot',
		]);
	});

	it('shows the session-expired message on a 401 save failure', async () => {
		savePartnerProfileMock.mockRejectedValue(
			Object.assign(new Error('Failed to save partner profile (401)'), {
				status: 401,
			}),
		);
		render(<PartnerProfileForm />);

		fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

		await waitFor(() =>
			expect(
				screen.getByText(/session has expired/i),
			).toBeInTheDocument(),
		);
	});

	it('saves a brand-new profile after answering the follow-up', async () => {
		contextProfile = null;
		render(<PartnerProfileForm />);

		// Direct follow-up + JumpStart share Yes/No radios; first group is the follow-up.
		const yesRadios = screen.getAllByRole('radio', { name: 'Yes' });
		fireEvent.click(yesRadios[0]);
		fireEvent.click(screen.getByRole('checkbox', { name: 'Modern Work' }));
		fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

		await waitFor(() => expect(savePartnerProfileMock).toHaveBeenCalled());
	});
});
