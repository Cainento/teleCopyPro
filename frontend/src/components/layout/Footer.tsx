export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t mt-auto bg-card">
      <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
        <p>&copy; {currentYear} TeleCopy Pro. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
