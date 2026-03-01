import { PrismaClient, AdminRole, SubmissionStatus, HalqaType, MaintenanceType, ImprovementStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const toMapUrl = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`;

async function main() {
    console.log('🌱 Seeding database...');

    // Clean existing data for a consistent seed run (order matters because of FKs)
    await prisma.mediaAsset.deleteMany();
    await prisma.auditLog?.deleteMany?.().catch(() => undefined);
    await prisma.improvement.deleteMany();
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

    // Seed areas (all Egyptian governorates with their districts)
    const areas = [
        // أسوان
        { gov: 'أسوان', ar: 'أبو الريش', en: 'Abu Al-Rish' },
        { gov: 'أسوان', ar: 'أبو سمبل', en: 'Abu Simbel' },
        { gov: 'أسوان', ar: 'ادفو', en: 'Edfu' },
        { gov: 'أسوان', ar: 'البصيلية', en: 'Al-Basiliya' },
        { gov: 'أسوان', ar: 'الرديسية', en: 'Al-Radisiya' },
        { gov: 'أسوان', ar: 'السباعية', en: 'Al-Subaiya' },
        { gov: 'أسوان', ar: 'دراو', en: 'Daraw' },
        { gov: 'أسوان', ar: 'صحاري', en: 'Sahary' },
        { gov: 'أسوان', ar: 'كلابشة', en: 'Kalabsha' },
        { gov: 'أسوان', ar: 'كوم امبو', en: 'Kom Ombo' },
        { gov: 'أسوان', ar: 'مدينة اسوان', en: 'Aswan City' },
        { gov: 'أسوان', ar: 'نصر النوبة', en: 'Nasr Al-Nuba' },
        // أسيوط
        { gov: 'أسيوط', ar: 'أبو تيج', en: 'Abu Tij' },
        { gov: 'أسيوط', ar: 'ابنوب', en: 'Abnoob' },
        { gov: 'أسيوط', ar: 'اسيوط الجديدة', en: 'New Assiut' },
        { gov: 'أسيوط', ar: 'البداري', en: 'Al-Badari' },
        { gov: 'أسيوط', ar: 'الغنايم', en: 'Al-Ghanayem' },
        { gov: 'أسيوط', ar: 'الفتح', en: 'Al-Fateh' },
        { gov: 'أسيوط', ar: 'القوصية', en: 'Al-Qusiya' },
        { gov: 'أسيوط', ar: 'ديروط', en: 'Deirut' },
        { gov: 'أسيوط', ar: 'ساحل سليم', en: 'Sahel Selim' },
        { gov: 'أسيوط', ar: 'صدفا', en: 'Sadfa' },
        { gov: 'أسيوط', ar: 'مدينة اسيوط', en: 'Assiut City' },
        { gov: 'أسيوط', ar: 'منفوط', en: 'Manfalut' },
        // الأقصر
        { gov: 'الأقصر', ar: 'أرمنت', en: 'Armant' },
        { gov: 'الأقصر', ar: 'إسنا', en: 'Esna' },
        { gov: 'الأقصر', ar: 'البياضية', en: 'Al-Bayadia' },
        { gov: 'الأقصر', ar: 'الزينية', en: 'Al-Zainiya' },
        { gov: 'الأقصر', ar: 'الطود', en: 'Al-Tod' },
        { gov: 'الأقصر', ar: 'القرنه', en: 'Al-Qurna' },
        { gov: 'الأقصر', ar: 'مدينة الأقصر', en: 'Luxor City' },
        // الإسكندرية
        { gov: 'الإسكندرية', ar: 'أبو تلات', en: 'Abu Talat' },
        { gov: 'الإسكندرية', ar: 'أبو قير', en: 'Abu Qir' },
        { gov: 'الإسكندرية', ar: 'الإسكندرية', en: 'Alexandria' },
        { gov: 'الإسكندرية', ar: 'الابراهيمية', en: 'Al-Ibrahimiya' },
        { gov: 'الإسكندرية', ar: 'الجمرك', en: 'Al-Gumruk' },
        { gov: 'الإسكندرية', ar: 'الحضرة', en: 'Al-Hadra' },
        { gov: 'الإسكندرية', ar: 'الساحل الشمالي', en: 'North Coast' },
        { gov: 'الإسكندرية', ar: 'السرايا', en: 'Al-Saraya' },
        { gov: 'الإسكندرية', ar: 'السيوف', en: 'Al-Suyuf' },
        { gov: 'الإسكندرية', ar: 'الظاهرية', en: 'Al-Zahria' },
        { gov: 'الإسكندرية', ar: 'العامرية', en: 'Al-Amiriya' },
        { gov: 'الإسكندرية', ar: 'العجمي', en: 'Agami' },
        { gov: 'الإسكندرية', ar: 'العصافرة', en: 'Al-Assafra' },
        { gov: 'الإسكندرية', ar: 'العطارين', en: 'El Attarin' },
        { gov: 'الإسكندرية', ar: 'العلمين', en: 'El Alamein' },
        { gov: 'الإسكندرية', ar: 'العوايد', en: 'Al-Awaid' },
        { gov: 'الإسكندرية', ar: 'اللبان', en: 'Al-Laban' },
        { gov: 'الإسكندرية', ar: 'المعمورة', en: 'Al-Mamoura' },
        { gov: 'الإسكندرية', ar: 'المكس', en: 'Al-Max' },
        { gov: 'الإسكندرية', ar: 'المنتزة', en: 'Al-Montazah' },
        { gov: 'الإسكندرية', ar: 'المندرة', en: 'Al-Mandara' },
        { gov: 'الإسكندرية', ar: 'النخيل', en: 'Al-Nakhil' },
        { gov: 'الإسكندرية', ar: 'النزهة', en: 'Al-Nozha' },
        { gov: 'الإسكندرية', ar: 'الهانوفيل', en: 'Al-Hanouville' },
        { gov: 'الإسكندرية', ar: 'الورديان', en: 'Al-Wardian' },
        { gov: 'الإسكندرية', ar: 'باكوس', en: 'Bakous' },
        { gov: 'الإسكندرية', ar: 'بحري', en: 'Bahary' },
        { gov: 'الإسكندرية', ar: 'برج العرب', en: 'Borg Al-Arab' },
        { gov: 'الإسكندرية', ar: 'بولكي', en: 'Bulkeley' },
        { gov: 'الإسكندرية', ar: 'ثروت', en: 'Tharwat' },
        { gov: 'الإسكندرية', ar: 'جليم', en: 'Glim' },
        { gov: 'الإسكندرية', ar: 'رشدي', en: 'Rushdi' },
        { gov: 'الإسكندرية', ar: 'زيزينيا', en: 'Zizinia' },
        { gov: 'الإسكندرية', ar: 'سابا باشا', en: 'Saba Pasha' },
        { gov: 'الإسكندرية', ar: 'سان ستيفانو', en: 'San Stefano' },
        { gov: 'الإسكندرية', ar: 'سبورتج', en: 'Sportch' },
        { gov: 'الإسكندرية', ar: 'ستانلي', en: 'Stanley' },
        { gov: 'الإسكندرية', ar: 'سموحة', en: 'Smoha' },
        { gov: 'الإسكندرية', ar: 'سيدي بشر', en: 'Sidi Bishr' },
        { gov: 'الإسكندرية', ar: 'سيدي جابر', en: 'Sidi Gaber' },
        { gov: 'الإسكندرية', ar: 'شدس', en: 'Sheds' },
        { gov: 'الإسكندرية', ar: 'فلمنج', en: 'Fleming' },
        { gov: 'الإسكندرية', ar: 'فيكتوريا', en: 'Victoria' },
        { gov: 'الإسكندرية', ar: 'كامب شيزار', en: 'Camp Caesar' },
        { gov: 'الإسكندرية', ar: 'كفر عبدو', en: 'Kafr Abdo' },
        { gov: 'الإسكندرية', ar: 'كليوباترا', en: 'Cleopatra' },
        { gov: 'الإسكندرية', ar: 'لوران', en: 'Laurent' },
        { gov: 'الإسكندرية', ar: 'محرم بك', en: 'Moharam Bek' },
        { gov: 'الإسكندرية', ar: 'محطة الرمل', en: 'Raml Station' },
        { gov: 'الإسكندرية', ar: 'ميامي', en: 'Miami' },
        // الإسماعيلية
        { gov: 'الإسماعيلية', ar: 'أبو صوير', en: 'Abu Swair' },
        { gov: 'الإسماعيلية', ar: 'التل الكبير', en: 'Al-Tell Al-Kabir' },
        { gov: 'الإسماعيلية', ar: 'القصاصين', en: 'Al-Qassasin' },
        { gov: 'الإسماعيلية', ar: 'القنطرة شرق', en: 'Qantara East' },
        { gov: 'الإسماعيلية', ar: 'القنطرة غرب', en: 'Qantara West' },
        { gov: 'الإسماعيلية', ar: 'فايد', en: 'Fayed' },
        { gov: 'الإسماعيلية', ar: 'مدينة الإسماعيلية', en: 'Ismailia City' },
        // البحر الأحمر
        { gov: 'البحر الأحمر', ar: 'الجونة', en: 'El Gouna' },
        { gov: 'البحر الأحمر', ar: 'الغردقة', en: 'Hurghada' },
        { gov: 'البحر الأحمر', ar: 'القصير', en: 'Al-Quseir' },
        { gov: 'البحر الأحمر', ar: 'برنيس', en: 'Berenice' },
        { gov: 'البحر الأحمر', ar: 'رأس غارب', en: 'Ras Gharib' },
        { gov: 'البحر الأحمر', ar: 'سفاجا', en: 'Safaga' },
        { gov: 'البحر الأحمر', ar: 'سهل حشيش', en: 'Sahl Hasheesh' },
        { gov: 'البحر الأحمر', ar: 'شلاتين', en: 'Shalateen' },
        { gov: 'البحر الأحمر', ar: 'مدينة حلايب', en: 'Halayeb City' },
        { gov: 'البحر الأحمر', ar: 'مرسى علم', en: 'Marsa Alam' },
        // البحيرة
        { gov: 'البحيرة', ar: 'أبو المطامير', en: 'Abu Al-Mutamair' },
        { gov: 'البحيرة', ar: 'أبو حمص', en: 'Abu Homs' },
        { gov: 'البحيرة', ar: 'إدكو', en: 'Edku' },
        { gov: 'البحيرة', ar: 'إيتاي البارود', en: 'Itay El Barud' },
        { gov: 'البحيرة', ar: 'الدلنجات', en: 'Al-Delengat' },
        { gov: 'البحيرة', ar: 'الرحمانية', en: 'Al-Rahmaniya' },
        { gov: 'البحيرة', ar: 'المحمودية', en: 'Al-Mahmudiya' },
        { gov: 'البحيرة', ar: 'النوبارية', en: 'El Nubaria' },
        { gov: 'البحيرة', ar: 'حوش عيسى', en: 'Housh Eissa' },
        { gov: 'البحيرة', ar: 'دمنهور', en: 'Damanhur' },
        { gov: 'البحيرة', ar: 'رشيد', en: 'Rosetta' },
        { gov: 'البحيرة', ar: 'شبراخيت', en: 'Shubrakhit' },
        { gov: 'البحيرة', ar: 'كفر الدوار', en: 'Kafr El Dawar' },
        { gov: 'البحيرة', ar: 'كوم حمادة', en: 'Kom Hamada' },
        { gov: 'البحيرة', ar: 'مركز بدر', en: 'Badr Center' },
        { gov: 'البحيرة', ar: 'وادي النطرون', en: 'Wadi El-Natrun' },
        // الجيزة
        { gov: 'الجيزة', ar: '6 اكتوبر', en: '6 October' },
        { gov: 'الجيزة', ar: 'أبو رواش', en: 'Abu Rawash' },
        { gov: 'الجيزة', ar: 'أرض اللواء', en: 'Ard El-Liwa' },
        { gov: 'الجيزة', ar: 'أوسيم', en: 'Ausim' },
        { gov: 'الجيزة', ar: 'إمبابة', en: 'Imbaba' },
        { gov: 'الجيزة', ar: 'البدرشين', en: 'Al-Badrasheen' },
        { gov: 'الجيزة', ar: 'البراجيل', en: 'Al-Barageel' },
        { gov: 'الجيزة', ar: 'الحوامدية', en: 'Al-Hawamdiya' },
        { gov: 'الجيزة', ar: 'الدقي', en: 'Dokki' },
        { gov: 'الجيزة', ar: 'الرماية', en: 'Al-Ramaya' },
        { gov: 'الجيزة', ar: 'الشيخ زايد', en: 'Sheikh Zayed' },
        { gov: 'الجيزة', ar: 'الصحفيين', en: 'Al-Sahafiyeen' },
        { gov: 'الجيزة', ar: 'الصف', en: 'Al-Saff' },
        { gov: 'الجيزة', ar: 'العجوزة', en: 'El-Agouza' },
        { gov: 'الجيزة', ar: 'العزيزية', en: 'Al-Aziza' },
        { gov: 'الجيزة', ar: 'العمرانية', en: 'El-Omraniya' },
        { gov: 'الجيزة', ar: 'العياط', en: 'El-Ayat' },
        { gov: 'الجيزة', ar: 'الكيت كات', en: 'Kit Kat' },
        { gov: 'الجيزة', ar: 'المريوطية', en: 'Al-Mariotiya' },
        { gov: 'الجيزة', ar: 'المنصورية', en: 'Al-Mansuriya' },
        { gov: 'الجيزة', ar: 'المنيب', en: 'Al-Moneib' },
        { gov: 'الجيزة', ar: 'المهندسين', en: 'Mohandessin' },
        { gov: 'الجيزة', ar: 'الهرم', en: 'Haram' },
        { gov: 'الجيزة', ar: 'الوراق', en: 'El-Warraq' },
        { gov: 'الجيزة', ar: 'بشتيل', en: 'Bashtil' },
        { gov: 'الجيزة', ar: 'بولاق الدكرور', en: 'Bulaq El-Dakror' },
        { gov: 'الجيزة', ar: 'ترسا', en: 'Tersa' },
        { gov: 'الجيزة', ar: 'جزيرة الدهب', en: 'Jazeera Al-Dahab' },
        { gov: 'الجيزة', ar: 'حدائق 6 أكتوبر', en: 'Gardens of October 6' },
        { gov: 'الجيزة', ar: 'حدائق الأهرام', en: 'Pyramids Gardens' },
        { gov: 'الجيزة', ar: 'حي الجيزة', en: 'Giza District' },
        { gov: 'الجيزة', ar: 'دهشور', en: 'Dahshur' },
        { gov: 'الجيزة', ar: 'سفط', en: 'Safat' },
        { gov: 'الجيزة', ar: 'سوميد', en: 'Sumed' },
        { gov: 'الجيزة', ar: 'فيصل', en: 'Faisal' },
        { gov: 'الجيزة', ar: 'كرداسة', en: 'Kardasa' },
        { gov: 'الجيزة', ar: 'كفر طهرمس', en: 'Kafr Tahrmis' },
        { gov: 'الجيزة', ar: 'مركز الجيزة', en: 'Giza Center' },
        { gov: 'الجيزة', ar: 'ميت عقبة', en: 'Mit Aqba' },
        { gov: 'الجيزة', ar: 'ناهيا', en: 'Nahia' },
        // الدقهلية
        { gov: 'الدقهلية', ar: 'أجا', en: 'Aja' },
        { gov: 'الدقهلية', ar: 'أخطاب', en: 'Akhtab' },
        { gov: 'الدقهلية', ar: 'الجمالية', en: 'Al-Gamaliya' },
        { gov: 'الدقهلية', ar: 'السنبلاوي', en: 'Al-Senblawy' },
        { gov: 'الدقهلية', ar: 'المطرية', en: 'Al-Matariya' },
        { gov: 'الدقهلية', ar: 'المنزلة', en: 'Al-Mansoura' },
        { gov: 'الدقهلية', ar: 'المنصورة', en: 'Mansoura' },
        { gov: 'الدقهلية', ar: 'بلقاس', en: 'Bilqas' },
        { gov: 'الدقهلية', ar: 'بنروه', en: 'Banroh' },
        { gov: 'الدقهلية', ar: 'بني عبيد', en: 'Bani Obaid' },
        { gov: 'الدقهلية', ar: 'تمى الامديد', en: 'Tummy El-Amdid' },
        { gov: 'الدقهلية', ar: 'جمصة', en: 'Gamasa' },
        { gov: 'الدقهلية', ar: 'دكرنس', en: 'Dekernes' },
        { gov: 'الدقهلية', ar: 'شربين', en: 'Sharbin' },
        { gov: 'الدقهلية', ar: 'طلخا', en: 'Talha' },
        { gov: 'الدقهلية', ar: 'مدينة النصر', en: 'Al-Nasr City' },
        { gov: 'الدقهلية', ar: 'ميت سلسيل', en: 'Mit Selsil' },
        { gov: 'الدقهلية', ar: 'ميت غمر', en: 'Mit Ghamr' },
        // السويس
        { gov: 'السويس', ar: 'العين السخنة', en: 'Ain El-Sokhna' },
        { gov: 'السويس', ar: 'حي الأربعين', en: 'Al-Arba\'een District' },
        { gov: 'السويس', ar: 'حي الجناين', en: 'Al-Janayen District' },
        { gov: 'السويس', ar: 'حي السويس', en: 'Suez District' },
        { gov: 'السويس', ar: 'حي عتاقة', en: 'Attaka District' },
        { gov: 'السويس', ar: 'فيصل', en: 'Faisal' },
        // الشرقية
        { gov: 'الشرقية', ar: 'أبو حماد', en: 'Abu Hammad' },
        { gov: 'الشرقية', ar: 'أبو كبير', en: 'Abu Kabir' },
        { gov: 'الشرقية', ar: 'أولاد صقر', en: 'Awlad Seqer' },
        { gov: 'الشرقية', ar: 'الإبراهيمية', en: 'Al-Ibrahimiya' },
        { gov: 'الشرقية', ar: 'الحسينية', en: 'Al-Husaynia' },
        { gov: 'الشرقية', ar: 'الزقازيق', en: 'Zagazig' },
        { gov: 'الشرقية', ar: 'الصالحية الجديدة', en: 'New El-Salhia' },
        { gov: 'الشرقية', ar: 'العاشر من رمضان', en: 'Tenth of Ramadan' },
        { gov: 'الشرقية', ar: 'القرين', en: 'Al-Qarine' },
        { gov: 'الشرقية', ar: 'القنايات', en: 'Al-Qanayat' },
        { gov: 'الشرقية', ar: 'بلبيس', en: 'Bilbeis' },
        { gov: 'الشرقية', ar: 'ديرب نجم', en: 'Dirab Negm' },
        { gov: 'الشرقية', ar: 'فاقوس', en: 'Faqous' },
        { gov: 'الشرقية', ar: 'كفر صقر', en: 'Kafr Seqer' },
        { gov: 'الشرقية', ar: 'مشتول السوق', en: 'Mashtul El-Souq' },
        { gov: 'الشرقية', ar: 'منيا القمح', en: 'Minya El-Qamh' },
        { gov: 'الشرقية', ar: 'ههيا', en: 'Hihya' },
        // الغربية
        { gov: 'الغربية', ar: 'السنطة', en: 'Al-Santa' },
        { gov: 'الغربية', ar: 'المحلة الكبرى', en: 'El-Mahalla El-Kubra' },
        { gov: 'الغربية', ar: 'بسيون', en: 'Basion' },
        { gov: 'الغربية', ar: 'زفتى', en: 'Zifta' },
        { gov: 'الغربية', ar: 'سمنود', en: 'Samanud' },
        { gov: 'الغربية', ar: 'طنطا', en: 'Tanta' },
        { gov: 'الغربية', ar: 'قطور', en: 'Qator' },
        { gov: 'الغربية', ar: 'كفر الزيات', en: 'Kafr El-Zayat' },
        // الفيوم
        { gov: 'الفيوم', ar: 'أطسا', en: 'Atsa' },
        { gov: 'الفيوم', ar: 'إبشواي', en: 'Ibshaway' },
        { gov: 'الفيوم', ar: 'الفيوم الجديدة', en: 'New Fayoum' },
        { gov: 'الفيوم', ar: 'سنورس', en: 'Sinors' },
        { gov: 'الفيوم', ar: 'طامية', en: 'Tamia' },
        { gov: 'الفيوم', ar: 'مدينة الفيوم', en: 'Fayoum City' },
        { gov: 'الفيوم', ar: 'يوسف الصديق', en: 'Yousif El-Seddik' },
        // القاهرة
        { gov: 'القاهرة', ar: 'التجمع الأول', en: 'First Compound' },
        { gov: 'القاهرة', ar: 'التجمع الخامس', en: 'New Cairo' },
        { gov: 'القاهرة', ar: 'الحلمية', en: 'Al-Helmeya' },
        { gov: 'القاهرة', ar: 'الزمالك', en: 'Zamalek' },
        { gov: 'القاهرة', ar: 'الزيتون', en: 'Al-Zeitoun' },
        { gov: 'القاهرة', ar: 'الساحل', en: 'Al-Sahel' },
        { gov: 'القاهرة', ar: 'السيدة زينب', en: 'Sayeda Zeinab' },
        { gov: 'القاهرة', ar: 'السيدة عائشة', en: 'Sayeda Aisha' },
        { gov: 'القاهرة', ar: 'العاشر من رمضان', en: 'Tenth of Ramadan' },
        { gov: 'القاهرة', ar: 'العاصمة الادارية الجديدة', en: 'New Administrative Capital' },
        { gov: 'القاهرة', ar: 'العباسية', en: 'Al-Abassia' },
        { gov: 'القاهرة', ar: 'العبور', en: 'El-Obour' },
        { gov: 'القاهرة', ar: 'القاهرة الجديدة', en: 'New Cairo' },
        { gov: 'القاهرة', ar: 'المرج', en: 'El-Marg' },
        { gov: 'القاهرة', ar: 'المطرية', en: 'Al-Matariya' },
        { gov: 'القاهرة', ar: 'المعادي', en: 'Maadi' },
        { gov: 'القاهرة', ar: 'المقطم', en: 'Mokattam' },
        { gov: 'القاهرة', ar: 'المنيل', en: 'El-Munira' },
        { gov: 'القاهرة', ar: 'الموسكي', en: 'Al-Mosky' },
        { gov: 'القاهرة', ar: 'النزهة', en: 'Al-Nozha' },
        { gov: 'القاهرة', ar: 'الوايلي', en: 'Al-Waili' },
        { gov: 'القاهرة', ar: 'باب الشعرية', en: 'Bab El-Shariya' },
        { gov: 'القاهرة', ar: 'حدائق القبة', en: 'Hadikat Al-Qubba' },
        { gov: 'القاهرة', ar: 'حدائق حلوان', en: 'Helwan Gardens' },
        { gov: 'القاهرة', ar: 'حلوان', en: 'Helwan' },
        { gov: 'القاهرة', ar: 'دار السلام', en: 'Dar El-Salam' },
        { gov: 'القاهرة', ar: 'رمسيس', en: 'Ramses' },
        { gov: 'القاهرة', ar: 'روض الفرج', en: 'Roud El-Farag' },
        { gov: 'القاهرة', ar: 'روكسي', en: 'Roxy' },
        { gov: 'القاهرة', ar: 'زهراء المعادي', en: 'Zahra Maadi' },
        { gov: 'القاهرة', ar: 'شبرا', en: 'Shubra' },
        { gov: 'القاهرة', ar: 'عابدين', en: 'Abidin' },
        { gov: 'القاهرة', ar: 'عزبة النخل', en: 'Ezbet El-Nakhl' },
        { gov: 'القاهرة', ar: 'عين شمس', en: 'Ain Shams' },
        { gov: 'القاهرة', ar: 'قصر النيل', en: 'Qasr El-Nile' },
        { gov: 'القاهرة', ar: 'مدينة 15 مايو', en: '15 May City' },
        { gov: 'القاهرة', ar: 'مدينة الرحاب', en: 'Al-Rehab City' },
        { gov: 'القاهرة', ar: 'مدينة السلام', en: 'Al-Salam City' },
        { gov: 'القاهرة', ar: 'مدينة الشروق', en: 'Al Shorouk City' },
        { gov: 'القاهرة', ar: 'مدينة بدر', en: 'Badr City' },
        { gov: 'القاهرة', ar: 'مدينة نصر', en: 'Nasr City' },
        { gov: 'القاهرة', ar: 'مدينتي', en: 'Madinet Misr' },
        { gov: 'القاهرة', ar: 'مصر الجديدة', en: 'Heliopolis' },
        { gov: 'القاهرة', ar: 'مصر القديمة', en: 'Old Cairo' },
        { gov: 'القاهرة', ar: 'وسط القاهرة', en: 'Downtown Cairo' },
        // القليوبية
        { gov: 'القليوبية', ar: 'الخانكة', en: 'Al-Khanka' },
        { gov: 'القليوبية', ar: 'الخصوص', en: 'El-Khosos' },
        { gov: 'القليوبية', ar: 'العبور', en: 'El-Obour' },
        { gov: 'القليوبية', ar: 'القناطر الخيرية', en: 'Al-Qanater Al-Khairiya' },
        { gov: 'القليوبية', ar: 'بنها', en: 'Banha' },
        { gov: 'القليوبية', ar: 'بهتيم', en: 'Bahtim' },
        { gov: 'القليوبية', ar: 'زاوية النجار', en: 'Zawia El-Naggar' },
        { gov: 'القليوبية', ar: 'شبرا الخيمة', en: 'Shubra El-Khayma' },
        { gov: 'القليوبية', ar: 'شبين القناطر', en: 'Shebin El-Qanater' },
        { gov: 'القليوبية', ar: 'طوخ', en: 'Tukh' },
        { gov: 'القليوبية', ar: 'قليوب', en: 'Qalyub' },
        { gov: 'القليوبية', ar: 'قها', en: 'Quha' },
        { gov: 'القليوبية', ar: 'كفر شكر', en: 'Kafr Shukr' },
        // المنوفية
        { gov: 'المنوفية', ar: 'أشمون', en: 'Ashmon' },
        { gov: 'المنوفية', ar: 'الباجور', en: 'Al-Bagour' },
        { gov: 'المنوفية', ar: 'السادات', en: 'El-Sadat' },
        { gov: 'المنوفية', ar: 'الشهداء', en: 'Al-Shuhada' },
        { gov: 'المنوفية', ar: 'بركة السبع', en: 'Birkat El-Sabe\'' },
        { gov: 'المنوفية', ar: 'تلا', en: 'Tala' },
        { gov: 'المنوفية', ar: 'سرس الليان', en: 'Sers El-Layan' },
        { gov: 'المنوفية', ar: 'شبين الكوم', en: 'Shebin El-Kom' },
        { gov: 'المنوفية', ar: 'قويسنا', en: 'Quesna' },
        { gov: 'المنوفية', ar: 'منوف', en: 'Menuf' },
        { gov: 'المنوفية', ar: 'ميت العز', en: 'Mit El-Ezzeh' },
        // المنيا
        { gov: 'المنيا', ar: 'أبو قرقاص', en: 'Abu Qurqas' },
        { gov: 'المنيا', ar: 'العدوة', en: 'El-Adwa' },
        { gov: 'المنيا', ar: 'المنيا الجديدة', en: 'New Minya' },
        { gov: 'المنيا', ar: 'بني مزار', en: 'Beni Mazar' },
        { gov: 'المنيا', ar: 'دير مواس', en: 'Deir Mawas' },
        { gov: 'المنيا', ar: 'سمالوط', en: 'Samalut' },
        { gov: 'المنيا', ar: 'مدينة المنيا', en: 'Minya City' },
        { gov: 'المنيا', ar: 'مطاي', en: 'Matay' },
        { gov: 'المنيا', ar: 'مغاغة', en: 'Mugagga' },
        { gov: 'المنيا', ar: 'ملوي', en: 'Mallawi' },
        // الوادي الجديد
        { gov: 'الوادي الجديد', ar: 'الخارجة', en: 'El-Kharga' },
        { gov: 'الوادي الجديد', ar: 'الداخلة', en: 'El-Dakla' },
        { gov: 'الوادي الجديد', ar: 'الفرافرة', en: 'El-Farafra' },
        { gov: 'الوادي الجديد', ar: 'باريس', en: 'Paris' },
        { gov: 'الوادي الجديد', ar: 'بلاط', en: 'Balat' },
        { gov: 'الوادي الجديد', ar: 'موط', en: 'Mut' },
        // بني سويف
        { gov: 'بني سويف', ar: 'إهناسيا', en: 'Ihnasia' },
        { gov: 'بني سويف', ar: 'الفشن', en: 'El-Fashn' },
        { gov: 'بني سويف', ar: 'الواسطي', en: 'El-Wasiti' },
        { gov: 'بني سويف', ar: 'ببا', en: 'Biba' },
        { gov: 'بني سويف', ar: 'بني سويف الجديدة', en: 'New Beni Suef' },
        { gov: 'بني سويف', ar: 'سمسطا', en: 'Somasta' },
        { gov: 'بني سويف', ar: 'مدينة بني سويف', en: 'Beni Suef City' },
        { gov: 'بني سويف', ar: 'ناصر', en: 'Nasser' },
        // بور سعيد
        { gov: 'بور سعيد', ar: 'حي الجنوب', en: 'South District' },
        { gov: 'بور سعيد', ar: 'حي الزهور', en: 'Al-Zohoor District' },
        { gov: 'بور سعيد', ar: 'حي الشرق', en: 'East District' },
        { gov: 'بور سعيد', ar: 'حي الضواحي', en: 'Suburbs District' },
        { gov: 'بور سعيد', ar: 'حي العرب', en: 'Arab District' },
        { gov: 'بور سعيد', ar: 'حي مناخ', en: 'Manakh District' },
        { gov: 'بور سعيد', ar: 'مدينة بور سعيد', en: 'Port Said City' },
        { gov: 'بور سعيد', ar: 'مدينة بور فؤاد', en: 'Port Fouad City' },
        // جنوب سيناء
        { gov: 'جنوب سيناء', ar: 'أبو رديس', en: 'Abu Rudeis' },
        { gov: 'جنوب سيناء', ar: 'أبو زنيمة', en: 'Abu Zenima' },
        { gov: 'جنوب سيناء', ar: 'الترابين', en: 'Tarbeen' },
        { gov: 'جنوب سيناء', ar: 'دهب', en: 'Dahab' },
        { gov: 'جنوب سيناء', ar: 'رأس سدر', en: 'Ras Sudr' },
        { gov: 'جنوب سيناء', ar: 'سانت كاترين', en: 'Saint Catherine' },
        { gov: 'جنوب سيناء', ar: 'شرم الشيخ', en: 'Sharm El-Sheikh' },
        { gov: 'جنوب سيناء', ar: 'طابا', en: 'Taba' },
        { gov: 'جنوب سيناء', ar: 'طور سيناء', en: 'Tor Sinai' },
        { gov: 'جنوب سيناء', ar: 'نويبع', en: 'Nuweiba' },
        // دمياط
        { gov: 'دمياط', ar: 'الباز', en: 'El-Baz' },
        { gov: 'دمياط', ar: 'الروضة', en: 'El-Roudah' },
        { gov: 'دمياط', ar: 'الزرقا', en: 'El-Zarqa' },
        { gov: 'دمياط', ar: 'السرو', en: 'El-Serw' },
        { gov: 'دمياط', ar: 'النواصرية', en: 'El-Nassriya' },
        { gov: 'دمياط', ar: 'دمياط الجديدة', en: 'New Damietta' },
        { gov: 'دمياط', ar: 'رأس البر', en: 'Ras El-Barr' },
        { gov: 'دمياط', ar: 'عزبة البرج', en: 'Ezbet El-Burj' },
        { gov: 'دمياط', ar: 'فارسكور', en: 'Faraskoor' },
        { gov: 'دمياط', ar: 'كحيل', en: 'Kahil' },
        { gov: 'دمياط', ar: 'كفر البطيخ', en: 'Kafr El-Batikh' },
        { gov: 'دمياط', ar: 'كفر سعد', en: 'Kafr Saad' },
        { gov: 'دمياط', ar: 'مدينة دمياط', en: 'Damietta City' },
        { gov: 'دمياط', ar: 'ميت أبو غالب', en: 'Mit Abu Galib' },
        // سوهاج
        { gov: 'سوهاج', ar: 'أخميم', en: 'Akhmim' },
        { gov: 'سوهاج', ar: 'البلينا', en: 'Bellina' },
        { gov: 'سوهاج', ar: 'العسيرات', en: 'El-Assirat' },
        { gov: 'سوهاج', ar: 'المراغة', en: 'El-Maragha' },
        { gov: 'سوهاج', ar: 'المنشاة', en: 'El-Monsha\'a' },
        { gov: 'سوهاج', ar: 'جرجا', en: 'Girga' },
        { gov: 'سوهاج', ar: 'جهينة', en: 'Jahina' },
        { gov: 'سوهاج', ar: 'دار السلام', en: 'Dar El-Salam' },
        { gov: 'سوهاج', ar: 'ساقتلة', en: 'Saqultah' },
        { gov: 'سوهاج', ar: 'طما', en: 'Tima' },
        { gov: 'سوهاج', ar: 'طهطا', en: 'Tahta' },
        { gov: 'سوهاج', ar: 'مدينة سوهاج', en: 'Sohag City' },
        // شمال سيناء
        { gov: 'شمال سيناء', ar: 'الحسنة', en: 'Al-Hasana' },
        { gov: 'شمال سيناء', ar: 'الشيخ زويد', en: 'Shaikh Zuwaid' },
        { gov: 'شمال سيناء', ar: 'العريش', en: 'El-Arish' },
        { gov: 'شمال سيناء', ar: 'بئر العبد', en: 'Bir El-Abd' },
        { gov: 'شمال سيناء', ar: 'رفح', en: 'Rafah' },
        { gov: 'شمال سيناء', ar: 'نخل', en: 'Nakhl' },
        // قنا
        { gov: 'قنا', ar: 'أبو تشت', en: 'Abu Tisht' },
        { gov: 'قنا', ar: 'الوقف', en: 'El-Waqf' },
        { gov: 'قنا', ar: 'شنا', en: 'Shna' },
        { gov: 'قنا', ar: 'فرشوط', en: 'Farshut' },
        { gov: 'قنا', ar: 'قفط', en: 'Qift' },
        { gov: 'قنا', ar: 'قوص', en: 'Qus' },
        { gov: 'قنا', ar: 'مدنية قنا', en: 'Qena City' },
        { gov: 'قنا', ar: 'نجع حمادي', en: 'Nag Hammadi' },
        { gov: 'قنا', ar: 'نقادة', en: 'Naqada' },
        // كفر الشيخ
        { gov: 'كفر الشيخ', ar: 'البرلس', en: 'Burullus' },
        { gov: 'كفر الشيخ', ar: 'الحامول', en: 'El-Hamool' },
        { gov: 'كفر الشيخ', ar: 'الرياض', en: 'El-Reyad' },
        { gov: 'كفر الشيخ', ar: 'بلطيم', en: 'Baltim' },
        { gov: 'كفر الشيخ', ar: 'بيلا', en: 'Bella' },
        { gov: 'كفر الشيخ', ar: 'دسوق', en: 'Desouq' },
        { gov: 'كفر الشيخ', ar: 'سيدي سالم', en: 'Sidi Salem' },
        { gov: 'كفر الشيخ', ar: 'فوه', en: 'Fowa' },
        { gov: 'كفر الشيخ', ar: 'قلين', en: 'Qallin' },
        { gov: 'كفر الشيخ', ar: 'مدنية كفر الشيخ', en: 'Kafr El-Sheikh City' },
        { gov: 'كفر الشيخ', ar: 'مسير', en: 'Mesir' },
        { gov: 'كفر الشيخ', ar: 'مطوبس', en: 'Metobas' },
        // مطروح
        { gov: 'مطروح', ar: 'الحمام', en: 'El-Hamam' },
        { gov: 'مطروح', ar: 'الساحل الشمالي', en: 'North Coast' },
        { gov: 'مطروح', ar: 'السلوم', en: 'Salloum' },
        { gov: 'مطروح', ar: 'الضبعة', en: 'Dab\'a' },
        { gov: 'مطروح', ar: 'العلمين', en: 'El Alamein' },
        { gov: 'مطروح', ar: 'النجيلة', en: 'El-Nagila' },
        { gov: 'مطروح', ar: 'سيدي براني', en: 'Sidi Barrani' },
        { gov: 'مطروح', ar: 'سيوة', en: 'Siwa' },
        { gov: 'مطروح', ar: 'مارينا العلمين', en: 'El Alamein Marina' },
        { gov: 'مطروح', ar: 'مرسى مطروح', en: 'Marsa Matruh' },
    ];

    const areaMap: Record<string, string> = {};
    let areaCount = 0;
    for (const a of areas) {
        try {
            const govId = govMap[a.gov];
            if (!govId) {
                console.warn(`⚠️  Skipping area (${a.gov}/${a.ar}): governorate not found`);
                continue;
            }

            const record = await prisma.area.upsert({
                where: {
                    governorateId_nameEn: {
                        governorateId: govId,
                        nameEn: a.en,
                    },
                },
                update: { nameAr: a.ar },
                create: {
                    nameAr: a.ar,
                    nameEn: a.en,
                    governorateId: govId,
                },
            });
            areaMap[`${a.gov}:${a.ar}`] = record.id;
            areaMap[`${a.gov}:${a.en}`] = record.id;
            areaCount++;
        } catch (error: any) {
            console.error(`❌ Error seeding area ${areaCount + 1} (${a.gov}/${a.ar}):`, error.message);
            throw error;
        }
    }
    console.log(`✅ ${areaCount} areas seeded`);

    const areaFor = (gov: string, area: string) => areaMap[`${gov}:${area}`] || null;

    // Helper data for generating diverse records
    const arabicNames = [
        { first: 'محمد', last: 'عبد الرحمن' },
        { first: 'أحمد', last: 'كمال الدين' },
        { first: 'عمر', last: 'حسن الجوهري' },
        { first: 'يوسف', last: 'إبراهيم السعيد' },
        { first: 'عبد الله', last: 'صابر' },
        { first: 'حسام الدين', last: 'رضا' },
        { first: 'علي', last: 'محمود' },
        { first: 'إبراهيم', last: 'الشريف' },
        { first: 'محمود', last: 'علي الدين' },
        { first: 'ياسر', last: 'صالح' },
        { first: 'سالم', last: 'العطار' },
        { first: 'خالد', last: 'الحسن' },
        { first: 'فايز', last: 'محمد' },
        { first: 'جمال', last: 'الدهيمي' },
        { first: 'مصطفى', last: 'الزهراني' },
        { first: 'رمضان', last: 'السيد' },
        { first: 'حسن', last: 'الخولي' },
        { first: 'صلاح', last: 'الجمال' },
        { first: 'كريم', last: 'الرفاعي' },
        { first: 'وليد', last: 'الشطي' },
        { first: 'نور', last: 'الدين' },
        { first: 'سعيد', last: 'العربي' },
        { first: 'طارق', last: 'السلمي' },
        { first: 'هاني', last: 'الشناوي' },
        { first: 'بشير', last: 'القاضي' },
    ];

    const mosqueNames = [
        'مسجد السيدة زينب', 'مسجد النور', 'مسجد الرحمة', 'مسجد الفتح',
        'مسجد بلال', 'مسجد المصطفى', 'مسجد عمر بن الخطاب', 'مسجد الإخلاص',
        'مسجد السلام', 'مسجد التوبة', 'مسجد النساء', 'مسجد الحصار',
        'مسجد القدس', 'مسجد الحمراء', 'مسجد الصفا', 'مسجد قباء',
        'مسجد المعراج', 'مسجد الهجرة', 'مسجد الإيمان', 'مسجد النجاح',
        'مسجد الشرح', 'مسجد الهدى', 'مسجد الراية', 'مسجد الأمانة',
        'مسجد السند', 'مسجد الجود', 'مسجد القيمة', 'مسجد الفضل',
        'مسجد الرايات', 'مسجد الغفران', 'مسجد الأنوار', 'مسجد السراج',
        'مسجد النجم', 'مسجد القمر', 'مسجد الشمس', 'مسجد الأرز',
        'مسجد الزيتون', 'مسجد الرومان', 'مسجد التمر', 'مسجد الحب',
        'مسجد الود', 'مسجد السلفة', 'مسجد التقوى', 'مسجد الخير',
        'مسجد البركة', 'مسجد الرزق', 'مسجد النعمة', 'مسجد الحكمة',
        'مسجد الإصلاح', 'مسجد التعاون',
    ];

    const maintenanceDescriptions = [
        'تجديد السجاد - المساحة ٢٠٠ م²',
        'تكييف المصلى الرئيسي لخدمة ٣٠٠ مصلٍّ',
        'إصلاح شبكة السباكة الداخلية لدورات المياه',
        'دهان وتجديد الواجهة الخارجية والجدران الداخلية',
        'تجديد كامل منظومة الإنارة والكهرباء',
        'توسعة المصلى بطابق ثانٍ',
        'إصلاح السقف والتسربات المائية',
        'تجديد أبواب وشبابيك المسجد',
        'تنظيف وعزل الخزانات المائية',
        'صيانة شرائط التحفيف والمراوح',
        'إعادة تصميم داخلي للمنطقة النسائية',
        'تركيب نظام صوي بجودة عالية',
        'إصلاح التهوية والتكييف المركزي',
        'تجديد الأدوات السنية وأرضيات دورات المياه',
        'عزل حراري للمصلى',
        'تركيب إضاءة LED موفرة للطاقة',
        'إعادة بناء منطقة وضوء درجة أولى',
        'صيانة نوافذ الحديد والكاسات',
        'إعادة تخطيط الممرات والمخارج',
        'تجديد أسقف معلقة وتكسيات جديدة',
        'صيانة شاملة لنظام الصرف الصحي',
        'إعادة رسم الجدران وتركيب لوحات تذهب',
        'تركيب أجهزة إطفاء الحريق والأمان',
        'تجديد وعزل الأساسات والجدران الخارجية',
        'صيانة الأرضيات والسيراميك المتضرر',
    ];

    const maintenanceTypes = [
        [MaintenanceType.Carpentry],
        [MaintenanceType.AC_Repair],
        [MaintenanceType.Plumbing],
        [MaintenanceType.Painting],
        [MaintenanceType.Electrical],
        [MaintenanceType.Other],
        [MaintenanceType.Carpentry, MaintenanceType.Painting],
        [MaintenanceType.AC_Repair, MaintenanceType.Electrical],
        [MaintenanceType.Plumbing, MaintenanceType.Electrical],
        [MaintenanceType.Painting, MaintenanceType.Carpentry],
    ];

    const circleNames = [
        'حلقة نور العلم', 'حلقة السيدات للتحفيظ', 'حلقة الإخوة للرجال',
        'حلقة الصغار المميزة', 'حلقة القراءات العشر', 'حلقة أمهات المؤمنين',
        'حلقة الشباب الواعي', 'حلقة رياض الجنة', 'حلقة السنة النبوية',
        'حلقة أساسيات الإسلام', 'حلقة الفقه الإسلامي', 'حلقة التفسير المميز',
        'حلقة التجويد للجميع', 'حلقة الحديث الشريف', 'حلقة العقيدة السلفية',
        'حلقة الدعوة والتوعية', 'حلقة الأخلاق والآداب', 'حلقة تربية الأطفال',
        'حلقة إعادة التأهيل', 'حلقة الإمامة والخطابة', 'حلقة الحفاظ',
        'حلقة التطبيق العملي', 'حلقة السيرة النبوية', 'حلقة أحكام الصلاة',
        'حلقة أحكام زكاة', 'حلقة أحكام الصيام', 'حلقة أحكام الحج',
        'حلقة دروس الجمعة', 'حلقة المسابقات القرآنية', 'حلقة المتقدمين',
        'حلقة الأساسيين', 'حلقة المبتدئين', 'حلقة الشباب المتدين',
        'حلقة كبار السن', 'حلقة الموظفين', 'حلقة الطلاب',
        'حلقة العاملين', 'حلقة الأساتذة', 'حلقة الأطباء',
        'حلقة المهندسين', 'حلقة الفنانين', 'حلقة الصانعين',
        'حلقة التجار', 'حلقة الفلاحين', 'حلقة الحرفيين',
        'حلقة الباعة', 'حلقة الموصيين',
    ];

    // Geographic distribution for coordinates
    const cityCoordinates: Record<string, [number, number]> = {
        'القاهرة': [30.0444, 31.2357],
        'الجيزة': [30.0131, 31.2089],
        'الإسكندرية': [31.2001, 29.9187],
        'الدقهلية': [31.04, 31.37],
        'الشرقية': [30.58, 31.51],
        'البحيرة': [31.03, 30.47],
        'المنيا': [28.1198, 30.7381],
        'بني سويف': [29.0711, 31.1075],
        'الغربية': [30.6815, 31.0226],
        'المنوفية': [30.5047, 31.1499],
    };

    // Seed Imams (50 items)
    const imams = [];
    const availableAreas = Object.values(areaMap).filter((value, index, self) => self.indexOf(value) === index).map(areaId => ({ areaId }));
    const statuses = [SubmissionStatus.approved, SubmissionStatus.pending, SubmissionStatus.approved, SubmissionStatus.approved];
    
    for (let i = 0; i < 50; i++) {
        const nameIdx = i % arabicNames.length;
        const mosqueIdx = i % mosqueNames.length;
        const areaIdx = i % availableAreas.length;
        const statusIdx = i % statuses.length;
        const area = availableAreas[areaIdx];
        
        const coords = cityCoordinates['القاهرة']; // Default coords
        const baseLat = coords[0] + (Math.random() - 0.5) * 0.5;
        const baseLng = coords[1] + (Math.random() - 0.5) * 0.5;

        imams.push({
            imamName: `الشيخ ${arabicNames[nameIdx]?.first || 'محمد'} ${arabicNames[nameIdx]?.last || 'السعيد'}`,
            mosqueName: mosqueNames[mosqueIdx] || 'مسجد جديد',
            governorate: 'القاهرة',
            city: 'القاهرة',
            district: `منطقة-${i + 1}`,
            areaId: area.areaId,
            latitude: baseLat,
            longitude: baseLng,
            googleMapsUrl: toMapUrl(baseLat, baseLng),
            videoUrl: i % 3 === 0 ? 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' : undefined,
            whatsapp: `+201${String(i + 1).padStart(10, '0')}`,
            status: statuses[statusIdx] || SubmissionStatus.approved,
            adminId: statuses[statusIdx] === SubmissionStatus.approved ? superAdmin.id : undefined,
        });
    }

    console.log(`📝 Starting to seed ${imams.length} imams...`);
    let imamCount = 0;
    for (const imam of imams) {
        try {
            const { areaId, adminId, ...imamData } = imam;
            await prisma.imam.create({
                data: {
                    ...imamData,
                    ...(areaId ? { area: { connect: { id: areaId } } } : {}),
                    ...(adminId ? { admin: { connect: { id: adminId } } } : {}),
                },
            });
            imamCount++;
        } catch (error: any) {
            console.error(`❌ Error seeding imam ${imamCount + 1}:`, error.message);
            break;
        }
    }
    console.log(`✅ ${imamCount} imams seeded`);

    // Seed Halaqat (50 items) - with online support
    const halaqat = [];
    const halqaTypes = [HalqaType.children, HalqaType.men, HalqaType.women];
    const onlinePlatforms = [
        'https://zoom.us/meeting/123456789',
        'https://meet.google.com/abc-defg-hij',
        'https://discord.gg/qareeb',
    ];

    for (let i = 0; i < 50; i++) {
        const circleIdx = i % circleNames.length;
        const mosqueIdx = i % mosqueNames.length;
        const areaIdx = i % availableAreas.length;
        const statusIdx = i % statuses.length;
        const typeIdx = i % halqaTypes.length;
        const area = availableAreas[areaIdx];

        // Make every 3rd halqa online
        const isOnline = i % 3 === 0;
        const platformIdx = i % onlinePlatforms.length;

        const coords = cityCoordinates['القاهرة'];
        const baseLat = coords[0] + (Math.random() - 0.5) * 0.5;
        const baseLng = coords[1] + (Math.random() - 0.5) * 0.5;

        halaqat.push({
            circleName: circleNames[circleIdx] || 'حلقة جديدة',
            mosqueName: mosqueNames[mosqueIdx] || 'مسجد جديد',
            halqaType: halqaTypes[typeIdx] || HalqaType.children,
            governorate: 'القاهرة',
            city: 'القاهرة',
            district: `منطقة-${i + 1}`,
            areaId: area.areaId,
            latitude: baseLat,
            longitude: baseLng,
            googleMapsUrl: toMapUrl(baseLat, baseLng),
            videoUrl: i % 2 === 0 ? 'https://www.youtube.com/watch?v=J---aiyznGQ' : undefined,
            whatsapp: `+201${String(i + 101).padStart(10, '0')}`,
            additionalInfo: `الدرس كل أسبوع يوم ${['السبت', 'الأحد', 'الاثنين', 'الثلاثاء'][i % 4]}`,
            status: statuses[statusIdx] || SubmissionStatus.approved,
            adminId: statuses[statusIdx] === SubmissionStatus.approved ? superAdmin.id : undefined,
            isOnline,
            onlineLink: isOnline ? `${onlinePlatforms[platformIdx]}?id=${i}` : null,
        });
    }

    let halqaCount = 0;
    for (const halqa of halaqat) {
        try {
            const { areaId, adminId, ...halqaData } = halqa;
            await prisma.halqa.create({
                data: {
                    ...halqaData,
                    ...(areaId ? { area: { connect: { id: areaId } } } : {}),
                    ...(adminId ? { admin: { connect: { id: adminId } } } : {}),
                },
            });
            halqaCount++;
        } catch (error: any) {
            console.error(`❌ Error seeding halqa ${halqaCount + 1}:`, error.message);
            break;
        }
    }
    console.log(`✅ ${halqaCount} halaqat seeded (${Math.floor(halqaCount / 3)} online)`);

    // Seed Maintenance Requests (50 items)
    const maintenance = [];
    
    for (let i = 0; i < 50; i++) {
        const mosqueIdx = i % mosqueNames.length;
        const areaIdx = i % availableAreas.length;
        const statusIdx = i % statuses.length;
        const descIdx = i % maintenanceDescriptions.length;
        const typeIdx = i % maintenanceTypes.length;
        const area = availableAreas[areaIdx];
        
        const coords = cityCoordinates['القاهرة'];
        const baseLat = coords[0] + (Math.random() - 0.5) * 0.5;
        const baseLng = coords[1] + (Math.random() - 0.5) * 0.5;
        
        const baseCost = 5000 + (i * 1000);

        maintenance.push({
            mosqueName: mosqueNames[mosqueIdx] || 'مسجد جديد',
            governorate: 'القاهرة',
            city: 'القاهرة',
            district: `منطقة-${i + 1}`,
            areaId: area.areaId,
            latitude: baseLat,
            longitude: baseLng,
            googleMapsUrl: toMapUrl(baseLat, baseLng),
            maintenanceTypes: maintenanceTypes[typeIdx] || [MaintenanceType.Other],
            description: maintenanceDescriptions[descIdx] || 'صيانة عامة وتحسينات',
            estimatedCostMin: baseCost,
            estimatedCostMax: baseCost + 10000 + (i * 500),
            whatsapp: `+201${String(i + 201).padStart(10, '0')}`,
            status: statuses[statusIdx] || SubmissionStatus.approved,
            adminId: statuses[statusIdx] === SubmissionStatus.approved ? superAdmin.id : undefined,
        });
    }

    let maintenanceCount = 0;
    for (const m of maintenance) {
        try {
            const { areaId, adminId, ...maintenanceData } = m;
            await prisma.maintenanceRequest.create({
                data: {
                    ...maintenanceData,
                    ...(areaId ? { area: { connect: { id: areaId } } } : {}),
                    ...(adminId ? { admin: { connect: { id: adminId } } } : {}),
                },
            });
            maintenanceCount++;
        } catch (error: any) {
            console.error(`❌ Error seeding maintenance ${maintenanceCount + 1}:`, error.message);
            break;
        }
    }
    console.log(`✅ ${maintenanceCount} maintenance requests seeded`);

    // Seed Improvements (24 items) for pagination/date filter tests
    const improvements = Array.from({ length: 24 }, (_, i) => {
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - i * 3);

        const statusesCycle = [
            ImprovementStatus.pending,
            ImprovementStatus.planned,
            ImprovementStatus.completed,
            ImprovementStatus.rejected,
        ];

        return {
            suggestionText: `اقتراح تحسين رقم ${i + 1}: تطوير تجربة المستخدم داخل لوحة التحكم مع تحسين الوضوح وسهولة الوصول للفلاتر.`,
            name: `${arabicNames[i % arabicNames.length]?.first || 'مستخدم'} ${arabicNames[i % arabicNames.length]?.last || `تجريبي-${i + 1}`}`,
            email: `improvement${i + 1}@qareeb.app`,
            status: statusesCycle[i % statusesCycle.length],
            internalNote: i % 2 === 0 ? `ملاحظة داخلية للاختبار رقم ${i + 1}` : null,
            createdAt,
        };
    });

    await prisma.improvement.createMany({ data: improvements });
    console.log(`✅ ${improvements.length} improvements seeded`);

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
