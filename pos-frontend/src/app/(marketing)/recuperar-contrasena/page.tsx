import { LoginShell } from '@/components/organisms/LoginShell';
import { RecuperarContrasenaForm } from '@/components/organisms/RecuperarContrasenaForm';

export const metadata = {
  title: 'Recuperar contraseña — POS-AI',
  description: 'Restablece el acceso a tu cuenta POS-AI con un código de verificación.',
};

export default function RecuperarContrasenaPage() {
  return (
    <LoginShell>
      <RecuperarContrasenaForm />
    </LoginShell>
  );
}
