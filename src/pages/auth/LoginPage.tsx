import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogIn, AlertCircle, KeyRound, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // 2FA & Verification States
  const [show2FA, setShow2FA] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [tempUserId, setTempUserId] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  
  const { login, verify2FA, verifyEmail } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      const res = await login(email, password);
      if (res && res.require2FA) {
        setShow2FA(true);
        setTempUserId(res.userId || '');
        setIsLoading(false);
      } else if (res && res.requiresVerification) {
        setShowVerification(true);
        setTempUserId(res.userId || '');
        setVerificationEmail(res.email || '');
        setIsLoading(false);
      } else {
        const userRole = res?.role || 'entrepreneur';
        if (userRole === 'admin') {
          navigate('/dashboard/admin');
        } else if (userRole === 'investor') {
          navigate('/dashboard/investor');
        } else {
          navigate('/dashboard/entrepreneur');
        }
      }
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      const res = await verify2FA(tempUserId, otpCode);
      const userRole = res?.role || 'entrepreneur';
      if (userRole === 'admin') {
        navigate('/dashboard/admin');
      } else if (userRole === 'investor') {
        navigate('/dashboard/investor');
      } else {
        navigate('/dashboard/entrepreneur');
      }
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      const res = await verifyEmail(tempUserId, otpCode);
      const userRole = res?.role || 'entrepreneur';
      if (userRole === 'admin') {
        navigate('/dashboard/admin');
      } else if (userRole === 'investor') {
        navigate('/dashboard/investor');
      } else {
        navigate('/dashboard/entrepreneur');
      }
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
    }
  };

  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-primary-600 rounded-md flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
              <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 21V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to Business Nexus
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Connect with investors and entrepreneurs
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-error-50 border border-error-500 text-error-700 px-4 py-3 rounded-md flex items-start">
              <AlertCircle size={18} className="mr-2 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          {show2FA ? (
            <form className="space-y-6" onSubmit={handleVerify2FA}>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Please enter the 6-digit verification code sent to your registered email address.
                </p>
                <Input
                  label="Verification Code"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                  fullWidth
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={() => setShow2FA(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  fullWidth
                  isLoading={isLoading}
                  leftIcon={<LogIn size={18} />}
                >
                  Verify Code
                </Button>
              </div>
            </form>
          ) : showVerification ? (
            <form className="space-y-6" onSubmit={handleVerifyEmail}>
              <div className="text-center mb-4">
                <CheckCircle2 size={48} className="mx-auto text-green-500 mb-2" />
                <p className="text-sm text-gray-600">
                  Please enter the 6-digit verification code sent to <strong>{verificationEmail}</strong>.
                </p>
              </div>

              <Input
                label="Verification OTP"
                type="text"
                maxLength={6}
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
                fullWidth
                startAdornment={<KeyRound size={18} />}
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={() => setShowVerification(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  fullWidth
                  isLoading={isLoading}
                >
                  Verify & Login
                </Button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>

              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
                startAdornment={<User size={18} />}
              />
              
              <div className="relative flex items-center">
                <div className="flex-grow">
                  <Input
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    fullWidth
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 bottom-2.5 mr-3 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <Link to="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
                    Forgot your password?
                  </Link>
                </div>
              </div>
              
              <Button
                type="submit"
                fullWidth
                isLoading={isLoading}
                leftIcon={<LogIn size={18} />}
              >
                Sign in
              </Button>
            </form>
          )}

          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>
            
            <div className="mt-2 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};