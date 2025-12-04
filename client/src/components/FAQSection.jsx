import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { faqData } from '../data/faqData';
import FAQCategoryTabs from './FAQCategoryTabs';
import FAQAccordion from './FAQAccordion';

const FAQSection = () => {
    const [activeCategoryId, setActiveCategoryId] = useState(faqData[0].id);

    const activeCategory = faqData.find(c => c.id === activeCategoryId) || faqData[0];

    return (
        <section id="faq" className="py-32 px-6 lg:px-8 bg-gray-50">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        Frequently Asked Questions
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Everything you need to know about MindTrace and how it helps.
                    </p>
                </div>

                <FAQCategoryTabs
                    categories={faqData}
                    activeCategory={activeCategoryId}
                    onSelectCategory={setActiveCategoryId}
                />

                <div
                    role="tabpanel"
                    id={`panel-${activeCategoryId}`}
                    aria-labelledby={`tab-${activeCategoryId}`}
                    className="min-h-[400px] transition-all duration-500 ease-in-out"
                >
                    <FAQAccordion items={activeCategory.questions} />
                </div>

                <div className="mt-12 text-center">
                    <p className="text-gray-600 mb-4">Still have questions?</p>
                    <a
                        href="mailto:support@mindtrace.ai"
                        className="inline-flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
                    >
                        <MessageCircle className="h-5 w-5" />
                        Contact Support
                    </a>
                </div>
            </div>
        </section>
    );
};

export default FAQSection;
