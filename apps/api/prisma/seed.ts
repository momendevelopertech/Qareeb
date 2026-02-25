import { PrismaClient, AdminRole, SubmissionStatus, HalqaType, MaintenanceType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const toMapUrl = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`;

async function main() {
    console.log('🌱 Seeding database...');

    // Clean existing data for a consistent seed run (order matters because of FKs)
    await prisma.mediaAsset.deleteMany();
    await prisma.auditLog?.deleteMany?.().catch(() => undefined);
    await prisma.maintenanceRequest.deleteMany();
    await prisma.halqa.deleteMany();
    await prisma.imam.deleteMany();
    await prisma.area.deleteMany();
    await prisma.governorate.deleteMany();
    await prisma.admin.deleteMany();

    // Create super admin
    const passwordHash = await bcrypt.hash('admin123456', 12);
    const superAdmin = await prisma.admin.create({
        data: {
            email: 'admin@qareeb.app',
            passwordHash,
            role: AdminRole.super_admin,
            isActive: true,
        },
    });
    console.log('✅ Super admin created:', superAdmin.email);

    // Create reviewer accounts
    const reviewers = [
        { email: 'imam.reviewer@qareeb.app', role: AdminRole.imam_reviewer },
        { email: 'halqa.reviewer@qareeb.app', role: AdminRole.halqa_reviewer },
        { email: 'maint.reviewer@qareeb.app', role: AdminRole.maintenance_reviewer },
        { email: 'full.reviewer@qareeb.app', role: AdminRole.full_reviewer },
    ];

    for (const r of reviewers) {
        await prisma.admin.create({
            data: {
                email: r.email,
                passwordHash,
                role: r.role,
                isActive: true,
                createdBy: superAdmin.id,
            },
        });
        console.log(`✅ Reviewer created: ${r.email}`);
    }

    // Seed governorates
    const governorates = [
        { ar: 'القاهرة', en: 'Cairo' },
        { ar: 'الجيزة', en: 'Giza' },
        { ar: 'الإسكندرية', en: 'Alexandria' },
        { ar: 'الدقهلية', en: 'Dakahlia' },
        { ar: 'البحر الأحمر', en: 'Red Sea' },
        { ar: 'البحيرة', en: 'Beheira' },
        { ar: 'الفيوم', en: 'Faiyum' },
        { ar: 'الغربية', en: 'Gharbia' },
        { ar: 'الإسماعيلية', en: 'Ismailia' },
        { ar: 'المنوفية', en: 'Monufia' },
        { ar: 'المنيا', en: 'Minya' },
        { ar: 'القليوبية', en: 'Qalyubia' },
        { ar: 'الوادي الجديد', en: 'New Valley' },
        { ar: 'السويس', en: 'Suez' },
        { ar: 'الشرقية', en: 'Sharqia' },
        { ar: 'أسوان', en: 'Aswan' },
        { ar: 'أسيوط', en: 'Assiut' },
        { ar: 'بني سويف', en: 'Beni Suef' },
        { ar: 'بورسعيد', en: 'Port Said' },
        { ar: 'دمياط', en: 'Damietta' },
        { ar: 'جنوب سيناء', en: 'South Sinai' },
        { ar: 'كفر الشيخ', en: 'Kafr El Sheikh' },
        { ar: 'مطروح', en: 'Matruh' },
        { ar: 'قنا', en: 'Qena' },
        { ar: 'سوهاج', en: 'Sohag' },
        { ar: 'شمال سيناء', en: 'North Sinai' },
        { ar: 'الأقصر', en: 'Luxor' },
    ];

    const govMap: Record<string, string> = {};
    for (const g of governorates) {
        const record = await prisma.governorate.create({
            data: { nameAr: g.ar, nameEn: g.en },
        });
        govMap[g.ar] = record.id;
        govMap[g.en] = record.id;
    }
    console.log(`✅ ${governorates.length} governorates seeded`);

    // Seed areas (focused on ones used in seed data + popular districts)
    const areas = [
        { gov: 'القاهرة', ar: 'السيدة زينب', en: 'Sayeda Zeinab' },
        { gov: 'القاهرة', ar: 'مصر الجديدة', en: 'Heliopolis' },
        { gov: 'القاهرة', ar: 'مدينة نصر', en: 'Nasr City' },
        { gov: 'القاهرة', ar: 'شبرا', en: 'Shubra' },
        { gov: 'القاهرة', ar: 'حلوان', en: 'Helwan' },
        { gov: 'القاهرة', ar: 'المرج', en: 'El Marg' },
        { gov: 'الجيزة', ar: 'المهندسين', en: 'Mohandessin' },
        { gov: 'الجيزة', ar: 'الدقي', en: 'Dokki' },
        { gov: 'الجيزة', ar: 'إمبابة', en: 'Imbaba' },
        { gov: 'الجيزة', ar: 'فيصل', en: 'Faisal' },
        { gov: 'الإسكندرية', ar: 'محرم بك', en: 'Moharam Bek' },
        { gov: 'الإسكندرية', ar: 'العجمي', en: 'Agamy' },
        { gov: 'الإسكندرية', ar: 'سيدي بشر', en: 'Sidi Bishr' },
        { gov: 'الإسكندرية', ar: 'المنتزه', en: 'Al Montazah' },
        { gov: 'الدقهلية', ar: 'وسط البلد', en: 'Downtown Mansoura' },
        { gov: 'الدقهلية', ar: 'الجمهورية', en: 'Al Gomhoria' },
        { gov: 'الشرقية', ar: 'وسط البلد', en: 'Zagazig Downtown' },
        { gov: 'البحيرة', ar: 'الزهور', en: 'Al Zuhour' },
    ];

    const areaMap: Record<string, string> = {};
    for (const a of areas) {
        const record = await prisma.area.create({
            data: {
                nameAr: a.ar,
                nameEn: a.en,
                governorateId: govMap[a.gov],
            },
        });
        areaMap[`${a.gov}:${a.ar}`] = record.id;
        areaMap[`${a.gov}:${a.en}`] = record.id;
    }
    console.log(`✅ ${areas.length} areas seeded`);

    const areaFor = (gov: string, area: string) => areaMap[`${gov}:${area}`] || null;

    // Seed Imams (6 items)
    const imams = [
        {
            imamName: 'الشيخ محمد عبد الرحمن',
            mosqueName: 'مسجد السيدة زينب',
            governorate: 'القاهرة',
            city: 'القاهرة',
            district: 'السيدة زينب',
            areaId: areaFor('القاهرة', 'السيدة زينب'),
            latitude: 30.0444,
            longitude: 31.2357,
            googleMapsUrl: toMapUrl(30.0444, 31.2357),
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            whatsapp: '+201012345678',
            status: SubmissionStatus.approved,
            adminId: superAdmin.id,
        },
        {
            imamName: 'الشيخ أحمد كمال الدين',
            mosqueName: 'مسجد النور',
            governorate: 'الإسكندرية',
            city: 'الإسكندرية',
            district: 'محرم بك',
            areaId: areaFor('الإسكندرية', 'محرم بك'),
            latitude: 31.2001,
            longitude: 29.9187,
            googleMapsUrl: toMapUrl(31.2001, 29.9187),
            whatsapp: '+201123456789',
            status: SubmissionStatus.approved,
            adminId: superAdmin.id,
        },
        {
            imamName: 'الشيخ عمر حسن الجوهري',
            mosqueName: 'مسجد الرحمة',
            governorate: 'الجيزة',
            city: 'الجيزة',
            district: 'المهندسين',
            areaId: areaFor('الجيزة', 'المهندسين'),
            latitude: 30.0131,
            longitude: 31.2089,
            googleMapsUrl: toMapUrl(30.0131, 31.2089),
            whatsapp: '+201234567890',
            status: SubmissionStatus.pending,
        },
        {
            imamName: 'الشيخ يوسف إبراهيم السعيد',
            mosqueName: 'مسجد الفتح',
            governorate: 'القاهرة',
            city: 'القاهرة',
            district: 'مصر الجديدة',
            areaId: areaFor('القاهرة', 'مصر الجديدة'),
            latitude: 30.09,
            longitude: 31.32,
            googleMapsUrl: toMapUrl(30.09, 31.32),
            whatsapp: '+201098765432',
            status: SubmissionStatus.approved,
            adminId: superAdmin.id,
        },
        {
            imamName: 'الشيخ عبد الله صابر',
            mosqueName: 'مسجد بلال',
            governorate: 'الدقهلية',
            city: 'المنصورة',
            district: 'وسط البلد',
            areaId: areaFor('الدقهلية', 'وسط البلد'),
            latitude: 31.04,
            longitude: 31.37,
            googleMapsUrl: toMapUrl(31.04, 31.37),
            whatsapp: '+201512345678',
            status: SubmissionStatus.approved,
            adminId: superAdmin.id,
        },
        {
            imamName: 'الشيخ حسام الدين رضا',
            mosqueName: 'مسجد المصطفى',
            governorate: 'الإسكندرية',
            city: 'الإسكندرية',
            district: 'العجمي',
            areaId: areaFor('الإسكندرية', 'العجمي'),
            latitude: 31.13,
            longitude: 29.78,
            googleMapsUrl: toMapUrl(31.13, 29.78),
            whatsapp: '+201612345678',
            status: SubmissionStatus.pending,
        },
    ];

    for (const imam of imams) {
        await prisma.imam.create({ data: imam });
    }
    console.log(`✅ ${imams.length} imams seeded`);

    // Seed Halaqat (6 items)
    const halaqat = [
        {
            circleName: 'حلقة نور العلم',
            mosqueName: 'مسجد عمر بن الخطاب',
            halqaType: HalqaType.children,
            governorate: 'القاهرة',
            city: 'القاهرة',
            district: 'مدينة نصر',
            areaId: areaFor('القاهرة', 'مدينة نصر'),
            latitude: 30.05,
            longitude: 31.33,
            googleMapsUrl: toMapUrl(30.05, 31.33),
            videoUrl: 'https://www.youtube.com/watch?v=J---aiyznGQ',
            whatsapp: '+201011111111',
            additionalInfo: 'السبت والاثنين ٤-٦ م - تحفيظ قرآن للأطفال',
            status: SubmissionStatus.approved,
            adminId: superAdmin.id,
        },
        {
            circleName: 'حلقة السيدات للتحفيظ',
            mosqueName: 'مسجد السلام',
            halqaType: HalqaType.women,
            governorate: 'الجيزة',
            city: 'الجيزة',
            district: 'الدقي',
            areaId: areaFor('الجيزة', 'الدقي'),
            latitude: 30.03,
            longitude: 31.21,
            googleMapsUrl: toMapUrl(30.03, 31.21),
            whatsapp: '+201022222222',
            additionalInfo: 'يومياً ١٠ص - ١٢ ظ - للسيدات فقط',
            status: SubmissionStatus.approved,
            adminId: superAdmin.id,
        },
        {
            circleName: 'حلقة الإخوة للرجال',
            mosqueName: 'مسجد الإخلاص',
            halqaType: HalqaType.men,
            governorate: 'الإسكندرية',
            city: 'الإسكندرية',
            district: 'سيدي بشر',
            areaId: areaFor('الإسكندرية', 'سيدي بشر'),
            latitude: 31.26,
            longitude: 30.0,
            googleMapsUrl: toMapUrl(31.26, 30.0),
            whatsapp: '+201033333333',
            additionalInfo: 'بعد المغرب يومياً - للرجال فقط',
            status: SubmissionStatus.approved,
            adminId: superAdmin.id,
        },
        {
            circleName: 'حلقة الصغار المميزة',
            mosqueName: 'مسجد الرحمن',
            halqaType: HalqaType.children,
            governorate: 'القاهرة',
            city: 'القاهرة',
            district: 'شبرا',
            areaId: areaFor('القاهرة', 'شبرا'),
            latitude: 30.1,
            longitude: 31.24,
            googleMapsUrl: toMapUrl(30.1, 31.24),
            whatsapp: '+201044444444',
            additionalInfo: 'الجمعة والأحد ٣-٥ م',
            status: SubmissionStatus.pending,
        },
        {
            circleName: 'حلقة القراءات العشر',
            mosqueName: 'مسجد التوبة',
            halqaType: HalqaType.men,
            governorate: 'الدقهلية',
            city: 'المنصورة',
            district: 'الجمهورية',
            areaId: areaFor('الدقهلية', 'الجمهورية'),
            latitude: 31.04,
            longitude: 31.38,
            googleMapsUrl: toMapUrl(31.04, 31.38),
            whatsapp: '+201055555555',
            additionalInfo: 'الثلاثاء والخميس ٨-١٠ م - للمتقدمين',
            status: SubmissionStatus.approved,
            adminId: superAdmin.id,
        },
        {
            circleName: 'حلقة أمهات المؤمنين',
            mosqueName: 'مسجد النساء',
            halqaType: HalqaType.women,
            governorate: 'الجيزة',
            city: 'الجيزة',
            district: 'فيصل',
            areaId: areaFor('الجيزة', 'فيصل'),
            latitude: 30.0,
            longitude: 31.17,
            googleMapsUrl: toMapUrl(30.0, 31.17),
            whatsapp: '+201066666666',
            additionalInfo: 'الاثنين والأربعاء ٩-١١ص',
            status: SubmissionStatus.approved,
            adminId: superAdmin.id,
        },
    ];

    for (const halqa of halaqat) {
        await prisma.halqa.create({ data: halqa });
    }
    console.log(`✅ ${halaqat.length} halaqat seeded`);

    // Seed Maintenance Requests (6 items)
    const maintenance = [
        {
            mosqueName: 'مسجد النور',
            governorate: 'القاهرة',
            city: 'القاهرة',
            district: 'حلوان',
            areaId: areaFor('القاهرة', 'حلوان'),
            latitude: 29.84,
            longitude: 31.33,
            googleMapsUrl: toMapUrl(29.84, 31.33),
            maintenanceTypes: [MaintenanceType.Carpentry],
            description: 'تجديد السجاد - المساحة ٢٠٠ م²',
            estimatedCostMin: 15000,
            estimatedCostMax: 25000,
            whatsapp: '+201077777777',
            status: SubmissionStatus.approved,
            adminId: superAdmin.id,
        },
        {
            mosqueName: 'مسجد الفتح',
            governorate: 'الجيزة',
            city: 'الجيزة',
            district: 'إمبابة',
            areaId: areaFor('الجيزة', 'إمبابة'),
            latitude: 30.07,
            longitude: 31.21,
            googleMapsUrl: toMapUrl(30.07, 31.21),
            maintenanceTypes: [MaintenanceType.AC_Repair],
            description: 'تكييف المصلى الرئيسي لخدمة ٣٠٠ مصلٍّ',
            estimatedCostMin: 30000,
            estimatedCostMax: 50000,
            whatsapp: '+201088888888',
            status: SubmissionStatus.approved,
            adminId: superAdmin.id,
        },
        {
            mosqueName: 'مسجد السلام',
            governorate: 'الإسكندرية',
            city: 'الإسكندرية',
            district: 'المنتزه',
            areaId: areaFor('الإسكندرية', 'المنتزه'),
            latitude: 31.27,
            longitude: 30.01,
            googleMapsUrl: toMapUrl(31.27, 30.01),
            maintenanceTypes: [MaintenanceType.Plumbing],
            description: 'إصلاح شبكة السباكة الداخلية لدورات المياه',
            estimatedCostMin: 8000,
            estimatedCostMax: 15000,
            whatsapp: '+201099999999',
            status: SubmissionStatus.approved,
            adminId: superAdmin.id,
        },
        {
            mosqueName: 'مسجد التوبة',
            governorate: 'الشرقية',
            city: 'الزقازيق',
            district: 'وسط البلد',
            areaId: areaFor('الشرقية', 'وسط البلد'),
            latitude: 30.58,
            longitude: 31.51,
            googleMapsUrl: toMapUrl(30.58, 31.51),
            maintenanceTypes: [MaintenanceType.Painting],
            description: 'دهان وتجديد الواجهة الخارجية والجدران الداخلية',
            estimatedCostMin: 5000,
            estimatedCostMax: 9000,
            whatsapp: '+201100000001',
            status: SubmissionStatus.approved,
            adminId: superAdmin.id,
        },
        {
            mosqueName: 'مسجد عمر بن الخطاب',
            governorate: 'القاهرة',
            city: 'القاهرة',
            district: 'المرج',
            areaId: areaFor('القاهرة', 'المرج'),
            latitude: 30.15,
            longitude: 31.33,
            googleMapsUrl: toMapUrl(30.15, 31.33),
            maintenanceTypes: [MaintenanceType.Electrical],
            description: 'تجديد كامل منظومة الإنارة والكهرباء',
            estimatedCostMin: 20000,
            estimatedCostMax: 35000,
            whatsapp: '+201100000002',
            status: SubmissionStatus.approved,
            adminId: superAdmin.id,
        },
        {
            mosqueName: 'مسجد الرحمة',
            governorate: 'البحيرة',
            city: 'دمنهور',
            district: 'الزهور',
            areaId: areaFor('البحيرة', 'الزهور'),
            latitude: 31.03,
            longitude: 30.47,
            googleMapsUrl: toMapUrl(31.03, 30.47),
            maintenanceTypes: [MaintenanceType.Other],
            description: 'توسعة المصلى بطابق ثانٍ',
            estimatedCostMin: 80000,
            estimatedCostMax: 150000,
            whatsapp: '+201100000003',
            status: SubmissionStatus.pending,
        },
    ];

    for (const m of maintenance) {
        await prisma.maintenanceRequest.create({ data: m });
    }
    console.log(`✅ ${maintenance.length} maintenance requests seeded`);

    console.log('🎉 Seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
