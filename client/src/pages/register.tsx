import { useState } from 'react';
import { Link } from 'wouter';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import AuthLayout from '@/components/auth-layout';
import { insertUserSchema, type InsertUser } from '@shared/schema';

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const { register: authRegister } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      role: 'Student',
    },
  });

  const onSubmit = async (data: InsertUser) => {
    try {
      await authRegister(data);
      toast({
        title: "Welcome to SREC Connect!",
        description: "Your account has been created successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthLayout
      title="Join SREC Connect"
      subtitle="Create your account to get started"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter your full name"
            {...register('name')}
            data-testid="input-name"
          />
          {errors.name && (
            <p className="text-sm text-destructive" data-testid="text-name-error">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">SREC Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="your.name@srec.ac.in"
            {...register('email')}
            data-testid="input-email"
          />
          {errors.email && (
            <p className="text-sm text-destructive" data-testid="text-email-error">
              {errors.email.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Only @srec.ac.in email addresses are accepted
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
              {...register('password')}
              data-testid="input-password"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              data-testid="button-toggle-password"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {errors.password && (
            <p className="text-sm text-destructive" data-testid="text-password-error">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select onValueChange={(value) => setValue('role', value as 'Student' | 'Faculty' | 'Organizer')}>
            <SelectTrigger data-testid="select-role">
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Student">Student</SelectItem>
              <SelectItem value="Faculty">Faculty</SelectItem>
              <SelectItem value="Organizer">Event Organizer</SelectItem>
            </SelectContent>
          </Select>
          {errors.role && (
            <p className="text-sm text-destructive" data-testid="text-role-error">
              {errors.role.message}
            </p>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isSubmitting}
          data-testid="button-register"
        >
          {isSubmitting ? "Creating account..." : "Create Account"}
        </Button>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login">
              <span className="text-primary hover:underline cursor-pointer font-medium" data-testid="link-login">
                Sign in here
              </span>
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
