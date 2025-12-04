import { useRef, useEffect } from 'react';

const FAQCategoryTabs = ({ categories, activeCategory, onSelectCategory }) => {
    const tabsRef = useRef(null);

    // Scroll active tab into view on mobile
    useEffect(() => {
        if (tabsRef.current) {
            const activeTab = tabsRef.current.querySelector('[data-active="true"]');
            if (activeTab) {
                activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [activeCategory]);

    return (
        <div className="relative mb-12">
            <div
                ref={tabsRef}
                className="flex overflow-x-auto pb-4 gap-3 no-scrollbar snap-x snap-mandatory md:flex-wrap md:justify-center md:overflow-visible md:pb-0"
                role="tablist"
                aria-label="FAQ Categories"
            >
                {categories.map((category) => {
                    const isActive = activeCategory === category.id;
                    const Icon = category.icon;

                    return (
                        <button
                            key={category.id}
                            onClick={() => onSelectCategory(category.id)}
                            data-active={isActive}
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={`panel-${category.id}`}
                            className={`
                flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 snap-center
                ${isActive
                                    ? 'bg-gray-900 text-white shadow-lg scale-105'
                                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
                                }
              `}
                        >
                            <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-300' : 'text-gray-400'}`} />
                            {category.title}
                        </button>
                    );
                })}
            </div>

            {/* Gradient fade for mobile scroll indication */}
            <div className="absolute right-0 top-0 bottom-4 w-12 bg-linear-to-l from-gray-50 to-transparent pointer-events-none md:hidden" />
            <div className="absolute left-0 top-0 bottom-4 w-12 bg-linear-to-r from-gray-50 to-transparent pointer-events-none md:hidden" />
        </div>
    );
};

export default FAQCategoryTabs;
