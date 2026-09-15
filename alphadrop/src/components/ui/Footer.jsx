export function Footer() {
  return (
    <footer className="border-t border-blue-900/60 bg-[#071a37] px-4 py-5 text-blue-100 lg:px-6">
      <div className="mx-auto flex max-w-[1500px] flex-col items-center justify-center gap-2 text-center text-xs">
        <p>© {new Date().getFullYear()} AlphaDrop. All rights reserved.</p>
        <p className="text-blue-300">Secure content delivery platform</p>
      </div>
    </footer>
  )
}
