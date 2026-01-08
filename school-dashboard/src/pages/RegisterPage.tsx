import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Mail, Lock, User, Phone, MapPin, Building } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    contactPerson: '',
    phoneNumber: '',
    city: '',
    state: '',
    country: 'Nigeria',
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (step === 1) {
      // Validate step 1
      if (!formData.name || !formData.email || !formData.password) {
        toast.error('Please fill in all required fields');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
      if (formData.password.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
      }
      setStep(2);
      return;
    }

    // Step 2 - Submit
    if (!formData.contactPerson) {
      toast.error('Contact person is required');
      return;
    }

    try {
      await register(formData);
      toast.success('School registered successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    }
  };

  return (
    <div className="h-screen bg-dark-300 flex overflow-hidden">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-8 mb-8">
              <img 
              src="/logo.png" 
              alt="MoneyQuest Logo" 
              className="w-[10%] h-full object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-white">MoneyQuest</h1>
              <p className="text-sm text-white/50">School Dashboard</p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex gap-2 mb-8">
            <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-primary-500' : 'bg-white/10'}`} />
            <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-primary-500' : 'bg-white/10'}`} />
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-white mb-2">
            {step === 1 ? 'Create an account' : 'School details'}
          </h2>
          <p className="text-white/50 mb-8">
            {step === 1
              ? 'Register your school to get started'
              : 'Tell us more about your school'}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {step === 1 ? (
              <>
                <Input
                  label="School Name"
                  type="text"
                  placeholder="Example High School"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  icon={<Building className="w-5 h-5" />}
                  required
                />

                <Input
                  label="Email address"
                  type="email"
                  placeholder="admin@school.edu"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  icon={<Mail className="w-5 h-5" />}
                  required
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  icon={<Lock className="w-5 h-5" />}
                  required
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  icon={<Lock className="w-5 h-5" />}
                  required
                />
              </>
            ) : (
              <>
                <Input
                  label="Contact Person"
                  type="text"
                  placeholder="Full name"
                  value={formData.contactPerson}
                  onChange={(e) => updateField('contactPerson', e.target.value)}
                  icon={<User className="w-5 h-5" />}
                  required
                />

                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="+234 XXX XXX XXXX"
                  value={formData.phoneNumber}
                  onChange={(e) => updateField('phoneNumber', e.target.value)}
                  icon={<Phone className="w-5 h-5" />}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="City"
                    type="text"
                    placeholder="Lagos"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    icon={<MapPin className="w-5 h-5" />}
                  />

                  <Input
                    label="State"
                    type="text"
                    placeholder="Lagos"
                    value={formData.state}
                    onChange={(e) => updateField('state', e.target.value)}
                  />
                </div>
              </>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              {step === 2 && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
              )}
              <Button
                type="submit"
                className="flex-1"
                size="lg"
                isLoading={isLoading}
              >
                {step === 1 ? 'Continue' : 'Create Account'}
              </Button>
            </div>
          </form>

          {/* Login link */}
          <p className="mt-8 text-center text-white/50">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-primary-500 hover:text-primary-400 font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Illustration */}
      <div className="hidden lg:flex flex-1 items-center justify-center overflow-hidden">
        <img 
          src="/register.jpg" 
          alt="Registration" 
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}
