import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AssetsLeftColumn } from './AssetsLeftColumn';

const createPartnerProposalEmailLinkMock = vi.fn();
const createPartnerProposalEmailLinkPublicMock = vi.fn();

vi.mock('@/lib/partner-proposal-email-link', () => ({
	createPartnerProposalEmailLink: (...args: unknown[]) =>
		createPartnerProposalEmailLinkMock(...args),
	createPartnerProposalEmailLinkPublic: (...args: unknown[]) =>
		createPartnerProposalEmailLinkPublicMock(...args),
}));

const defaultProps = {
	customerName: 'Contoso',
	endingSkuIds: ['bs_cb'],
	showPartnerEmail: true,
	customerProposalEmailRequest: {
		journey: 'renewal' as const,
		customerId: 'cust-1',
		customerName: 'Contoso',
		scenarios: [
			{
				opportunityId: 'opp-1',
				startingSkuId: 'bs',
				startingSkuName: 'Business Standard',
				endingSkuId: 'bs_cb',
				selectedSeats: 35,
				originalSeats: 40,
				expiringArr: 6000,
			},
		],
	},
	proposalDownloadUrl: 'https://example.com/proposal-assets.zip?dlToken=abc',
};

describe('AssetsLeftColumn', () => {
	beforeEach(() => {
		createPartnerProposalEmailLinkMock.mockReset();
		createPartnerProposalEmailLinkPublicMock.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders all three section headings', () => {
		render(<AssetsLeftColumn {...defaultProps} />);

		expect(
			screen.getByText('Download the Customer-Ready Proactive Proposal Pack'),
		).toBeInTheDocument();
		expect(
			screen.getByText('Partner Ready proposal Assets'),
		).toBeInTheDocument();
		expect(
			screen.getByText('Download additional GTM resources'),
		).toBeInTheDocument();
	});

	it('renders Copilot Business GTM resources as one category', () => {
		render(
			<AssetsLeftColumn
				{...defaultProps}
				endingSkuIds={['bs_cb', 'bp_cb']}
				showPartnerEmail={false}
			/>,
		);

		expect(screen.getByText('Copilot Business')).toBeInTheDocument();
		expect(screen.getByText('Business Case Builder')).toBeInTheDocument();
		expect(
			screen.getByText('Copilot and Chat envisioning tool'),
		).toBeInTheDocument();
		expect(screen.getByText('GTM Kit')).toBeInTheDocument();
		expect(screen.getByText('Customer pitch deck')).toBeInTheDocument();
		expect(screen.getByText('Promotion one-sliders')).toBeInTheDocument();
		expect(screen.getByText('To-customer flyers')).toBeInTheDocument();
		expect(screen.getByText('To-customer e-mails')).toBeInTheDocument();
		expect(
			screen.getByText('Building Agents with Microsoft Pitch deck'),
		).toBeInTheDocument();
		expect(
			screen.getByText('Cowork Partner GTM Launch kit'),
		).toBeInTheDocument();
		expect(
			screen.getByText('Copilot agent immersion experience'),
		).toBeInTheDocument();
		expect(screen.queryByText('Sizzle videos')).not.toBeInTheDocument();
		expect(
			screen.queryByLabelText('Select GTM Kit language'),
		).not.toBeInTheDocument();

		expect(screen.getByRole('link', { name: /open gtm kit/i })).toHaveAttribute(
			'href',
			'https://microsoftpartners.microsoft.com/downloads?filename=abs/protected/M365-Business-with-Copilot-Partner-Launch-Kit.zip',
		);
	});

	it('renders the Copilot Business sales guide for Business Basic + Copilot Business', () => {
		render(
			<AssetsLeftColumn
				{...defaultProps}
				endingSkuIds={['bb_cb']}
				showCspPartnerResources
				showPartnerEmail={false}
			/>,
		);

		expect(
			screen.getByText('Explore Sales Guidance'),
		).toBeInTheDocument();
		expect(
			screen.getByRole('link', {
				name: /download copilot business \+ business basic/i,
			}),
		).toHaveAttribute(
			'href',
			'https://agentbprodstorage.blob.core.windows.net/pdf-exports/sales-enablement/Microsoft%20365%20Copilot%20Business%20%2B%20Business%20Basic%20(1).pdf',
		);
	});

	it('renders Purview and Defender categories for combined security SKUs', () => {
		render(
			<AssetsLeftColumn
				{...defaultProps}
				endingSkuIds={['bp_defender_purview']}
				showPartnerEmail={false}
			/>,
		);

		expect(screen.getByText('Purview')).toBeInTheDocument();
		expect(screen.getByText('Defender')).toBeInTheDocument();
		expect(screen.queryByText('Copilot Business')).not.toBeInTheDocument();
		expect(
			screen.getByText('Unlock the power and promise of AI'),
		).toBeInTheDocument();
		expect(
			screen.getByText('Elevate security and compliance'),
		).toBeInTheDocument();
	});

	it('recognizes attach Copilot as a Copilot Business category', () => {
		render(
			<AssetsLeftColumn
				{...defaultProps}
				endingSkuIds={['attach_copilot']}
				showPartnerEmail={false}
			/>,
		);

		expect(screen.getByText('Copilot Business')).toBeInTheDocument();
		expect(screen.getByText('Business Case Builder')).toBeInTheDocument();
	});

	it('renders the configured Copilot adoption resources', () => {
		render(
			<AssetsLeftColumn
				{...defaultProps}
				showCspPartnerResources
				showPartnerEmail={false}
			/>,
		);

		expect(
			screen.getByText('Copilot analytics risk and compliance discussion guide'),
		).toBeInTheDocument();
		expect(screen.getByText('Building first agent in minutes')).toBeInTheDocument();
		expect(screen.getByText('Agent governance')).toBeInTheDocument();
		expect(
			screen.getByText(
				'Copilot for Microsoft 365 Copilot Success Kit for Small and Medium Business - Microsoft Adoption',
			),
		).toBeInTheDocument();
		expect(
			screen.getByText('M365 Adoption guide - PowerPoint Presentation'),
		).toBeInTheDocument();
		expect(screen.getByText('Copilot Prompt Packs')).toBeInTheDocument();
		expect(screen.getByText('Interactive scenario library')).toBeInTheDocument();
		expect(
			screen.getByText('Measuring impact with Copilot Analytics'),
		).toBeInTheDocument();

		expect(
			screen.getByRole('link', { name: /download copilot prompt packs/i }),
		).toHaveAttribute(
			'href',
			'https://microsoftpartners.microsoft.com/downloads?filename=abs/protected/Copilot-Prompt-Packs.zip',
		);
		expect(
			screen.queryByText(/User enablement tools and templates/),
		).not.toBeInTheDocument();
	});

	it('renders Defender adoption resources with the existing interactive guides', () => {
		render(
			<AssetsLeftColumn
				{...defaultProps}
				endingSkuIds={['bp_defender']}
				showCspPartnerResources
				showPartnerEmail={false}
			/>,
		);

		expect(
			screen.getByRole('link', {
				name: /download microsoft security adoption guide/i,
			}),
		).toHaveAttribute('href', 'https://aka.ms/security_adoption_guide');
		expect(
			screen.getByText('A practical handbook to securing data with Purview'),
		).toBeInTheDocument();

		const guidesToggle = screen.getByRole('button', {
			name: /interactive guides/i,
		});
		fireEvent.click(guidesToggle);

		expect(screen.getByText('Data Loss Protection')).toBeInTheDocument();
		expect(
			screen.getByRole('link', { name: /download data loss protection/i }),
		).toHaveAttribute(
			'href',
			'https://mslearn.cloudguides.com/en-us/guides/Apply%20Microsoft%20Endpoint%20DLP%20policies%20to%20devices',
		);
		expect(
			screen.getByRole('link', { name: /download clickthrough demos/i }),
		).toHaveAttribute(
			'href',
			'https://adoption.microsoft.com/en-us/microsoft-security/purview/?role=developer',
		);
		expect(
			screen.getByRole('link', {
				name: /download additional implementation and adoption resources/i,
			}),
		).toHaveAttribute(
			'href',
			'https://adoption.microsoft.com/en-us/microsoft-security/purview/?role=developer',
		);
	});

	it('renders only the security adoption guide for Purview adoption resources', () => {
		render(
			<AssetsLeftColumn
				{...defaultProps}
				endingSkuIds={['bp_purview']}
				showCspPartnerResources
				showPartnerEmail={false}
			/>,
		);

		expect(
			screen.getByRole('link', {
				name: /download microsoft security adoption guide/i,
			}),
		).toHaveAttribute('href', 'https://aka.ms/security_adoption_guide');
		expect(
			screen.queryByText('A practical handbook to securing data with Purview'),
		).not.toBeInTheDocument();
		expect(screen.queryByText('Interactive guides')).not.toBeInTheDocument();
		expect(screen.queryByText('Clickthrough demos')).not.toBeInTheDocument();
		expect(
			screen.queryByRole('link', {
				name: /download additional implementation and adoption resources/i,
			}),
		).not.toBeInTheDocument();
	});

	it('renders section-aware skeleton when loading', () => {
		render(<AssetsLeftColumn {...defaultProps} loading />);

		expect(
			screen.getByTestId('assets-left-skeleton-customer'),
		).toBeInTheDocument();
		expect(
			screen.getByTestId('assets-left-skeleton-partner'),
		).toBeInTheDocument();
		expect(screen.getByTestId('assets-left-skeleton-gtm')).toBeInTheDocument();
		expect(
			screen.queryByRole('link', {
				name: /download/i,
			}),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('button', {
				name: /download/i,
			}),
		).not.toBeInTheDocument();
	});

	it('hides partner skeleton block when showPartnerEmail is false', () => {
		render(
			<AssetsLeftColumn {...defaultProps} loading showPartnerEmail={false} />,
		);

		expect(
			screen.getByTestId('assets-left-skeleton-customer'),
		).toBeInTheDocument();
		expect(
			screen.queryByTestId('assets-left-skeleton-partner'),
		).not.toBeInTheDocument();
	});

	it('renders PPT child item with correct download href', () => {
		render(<AssetsLeftColumn {...defaultProps} />);

		const pptLink = screen.getByRole('link', {
			name: /download consolidated proactive proposal document/i,
		});
		expect(pptLink).toHaveAttribute(
			'href',
			expect.stringContaining('&file=ppt'),
		);
	});

	it('hides consolidated PPT item when showConsolidatedPpt is false', () => {
		render(<AssetsLeftColumn {...defaultProps} showConsolidatedPpt={false} />);

		expect(
			screen.queryByRole('link', {
				name: /download consolidated proactive proposal document/i,
			}),
		).not.toBeInTheDocument();
	});

	it('renders DOCX child item with correct download href', () => {
		render(<AssetsLeftColumn {...defaultProps} />);

		const docxLink = screen.getByRole('link', {
			name: /download customer proposal e-mail/i,
		});
		expect(docxLink).toHaveAttribute(
			'href',
			expect.stringContaining('&file=email'),
		);
	});

	it('renders individual opportunity PPT items when provided', () => {
		const individualPpts = [
			{
				key: 'opp-1',
				label: 'Business Premium Proposal',
				downloadUrl: 'blob:https://example.com/ppt-1',
			},
			{
				key: 'opp-2',
				label: 'Business Standard Proposal',
				downloadUrl: 'blob:https://example.com/ppt-2',
			},
		];
		render(
			<AssetsLeftColumn {...defaultProps} individualPpts={individualPpts} />,
		);

		const ppt1Link = screen.getByRole('link', {
			name: /download business premium proposal/i,
		});
		expect(ppt1Link).toHaveAttribute('href', 'blob:https://example.com/ppt-1');

		const ppt2Link = screen.getByRole('link', {
			name: /download business standard proposal/i,
		});
		expect(ppt2Link).toHaveAttribute('href', 'blob:https://example.com/ppt-2');
	});

	it('renders customer proposal email after individual opportunity documents', () => {
		const individualPpts = [
			{
				key: 'opp-1',
				label: 'Business Premium Proposal',
				downloadUrl: 'blob:https://example.com/ppt-1',
			},
		];
		render(
			<AssetsLeftColumn {...defaultProps} individualPpts={individualPpts} />,
		);

		const emailLabel = screen.getByText('Customer Proposal E-mail');
		const proposalLabel = screen.getByText('Business Premium Proposal');
		const orderFlag = proposalLabel.compareDocumentPosition(emailLabel);
		expect(orderFlag & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
	});

	it('does not render individual PPT items when prop is omitted', () => {
		render(<AssetsLeftColumn {...defaultProps} />);

		expect(
			screen.queryByRole('link', {
				name: /download business premium proposal/i,
			}),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole('link', {
				name: /download business standard proposal/i,
			}),
		).not.toBeInTheDocument();
	});

	it('downloads partner-ready email using partner proposal endpoint', async () => {
		createPartnerProposalEmailLinkMock.mockResolvedValue({
			url: 'https://example.com/partner-proposal-email.docx',
			expiresAt: '2026-02-23T00:00:00.000Z',
		});

		const pendingTab = {
			closed: false,
			opener: null as null,
			location: { href: '' },
		};
		const openSpy = vi
			.spyOn(window, 'open')
			.mockReturnValue(pendingTab as unknown as Window);

		render(<AssetsLeftColumn {...defaultProps} />);

		fireEvent.click(screen.getByRole('button', { name: /download partner/i }));

		await waitFor(() =>
			expect(createPartnerProposalEmailLinkMock).toHaveBeenCalledWith({
				journey: 'renewal',
				customerId: 'cust-1',
				customerName: 'Contoso',
				scenarios: [
					{
						opportunityId: 'opp-1',
						startingSkuId: 'bs',
						startingSkuName: 'Business Standard',
						endingSkuId: 'bs_cb',
						selectedSeats: 35,
						originalSeats: 40,
						expiringArr: 6000,
					},
				],
			}),
		);
		expect(openSpy).toHaveBeenCalledWith('', '_blank');
		expect(pendingTab.location.href).toBe(
			'https://example.com/partner-proposal-email.docx',
		);
	});
});
