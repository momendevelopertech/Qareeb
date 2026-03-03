import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

type EgyGovernorate = {
    id: number;
    code: string;
    name: string;
    nameEn: string;
};

type EgyCity = {
    id: number;
    name: string;
    nameEn: string;
    governorateCode: string;
};

const { cities, governorates } = require('egydata') as {
    cities: { getByGovernorate: (code: string) => EgyCity[] };
    governorates: { getAll: () => EgyGovernorate[] };
};

const prisma = new PrismaClient();

async function main() {
    const governoratesCatalog = governorates.getAll();
    const governorateNames = governoratesCatalog.map((item: EgyGovernorate) => item.name);
    const cityMap = new Map<string, EgyCity[]>();

    let govCount = 0;
    let areaCount = 0;

    for (const governorate of governoratesCatalog) {
        cityMap.set(governorate.code, cities.getByGovernorate(governorate.code));
    }

    for (const item of governoratesCatalog) {
        const governorate = await prisma.governorate.upsert({
            where: { nameAr: item.name },
            update: { nameEn: item.nameEn },
            create: { nameAr: item.name, nameEn: item.nameEn },
        });
        govCount += 1;

        const areas = cityMap.get(item.code) ?? [];
        const areaNames = areas.map((area) => area.name);
        for (const area of areas) {
            const englishCandidates = [
                area.nameEn.trim(),
                `${area.nameEn.trim()} (${area.name.trim()})`,
                `${area.nameEn.trim()} (${item.code}-${area.id})`,
            ];

            let lastError: unknown;
            let upserted = false;

            for (const safeEnglishName of englishCandidates) {
                try {
                    await prisma.area.upsert({
                        where: {
                            governorateId_nameAr: {
                                governorateId: governorate.id,
                                nameAr: area.name,
                            },
                        },
                        update: { nameEn: safeEnglishName },
                        create: {
                            governorateId: governorate.id,
                            nameAr: area.name,
                            nameEn: safeEnglishName,
                        },
                    });
                    upserted = true;
                    break;
                } catch (error) {
                    const isUniqueConflict = typeof error === 'object'
                        && error !== null
                        && 'code' in error
                        && (error as { code?: string }).code === 'P2002';

                    if (!isUniqueConflict) throw error;
                    lastError = error;
                }
            }

            if (!upserted) {
                throw lastError;
            }

            areaCount += 1;
        }

        await prisma.area.deleteMany({
            where: {
                governorateId: governorate.id,
                nameAr: { notIn: areaNames },
            },
        });
    }

    const staleGovernorates = await prisma.governorate.findMany({
        where: { nameAr: { notIn: governorateNames } },
        select: { id: true },
    });
    const staleGovernorateIds = staleGovernorates.map((item) => item.id);

    if (staleGovernorateIds.length) {
        await prisma.area.deleteMany({
            where: { governorateId: { in: staleGovernorateIds } },
        });
    }

    await prisma.governorate.deleteMany({
        where: { id: { in: staleGovernorateIds } },
    });

    console.log(`Synced governorates: ${govCount}`);
    console.log(`Synced areas: ${areaCount}`);
}

main()
    .catch((error) => {
        console.error('sync-locations failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
