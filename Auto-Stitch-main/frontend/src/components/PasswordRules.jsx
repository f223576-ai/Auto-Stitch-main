import { PASSWORD_RULES } from '../utils/passwordPolicy';
import './PasswordRules.css';

export default function PasswordRules({ password }) {
  const value = password || '';

  return (
    <ul className="password-rules" aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        return (
          <li key={rule.id} className={met ? 'password-rule met' : 'password-rule'}>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
