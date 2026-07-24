interface ProposalSectionStepLabelProps {
	stepNumber?: number;
	className?: string;
}

export function ProposalSectionStepLabel({
	stepNumber,
	className,
}: ProposalSectionStepLabelProps) {
	if (!stepNumber) return null;

	return (
		<>
			<span className="sr-only">Step {stepNumber}: </span>
			<span
				aria-hidden="true"
				className={[
					'font-ds-display font-semibold text-current',
					className,
				]
					.filter(Boolean)
					.join(' ')}
			>
				{stepNumber}.
			</span>
		</>
	);
}
