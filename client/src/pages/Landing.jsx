import { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import FAQSection from '../components/FAQSection';
import { Brain, Mic, Eye, Shield, Clock, Zap, Heart, Users, Lock, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router';

const Landing = () => {
  const navigate = useNavigate();

  // Scroll to top on component mount and clear any hash fragments
  useEffect(() => {
    window.scrollTo(0, 0);
    // Remove hash from URL without triggering navigation
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section id="overview" className="pt-32 pb-20 px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-7xl lg:text-8xl font-bold text-gray-900 mb-8 tracking-tight leading-[1.1]">
            A new species of<br />smart glasses.
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            MindTrace integrates seamlessly with your Ray-Ban Meta to whisper names, reminders, and context directly into your ear.
          </p>
          <button onClick={() => navigate('/login')} className="bg-gray-900 text-white px-10 py-4 rounded-full hover:bg-gray-800 transition-all duration-300 font-medium text-lg shadow-lg hover:shadow-xl">
            Join the Waitlist
          </button>
        </div>
      </section>

      {/* Product Image Section */}
      <section className="py-20 px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="relative aspect-square md:aspect-video rounded-3xl overflow-hidden shadow-2xl group cursor-default">
            <img
              src="https://images.unsplash.com/photo-1592478411213-6153e4ebc07d?q=80&w=2912&auto=format&fit=crop"
              alt="Smart glasses technology"
              className="absolute inset-0 w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-80" />

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative bg-white/5 backdrop-blur-xl px-16 py-12 rounded-3xl border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.3)] overflow-hidden group-hover:bg-white/10 transition-all duration-500 hover:border-white/20">
                <div className="absolute inset-0 bg-linear-to-tr from-white/0 via-white/5 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />

                <div className="relative z-10 text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 mb-6 backdrop-blur-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    <span className="text-xs font-bold text-indigo-200 tracking-[0.2em] uppercase">System Online</span>
                  </div>
                  <h3 className="text-5xl md:text-7xl font-black text-white tracking-tighter drop-shadow-2xl mb-2">
                    Your External<br />
                    <span className="text-transparent bg-clip-text bg-linear-to-r from-white via-white to-white/70">Memory.</span>
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlight 1 */}
      <section className="py-32 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1">
            <div className="aspect-square bg-linear-to-br from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center">
              <Eye className="h-40 w-40 text-indigo-600" />
            </div>
          </div>
          <div className="feature-content order-1 md:order-2">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Never forget a face.
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed mb-8">
              MindTrace uses advanced visual recognition to identify people and objects instantly, whispering their names and relevant details directly into your ear.
            </p>
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <Zap className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Instant Recognition</h4>
                  <p className="text-gray-600">Identifies people in milliseconds</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <Lock className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Privacy First</h4>
                  <p className="text-gray-600">All data encrypted and stored locally</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlight 2 */}
      <section className="py-32 px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Whisper Assist.
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed mb-8">
              Get answers and assistance without ever looking at a screen. Simply ask, and MindTrace whispers back the information you need.
            </p>
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Mic className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Voice Activated</h4>
                  <p className="text-gray-600">Natural conversation with AI</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Brain className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Context Aware</h4>
                  <p className="text-gray-600">Understands your situation and needs</p>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="aspect-square bg-linear-to-br from-purple-100 to-pink-100 rounded-3xl flex items-center justify-center">
              <Mic className="h-40 w-40 text-purple-600" />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlight 3 */}
      <section className="py-32 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1">
            <div className="aspect-square bg-linear-to-br from-emerald-100 to-teal-100 rounded-3xl flex items-center justify-center">
              <Shield className="h-40 w-40 text-emerald-600" />
            </div>
          </div>
          <div className="feature-content order-1 md:order-2">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Safety Net.
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed mb-8">
              Automatic location sharing and emergency features provide peace of mind for you and your loved ones.
            </p>
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <Heart className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Emergency Mode</h4>
                  <p className="text-gray-600">Quick access to emergency contacts</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Location Sharing</h4>
                  <p className="text-gray-600">Share your location with trusted contacts</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Capabilities
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Supercharge your daily life with real-time AI assistance
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all hover:shadow-lg group">
              <div className="bg-indigo-100 text-indigo-600 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                <Eye className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Visual Recognition</h3>
              <p className="text-gray-600 leading-relaxed">Identifies people and objects instantly</p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all hover:shadow-lg group">
              <div className="bg-purple-100 text-purple-600 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                <Mic className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Voice Assistant</h3>
              <p className="text-gray-600 leading-relaxed">Get answers without looking at a screen</p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all hover:shadow-lg group">
              <div className="bg-emerald-100 text-emerald-600 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Safety Features</h3>
              <p className="text-gray-600 leading-relaxed">Automatic location sharing for peace of mind</p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all hover:shadow-lg group">
              <div className="bg-blue-100 text-blue-600 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                <Clock className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Smart Reminders</h3>
              <p className="text-gray-600 leading-relaxed">Never miss an important moment</p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all hover:shadow-lg group">
              <div className="bg-pink-100 text-pink-600 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                <Smartphone className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">App Integration</h3>
              <p className="text-gray-600 leading-relaxed">Seamlessly connects with your digital life</p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all hover:shadow-lg group">
              <div className="bg-gray-100 text-gray-600 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                <Lock className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Privacy First</h3>
              <p className="text-gray-600 leading-relaxed">End-to-end encryption and local storage</p>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Specifications */}
      <section id="support" className="py-32 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Technical Specifications
            </h2>
            <p className="text-xl text-gray-600">Everything you need to know</p>
          </div>

          <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
            {[
              { label: "Compatibility", value: "Ray-Ban Meta Smart Glasses" },
              { label: "Connectivity", value: "Bluetooth 5.2" },
              { label: "Battery Life", value: "Up to 12 hours" },
              { label: "Voice Recognition", value: "Multi-language support" },
              { label: "Storage", value: "Encrypted local storage" },
              { label: "Updates", value: "Over-the-air updates" },
              { label: "Platform", value: "iOS 15+ and Android 11+" },
              { label: "Privacy", value: "End-to-end encryption" }
            ].map((spec, index) => (
              <div key={index} className="flex justify-between items-center py-4 border-b border-gray-200">
                <span className="text-gray-600 font-medium">{spec.label}</span>
                <span className="text-gray-900 font-semibold text-right">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection />

      {/* CTA Section */}
      <section className="py-32 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center text-black">
          <h2 className="text-5xl md:text-6xl font-bold mb-8 leading-tight">
            Ready to upgrade<br />your memory?
          </h2>
          <p className="text-xl md:text-2xl mb-12 opacity-90 max-w-2xl mx-auto leading-relaxed">
            Join the waitlist today and be the first to experience MindTrace.
          </p>
          <button className="bg-gray-900 text-white px-12 py-5 rounded-full hover:bg-gray-800 transition-all duration-300 font-semibold text-lg shadow-2xl hover:shadow-3xl">
            Join the Waitlist
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
