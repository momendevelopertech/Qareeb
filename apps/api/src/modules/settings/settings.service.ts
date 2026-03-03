import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

type CacheItem = {
    value: string;
    group: string;
    isSecret: boolean;
    expiresAt: number;
};

const SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class SettingsService {
    private readonly cache = new Map<string, CacheItem>();
    private readonly logger = new Logger(SettingsService.name);

    constructor(private readonly prisma: PrismaService) { }

    async get(key: string): Promise<string | null> {
        const now = Date.now();
        const cached = this.cache.get(key);
        if (cached && cached.expiresAt > now) {
            return cached.value;
        }

        const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
        if (!setting) return null;

        const value = setting.isSecret ? this.decrypt(setting.value) : setting.value;
        this.cache.set(key, {
            value,
            group: setting.group,
            isSecret: setting.isSecret,
            expiresAt: now + SETTINGS_CACHE_TTL_MS,
        });
        return value;
    }

    async getByGroup(group: string): Promise<Array<{
        key: string;
        valueMasked: string;
        group: string;
        isSecret: boolean;
        hasValue: boolean;
        updatedAt: Date;
    }>> {
        const normalizedGroup = group.toUpperCase();
        const rows = await this.prisma.systemSetting.findMany({
            where: { group: normalizedGroup },
            orderBy: { key: 'asc' },
        });

        const output: Array<{
            key: string;
            valueMasked: string;
            group: string;
            isSecret: boolean;
            hasValue: boolean;
            updatedAt: Date;
        }> = [];

        for (const row of rows) {
            const value = row.isSecret ? await this.get(row.key) : row.value;
            const normalizedValue = value || '';
            output.push({
                key: row.key,
                valueMasked: row.isSecret ? this.mask(normalizedValue) : normalizedValue,
                group: row.group,
                isSecret: row.isSecret,
                hasValue: normalizedValue.trim().length > 0,
                updatedAt: row.updatedAt,
            });
        }

        return output;
    }

    async set(key: string, value: string, group: string, isSecret = false) {
        const normalizedGroup = group.toUpperCase();
        const storedValue = isSecret ? this.encrypt(value) : value;

        const saved = await this.prisma.systemSetting.upsert({
            where: { key },
            update: {
                value: storedValue,
                group: normalizedGroup,
                isSecret,
            },
            create: {
                key,
                value: storedValue,
                group: normalizedGroup,
                isSecret,
            },
        });

        this.cache.delete(key);
        return {
            key: saved.key,
            group: saved.group,
            isSecret: saved.isSecret,
            hasValue: true,
            valueMasked: saved.isSecret ? this.mask(value) : value,
            updatedAt: saved.updatedAt,
        };
    }

    async update(key: string, data: { value?: string; group?: string; isSecret?: boolean }) {
        const current = await this.prisma.systemSetting.findUnique({ where: { key } });
        if (!current) throw new NotFoundException(`Setting ${key} not found`);

        const nextSecret = data.isSecret ?? current.isSecret;
        const nextGroup = (data.group || current.group).toUpperCase();

        let nextValue = current.value;
        if (data.value !== undefined) {
            nextValue = nextSecret ? this.encrypt(data.value) : data.value;
        } else if (current.isSecret !== nextSecret) {
            const currentPlain = current.isSecret ? this.decrypt(current.value) : current.value;
            nextValue = nextSecret ? this.encrypt(currentPlain) : currentPlain;
        }

        const saved = await this.prisma.systemSetting.update({
            where: { key },
            data: {
                value: nextValue,
                group: nextGroup,
                isSecret: nextSecret,
            },
        });

        this.cache.delete(key);
        const plain = await this.get(key);
        const safePlain = plain || '';

        return {
            key: saved.key,
            group: saved.group,
            isSecret: saved.isSecret,
            hasValue: safePlain.trim().length > 0,
            valueMasked: saved.isSecret ? this.mask(safePlain) : safePlain,
            updatedAt: saved.updatedAt,
        };
    }

    async delete(key: string) {
        await this.prisma.systemSetting.delete({ where: { key } });
        this.cache.delete(key);
        return { success: true };
    }

    private getEncryptionKey(): Buffer | null {
        const raw = process.env.SETTINGS_ENCRYPTION_KEY || '';
        if (!raw.trim()) {
            return null;
        }
        return scryptSync(raw, 'qareeb-settings', 32);
    }

    private encrypt(plainText: string): string {
        const key = this.getEncryptionKey();
        if (!key) {
            this.logger.warn('SETTINGS_ENCRYPTION_KEY is missing; storing secret setting in plain text.');
            return `plain:${plainText}`;
        }
        const iv = randomBytes(12);
        const cipher = createCipheriv('aes-256-gcm', key, iv);
        const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
    }

    private decrypt(payload: string): string {
        if (payload.startsWith('plain:')) {
            return payload.slice('plain:'.length);
        }

        const [version, ivBase64, tagBase64, encryptedBase64] = payload.split(':');
        if (version !== 'v1' || !ivBase64 || !tagBase64 || !encryptedBase64) {
            return payload;
        }

        const key = this.getEncryptionKey();
        if (!key) {
            this.logger.warn('SETTINGS_ENCRYPTION_KEY is missing; cannot decrypt secret setting.');
            return '';
        }

        const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivBase64, 'base64'));
        decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));
        const plain = Buffer.concat([
            decipher.update(Buffer.from(encryptedBase64, 'base64')),
            decipher.final(),
        ]);
        return plain.toString('utf8');
    }

    private mask(value: string): string {
        if (!value) return '';
        const suffix = value.slice(-4);
        return `********${suffix}`;
    }
}
