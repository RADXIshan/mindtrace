import { useState } from 'react';
import { HelpCircle, Mail, Phone, Search, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

const HelpSupport = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqs = [
    {
      question: 'How do I add a new contact to the system?',
      answer: 'Navigate to the Contacts page from the sidebar, click the "Add Contact" button, and fill in the required information including name, relationship, and contact details.'
    },
    {
      question: 'What happens when the SOS button is activated?',
      answer: 'When SOS is activated, the system immediately notifies all emergency contacts via SMS and call, shares the current location, and can optionally alert local emergency services based on your settings.'
    },
    {
      question: 'How do I set up reminders for medication?',
      answer: 'Go to the Reminders & Calendar page, click "New Reminder", select "Medication" as the type, set the time and frequency, and save. You\'ll receive notifications at the scheduled times.'
    },
    {
      question: 'Can I export interaction history data?',
      answer: 'Yes, go to Interaction History, click the menu icon, and select "Export Data". You can choose between PDF, CSV, or JSON formats.'
    },
    {
      question: 'How do I connect the smart glasses?',
      answer: 'Ensure Bluetooth is enabled on your device, turn on the glasses, go to Settings > Device Connection, and follow the pairing instructions.'
    },
    {
      question: 'What should I do if I forget my password?',
      answer: 'Click "Forgot Password" on the login page, enter your email address, and follow the reset instructions sent to your email.'
    },
    {
      question: 'How is my data protected?',
      answer: 'All data is encrypted end-to-end, stored securely on HIPAA-compliant servers, and never shared with third parties without your explicit consent.'
    },
    {
      question: 'Can multiple caregivers access the same account?',
      answer: 'Yes, you can invite additional caregivers from Settings > Team Management. Each caregiver will have their own login credentials.'
    }
  ];

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <HelpCircle className="h-10 w-10 text-gray-900" />
          Help & Support
        </h1>
        <p className="text-lg text-gray-600">
          Get answers and assistance when you need it
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 text-lg"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Contact Support */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Support</h3>
          <p className="text-gray-600 text-sm mb-4">
            Get help via email within 24 hours
          </p>
          <a href="mailto:support@mindtrace.com" className="text-purple-600 font-medium text-sm hover:text-purple-700 flex items-center gap-1">
            support@mindtrace.com
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
            <Phone className="h-6 w-6 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Phone Support</h3>
          <p className="text-gray-600 text-sm mb-4">
            Call us Monday-Friday, 9AM-6PM EST
          </p>
          <a href="tel:+15551234567" className="text-emerald-600 font-medium text-sm hover:text-emerald-700 flex items-center gap-1">
            (555) 123-4567
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* FAQs */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                  {expandedFaq === index ? (
                    <ChevronUp className="h-5 w-5 text-gray-600 shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-600 shrink-0" />
                  )}
                </button>
                {expandedFaq === index && (
                  <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-200">
                    <p className="text-gray-600">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <HelpCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No results found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <span className="text-gray-900 font-medium">API Services</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-emerald-600">Operational</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <span className="text-gray-900 font-medium">Smart Glasses Connection</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-emerald-600">Operational</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <span className="text-gray-900 font-medium">Notification System</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-emerald-600">Operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;
