import { ChevronDown } from 'lucide-react';

const FAQAccordionItem = ({ item, isOpen, onToggle }) => {
    return (
        <div className="border-b border-gray-200 last:border-0">
            <button
                onClick={onToggle}
                className="w-full py-6 flex items-center justify-between gap-4 text-left group focus:outline-none"
                aria-expanded={isOpen}
            >
                <span className={`text-lg font-medium transition-colors duration-200 ${isOpen ? 'text-indigo-600' : 'text-gray-900 group-hover:text-indigo-600'
                    }`}>
                    {item.q}
                </span>
                <span className={`flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'
                    }`}>
                    <ChevronDown className={`h-5 w-5 ${isOpen ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600'
                        }`} />
                </span>
            </button>

            <div
                className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 pb-6' : 'grid-rows-[0fr] opacity-0 pb-0'
                    }`}
            >
                <div className="overflow-hidden">
                    <p className="text-gray-600 leading-relaxed">
                        {item.a}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FAQAccordionItem;
