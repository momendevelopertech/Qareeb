import { getLocale } from 'next-intl/server';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FAB from '@/components/ui/FAB';
import ChatWidget from '@/components/chat/ChatWidget';
import HomeSearchBar from '@/components/search/HomeSearchBar';
import PublicCardsTabs from '@/components/public/PublicCardsTabs';

export const metadata = {
    title: 'Search | Qareeb',
    description: 'Search for imams, quran circles, and mosque maintenance projects in Egypt',
};

export default async function SearchPage() {
    const locale = await getLocale();

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 bg-gradient-to-br from-[#F0F9F4] via-[#FAF8F3] to-[#FFF9F0]">
                {/* Search Bar Section */}
                <section className="pt-12 px-4 pb-4">
                    <HomeSearchBar />
                </section>

                {/* Cards Grid Section */}
                <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <PublicCardsTabs />
                </section>
            </main>

            <Footer />
            <FAB />
            <ChatWidget />
        </div>
    );
}
