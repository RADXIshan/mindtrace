import { useState, useLayoutEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import gsap from 'gsap';
import googleLogo from '../assets/google.png';

const Signup = () => {
  const containerRef = useRef(null);
  const formRef = useRef(null);
  const imageRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(imageRef.current, {
        x: -50,
        opacity: 0,
        duration: 1.2,
        ease: 'power3.out'
      });

      gsap.from(formRef.current.children, {
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        delay: 0.3,
        ease: 'power2.out'
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="max-h-screen flex bg-white">
      {/* Left Side - Visual */}
      <div className="hidden lg:flex w-1/2 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-bl from-indigo-900/40 to-purple-900/40 z-10" />
        <img 
          ref={imageRef}
          src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=2065&auto=format&fit=crop" 
          alt="AI Technology" 
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="relative z-20 m-auto text-center px-12">
          <h2 className="text-4xl font-bold text-white mb-6">Join the Future</h2>
          <p className="text-gray-300 text-lg max-w-md mx-auto">
            Experience the next generation of smart assistance. Create your account today.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24">
        <div ref={formRef} className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <p onClick={() => navigate('/')} className="cursor-pointer inline-block text-4xl font-bold text-gray-900 mb-2">MindTrace</p>
            <h1 className="text-3xl font-bold text-gray-900 mt-4">Create your account</h1>
            <p className="text-gray-600 mt-2">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      className="appearance-none block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <Eye className="h-5 w-5" />
                      ) : (
                        <EyeOff className="h-5 w-5" />
                      )}
                    </button>
                  </div>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="cursor-pointer h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                I agree to the{' '}
                <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Privacy Policy
                </a>
              </label>
            </div>

            <button
              type="submit"
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center gap-2">
                Create Account
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-linear-to-r from-gray-800 via-gray-700 to-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or sign up with</span>
              </div>
            </div>

            <div className="mt-6">
              <button className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-100 hover:border-gray-400 hover:text-gray-700 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]">
                <img src={googleLogo} alt="Google" className="h-5 w-5" />
                <span className="ml-2">Sign up with Google</span>
              </button>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default Signup;
