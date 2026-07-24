import { BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

export const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
export const LOGO_CONTAINER = 'partner-logos';
export const ALLOWED_LOGO_TYPES: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/webp': 'webp',
	'image/svg+xml': 'svg',
};

export interface UploadedLogoFile {
	originalname: string;
	mimetype: string;
	size: number;
	buffer: Buffer;
}

export function isUploadedLogoFile(value: unknown): value is UploadedLogoFile {
	if (!value || typeof value !== 'object') return false;
	const f = value as Partial<UploadedLogoFile>;
	return (
		typeof f.originalname === 'string' &&
		typeof f.mimetype === 'string' &&
		typeof f.size === 'number' &&
		Buffer.isBuffer(f.buffer)
	);
}

export function logoFileInterceptor() {
	return FileInterceptor('file', {
		limits: { fileSize: MAX_LOGO_SIZE },
		fileFilter: (_req: unknown, file: any, callback: any) => {
			if (!ALLOWED_LOGO_TYPES[file.mimetype]) {
				callback(
					new BadRequestException(
						'Only PNG, JPEG, WebP, or SVG images are supported',
					),
					false,
				);
				return;
			}
			callback(null, true);
		},
	});
}
