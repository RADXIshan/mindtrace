import { useState } from 'react';
import FAQAccordionItem from './FAQAccordionItem';

const FAQAccordion = ({ items }) => {
    const [openIndex, setOpenIndex] = useState(null);

    const handleToggle = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm px-6 md:px-8">
            {items.map((item, index) => (
                <FAQAccordionItem
                    key={index}
                    item={item}
                    isOpen={openIndex === index}
                    onToggle={() => handleToggle(index)}
                />
            ))}
        </div>
    );
};

export default FAQAccordion;
