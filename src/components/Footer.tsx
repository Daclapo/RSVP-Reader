const Footer = () => {
  return (
    <footer className="mx-auto mt-8 w-full max-w-6xl px-4 pb-8">
      <p className="text-center text-xs text-muted-foreground">
        David Clarkson · github.com/daclapo · {new Date().getFullYear()}
      </p>
    </footer>
  );
};

export default Footer;
