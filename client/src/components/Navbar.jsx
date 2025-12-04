import { useState, useEffect } from 'react';
import { Menu, X, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMenuOpen]);

  const navLinks = [
    { name: 'Overview', href: '#overview' },
    { name: 'Features', href: '#features' },
    { name: 'Specs', href: '#support' },
    { name: 'FAQ', href: '#faq' },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 py-6 ${scrolled || isMenuOpen
          ? 'bg-white/50 backdrop-blur-md'
          : 'bg-transparent'
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <a href="#" className="flex items-center gap-2 group z-50 relative">
              <span className={`font-bold text-2xl tracking-tight transition-colors duration-300 ${isMenuOpen ? 'text-gray-900' : 'text-gray-900'
                }`}>
                MindTrace
              </span>
            </a>

            {/* Desktop Navigation */}
            <div className="max-md:hidden flex items-center gap-8">
              <div className="flex items-center gap-6">
                {navLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="text-md font-medium text-gray-600 hover:text-gray-900 transition-colors relative after:content-[''] after:absolute after:left-0 after:-bottom-1 after:w-full after:h-0.5 after:bg-gray-900 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300 after:origin-left"
                  >
                    {link.name}
                  </a>
                ))}
              </div>
              <button onClick={() => navigate('/login')} className="bg-gray-900 text-white px-6 py-2.5 rounded-full text-md font-medium hover:bg-gray-800 transition-all hover:shadow-lg duration-300">
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden relative z-50 p-2 -mr-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={() => setIsMenuOpen(false)}
      />

      {/* Mobile Menu Sidebar */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-[80%] max-w-sm bg-white z-40 shadow-2xl transform md:hidden flex flex-col transition-transform duration-500 ease-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex-1 px-8 pt-28 pb-8 flex flex-col gap-8">
          <div className="flex flex-col gap-6">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="text-2xl font-semibold text-gray-900 flex items-center justify-between group"
              >
                {link.name}
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </a>
            ))}
          </div>

          <div className="mt-auto">
            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <h4 className="font-semibold text-gray-900 mb-2">Ready to start?</h4>
              <p className="text-sm text-gray-500 mb-4">Join the waitlist and be the first to experience the future.</p>
              <button className="w-full bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-all shadow-lg flex items-center justify-center gap-2">
                Join Waitlist
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
