import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

type CatalogItem = {
    name: string;
    areas: string[];
};

const prisma = new PrismaClient();

async function main() {
    const catalogPath = join(__dirname, 'data', 'egypt-locations.ar.json');
    const raw = readFileSync(catalogPath, 'utf8').replace(/^\uFEFF/, '');
    const catalog = JSON.parse(raw) as CatalogItem[];

    let govCount = 0;
    let areaCount = 0;

    for (const item of catalog) {
        const governorate = await prisma.governorate.upsert({
            where: { nameAr: item.name },
            update: { nameEn: item.name },
            create: { nameAr: item.name, nameEn: item.name },
        });
        govCount += 1;

        for (const areaName of item.areas) {
            await prisma.area.upsert({
                where: {
                    governorateId_nameAr: {
                        governorateId: governorate.id,
                        nameAr: areaName,
                    },
                },
                update: { nameEn: areaName },
                create: {
                    governorateId: governorate.id,
                    nameAr: areaName,
                    nameEn: areaName,
                },
            });
            areaCount += 1;
        }

        await prisma.area.deleteMany({
            where: {
                governorateId: governorate.id,
                nameAr: { notIn: item.areas },
            },
        });
    }

    await prisma.governorate.deleteMany({
        where: { nameAr: { notIn: catalog.map((item) => item.name) } },
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
