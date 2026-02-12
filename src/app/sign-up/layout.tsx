export default function SignUpLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background">
      {children}
    </div>
  );
}
