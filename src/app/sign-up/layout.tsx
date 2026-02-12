export default function SignUpLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-full items-center justify-center -m-4 sm:-m-6">
      {children}
    </div>
  );
}
