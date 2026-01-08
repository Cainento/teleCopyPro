export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-muted/30 border-t border-border/50 py-8">
            <div className="container mx-auto px-4 md:px-6 text-center text-sm text-muted-foreground">
                &copy; {currentYear} Clona Gram. Todos os direitos reservados.
            </div>
        </footer>
    );
}
