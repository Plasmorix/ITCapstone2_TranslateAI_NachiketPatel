interface PasswordStrengthMeterProps {
  password: string;
  email: string;
  fullName: string;
}

export default function PasswordStrengthMeter({ password, email, fullName }: PasswordStrengthMeterProps) {
  const checks = {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    notEmail: !email || !password.toLowerCase().includes(email.toLowerCase().split('@')[0]),
    notName: !fullName || !password.toLowerCase().includes(fullName.toLowerCase()),
  };

  const passedChecks = Object.values(checks).filter(Boolean).length;
  const strength = passedChecks <= 3 ? 'weak' : passedChecks <= 5 ? 'medium' : 'strong';

  const strengthColors = {
    weak: 'bg-destructive',
    medium: 'bg-yellow-500',
    strong: 'bg-green-500',
  };

  const strengthLabels = {
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
  };

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${strengthColors[strength]}`}
            style={{ width: `${(passedChecks / 7) * 100}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${
          strength === 'weak' ? 'text-destructive' :
          strength === 'medium' ? 'text-yellow-500' :
          'text-green-500'
        }`}>
          {strengthLabels[strength]}
        </span>
      </div>

      <ul className="text-xs space-y-1">
        <li className={checks.length ? 'text-green-600' : 'text-muted-foreground'}>
          {checks.length ? '✓' : '○'} Minimum 12 characters
        </li>
        <li className={checks.uppercase ? 'text-green-600' : 'text-muted-foreground'}>
          {checks.uppercase ? '✓' : '○'} At least one uppercase letter
        </li>
        <li className={checks.lowercase ? 'text-green-600' : 'text-muted-foreground'}>
          {checks.lowercase ? '✓' : '○'} At least one lowercase letter
        </li>
        <li className={checks.number ? 'text-green-600' : 'text-muted-foreground'}>
          {checks.number ? '✓' : '○'} At least one number
        </li>
        <li className={checks.special ? 'text-green-600' : 'text-muted-foreground'}>
          {checks.special ? '✓' : '○'} At least one special character (!@#$%^&*)
        </li>
        <li className={checks.notEmail ? 'text-green-600' : 'text-muted-foreground'}>
          {checks.notEmail ? '✓' : '○'} Must not contain your email
        </li>
        <li className={checks.notName ? 'text-green-600' : 'text-muted-foreground'}>
          {checks.notName ? '✓' : '○'} Must not contain your name
        </li>
      </ul>
    </div>
  );
}
