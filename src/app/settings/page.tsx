import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajustes</CardTitle>
        <CardDescription>
          Gestiona los ajustes de la aplicación aquí.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Página de ajustes en construcción.</p>
      </CardContent>
    </Card>
  );
}
