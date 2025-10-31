import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '../../services/api';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

interface LoginFormData {
  email: string;
  password: string;
}

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError
  } = useForm<LoginFormData>();

  const loginMutation = useMutation(
    async (data: LoginFormData) => {
      const response = await authService.login(data.email, data.password);
      if (response.data) {
        localStorage.setItem('auth_token', response.data.token);
        return response.data;
      }
      throw new Error(response.message || 'Login failed');
    },
    {
      onSuccess: (data) => {
        toast.success('Login successful!');
        navigate('/dashboard');
      },
      onError: (error: any) => {
        const message = error.message || 'Login failed. Please try again.';
        toast.error(message);
        setError('root', { message });
      }
    }
  );

  const onSubmit = async (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="Enter your email"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          })}
        />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            error={errors.password?.message}
            {...register('password', {
              required: 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters'
              }
            })}
          />
          <button
            type="button"
            className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        {errors.root && (
          <div className="text-red-500 text-sm">{errors.root.message}</div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || loginMutation.isLoading}
        >
          {loginMutation.isLoading ? 'Logging in...' : 'Login'}
        </Button>
      </form>

      <div className="mt-4 text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <button
          onClick={() => navigate('/register')}
          className="text-blue-600 hover:underline"
        >
          Register
        </button>
      </div>
    </div>
  );
};
