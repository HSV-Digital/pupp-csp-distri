import type { CreateResellerCustomerPdfDto } from './dto/create-reseller-customer-pdf.dto';

const RESELLER_PDF_FILTER_KEYS = [
	'customerName',
	'currentSku',
	'region',
	'seats',
	'currentArr',
	'renewalDate',
	'copilotFit',
	'copilotIntent',
	'copilotCluster',
	'hasCompete',
	'hasTransactedProduct',
	'distributorName',
	'customerTpid',
	'copilotChatToPaid',
	'mwPaidSeatRange',
] as const;

export function buildResellerPdfFilters(
	filters: CreateResellerCustomerPdfDto['filters'],
): Record<string, string[]> {
	const resellerFilters: Record<string, string[]> = {};

	for (const key of RESELLER_PDF_FILTER_KEYS) {
		const values = filters?.[key];
		if (values?.length) {
			resellerFilters[key] = values;
		}
	}

	return resellerFilters;
}
